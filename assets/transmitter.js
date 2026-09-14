(() => {
  const cfg = window.ANTORCHA_CONFIG || {};
  const points = window.ANTORCHA_POINTS || [];
  const sequence = window.ANTORCHA_SEQUENCE || [];
  const byNumber = new Map(points.map(p => [p.number, p]));
  const q = id => document.getElementById(id);
  let watchId = null, wakeLock = null, lastSentAt = 0, lastSentLoc = null, currentStep = -1;
  let supabase = null, operatorKey = localStorage.getItem('antorcha_operator_key') || '';
  const keySavedAt = Number(localStorage.getItem('antorcha_operator_key_saved_at') || 0);
  if (operatorKey && keySavedAt && (Date.now()-keySavedAt) > 18*60*60*1000) {
    operatorKey=''; localStorage.removeItem('antorcha_operator_key'); localStorage.removeItem('antorcha_operator_key_saved_at');
  }

  function hav(a, b) { const R=6371000,r=Math.PI/180,d1=(b.lat-a.lat)*r,d2=(b.lon-a.lon)*r,l1=a.lat*r,l2=b.lat*r,h=Math.sin(d1/2)**2+Math.cos(l1)*Math.cos(l2)*Math.sin(d2/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
  function infer(loc) { let best={idx:0,d:Infinity}; sequence.forEach((n,i)=>{const p=byNumber.get(n);if(!p)return;const d=hav(loc,p);if(d<best.d)best={idx:i,d}}); currentStep=best.idx; if(currentStep===21){q('txNext').textContent='Pausa en punto 22 · reinicio 1:00 p. m. en punto 23';q('txPhase').textContent='Fin tramo mañana';return;} if(currentStep===22){q('txNext').textContent='Punto 23 · Sonador - PINDECO · 1:00 p. m.';q('txPhase').textContent='Inicio tramo tarde';return;} const np=byNumber.get(sequence[Math.min(currentStep+1,sequence.length-1)]);q('txNext').textContent=np?`Punto ${np.number} · ${np.name}`:'Recorrido completado';q('txPhase').textContent=currentStep<22?'Mañana':currentStep>=37?'Retorno':'Tarde'; }
  async function keepAwake(){ try{ if('wakeLock' in navigator) wakeLock=await navigator.wakeLock.request('screen'); }catch(e){} }

  function createBasemap(map){
    const providers=cfg.map?.providers||[]; let layer=null, switched=false;
    const status=q('mapSourceStatusTx'); const say=t=>{if(status)status.textContent=t};
    function load(i=0){const p=providers[i]; if(!p)return; if(layer)map.removeLayer(layer); layer=L.tileLayer(p.tileUrl,{maxZoom:p.maxZoom||19,attribution:p.attribution||''}).addTo(map); say(`Mapa base: ${p.name}`); layer.on('tileerror',()=>{if(switched)return; if(i<providers.length-1){switched=true;load(i+1);say(`Mapa base alterno: ${providers[i+1].name}`)}else say('No fue posible cargar el mapa base')}); return layer}
    return {start:()=>load(0)};
  }

  const map=L.map('txMap',{zoomControl:false,preferCanvas:true}); createBasemap(map).start(); L.control.zoom({position:'bottomright'}).addTo(map);
  const morningSeq=Array.from({length:22},(_,i)=>i+1), afternoonSeq=[...Array.from({length:15},(_,i)=>i+23),6,5,4,3,2,1];
  const segs=(window.ANTORCHA_ROUTE_SEGMENTS||[]).length?window.ANTORCHA_ROUTE_SEGMENTS:[{id:'manana',coordinates:morningSeq.map(n=>[byNumber.get(n).lat,byNumber.get(n).lon])},{id:'tarde',coordinates:afternoonSeq.map(n=>[byNumber.get(n).lat,byNumber.get(n).lon])}];
  const routeGroup=L.layerGroup().addTo(map); segs.forEach((seg,i)=>L.polyline(seg.coordinates,{color:i===0?'#b71918':'#0b2f56',weight:4,opacity:.75,dashArray:'8 8'}).addTo(routeGroup));
  const routeBounds=L.latLngBounds(segs.flatMap(seg=>seg.coordinates)); map.fitBounds(routeBounds.pad(.08));
  points.forEach(p=>L.circleMarker([p.lat,p.lon],{radius:3,color:'#0b2f56',weight:1,fillOpacity:.7}).bindTooltip(`${p.number}. ${p.name}`).addTo(map));
  if(cfg.ogc?.enabled){
    const mk=(name,opacity=.55)=>L.tileLayer.wms(cfg.ogc.snitIgn5Wms,{layers:name,format:'image/png',transparent:true,version:'1.1.1',opacity,attribution:'SNIT / IGN'});
    mk(cfg.ogc.layers.roads,.45).addTo(map); mk(cfg.ogc.layers.districts,.6).addTo(map); mk(cfg.ogc.layers.hydrology,.55).addTo(map);
  }
  const gpsIcon=L.icon({iconUrl:'assets/torch-icon.svg',iconSize:[30,42],iconAnchor:[15,36]}); let gpsMarker=null,accCircle=null;

  async function initBackend(){
    if(!cfg.backend?.enabled){q('backendBadge').textContent='Modo local'; return;}
    try{
      const sbCfg=cfg.backend.supabase;
      const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      supabase=mod.createClient(sbCfg.url,sbCfg.publishableKey);
      q('backendBadge').textContent='Supabase conectado';
      if(operatorKey){q('operatorKey').value=operatorKey; q('keyStatus').textContent='Clave cargada para esta jornada';}
    }catch(e){console.error(e);q('backendBadge').textContent='Error conectando Supabase';}
  }

  q('saveKey').onclick=()=>{
    operatorKey=q('operatorKey').value.trim();
    if(!operatorKey){q('keyStatus').textContent='Ingrese la clave privada de transmisión';return;}
    localStorage.setItem('antorcha_operator_key',operatorKey);
    localStorage.setItem('antorcha_operator_key_saved_at', String(Date.now()));
    q('keyStatus').textContent='Clave guardada en este teléfono para la jornada';
  };
  q('clearKey').onclick=()=>{operatorKey='';localStorage.removeItem('antorcha_operator_key');localStorage.removeItem('antorcha_operator_key_saved_at');q('operatorKey').value='';q('keyStatus').textContent='Clave eliminada de este teléfono';};

  async function rpcUpdate(payload){
    if(!supabase) throw new Error('Supabase no está conectado');
    if(!operatorKey) throw new Error('Falta la clave privada de transmisión');
    const sb=cfg.backend.supabase;
    const res=await fetch(`${sb.url}/rest/v1/rpc/${sb.updateRpc||'update_antorcha_location'}`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':sb.publishableKey,'Authorization':`Bearer ${sb.publishableKey}`,'x-antorcha-operator':operatorKey},
      body:JSON.stringify(payload)
    });
    if(!res.ok){let msg=await res.text();throw new Error(msg||`HTTP ${res.status}`)}
    return res.json().catch(()=>null);
  }

  async function pushStatus(state){
    if(!cfg.backend?.enabled)return;
    await rpcUpdate({p_event_id:cfg.eventId,p_lat:null,p_lon:null,p_accuracy:null,p_heading:null,p_speed:null,p_state:state});
  }

  async function send(loc,pos){
    if(!cfg.backend?.enabled)return;
    const now=Date.now(),moved=lastSentLoc?hav(lastSentLoc,loc):Infinity;
    if(now-lastSentAt<(cfg.sendEveryMs||4000)&&moved<(cfg.minMoveMeters||4))return;
    lastSentAt=now;lastSentLoc=loc;
    await rpcUpdate({p_event_id:cfg.eventId,p_lat:loc.lat,p_lon:loc.lon,p_accuracy:pos.coords.accuracy||null,p_heading:Number.isFinite(pos.coords.heading)?pos.coords.heading:null,p_speed:Number.isFinite(pos.coords.speed)?pos.coords.speed:null,p_state:'live'});
    q('sent').textContent=new Date().toLocaleTimeString('es-CR');
  }

  function onPos(pos){
    const c=pos.coords,loc={lat:c.latitude,lon:c.longitude};
    q('lat').textContent=c.latitude.toFixed(6);q('lon').textContent=c.longitude.toFixed(6);q('acc').textContent='± '+Math.round(c.accuracy)+' m';q('time').textContent=new Date(pos.timestamp).toLocaleTimeString('es-CR');
    q('state').textContent='GPS activo · transmitiendo';q('state').className='state live';
    if(!gpsMarker)gpsMarker=L.marker([loc.lat,loc.lon],{icon:gpsIcon,zIndexOffset:1000}).addTo(map);else gpsMarker.setLatLng([loc.lat,loc.lon]);
    if(!accCircle)accCircle=L.circle([loc.lat,loc.lon],{radius:c.accuracy,color:'#168a55',weight:1,fillOpacity:.06}).addTo(map);else accCircle.setLatLng([loc.lat,loc.lon]).setRadius(c.accuracy);
    map.panTo([loc.lat,loc.lon]);infer(loc);
    send(loc,pos).catch(e=>{console.error(e);q('state').textContent='GPS activo · error enviando datos';q('state').className='state error';q('keyStatus').textContent='Error: '+e.message.slice(0,140)});
  }

  q('start').onclick=async()=>{
    operatorKey=q('operatorKey').value.trim()||operatorKey;
    if(!operatorKey){q('keyStatus').textContent='Ingrese y guarde la clave privada antes de transmitir';return;}
    if(!navigator.geolocation){q('state').textContent='Este navegador no admite geolocalización';return;}
    await keepAwake();q('state').textContent='Solicitando señal GPS…';
    watchId=navigator.geolocation.watchPosition(onPos,e=>{q('state').textContent='Error GPS: '+e.message;q('state').className='state error';},{enableHighAccuracy:true,maximumAge:1500,timeout:15000});
    q('start').disabled=true;q('pause').disabled=false;q('finish').disabled=false;
  };
  q('pause').onclick=async()=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId);watchId=null;q('state').textContent='Transmisión pausada';q('state').className='state';q('start').disabled=false;q('pause').disabled=true;try{await pushStatus('paused')}catch(e){}};
  q('finish').onclick=async()=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId);watchId=null;if(wakeLock)try{await wakeLock.release()}catch(e){}q('state').textContent='Recorrido finalizado';q('state').className='state';q('start').disabled=false;q('pause').disabled=true;q('finish').disabled=true;try{await pushStatus('ended')}catch(e){}};
  q('fitTx').onclick=()=>map.fitBounds(routeBounds.pad(.08));
  q('openPublic').onclick=()=>window.open(cfg.publicUrl||'./visor_antorcha_buenosaires2026.html','_blank');
  initBackend();
})();
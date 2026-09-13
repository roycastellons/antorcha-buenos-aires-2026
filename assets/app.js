(() => {
  const cfg = window.ANTORCHA_CONFIG || {};
  const points = window.ANTORCHA_POINTS || [];
  const sequence = window.ANTORCHA_SEQUENCE || [];
  const byNumber = new Map(points.map(p => [p.number, p]));
  const el = id => document.getElementById(id);

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }
  function formatDistance(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; }
  function haversine(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad, la1 = a.lat * rad, la2 = b.lat * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function createBasemap(map) {
    const providers = cfg.map?.providers || [];
    if (!providers.length) throw new Error('No hay proveedores de mapa configurados.');
    let index = 0, layer = null, switched = false;
    const status = el('mapSourceStatus');
    const setStatus = text => { if (status) status.textContent = text; };
    const make = p => L.tileLayer(p.tileUrl, { maxZoom: p.maxZoom || 19, attribution: p.attribution || '' });
    function load(i) {
      const p = providers[i];
      if (!p) return;
      if (layer) map.removeLayer(layer);
      layer = make(p).addTo(map);
      setStatus(`Mapa base: ${p.name}`);
      layer.on('tileerror', () => {
        if (switched) return;
        if (i < providers.length - 1) {
          switched = true;
          load(i + 1);
          setStatus(`Mapa base alterno: ${providers[i + 1].name}`);
        } else {
          setStatus('No fue posible cargar el mapa base.');
        }
      });
      switched = false;
      index = i;
      return layer;
    }
    return { get current() { return layer; }, load, start: () => load(index), providers };
  }

  const map = L.map('map', { zoomControl: false, preferCanvas: true });
  const basemapManager = createBasemap(map);
  const base = basemapManager.start();
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const routeLatLngs = sequence.map(n => byNumber.get(n)).filter(Boolean).map(p => [p.lat, p.lon]);
  const routeLayer = L.layerGroup().addTo(map);
  const refLine = L.polyline(routeLatLngs, { color: '#b71918', weight: 4, opacity: .7, dashArray: '9 8' }).addTo(routeLayer);
  refLine.bindTooltip('Trazado referencial por secuencia de puntos.');

  const routePoints = L.layerGroup().addTo(map), markerByNumber = new Map();
  points.forEach(p => {
    const icon = L.divIcon({ className: '', html: `<div class="point-number">${p.number}</div>`, iconSize: [27, 27], iconAnchor: [13, 13] });
    const m = L.marker([p.lat, p.lon], { icon }).addTo(routePoints);
    m.bindPopup(`<strong>Punto ${p.number}</strong><br>${escapeHtml(p.name)}${p.number === 1 ? '<br><small>Salida aproximada: 8:00 a. m.</small>' : ''}`);
    markerByNumber.set(p.number, m);
  });

  const localityLayer = L.layerGroup();
  (window.ANTORCHA_LOCALITIES?.features || []).forEach(f => {
    const [lon, lat] = f.geometry.coordinates, p = f.properties;
    const cab = /Cabecera/.test(p.type || '');
    const marker = L.circleMarker([lat, lon], { radius: cab ? 5 : 3, weight: 1, color: '#0b2f56', fillColor: '#fff', fillOpacity: .92 });
    marker.bindTooltip(`<strong>${escapeHtml(p.name)}</strong><br><span>${escapeHtml(p.district)}</span>`, { direction: 'top' });
    marker.bindPopup(`<strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.type)}<br>Distrito: ${escapeHtml(p.district)}<br><small>Fuente: IGN/SNIT · Centros Poblados y Localidades 2026</small>`);
    marker.addTo(localityLayer);
  });

  const schoolsLayer = L.layerGroup();
  (window.ANTORCHA_SCHOOL_REFS?.features || []).forEach(f => {
    const [lon, lat] = f.geometry.coordinates, p = f.properties;
    const icon = L.divIcon({ className: '', html: '<div class="school-marker">🏫</div>', iconSize: [28, 28], iconAnchor: [14, 20] });
    L.marker([lat, lon], { icon }).bindPopup(`<strong>${escapeHtml(p.name)}</strong><br>Punto ${p.route_point}<br><small>Referencia identificada en el KML del recorrido.</small>`).addTo(schoolsLayer);
  });

  localityLayer.addTo(map);
  schoolsLayer.addTo(map);
  const overlays = { 'Recorrido y puntos': routePoints, 'Localidades IGN/SNIT 2026': localityLayer, 'Centros educativos del recorrido': schoolsLayer };
  if (cfg.ogc?.enabled) {
    const mkIgn = (name, opacity=.65) => L.tileLayer.wms(cfg.ogc.snitIgn5Wms, { layers: name, format: 'image/png', transparent: true, version: '1.1.1', opacity, attribution: 'SNIT / IGN' });
    const districtsWms = mkIgn(cfg.ogc.layers.districts, .70).addTo(map);
    const hydrologyWms = mkIgn(cfg.ogc.layers.hydrology, .70).addTo(map);
    const roadsWms = mkIgn(cfg.ogc.layers.roads, .45);
    overlays['SNIT · Límites distritales'] = districtsWms;
    overlays['SNIT · Hidrografía'] = hydrologyWms;
    overlays['SNIT · Vías oficiales IGN'] = roadsWms;
    if (cfg.ogc.mepWms) {
      const mepSchools = L.tileLayer.wms(cfg.ogc.mepWms, { layers: cfg.ogc.layers.schools || '0', format: 'image/png', transparent: true, version: '1.3.0', opacity: .85, attribution: 'MEP / SIGMEP' }).addTo(map);
      overlays['MEP · Centros educativos'] = mepSchools;
    }
  }
  const baseLayers = {};
  basemapManager.providers.forEach((p, idx) => {
    baseLayers[`Mapa base · ${p.name}`] = idx === 0 ? base : L.tileLayer(p.tileUrl, { maxZoom: p.maxZoom || 19, attribution: p.attribution || '' });
  });
  L.control.layers(baseLayers, overlays, { position: 'topleft', collapsed: true }).addTo(map);

  const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
  map.fitBounds(bounds.pad(.08));

  const torchIcon = L.icon({ iconUrl: 'assets/torch-icon.svg', iconSize: [34, 48], iconAnchor: [17, 42], popupAnchor: [0, -34] });
  let torchMarker = null, accuracyCircle = null, follow = true, currentStep = -1, lastTimestamp = null;
  const liveDot = el('liveDot'), liveStatus = el('liveStatus'), lastUpdate = el('lastUpdate'), currentLocation = el('currentLocation'), nextPoint = el('nextPoint'), progressBar = el('progressBar'), progressText = el('progressText'), progressPercent = el('progressPercent');

  function nearestPoint(loc) { let best = null; points.forEach(p => { const d = haversine(loc, p); if (!best || d < best.d) best = { p, d }; }); return best; }
  function inferStep(loc) {
    const start = Math.max(0, currentStep - 2), end = Math.min(sequence.length - 1, currentStep < 0 ? sequence.length - 1 : currentStep + 7);
    let best = { idx: currentStep < 0 ? 0 : currentStep, d: Infinity };
    for (let i = start; i <= end; i++) { const p = byNumber.get(sequence[i]); if (!p) continue; const d = haversine(loc, p); if (d < best.d) best = { idx: i, d }; }
    if (currentStep < 0) for (let i = 0; i < 37; i++) { const p = byNumber.get(sequence[i]), d = haversine(loc, p); if (d < best.d) best = { idx: i, d }; }
    return best.idx;
  }

  function setLiveLocation(loc, timestamp = Date.now(), opts = {}) {
    const ll = [loc.lat, loc.lon];
    if (!torchMarker) torchMarker = L.marker(ll, { icon: torchIcon, zIndexOffset: 1000 }).addTo(map); else torchMarker.setLatLng(ll);
    if (loc.accuracy) {
      if (!accuracyCircle) accuracyCircle = L.circle(ll, { radius: loc.accuracy, color: '#168a55', weight: 1, fillOpacity: .05 }).addTo(map);
      else accuracyCircle.setLatLng(ll).setRadius(loc.accuracy);
    }
    if (torchMarker) torchMarker.setOpacity(1);
    lastTimestamp = timestamp;
    currentStep = inferStep(loc);
    const near = nearestPoint(loc), nearText = near && near.d < 1800 ? `${near.p.name} · ${formatDistance(near.d)}` : 'En recorrido';
    currentLocation.textContent = nearText;
    const ni = Math.min(currentStep + 1, sequence.length - 1), np = byNumber.get(sequence[ni]);
    nextPoint.textContent = np ? `Punto ${np.number} · ${np.name}` : 'Recorrido completado';
    const pct = Math.max(0, Math.min(100, Math.round((Math.max(0, currentStep) / (sequence.length - 1)) * 100)));
    progressBar.style.width = pct + '%';
    progressPercent.textContent = pct + '%';
    progressText.textContent = currentStep >= 37 ? 'Retorno hacia Buenos Aires' : currentStep >= 0 ? 'Recorrido en curso' : 'Preparando recorrido';
    liveDot.className = 'dot dot-live';
    liveStatus.textContent = opts.demo ? 'Demostración de recorrido' : 'Ubicación GPS en vivo';
    lastUpdate.textContent = new Date(timestamp).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (follow) map.panTo(ll, { animate: true, duration: .5 });
  }

  el('fitRoute').onclick = () => { follow = false; map.fitBounds(bounds.pad(.08)); };
  el('followTorch').onclick = () => { follow = true; if (torchMarker) map.setView(torchMarker.getLatLng(), 14); };

  const drawer = el('pointsDrawer'), backdrop = el('drawerBackdrop'), list = el('pointsList');
  points.forEach(p => {
    const row = document.createElement('div');
    row.className = 'point-row';
    row.innerHTML = `<span class="point-badge">${p.number}</span><div><strong>${escapeHtml(p.name)}</strong>${p.number === 1 ? '<br><small>Salida aprox. 8:00 a. m.</small>' : ''}</div><span>›</span>`;
    row.onclick = () => { map.setView([p.lat, p.lon], 15); markerByNumber.get(p.number).openPopup(); closeDrawer(); };
    list.appendChild(row);
  });
  function openDrawer() { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); backdrop.hidden = false; }
  function closeDrawer() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); backdrop.hidden = true; }
  el('openPoints').onclick = openDrawer; document.querySelector('.close-drawer').onclick = closeDrawer; backdrop.onclick = closeDrawer;

  const dlg = el('aboutDialog'); el('openAbout').onclick = () => dlg.showModal(); el('officialMark').onclick = () => dlg.showModal(); document.querySelector('.dialog-close').onclick = () => dlg.close();
  const shareDlg = el('shareDialog');
  el('openShare').onclick = () => {
    const publicUrl = cfg.publicUrl || location.href.split('?')[0].split('#')[0];
    el('publicLink').value = publicUrl;
    const q = el('qrCode'); q.innerHTML = '';
    if (location.protocol === 'file:') q.innerHTML = '<div class="qr-wait">El QR final se genera automáticamente cuando el visor esté publicado.</div>';
    else if (window.QRCode) new QRCode(q, { text: publicUrl, width: 190, height: 190, correctLevel: QRCode.CorrectLevel.M });
    shareDlg.showModal();
  };
  el('copyLink').onclick = async () => { try { await navigator.clipboard.writeText(el('publicLink').value); el('copyLink').textContent = 'Copiado ✓'; setTimeout(() => el('copyLink').textContent = 'Copiar enlace', 1400); } catch (e) { el('publicLink').select(); } };
  document.querySelector('.share-close').onclick = () => shareDlg.close();

  setInterval(() => {
    if (!lastTimestamp) return;
    const age = (Date.now() - lastTimestamp) / 1000;
    if (age > (cfg.staleAfterSeconds || 45)) {
      liveDot.className = 'dot dot-stale';
      liveStatus.textContent = 'Señal sin actualizar';
      lastUpdate.textContent = `hace ${Math.round(age)} s`;
      if (torchMarker) torchMarker.setOpacity(.62);
    }
  }, 1000);

  const demo = new URLSearchParams(location.search).get('demo') === '1';
  if (demo) {
    let i = 0, t = 0;
    function tick() {
      const a = routeLatLngs[i], b = routeLatLngs[Math.min(i + 1, routeLatLngs.length - 1)];
      const lat = a[0] + (b[0] - a[0]) * t, lon = a[1] + (b[1] - a[1]) * t;
      setLiveLocation({ lat, lon, accuracy: 8 }, Date.now(), { demo: true });
      t += .055; if (t >= 1) { t = 0; i = (i + 1) % routeLatLngs.length; }
    }
    tick(); setInterval(tick, 1000);
  }

  async function connectSupabase() {
    const sbCfg = cfg.backend?.supabase || {};
    try {
      const supa = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      const client = supa.createClient(sbCfg.url, sbCfg.publishableKey);
      const table = sbCfg.liveTable || 'event_live_status';
      let lastSeen = null;
      async function fetchLive() {
        const { data, error } = await client.from(table).select('*').eq('event_id', cfg.eventId).maybeSingle();
        if (error) throw error;
        if (!data) return;
        const ts = new Date(data.updated_at || Date.now()).getTime();
        if (data.state === 'live' && typeof data.lat === 'number' && typeof data.lon === 'number') {
          if (lastSeen !== ts) {
            lastSeen = ts;
            setLiveLocation({ lat: data.lat, lon: data.lon, accuracy: data.accuracy || 0 }, ts);
          }
        } else if (data.state === 'paused') {
          liveDot.className = 'dot dot-stale';
          liveStatus.textContent = 'Transmisión pausada';
          lastUpdate.textContent = new Date(ts).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else if (data.state === 'ended' || data.state === 'offline') {
          liveDot.className = 'dot dot-stale';
          liveStatus.textContent = data.state === 'ended' ? 'Recorrido finalizado' : 'Esperando señal GPS';
          lastUpdate.textContent = 'Sin transmisión activa';
        }
      }
      await fetchLive();
      setInterval(() => fetchLive().catch(err => console.error('Supabase polling:', err)), cfg.pollEveryMs || 4000);
    } catch (err) {
      console.error(err); liveStatus.textContent = 'No fue posible conectar Supabase';
    }
  }

  async function connectBackend() {
    if (!cfg.backend?.enabled) { liveStatus.textContent = 'Esperando señal GPS'; return; }
    if (cfg.backend.provider === 'supabase' && cfg.backend.supabase?.url && cfg.backend.supabase?.publishableKey) return connectSupabase();
    liveStatus.textContent = 'Backend no configurado';
  }

  connectBackend();
  window.AntorchaViewer = { setLiveLocation, map };
})();

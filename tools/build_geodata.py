# GEOIURIS · Antorcha Buenos Aires 2026 · generador geográfico v1.2
import json, os, sys, time, re
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
HEADERS = {'User-Agent': 'GEOIURIS-Antorcha-BuenosAires-2026/1.2 (contact: rcastellons@outlook.com)'}

def fetch_json(url, timeout=60):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))

def save_js(path, varname, obj):
    path.write_text(f"window.{varname} = " + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')

def parse_js_json(path, varname):
    txt = path.read_text(encoding='utf-8')
    m = re.search(rf'window\.{re.escape(varname)}\s*=\s*(.*?);\s*(?:\n|$)', txt, re.S)
    if not m:
        raise RuntimeError(f'No se pudo leer {varname} desde {path}')
    return json.loads(m.group(1))

def load_points():
    pts_list = parse_js_json(DATA/'route-data.js','ANTORCHA_POINTS')
    return {int(p['number']): {'number':int(p['number']),'name':p.get('name',f"Punto {p['number']}"),'lat':p['lat'],'lon':p['lon']} for p in pts_list}

def route_osrm(points, seq):
    coords = ';'.join(f"{points[n]['lon']},{points[n]['lat']}" for n in seq)
    url = f"https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson&steps=false&annotations=false&continue_straight=false"
    data = fetch_json(url, 90)
    if data.get('code') != 'Ok' or not data.get('routes'):
        raise RuntimeError('OSRM no devolvió una ruta válida: ' + json.dumps(data)[:500])
    geom = data['routes'][0]['geometry']['coordinates']
    return {'coordinates': [[lat, lon] for lon, lat in geom], 'distance_m': data['routes'][0].get('distance'), 'duration_s': data['routes'][0].get('duration')}

def build_routes(points):
    morning = list(range(1,23))
    afternoon = list(range(23,38)) + [6,5,4,3,2,1]
    r1 = route_osrm(points, morning)
    time.sleep(1)
    r2 = route_osrm(points, afternoon)
    segments = [
        {'id':'manana','title':'Tramo de la mañana','start':'8:00 a. m. aprox.','from':1,'to':22,'sequence':morning, **r1},
        {'id':'tarde','title':'Tramo de la tarde','start':'1:00 p. m.','from':23,'to':1,'sequence':afternoon, **r2}
    ]
    save_js(DATA/'route-snapped.js','ANTORCHA_ROUTE_SEGMENTS',segments)
    return segments

def try_wfs(type_name, bbox):
    params = {'service':'WFS','version':'1.0.0','request':'GetFeature','typeName':type_name,'outputFormat':'application/json','srsName':'EPSG:4326','bbox':','.join(map(str,bbox))+',EPSG:4326'}
    urls = ['https://geos.snitcr.go.cr/be/IGN_5/wfs?' + urlencode(params),'http://geos.snitcr.go.cr/be/IGN_5/wfs?' + urlencode(params)]
    last=None
    for u in urls:
        try: return fetch_json(u,90)
        except Exception as e: last=e
    raise last

def merge_feature_collections(collections):
    seen=set(); feats=[]
    for gj in collections:
        for f in gj.get('features',[]):
            key=json.dumps(f.get('geometry'),sort_keys=True,separators=(',',':')) + json.dumps(f.get('properties') or {},sort_keys=True,separators=(',',':'))
            if key not in seen:
                seen.add(key); feats.append(f)
    return {'type':'FeatureCollection','features':feats}

def filter_buenos_aires_districts(gj):
    out=[]
    for f in gj.get('features',[]):
        p={str(k).lower():v for k,v in (f.get('properties') or {}).items()}
        text=' '.join(str(v) for v in p.values()).lower()
        canton = str(p.get('canton') or p.get('nom_canton') or p.get('canton_nom') or '').lower()
        code = ''.join(ch for ch in str(p.get('cod_canton') or p.get('canton_id') or p.get('codigo') or '') if ch.isdigit())
        if 'buenos aires' in canton or 'buenos aires' in text or code.startswith('603'): out.append(f)
    return {'type':'FeatureCollection','features':out or gj.get('features',[])}

def build_ign_vectors():
    # Two working corridors keep the mobile payload smaller than downloading the whole cantón.
    bboxes=[(-83.38,8.97,-83.18,9.19),(-83.52,9.12,-83.31,9.27)]
    districts=filter_buenos_aires_districts(try_wfs('IGN_5:limitedistrital_5k',(-83.60,8.88,-83.10,9.34)))
    roads=merge_feature_collections([try_wfs('IGN_5:vias_5000',b) for b in bboxes])
    hydro=merge_feature_collections([try_wfs('IGN_5:hidrografia_5000',b) for b in bboxes])
    save_js(DATA/'distritos-buenosaires.js','ANTORCHA_DISTRICTS_GEOJSON',districts)
    save_js(DATA/'vias-snit.js','ANTORCHA_ROADS_GEOJSON',roads)
    save_js(DATA/'hidrografia-snit.js','ANTORCHA_HYDRO_GEOJSON',hydro)
    return len(districts['features']),len(roads['features']),len(hydro['features'])

def build_mep_schools():
    bbox='-83.60,8.88,-83.10,9.34'
    params={'where':'1=1','outFields':'*','returnGeometry':'true','f':'geojson','geometry':bbox,'geometryType':'esriGeometryEnvelope','inSR':'4326','outSR':'4326','spatialRel':'esriSpatialRelIntersects'}
    bases=['https://sig.mep.go.cr/server/rest/services/CE_Publicos_CR/MapServer/0/query?','https://sig.mep.go.cr/server/rest/services/CE_Publicos_CR/FeatureServer/0/query?']
    last=None
    for b in bases:
        try:
            gj=fetch_json(b+urlencode(params),90)
            if gj.get('features') is not None:
                save_js(DATA/'centros-educativos-mep.js','ANTORCHA_MEP_SCHOOLS_GEOJSON',gj)
                return len(gj['features'])
        except Exception as e: last=e
    print('ADVERTENCIA: no se pudo descargar MEP:',repr(last),file=sys.stderr)
    save_js(DATA/'centros-educativos-mep.js','ANTORCHA_MEP_SCHOOLS_GEOJSON',{'type':'FeatureCollection','features':[]})
    return 0

if __name__ == '__main__':
    pts=load_points()
    print('Generando rutas ajustadas a red vial OSM...')
    routes=build_routes(pts)
    print('Tramos:',[(r['id'],len(r['coordinates']),round((r.get('distance_m') or 0)/1000,1)) for r in routes])
    try:
        print('IGN distritos/vías/hidrografía:',build_ign_vectors())
    except Exception as e:
        print('ADVERTENCIA IGN:',repr(e),file=sys.stderr)
    print('Centros educativos MEP:',build_mep_schools())

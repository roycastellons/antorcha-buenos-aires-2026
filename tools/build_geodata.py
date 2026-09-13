# GEOIURIS · Antorcha Buenos Aires 2026 · generador geográfico v1.1
import json, os, sys, time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'

HEADERS = {'User-Agent': 'GEOIURIS-Antorcha-BuenosAires-2026/1.1 (contact: rcastellons@outlook.com)'}

def fetch_json(url, timeout=60):
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))

def save_js(path, varname, obj):
    path.write_text(f"window.{varname} = " + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')

def load_points():
    gj = json.loads((DATA/'puntos.geojson').read_text(encoding='utf-8'))
    pts = {}
    for f in gj['features']:
        n = int(f['properties']['number'])
        lon, lat = f['geometry']['coordinates'][:2]
        pts[n] = {'number': n, 'name': f['properties'].get('name', f'Punto {n}'), 'lon': lon, 'lat': lat}
    return pts

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
    params = {
      'service':'WFS','version':'1.0.0','request':'GetFeature','typeName':type_name,
      'outputFormat':'application/json','srsName':'EPSG:4326','bbox':','.join(map(str,bbox))+',EPSG:4326'
    }
    urls = [
      'https://geos.snitcr.go.cr/be/IGN_5/wfs?' + urlencode(params),
      'http://geos.snitcr.go.cr/be/IGN_5/wfs?' + urlencode(params),
    ]
    last = None
    for u in urls:
      try:
        return fetch_json(u, 90)
      except Exception as e:
        last=e
    raise last

def filter_buenos_aires_districts(gj):
    out=[]
    for f in gj.get('features',[]):
        p={str(k).lower():v for k,v in (f.get('properties') or {}).items()}
        text=' '.join(str(v) for v in p.values()).lower()
        canton = str(p.get('canton') or p.get('nom_canton') or p.get('canton_nom') or '').lower()
        code = ''.join(ch for ch in str(p.get('cod_canton') or p.get('canton_id') or p.get('codigo') or '') if ch.isdigit())
        if 'buenos aires' in canton or 'buenos aires' in text or code.startswith('603'):
            out.append(f)
    if not out:
        out = gj.get('features',[])
    return {'type':'FeatureCollection','features':out}

def build_districts():
    bbox=(-83.60,8.90,-83.10,9.32)
    gj=try_wfs('IGN_5:limitedistrital_5k', bbox)
    ba=filter_buenos_aires_districts(gj)
    save_js(DATA/'distritos-buenosaires.js','ANTORCHA_DISTRICTS_GEOJSON',ba)
    return len(ba['features'])

def build_mep_schools():
    bbox='-83.60,8.90,-83.10,9.32'
    params={
      'where':'1=1','outFields':'*','returnGeometry':'true','f':'geojson',
      'geometry':bbox,'geometryType':'esriGeometryEnvelope','inSR':'4326','outSR':'4326',
      'spatialRel':'esriSpatialRelIntersects'
    }
    bases=[
      'https://sig.mep.go.cr/server/rest/services/CE_Publicos_CR/MapServer/0/query?',
      'https://sig.mep.go.cr/server/rest/services/CE_Publicos_CR/FeatureServer/0/query?'
    ]
    last=None
    for b in bases:
      try:
        gj=fetch_json(b+urlencode(params),90)
        if gj.get('features') is not None:
            save_js(DATA/'centros-educativos-mep.js','ANTORCHA_MEP_SCHOOLS_GEOJSON',gj)
            return len(gj['features'])
      except Exception as e:
        last=e
    print('ADVERTENCIA: no se pudo descargar MEP:',repr(last), file=sys.stderr)
    fallback={'type':'FeatureCollection','features':[]}
    save_js(DATA/'centros-educativos-mep.js','ANTORCHA_MEP_SCHOOLS_GEOJSON',fallback)
    return 0

if __name__ == '__main__':
    pts=load_points()
    print('Generando rutas ajustadas a red vial OSM...')
    routes=build_routes(pts)
    print('Tramos:',[(r['id'],len(r['coordinates'])) for r in routes])
    try:
        print('Distritos SNIT:',build_districts())
    except Exception as e:
        print('ADVERTENCIA distritos:',repr(e),file=sys.stderr)
    print('Centros educativos MEP:',build_mep_schools())

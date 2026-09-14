# GEOIURIS · Antorcha Buenos Aires 2026 · generador geográfico v1.4
import json, os, sys, time, re, subprocess, tempfile
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
HEADERS = {'User-Agent': 'GEOIURIS-Antorcha-BuenosAires-2026/1.4 (contact: rcastellons@outlook.com)'}

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

def ogr_wfs(type_name, bbox):
    with tempfile.TemporaryDirectory() as td:
        out = Path(td)/'layer.geojson'
        cmd = ['ogr2ogr','-f','GeoJSON',str(out),'WFS:http://geos.snitcr.go.cr/be/IGN_5/wfs',type_name,'-t_srs','EPSG:4326','-spat',str(bbox[0]),str(bbox[1]),str(bbox[2]),str(bbox[3]),'-skipfailures']
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
        return json.loads(out.read_text(encoding='utf-8'))

def merge_feature_collections(collections):
    seen=set(); feats=[]
    for gj in collections:
        for f in gj.get('features',[]):
            key=json.dumps(f.get('geometry'),sort_keys=True,separators=(',',':')) + json.dumps(f.get('properties') or {},sort_keys=True,separators=(',',':'))
            if key not in seen:
                seen.add(key); feats.append(f)
    return {'type':'FeatureCollection','features':feats}

def filter_buenos_aires(gj):
    out=[]
    for f in gj.get('features',[]):
        p={str(k).lower():v for k,v in (f.get('properties') or {}).items()}
        text=' '.join(str(v) for v in p.values()).lower()
        if 'buenos aires' in text or any(str(v).replace('.0','').startswith('603') for v in p.values() if isinstance(v,(str,int,float))):
            out.append(f)
    return {'type':'FeatureCollection','features':out or gj.get('features',[])}

def build_ign_vectors():
    bboxes=[(-83.38,8.97,-83.18,9.19),(-83.52,9.12,-83.31,9.27)]
    districts=filter_buenos_aires(ogr_wfs('IGN_5:limitedistrital_5k',(-83.60,8.88,-83.10,9.34)))
    roads=merge_feature_collections([ogr_wfs('IGN_5:vias_5000',b) for b in bboxes])
    hydro=merge_feature_collections([ogr_wfs('IGN_5:hidrografia_5000',b) for b in bboxes])
    save_js(DATA/'distritos-buenosaires-snit.js','ANTORCHA_SNIT_DISTRICTS_GEOJSON',districts)
    save_js(DATA/'vias-snit.js','ANTORCHA_ROADS_GEOJSON',roads)
    save_js(DATA/'hidrografia-snit.js','ANTORCHA_HYDRO_GEOJSON',hydro)
    return len(districts['features']),len(roads['features']),len(hydro['features'])

def arcgis_query(layer, bbox='-83.60,8.88,-83.10,9.34'):
    params={'where':'1=1','outFields':'*','returnGeometry':'true','f':'geojson','geometry':bbox,'geometryType':'esriGeometryEnvelope','inSR':'4326','outSR':'4326','spatialRel':'esriSpatialRelIntersects','resultRecordCount':'2000'}
    base=f'https://services1.arcgis.com/aWQmxJWy7lM2Qqmo/arcgis/rest/services/CE_Publicos_CR/FeatureServer/{layer}/query?'
    return fetch_json(base+urlencode(params),90)

def build_mep():
    schools=[]
    for layer in (0,1):
        try:
            gj=arcgis_query(layer)
            if gj.get('features') is not None: schools.append(gj)
        except Exception as e: print('ADVERTENCIA MEP centros:',repr(e),file=sys.stderr)
    school_gj=merge_feature_collections(schools) if schools else {'type':'FeatureCollection','features':[]}
    save_js(DATA/'centros-educativos-mep.js','ANTORCHA_MEP_SCHOOLS_GEOJSON',school_gj)
    try:
        districts=filter_buenos_aires(arcgis_query(2))
    except Exception as e:
        print('ADVERTENCIA MEP distritos:',repr(e),file=sys.stderr); districts={'type':'FeatureCollection','features':[]}
    save_js(DATA/'distritos-buenosaires.js','ANTORCHA_DISTRICTS_GEOJSON',districts)
    return len(school_gj['features']),len(districts['features'])

if __name__ == '__main__':
    pts=load_points()
    print('Generando rutas ajustadas a red vial OSM...')
    routes=build_routes(pts)
    print('Tramos:',[(r['id'],len(r['coordinates']),round((r.get('distance_m') or 0)/1000,1)) for r in routes])
    try:
        print('IGN distritos/vías/hidrografía:',build_ign_vectors())
    except Exception as e:
        print('ADVERTENCIA IGN:',repr(e),file=sys.stderr)
    print('MEP centros/distritos:',build_mep())

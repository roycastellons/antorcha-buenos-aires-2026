window.ANTORCHA_CONFIG = {
  eventId: 'antorcha-buenos-aires-2026',
  eventTitle: 'Ruta en Vivo de la Antorcha 2026',
  publicUrl: 'https://roycastellons.github.io/antorcha-buenos-aires-2026/visor_antorcha_buenosaires2026.html',
  transmitterUrl: 'https://roycastellons.github.io/antorcha-buenos-aires-2026/transmitir_recorrido.html',
  staleAfterSeconds: 45,
  pollEveryMs: 4000,
  sendEveryMs: 4000,
  minMoveMeters: 4,
  backend: {
    enabled: true,
    provider: 'supabase',
    supabase: {
      url: 'https://xqrxqmxekbjinpmhivua.supabase.co',
      publishableKey: 'sb_publishable_gjGIgYbAEyNiEtqs2suDwA_My09reFA',
      liveTable: 'event_live_status',
      updateRpc: 'update_antorcha_location'
    }
  },
  map: {
    providers: [
      {
        name: 'OpenStreetMap',
        tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      },
      {
        name: 'Esri World Street Map (respaldo)',
        tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      }
    ]
  },
  ogc: {
    enabled: true,
    snitIgn5Wms: 'https://geos.snitcr.go.cr/be/IGN_5/wms?',
    mepWms: 'https://sig.mep.go.cr/server/services/CE_Publicos_CR/MapServer/WMSServer?',
    layers: {
      districts: 'IGN_5:limitedistrital_5k',
      hydrology: 'IGN_5:hidrografia_5000',
      roads: 'IGN_5:vias_5000',
      schools: '0'
    }
  }
};

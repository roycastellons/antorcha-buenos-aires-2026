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
    openFreeMapStyle: 'https://tiles.openfreemap.org/styles/liberty',
    providers: [
      {
        name: 'OpenStreetMap France (respaldo)',
        tileUrl: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors · OpenStreetMap France',
        maxZoom: 20
      },
      {
        name: 'OpenStreetMap Deutschland (respaldo)',
        tileUrl: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors · FOSSGIS e.V.',
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

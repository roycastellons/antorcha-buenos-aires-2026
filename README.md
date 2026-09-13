# Antorcha Buenos Aires 2026 · GEOIURIS / Red de Medios de Buenos Aires

Versión 1.0 del visor web para seguimiento en tiempo real de la Antorcha de la Independencia 2026 en Buenos Aires, Puntarenas.

## Archivos de uso

- `visor_antorcha_buenosaires2026.html`: visor público. Este es el enlace que se comparte por WhatsApp, redes sociales y QR.
- `transmitir_recorrido.html`: consola privada del único teléfono transmisor.
- `index.html`: redirección técnica hacia el visor público para GitHub Pages.

## Backend

Supabase está configurado y activo para almacenar únicamente el estado y la última ubicación vigente del evento. No se conserva un historial de posiciones.

## Cartografía

- OpenStreetMap como mapa base principal.
- Esri World Street Map como respaldo automático si OSM no responde.
- IGN/SNIT: límites distritales, hidrografía y vías mediante WMS.
- MEP/SIGMEP: centros educativos mediante WMS.
- Localidades IGN/SNIT 2026 incorporadas localmente.
- 37 puntos del recorrido suministrado y retorno 37 → 6 → 5 → 4 → 3 → 2 → 1.

## Créditos

Colaboración: Red de Medios de Buenos Aires + GEOIURIS®.
© GEOIURIS Derechos Reservados 2026.

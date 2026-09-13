# Manual operativo · Versión 1.0

## 1. Qué usa cada persona

### Público
Abrir únicamente:

`visor_antorcha_buenosaires2026.html`

Ese es el archivo/enlace que se distribuye a la comunidad y del cual se genera el QR.

### Teléfono transmisor
Abrir únicamente:

`transmitir_recorrido.html`

Este enlace no debe difundirse públicamente. El operador debe ingresar la clave privada de transmisión suministrada por GEOIURIS y guardarla para esa sesión del navegador.

## 2. Funcionamiento

Un solo teléfono transmite. Todos los demás dispositivos únicamente consultan la última ubicación activa.

El sistema no conserva un historial de ubicaciones. Supabase mantiene una sola fila con latitud, longitud, precisión, velocidad y rumbo cuando el dispositivo los proporciona, estado de la transmisión y fecha/hora de actualización.

## 3. Inicio del recorrido

1. Abrir `transmitir_recorrido.html` en el teléfono que encabezará el recorrido.
2. Ingresar la clave privada.
3. Pulsar **Guardar para esta sesión**.
4. Pulsar **Iniciar transmisión**.
5. Autorizar la geolocalización precisa cuando el navegador la solicite.
6. Mantener GPS, datos móviles y pantalla activos. Se recomienda power bank.

## 4. Pausa y finalización

- **Pausar**: detiene temporalmente la transmisión y el visor público lo informa.
- **Finalizar recorrido**: marca el evento como finalizado y detiene el GPS.
- Si el teléfono pierde conexión o deja de actualizar por más de 45 segundos, el visor público muestra **Señal sin actualizar**.

## 5. Visor público

El visor muestra la posición actual mediante símbolo de antorcha, recorrido y 37 puntos, siguiente referencia, progreso estimado por secuencia de puntos, localidades oficiales IGN/SNIT 2026, límites distritales IGN/SNIT, hidrografía IGN/SNIT, vías oficiales IGN/SNIT como capa opcional, centros educativos MEP/SIGMEP y centros educativos identificados expresamente en el recorrido.

## 6. Mapa base

El mapa base principal es OpenStreetMap. Si sus teselas no responden, el código cambia automáticamente al mapa vial de Esri para no dejar el visor inutilizable.

## 7. Publicación

Repositorio: `roycastellons/antorcha-buenos-aires-2026`

Enlaces previstos de GitHub Pages:
- Público: `https://roycastellons.github.io/antorcha-buenos-aires-2026/visor_antorcha_buenosaires2026.html`
- Transmisor: `https://roycastellons.github.io/antorcha-buenos-aires-2026/transmitir_recorrido.html`

El archivo `index.html` redirige automáticamente al visor público.

## 8. QR

Una vez GitHub Pages esté activo, el botón **Compartir** del visor genera el QR usando la URL pública real configurada.

## 9. Créditos

Proyecto colaborativo de Red de Medios de Buenos Aires y GEOIURIS®.
© GEOIURIS Derechos Reservados 2026.

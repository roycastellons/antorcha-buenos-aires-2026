# Manual operativo · Antorcha Buenos Aires 2026 · Versión de pruebas GPS

## 1. Enlaces operativos

### Visor público
https://roycastellons.github.io/antorcha-buenos-aires-2026/

Archivo principal: `visor_antorcha_buenosaires2026.html`

Este es el enlace que se comparte con la comunidad y el que contiene el QR público.

### Teléfono transmisor
https://roycastellons.github.io/antorcha-buenos-aires-2026/transmitir_recorrido.html

Archivo: `transmitir_recorrido.html`

Este enlace es privado y solo debe entregarse a las personas responsables del teléfono transmisor y los equipos de respaldo.

## 2. Clave del transmisor

**Clave:** `AntorchaBA2026`

La clave puede guardarse previamente en dos o tres teléfonos de respaldo. El panel la conserva en ese navegador durante la jornada, por lo que normalmente se ingresa una sola vez en cada teléfono.

**Regla fundamental:** aunque varios teléfonos tengan la clave guardada, **solo uno debe pulsar Iniciar transmisión y estar transmitiendo a la vez**. Si falla el teléfono principal, se detiene o se apaga y entonces se inicia la transmisión desde uno de los teléfonos de respaldo.

## 3. Prueba rápida

1. Abrir el enlace privado del transmisor en el teléfono.
2. Escribir `AntorchaBA2026`.
3. Pulsar **Guardar para la jornada**.
4. Pulsar **Iniciar transmisión**.
5. Autorizar la ubicación precisa del navegador.
6. Abrir el visor público en otro teléfono o computadora.
7. Confirmar que aparece el símbolo de antorcha en la ubicación del transmisor y que la hora de actualización cambia.
8. Caminar o desplazarse algunos metros y comprobar que la antorcha se mueve.
9. Para una interrupción temporal, pulsar **Pausar**.
10. Para terminar la prueba, pulsar **Finalizar recorrido** o cerrar/detener el transmisor. Si deja de enviar posiciones, el visor mostrará **Señal sin actualizar** después del tiempo de tolerancia configurado.
11. Para reanudar después, volver a abrir el transmisor y pulsar **Iniciar transmisión**. La clave debe seguir guardada en ese teléfono durante la jornada.

## 4. Funcionamiento del sistema

El sistema mantiene únicamente la posición y estado vigentes en Supabase; no necesita almacenar un historial completo del desplazamiento. El teléfono transmisor envía latitud, longitud, precisión y, cuando el dispositivo los entrega, velocidad y rumbo.

El visor público consulta esa posición y la representa con el símbolo de antorcha. Si no recibe una actualización reciente, cambia el estado a **Señal sin actualizar**.

## 5. Recorrido

- **Tramo de la mañana:** puntos 1 → 22. Salida aproximada a las 8:00 a. m. frente a la Municipalidad de Buenos Aires.
- **Pausa:** al llegar al punto 22.
- **Tramo de la tarde:** salida a la 1:00 p. m. desde el punto 23, Sonador - PINDECO.
- Continúa hasta el punto 37 y retorna por 6 → 5 → 4 → 3 → 2 → 1.
- No existe línea entre los puntos 22 y 23 porque representan dos inicios independientes del recorrido.

## 6. Cartografía

El visor incorpora mapa base OpenStreetMap, recorrido ajustado a la red vial, vías e hidrografía IGN/SNIT, división distrital del cantón de Buenos Aires, localidades de referencia IGN/SNIT y centros educativos MEP/SIGMEP.

## 7. Recomendaciones para el teléfono transmisor

- GPS de alta precisión activo.
- Datos móviles activos.
- Página del transmisor abierta.
- Pantalla encendida durante el recorrido.
- Desactivar ahorro extremo de batería para el navegador.
- Utilizar power bank.
- Tener al menos un teléfono de respaldo previamente configurado con el enlace y la clave.

## 8. Identidad y créditos

Proyecto colaborativo de **Red de Medios de Buenos Aires + GEOIURIS®**.

Desarrollo cartográfico y tecnológico:  
**Geógrafo Roy Castellon Sossa**  
rcastellons@outlook.com

GEOIURIS® © 2026 · Derechos reservados.

# Mejora del asistente de IA (SC-47) — 26-11-2026

Pedido del PO el 26-11-2026: cuando una persona necesita un profesional, el asistente no debe mandarla a filtrar en Profesionales, sino recomendarle un profesional concreto. Si no hay cercanos, primero se pregunta cómo quiere atenderse (presencial u online): presencial muestra el más cercano y, si no hay, se la lleva al buscador con el filtro como antes; online muestra los mejor evaluados. El PO aprobó además las mejoras propuestas: «¿Cómo voy hoy?», valoración de respuestas, sugerencias para seguir, reservar desde el chat y respuesta en vivo, y pidió que el asistente use el perfil solo después de pedir permiso.

Ajuste acordado: la modalidad se pregunta al inicio, cuando la persona no la dijo, porque define qué significa «el mejor» (el más cercano en presencial y el mejor evaluado en online) y evita mostrar primero una tarjeta vacía.

Casos: CP-282 a CP-291 de la Planilla. DAS 1.42 (D48 a D50). Rama `feat/mejora-asistente-ia`.

## Resultados

| Verificación | Resultado |
|---|---|
| Backend (Jest y Supertest) | 760/760 (51 nuevas), lint sin errores |
| Frontend (Vitest y Testing Library) | 599/599 (11 nuevas), build correcto; lint con la advertencia previa de `Mensajes.jsx` |
| `npm run test:mysql:asistente` (MySQL real) | 33 comprobaciones, 11 nuevas de la SC-47: modalidad y orden guardados, online no se ordena por cercanía, valoración, restricciones CHECK, resumen del día, permiso del perfil y «Mis datos» |
| `test:mysql:cuenta`, `comidas`, `mejoras` y `compartir` | Aprobados sin cambios |
| Groq real, 4 consultas | Ninguna respuesta explica cómo filtrar ni nombra profesionales; la respuesta con perfil autorizado tiene en cuenta las alergias |
| Navegador (Playwright) con cuenta temporal | Escritorio 1440 px y celular 390 px, claro y oscuro, sin desborde horizontal. La cuenta temporal se borró al terminar |

## Hallazgos de la revisión y su corrección

- Con las instrucciones originales, Groq respondía «ingresa la especialidad Nutrición y elige la opción online», justo lo que el PO no quería. Se reforzaron las instrucciones («no expliques cómo buscar, filtrar ni usar el buscador»); con 4 consultas reales ya no ocurre (CP-291).
- La pregunta de permiso quedaba como una tarjeta dentro de la burbuja; ahora va sola. La recomendación se separa del texto con una línea en vez de otra tarjeta.
- En el celular, las tarjetas usan todo el ancho del chat, sin el avatar, para que los datos del profesional no se corten.
- El texto de «¿Cómo voy hoy?» repetía las cifras de la tarjeta; ahora resume las calorías y el agua y da el consejo, y la tarjeta muestra el detalle.

## Capturas (`Mejora_Asistente_IA_2026-11-26/`)

| Archivo | Qué muestra |
|---|---|
| `01_permiso_perfil.png` | Antes de empezar, el asistente pide permiso para usar el perfil, con la salud en una casilla aparte |
| `02_presencial_cercanos.png` | Respuesta con Groq real: «abajo tienes opciones»; presencial muestra al profesional más cercano (a 1,1 km) con las pestañas de orden |
| `03_reserva_en_chat.png` | Reserva en el chat: hora elegida, mensaje sugerido con la pregunta, primera visita y modalidad |
| `04_como_voy_hoy.png` | «¿Cómo voy hoy?» con Groq real: resumen y tarjeta con barras frente al plan |
| `05_valoracion_seguimiento.png` | «Me sirvió» marcado en azul con el agradecimiento |
| `06_celular_claro_online.png` y `06_celular_oscuro_online.png` | Celular 390 px: online detectado sin preguntar, los 3 mejor evaluados, en claro y oscuro |

## Privacidad

- Los profesionales recomendados se piden a `GET /api/profesionales` desde el navegador: la ubicación se usa solo para esa búsqueda, queda en memoria y nunca viaja a la IA (D23, D48).
- El resumen del día lo arma el backend: los datos de Comidas y Agua no viajan a la IA (D49).
- El perfil viaja a la IA solo con permiso, y la salud solo con su permiso aparte; nunca el nombre, el correo, el teléfono ni la dirección (D50). Sin permiso, el comportamiento es el de siempre (QS7).

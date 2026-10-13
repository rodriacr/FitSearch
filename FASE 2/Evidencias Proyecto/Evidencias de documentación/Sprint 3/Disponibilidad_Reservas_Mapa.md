# Disponibilidad reservas y mapa del Sprint 3

Estado al 12-10-2026. Implementado en los PR #21 y #22, ambos fusionados en main (el #22 con el merge 662e79c). Rodrigo autorizó completar los pendientes de los Sprints 2 y 3. La aceptación del PO, las horas y las estimaciones no se deducen de las pruebas. Las secciones fechadas más abajo registran cada etapa tal como estaba en ese momento.

## Disponibilidad FS-HU-13

El profesional publica, edita y elimina bloques desde Mi agenda o la pestaña Horarios de su perfil. Fecha y horas se interpretan en America/Santiago, sin convertir la hora publicada según el navegador. Se permiten bloques futuros dentro de 365 días, con inicio anterior al término. Los bloques contiguos son válidos; los superpuestos reciben 409.

Los bloques con historial no se editan: así no cambia la fecha de las reservas. Si todas están canceladas, Retirar horario marca retirado=true, conserva el historial y lo excluye de nuevas reservas y de la comparación de superposición. Con una reserva activa responde 409 y exige cancelarla antes. Los bloques sin historial se eliminan. Retirar y reservar usan el mismo bloqueo del profesional para evitar carreras. El usuario ve solamente bloques futuros libres de profesionales activos.

## Reservas FS-HU-14

Desde la ficha pública, el usuario selecciona un bloque y escribe un mensaje obligatorio de 10 a 500 caracteres. La reserva comienza pendiente. El profesional puede confirmar o cancelar; el usuario puede cancelar su propia reserva. Una cancelada no se reactiva. Los horarios pasados permanecen en el historial y no se modifican.

Una transacción con aislamiento ReadCommitted bloquea primero el profesional y después el bloque. La consulta de reservas activas se realiza bajo bloqueo, antes de insertar: dos solicitudes simultáneas producen una creación 201 y un conflicto 409. Cancelar libera el bloque. El mensaje y los participantes se devuelven solo en el listado privado del usuario o del profesional correspondiente; el listado público no los expone.

La pantalla pide confirmación antes de cancelar. Conserva el mensaje y vuelve a cargar la disponibilidad cuando otro usuario ocupa el bloque. Mis citas muestra las próximas reservas también en Inicio.

## Mapa FS-HU-06

La alternancia Lista/Mapa conserva filtros, búsqueda y página. El mapa muestra los resultados de la página actual; se puede paginar en ambas vistas. Usa Google Maps JavaScript API y AdvancedMarkerElement. Los marcadores abren el nombre, la especialidad y un enlace a la ficha. Las coordenadas corresponden a las fichas públicas; no se envía una posición privada adicional.

El proveedor real se usa configurando VITE_GOOGLE_MAPS_API_KEY en frontend/.env; el 12-10-2026 se comprobó con una Demo Key, sin facturación (ver «Pruebas con proveedores reales»). El SDK se carga únicamente al abrir Mapa. Sin clave o si falla, la lista de resultados continúa disponible y la pantalla ofrece reintentar. Las pruebas automatizadas del mapa usan un SDK simulado; no acreditan por sí solas la conexión real con Google.

Configuración oficial: https://developers.google.com/maps/documentation/javascript/get-api-key y https://developers.google.com/maps/documentation/javascript/advanced-markers/start. Restringir la clave por sitios web autorizados y por Maps JavaScript API. Para desarrollo, VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID; para publicación, configurar el ID de mapa del proyecto. No se activaron cuentas ni facturación.

## SMTP del Sprint 2

La recuperación usa el correo configurado en backend/.env: usuario, contraseña de aplicación y remitente. La dirección del destinatario no reemplaza estas credenciales. El comando npm run smtp:comprobar verifica la configuración y la conexión sin enviar mensajes; termina con código 2 si faltan datos.

Con las credenciales configuradas localmente, ejecutar desde backend:

```powershell
npm run smtp:comprobar
npm run smtp:comprobar -- --destinatario correo-de-prueba@ejemplo.cl --enviar-prueba
```

Reemplazar `correo-de-prueba@ejemplo.cl` por un buzón propio que autorice recibir la prueba. No publicar los .env ni contraseñas en GitHub, Trello o documentación. El 12-10-2026 se comprobaron la entrega real en bandeja y la recuperación completa (ver «Pruebas con proveedores reales»).

## API

Todas las rutas requieren sesión. Disponibilidad propia exige rol profesional; crear reservas exige usuario. Administrador no recibe acceso al mensaje privado por estas rutas.

| Método y ruta | Resultado |
| --- | --- |
| GET /api/disponibilidades | Horarios futuros propios |
| POST /api/disponibilidades | Publicar con fecha, horaInicio y horaFin |
| PUT /api/disponibilidades/:id | Editar un bloque propio sin reservas previas |
| DELETE /api/disponibilidades/:id | Retirar bloque propio sin reservas activas; conservarlo si tiene historial |
| GET /api/profesionales/:id/disponibilidades | Horarios públicos futuros y libres |
| GET /api/reservas | Reservas privadas del participante |
| POST /api/reservas | Reservar con disponibilidadId y mensaje |
| PATCH /api/reservas/:id | Confirmar o cancelar con estado |

La API no acepta usuarioId ni profesionalId del cliente para asignar propiedad. Devuelve 400 ante datos inválidos, 401 sin sesión, 403 ante un rol o propietario incorrecto, 404 si no existe el recurso y 409 ante superposición, ocupación o cambios incompatibles.

## Instalación y validación

Desde backend, ejecutar db:generate y db:migrate antes de iniciar. La migración 20261012010000_disponibilidad_reservas agrega disponibilidades y reservas, con claves foráneas y comprobaciones de horarios y estados. Son doce tablas de dominio implementadas de quince del modelo completo; conversaciones, mensajes y registro_comida siguen previstos.

Validación: 231 pruebas backend en 27 suites y 173 frontend en 23 archivos; lint de ambas capas y build frontend correctos. Se ejecutaron 25 comprobaciones con Express y MySQL reales, incluidas privacidad, superposición, reserva concurrente, confirmación, cancelación y conservación del historial. Las cuentas y bloques temporales de la prueba se eliminaron al finalizar. La evidencia está en Plan de Pruebas/Agenda_MySQL_2026-10-11.json.

Prueba manual recomendada: publicar dos bloques contiguos, rechazar uno superpuesto, reservar como usuario con mensaje, confirmar desde el profesional y cancelar desde el usuario. Comprobar que el bloque vuelve a estar libre y que el historial permanece. Abrir Mapa, alternar a Lista conservando filtros y repetir con clave real cuando esté disponible.

## Publicación y pendientes

Los PR 19 y 20 están fusionados. El PR 20 limita diez cargas por tipo y trámite y determina vigencia mediante IDs. La observación posterior sobre el reinicio reiterado de cuota al cambiar especialidad sigue pendiente: no forma parte de esta implementación de agenda.

El PR #22 se fusionó el 12-10-2026 (merge 662e79c) y el DAS 1.22 con sus diagramas quedó publicado en Drive ese mismo día; falta actualizar los marcos de Miro. SMTP y Maps reales se comprobaron el 12-10-2026. No se declara que los Sprints estén aceptados: quedan el origen OAuth y el ingreso Google real, registro de horas/estimaciones y aceptación del PO.

## Comprobación de dependencias

Se corrigieron las alertas críticas y altas detectadas por npm audit. Backend: proxy-addr actualizado y nodemon sustituido por node --watch (Node 20.13 o superior); npm run dev conserva la recarga automática. Frontend: brace-expansion y source-map-js actualizados. Auditoría completa frontend sin vulnerabilidades, backend sin altas/críticas y producción backend sin vulnerabilidades. Quedan 19 alertas moderadas transitivas de herramientas Jest, derivadas de sprintf-js; no se aplicó la degradación a Jest 25 sugerida por --force. El lint, las 231/172 pruebas y el build se comprobaron después de actualizar.

## Corrección de la revisión del PR 21

12-10-2026: se reemplazó CAST de parámetros TIME por comparación TIME_TO_SEC con segundos numéricos. Se comprobaron el duplicado 09:00–11:00 (409), 10:00–12:00 superpuesto (409), 15:00–15:30 libre (201), bloques contiguos y edición superpuesta. Nueva migración 20261012040000_retirar_disponibilidad, sin borrado de historial. La prueba reproducible npm run test:mysql:agenda ejecuta 39 comprobaciones con MySQL local y elimina únicamente sus datos temporales. Evidencia Agenda_MySQL_2026-10-12.json. Product Backlog conserva íntegramente las notas previas de FS-HU-13/14 y agrega el avance debajo. Drive/Miro esperan la fusión.


## Revisión posterior a la fusión del PR 21

El PR #21 fue aprobado y fusionado el 12-10-2026. El cierre oficial del Sprint 2 se conserva. La siguiente entrega limita a una reserva pendiente o confirmada por usuario con cada profesional, bajo el mismo bloqueo transaccional. Permite otro profesional y vuelve a permitir reservar al cancelar. El listado filtra fecha >= hoy en la consulta y no expone conHistorial públicamente.

MapaProfesionales conserva su instancia al paginar y alternar lista/mapa; reemplaza marcadores y ventanas y limpia la selección anterior. El plazo de 15 segundos no elimina el callback de una descarga tardía; los reintentos comparten el script. Agenda distingue actualización, eliminación y retiro con historial, y limpia el formulario del bloque retirado. Inicio deja de solicitar disponibilidad si ya hay horarios. El comprobador SMTP explica cuándo falta --enviar-prueba y muestra códigos de proveedor sin revelar credenciales.

Validación de esta revisión: 233 pruebas backend en 28 suites, 178 frontend en 24 archivos, 51 comprobaciones MySQL reales; lint y build correctos. SMTP y Maps reales comprobados el 12-10-2026; quedan configuración OAuth/ingreso Google y aceptación del PO. DAS 1.22 y flujo 12 revisado se publican después de fusionar la nueva entrega.

## Pruebas con proveedores reales — 12-10-2026

SMTP real: correo recibido en bandeja, restablecimiento e inicio con contraseña nueva comprobados, contraseña anterior y enlace reutilizado rechazados. Google Maps real: marcadores, selección, filtro Nutrición, lista/mapa y paginación 12/3 comprobados con Demo Key sin facturación. Google Identity bloqueado por origen no autorizado en localhost:5173; autorizar localhost y localhost:5173 en el cliente OAuth y repetir. PR #22/#23 pendientes de fusión, horas y aceptación del PO pendientes. DAS 1.22 y fuentes se publican en Drive/Miro tras la fusión.

Evidencia: ../Plan de Pruebas/Proveedores_Reales_2026-10-12.json y Mapa_Real_Paginacion_2026-10-12.jpg. No contienen claves, tokens ni contraseñas.

## Corrección de la revisión del 12-10-2026 (Rodrigo Cárcamo)

Rodrigo pidió cambios en el PR #22 (commit 0ab6ec3) y los corrigió en la misma rama:

- Límite de reservas (defecto 26): solo cuentan las reservas pendientes o confirmadas de horarios futuros, en hora de Santiago. Las citas que ya pasaron quedan en el historial y no se pueden cancelar, así que antes dejaban al usuario bloqueado para siempre con ese profesional. El 409 del límite incluye `detalles.motivo = limite_por_profesional`.
- Reservar desde la ficha: si ya hay una reserva activa y futura con ese profesional, se avisa antes de escribir el mensaje y se ofrece ir a Mis citas; si igual llega el 409 del límite, se conserva la hora elegida.
- Mapa: con 0 resultados solo se muestra el estado vacío, y mientras está oculto (vista Lista o cargando) no crea marcadores ni ajusta el encuadre; lo hace al mostrarse.
- comprobar-smtp: el error de uso (falta `--enviar-prueba`) ya no muestra el aviso de revisar la contraseña.
- Proveedores_Reales_2026-10-12.json: se corrigieron las tildes mal codificadas.

Validación: backend 233/233, frontend 183/183 (5 pruebas nuevas), 55 comprobaciones con MySQL real (4 nuevas: una cita pasada no cuenta para el límite y el 409 trae su motivo; evidencia en Agenda_MySQL_2026-10-12_PR22.json), lint y build correctos. Revisión en el navegador con datos temporales, eliminados al terminar.

## Estado al cierre del 12-10-2026

- PR #22 aprobado y fusionado en main (merge 662e79c); 55/55 comprobaciones con MySQL real repetidas sobre main.
- Defecto 26 corregido. Casos CP-079 y CP-080 aprobados; la planilla suma 80 casos, con 77 aprobados.
- DAS 1.22, diagramas 07, 12 y 13 y estas evidencias publicados en el Drive del equipo. Falta actualizar los marcos de Miro.
- Pendientes: CP-078 (mapa real sobre main), CP-024 y CP-025 (autorizar el origen localhost en el cliente OAuth y repetir el ingreso con Google), registro de horas del Sprint 3 y aceptación del PO de FS-HU-06, FS-HU-13 y FS-HU-14.

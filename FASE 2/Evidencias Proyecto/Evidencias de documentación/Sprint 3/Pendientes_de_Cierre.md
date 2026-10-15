# Cierre y pendientes de los Sprints 2 y 3

Estado al 12-10-2026. PR #21 aprobado y fusionado en main. La conciliación oficial de Rodrigo está en fcb1346. El Sprint Backlog 2 está cerrado y no se vuelve a editar.

## Publicación aprobada

DAS 1.21 leído y comprobado en Drive. Diagramas 02/03/04/07/08 actualizados conservando sus IDs; flujo 12 creado en Drive/Miro. Product Backlog y Sprint Backlog 3 conservan la conciliación que Rodrigo publicó el 12-10-2026. Trello registra la fusión. No se sustituyeron las planillas oficiales con copias anteriores.

## Nueva revisión desde main

DAS 1.22, UML de componentes y ajustes posteriores al PR #21 preparados en codex/cierre-documentacion-y-ajustes-agenda. Incluye una reserva activa por usuario/profesional; instancia única del mapa y limpieza de selección; mensajes de edición/retiro; SDK tardío sin duplicar scripts; filtro de fecha en MySQL y privacidad de historial; diagnóstico SMTP; tarea de disponibilidad condicionada a horarios reales.

Validación: 233 pruebas backend, 178 frontend, 51 comprobaciones MySQL reales, lint y build. Las suites automatizadas usan transporte/SDK simulados; se añadieron pruebas separadas con SMTP y Google Maps reales el 12-10-2026. Los nuevos cambios y DAS 1.22 se publicarán en Drive/Miro después de su revisión y fusión.

## Dependencias restantes

- SMTP: entrega en bandeja confirmada. Recuperación con MySQL y SMTP reales: solicitud 200, restablecimiento 200, contraseña anterior 401, nueva 200 y enlace reutilizado 400. Cuenta temporal eliminada.
- Maps: Demo Key sin facturación; mapa integrado, marcadores, selección, filtros, lista/mapa y paginación real 12/3 comprobados. Datos temporales eliminados. Juan conserva coordenadas 33,71: corregirlas desde el perfil, sin inventar ubicación.
- Google: el SDK real rechaza http://localhost:5173 por origen OAuth no autorizado. Agregar http://localhost y http://localhost:5173 en el cliente existente y repetir el ingreso; comprobar usuarios de prueba si corresponde.
- Horas: usar los registros oficiales de Rodrigo. La aproximación de siete horas comunicada por Luis no sustituye el desglose real ni modifica el Sprint 2 cerrado.
- Aceptación de historias: corresponde al PO y no se infiere de la fusión técnica.
- La observación anterior del PR #20 sobre cuotas de documentos al cambiar especialidad sigue registrada aparte.

Los destinos y huellas locales están en Manifiesto_Sincronizacion.json. No contiene credenciales ni documentos privados.

Revisión: https://github.com/rodriacr/FitSearch/pull/22 (fusionado el 12-10-2026; ver el estado al cierre al final de este documento).

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

- PR #22 aprobado y fusionado en main (merge 662e79c). PR #23 (diario de Luis) aprobado y fusionado (f6607a5).
- DAS 1.22, diagramas 07, 12 y 13 y las evidencias de esta entrega publicados en el Drive del equipo; el Drive coincide con main. Las secciones anteriores que dicen «después de la fusión» ya se cumplieron, salvo los marcos de Miro, que siguen en la versión 1.21.
- Siguen pendientes: CP-078 (mapa real sobre main), CP-024 y CP-025 (origen OAuth y nuevo ingreso con Google), horas del Sprint 3 y aceptación del PO de las historias en revisión.
- Manifiesto_Sincronizacion.json conserva la sincronización del DAS 1.21 tal como se hizo; no se actualizó para el 1.22.

## Actualización del 15-10-2026 (SC-18)

- PR #27 de Nicolás Silva fusionado en main (merge b10a96a): el mapa pasa de Google Maps a MapLibre GL JS con teselas de OpenFreeMap, sin clave. PR #25 (matriz de trazabilidad) fusionado (merge 9d9a2a3).
- Validación sobre main: backend 233/233, frontend 189/189, lint y build correctos. En Edge se comprobó el componente del mapa con MapLibre y OpenFreeMap reales.
- DAS 1.23 (D31 reemplaza a D8), SC-18 en la Matriz de Control de Cambio, CP-076 a CP-078 y defectos 27 a 29 registrados.
- Pendientes: CP-078 sobre main con sesión de usuario, corrección de los defectos 27 a 29 en un PR siguiente, CP-024 y CP-025, y la aceptación del PO de FS-HU-06. FS-HU-13 y FS-HU-14 se aceptaron el 12-10-2026.

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

Revisión abierta: https://github.com/rodriacr/FitSearch/pull/22. Rodrigo figura como revisor solicitado.

## Pruebas con proveedores reales — 12-10-2026

SMTP real: correo recibido en bandeja, restablecimiento e inicio con contraseña nueva comprobados, contraseña anterior y enlace reutilizado rechazados. Google Maps real: marcadores, selección, filtro Nutrición, lista/mapa y paginación 12/3 comprobados con Demo Key sin facturación. Google Identity bloqueado por origen no autorizado en localhost:5173; autorizar localhost y localhost:5173 en el cliente OAuth y repetir. PR #22/#23 pendientes de fusión, horas y aceptación del PO pendientes. DAS 1.22 y fuentes se publican en Drive/Miro tras la fusión.

Evidencia: ../Plan de Pruebas/Proveedores_Reales_2026-10-12.json y Mapa_Real_Paginacion_2026-10-12.jpg. No contienen claves, tokens ni contraseñas.

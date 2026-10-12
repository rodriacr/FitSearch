# Cierre y pendientes de los Sprints 2 y 3

Estado al 12-10-2026. PR #21 aprobado y fusionado en main. La conciliación oficial de Rodrigo está en fcb1346. El Sprint Backlog 2 está cerrado y no se vuelve a editar.

## Publicación aprobada

DAS 1.21 leído y comprobado en Drive. Diagramas 02/03/04/07/08 actualizados conservando sus IDs; flujo 12 creado en Drive/Miro. Product Backlog y Sprint Backlog 3 conservan la conciliación que Rodrigo publicó el 12-10-2026. Trello registra la fusión. No se sustituyeron las planillas oficiales con copias anteriores.

## Nueva revisión desde main

DAS 1.22, UML de componentes y ajustes posteriores al PR #21 preparados en codex/cierre-documentacion-y-ajustes-agenda. Incluye una reserva activa por usuario/profesional; instancia única del mapa y limpieza de selección; mensajes de edición/retiro; SDK tardío sin duplicar scripts; filtro de fecha en MySQL y privacidad de historial; diagnóstico SMTP; tarea de disponibilidad condicionada a horarios reales.

Validación: 233 pruebas backend, 178 frontend, 51 comprobaciones MySQL reales, lint y build. Las pruebas SMTP utilizan transporte simulado; Maps usa SDK simulado. No acreditan proveedor real. Los nuevos cambios y DAS 1.22 se publicarán en Drive/Miro después de su revisión y fusión.

## Dependencias restantes

- SMTP: host, puerto, usuario y remitente guardados localmente; contraseña de aplicación pendiente. Está autorizado el envío de prueba a lmendezl1999@gmail.com. No se envió correo. Probar autenticación, entrega y recuperación con cuenta temporal; no cambiar contraseñas de cuentas existentes.
- Maps: clave del proyecto y prueba real pendientes. No se activó facturación ni se creó una cuenta.
- Horas: usar los registros oficiales de Rodrigo. La aproximación de siete horas comunicada por Luis no sustituye el desglose real ni modifica el Sprint 2 cerrado.
- Aceptación de historias: corresponde al PO y no se infiere de la fusión técnica.
- La observación anterior del PR #20 sobre cuotas de documentos al cambiar especialidad sigue registrada aparte.

Los destinos y huellas locales están en Manifiesto_Sincronizacion.json. No contiene credenciales ni documentos privados.

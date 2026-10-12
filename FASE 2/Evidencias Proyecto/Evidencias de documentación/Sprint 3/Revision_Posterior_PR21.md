# Ajustes de la revisión posterior al PR 21

Base: main fcb1346, con PR #21 aprobado y fusionado y cierre oficial del Sprint 2. Fecha: 12-10-2026. Esta revisión requiere aceptación técnica antes de publicar DAS 1.22 y las nuevas fuentes en Drive/Miro.

| Observación | Resultado | Comprobación |
| --- | --- | --- |
| Un usuario puede ocupar varios bloques del mismo profesional | Máximo una reserva pendiente o confirmada de un horario futuro por usuario/profesional (las citas pasadas no cuentan); 409 con motivo, bajo bloqueo transaccional | MySQL real: dos bloques concurrentes, confirmada, cancelación y otro profesional |
| Cada actualización crea otra carga de mapa | Instancia conservada al paginar y alternar lista/mapa; solo cambian marcadores y ventanas | Prueba SDK simulado: un constructor, limpieza y selección anterior oculta |
| Retiro durante edición y mensajes incorrectos | Limpia edición; distingue actualizado, eliminado y retirado con historial | Pruebas de Agenda |
| SDK tardío y scripts duplicados | El plazo de pantalla conserva la descarga compartida y callback hasta resolver/error real | Reloj simulado: 15 segundos, reintento, callback tardío y fallo de descarga |
| Listado lee fechas pasadas y revela historial | Consulta fecha >= hoy en Santiago; conHistorial solo en agenda propia | Servicio y API con MySQL real |
| Comprobador SMTP oculta permiso de envío faltante | Explica --enviar-prueba; otros fallos muestran códigos sin datos de autenticación | Transporte simulado sin envío real |
| Inicio pide disponibilidad aunque ya existe | Solo muestra la tarea después de comprobar una agenda vacía; fallo de consulta no afirma que falten horarios | Pruebas del Inicio profesional |

Validación ejecutada: backend 233/233 en 28 suites; frontend 178/178 en 24 archivos; 51 comprobaciones MySQL reales; lint backend/frontend y build frontend correctos. Comandos: npm test; npm run lint; npm run build (frontend); npm run test:mysql:agenda (backend). La prueba real elimina únicamente sus cuentas, bloques y reservas temporales.

Documentación: DAS 1.22, diagrama UML de componentes 13, corrección de dependencia en vista 07 y flujo 12 con límite por usuario/profesional. DAS 1.21 y fuentes aprobadas de #21 publicados en Drive/Miro. Sprint Backlog 2 y conciliación oficial de Rodrigo conservados. Horas y aceptación de historias no se inventan.

Pendientes externos: origen OAuth de Google y repetición del ingreso; revisión/fusión de los PR, horas y aceptación del PO. SMTP y Maps reales comprobados el 12-10-2026; no se activó facturación.

Revisión abierta: https://github.com/rodriacr/FitSearch/pull/22. Rodrigo figura como revisor solicitado.

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

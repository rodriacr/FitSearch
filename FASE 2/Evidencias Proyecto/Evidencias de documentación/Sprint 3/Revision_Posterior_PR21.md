# Ajustes de la revisión posterior al PR 21

Base: main fcb1346, con PR #21 aprobado y fusionado y cierre oficial del Sprint 2. Fecha: 12-10-2026. Esta revisión requiere aceptación técnica antes de publicar DAS 1.22 y las nuevas fuentes en Drive/Miro.

| Observación | Resultado | Comprobación |
| --- | --- | --- |
| Un usuario puede ocupar varios bloques del mismo profesional | Máximo una reserva pendiente o confirmada por usuario/profesional; 409 bajo bloqueo transaccional | MySQL real: dos bloques concurrentes, confirmada, cancelación y otro profesional |
| Cada actualización crea otra carga de mapa | Instancia conservada al paginar y alternar lista/mapa; solo cambian marcadores y ventanas | Prueba SDK simulado: un constructor, limpieza y selección anterior oculta |
| Retiro durante edición y mensajes incorrectos | Limpia edición; distingue actualizado, eliminado y retirado con historial | Pruebas de Agenda |
| SDK tardío y scripts duplicados | El plazo de pantalla conserva la descarga compartida y callback hasta resolver/error real | Reloj simulado: 15 segundos, reintento, callback tardío y fallo de descarga |
| Listado lee fechas pasadas y revela historial | Consulta fecha >= hoy en Santiago; conHistorial solo en agenda propia | Servicio y API con MySQL real |
| Comprobador SMTP oculta permiso de envío faltante | Explica --enviar-prueba; otros fallos muestran códigos sin datos de autenticación | Transporte simulado sin envío real |
| Inicio pide disponibilidad aunque ya existe | Solo muestra la tarea después de comprobar una agenda vacía; fallo de consulta no afirma que falten horarios | Pruebas del Inicio profesional |

Validación ejecutada: backend 233/233 en 28 suites; frontend 178/178 en 24 archivos; 51 comprobaciones MySQL reales; lint backend/frontend y build frontend correctos. Comandos: npm test; npm run lint; npm run build (frontend); npm run test:mysql:agenda (backend). La prueba real elimina únicamente sus cuentas, bloques y reservas temporales.

Documentación: DAS 1.22, diagrama UML de componentes 13, corrección de dependencia en vista 07 y flujo 12 con límite por usuario/profesional. DAS 1.21 y fuentes aprobadas de #21 publicados en Drive/Miro. Sprint Backlog 2 y conciliación oficial de Rodrigo conservados. Horas y aceptación de historias no se inventan.

Pendientes externos: contraseña de aplicación SMTP, recepción y recuperación reales; clave y prueba Google Maps real; aceptación del PO. No se enviaron correos ni se activó facturación.

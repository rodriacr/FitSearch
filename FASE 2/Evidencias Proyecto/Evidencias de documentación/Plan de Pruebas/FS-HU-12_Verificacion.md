# Pruebas de verificación de profesionales

Revisión del PR #19 al 11-10-2026. Incluye el panel autorizado por Rodrigo y las correcciones de su revisión. La aceptación final de FS-HU-12 sigue pendiente del PO. Contrato e instalación: [Panel_Administrador.md](../Sprint%203/Panel_Administrador.md).

## Resultado automatizado

Backend: **213 pruebas en 25 suites aprobadas**. Frontend: **165 pruebas en 21 archivos aprobadas**. Las suites de componentes usan API simulada y las unitarias del backend usan modelos/Prisma simulados; sus resultados no equivalen a ejecución sobre MySQL. El frontend conserva avisos de React `act` en pruebas existentes, sin pruebas fallidas.

## Regresión sobre MySQL y Express reales

La migración correctiva se aplicó mediante `prisma migrate deploy` en MySQL local, con once migraciones en total. Se ejecutaron **49 comprobaciones de API** usando Express, Prisma y almacenamiento reales, sin simular modelos. Se crearon cuentas temporales y se eliminaron exclusivamente sus cuentas y archivos al terminar. No se consultaron servicios externos de acreditación.

| Caso | Resultado esperado y observado |
| --- | --- |
| Ficha nueva | `sin_solicitud`, fuera de Pendientes y sin aumentar el contador |
| Aprobar/rechazar sin envío | 409; no se abre una solicitud por crear la ficha o adjuntar |
| Más de veinte versiones | 22 cargas de título aceptadas; solo último título e identidad actuales visibles |
| Recarga | Dos consultas conservan los mismos adjuntos actuales; no exige repetir cargas |
| Envío explícito | Con RUT e identidad/título actuales, pasa a `pendiente` |
| Rechazo | Cierra el trámite; no permite aprobar de inmediato ni reutilizar documentos antiguos |
| Nueva carga tras rechazo | No abre Pendientes hasta un nuevo envío; después permite aprobación |
| Cambio Nutrición a Kinesiología | Retira verificación, cierra solicitud e invalida documentos de la especialidad anterior |
| Nueva especialidad | Exige documentos nuevos y envío explícito antes de aprobar |
| Revocación | Retira insignia y bloquea aprobar/rechazar hasta otra solicitud |
| PATCH compatible | Requiere solicitud enviada y documentos actuales; no aprueba una revocación cerrada |

Los eventos identifican las nuevas cargas por ID, incluyendo cargas y cierres en el mismo segundo de MySQL. La cobertura unitaria comprueba además revisión concurrente, cuenta desactivada y permisos. La cobertura de componentes comprueba adjuntos persistentes al reabrir, solicitud incompleta bloqueada, bloques separados, formato del RUT y ausencia de decisiones sobre `sin_solicitud`.

## Comprobaciones de permisos y revisión manual

Se conservan los resultados manuales informados por Luis antes de esta revisión: 200 al verificar como administrador, 401 sin sesión, 403 con usuario/profesional, 400 con ID inválido y 404 con profesional inexistente; insignias visibles en perfil y listado. Posteriormente se confirmó manualmente rechazo, revocación y reenvío. El endpoint original ahora exige trámite y documentos; los ejemplos antiguos de aprobación por ID sin esos requisitos quedan sustituidos por el contrato actual.

Las comprobaciones visuales previas cubrieron escritorio de 1440 px, móvil de 390 px, encabezado fijo, menú y formularios. No prueban un despliegue de producción ni aceptación del PO. Para otra revisión manual: crear ficha sin enviar, adjuntar y recargar, enviar, rechazar, subir documentos nuevos, reenviar, aprobar, cambiar especialidad y comprobar el retiro de la insignia y el bloqueo hasta nuevo envío.

## Seguimiento

El PR #19 continúa en revisión contra main; el #16 está fusionado y el #17 cerrado sin fusionar. DAS 1.19 y flujo 11 preparados localmente. Drive se sincroniza solo después de la fusión, conforme a la indicación del revisor. No se marca la historia aceptada por resultados de pruebas.

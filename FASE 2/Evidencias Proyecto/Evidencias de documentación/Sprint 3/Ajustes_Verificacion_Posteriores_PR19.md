# Ajustes posteriores a la revisión del PR 19

Seguimiento del 11-10-2026. El PR #19 está aprobado y fusionado en main. Estos cambios implementan sus tres observaciones no bloqueantes en una rama separada; no modifican la aceptación de FS-HU-12 ni su planificación.

## Control de cargas

Cada tipo (identidad, título y antecedentes) admite diez cargas por trámite, de hasta 5 MB por archivo. Los cupos son independientes: alcanzar el del título no impide cargar identidad ni enviar una solicitud completa con sus últimos adjuntos vigentes. Una carga que excede el cupo responde 409 y el servicio elimina el archivo temporal de esa carga fallida.

El trámite se cuenta desde el último rechazo, revocación o cambio de especialidad. Reenviar sin una de esas decisiones no reinicia el cupo; un cierre inicia un ciclo nuevo. El contador usa IDs distintos del historial del ciclo. Antes del primer cierre, los documentos sin historial previo también se cuentan por compatibilidad. Las versiones antiguas de ciclos cerrados no consumen los cupos actuales. Los archivos históricos se conservan; no se introduce una purga retroactiva ni una política institucional de retención. Se limita el crecimiento por trámite, no el acumulado de todos los trámites de una cuenta.

Certificaciones informa el cupo en cada apartado y conserva los adjuntos vigentes al recargar.

## Vigencia por ID

Después de un cierre, un documento solo es vigente si su `documentoId` aparece en un evento de carga posterior a ese cierre. Se elimina la comparación con `fechaCreacion`. Una fecha redondeada por MySQL no puede reactivar un archivo anterior ni excluir una nueva carga del mismo segundo. Solo se muestra el último ID de cada tipo.

## Fichas sin solicitud

El listado administrativo Todos muestra «Sin solicitud» para `sin_solicitud`. Cambiar la especialidad antes de postular mantiene ese estado y no genera motivo de rechazo. La API oculta además motivos antiguos de fichas sin solicitud, tanto en Certificaciones como en los datos administrativos.

## Validación y publicación

217 pruebas backend en 25 suites y 166 frontend en 21 archivos aprobadas; lint de ambas capas y build correctos. Se realizaron 38 comprobaciones sobre Express, Prisma, almacenamiento y MySQL reales, incluyendo cupo del título, identidad cargada después de alcanzar ese cupo, recarga, envío y nuevo ciclo tras rechazo. Solo los datos temporales de la prueba se eliminaron.

No requiere migraciones. Drive/Miro conservan el DAS 1.19 y flujo 11 aprobados del #19. Tras aprobar esta entrega se incorporará el cupo en el DAS y se sincronizará su publicación; las observaciones sobre ID y etiquetas no cambian entidades ni conexiones de los diagramas.

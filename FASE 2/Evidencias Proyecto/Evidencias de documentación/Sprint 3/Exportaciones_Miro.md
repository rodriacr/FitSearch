# Diagramas y exportaciones de Miro

DAS local 1.20 en revisión al 11-10-2026. Los PR #19 y #20 están fusionados; Drive/Miro conservan la publicación aprobada 1.19. Esta rama agrega disponibilidad, reservas y mapa/lista. Sus fuentes se publicarán después de fusionar el nuevo PR, conservando enlaces y versiones históricas.

| Número | Marco publicado | Cambio local para el PR #21 |
| --- | --- | --- |
| 01 | [Casos de uso](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777496) | Estructura vigente; sin cambios en esta corrección |
| 02 | [Clases del dominio](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777497) | Estructura vigente; sin cambios en esta corrección |
| 03 | [DER completo](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777498) | Estructura vigente; sin cambios en esta corrección |
| 04 | [DER implementado](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777499) | Local: doce tablas; publicación pendiente de fusión |
| 06 | [Elección de perfil y asistente](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686730989749) | Estructura vigente; sin cambios en esta corrección |
| 07 | [Vista de desarrollo](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777500) | Local: agenda, reservas y Maps; publicación pendiente de fusión |
| 08 | [Vista física](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777501) | Local: doce tablas y Maps pendiente de clave; publicación pendiente de fusión |
| 11 | [Verificación administrativa](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777502) | Flujo publicado vigente; cuota del PR #20 registrada en DAS local |
| 12 | Marco pendiente de crear tras fusión | Fuente local: disponibilidad y reserva concurrente comprobadas con MySQL |

## Archivos y cambios

Las fuentes MMD y exportaciones SVG/PNG están en `Diagramas (Miro)/Actualización Sprint 3/`. Se generan desde la misma fuente; son exportaciones locales, no capturas nativas de Miro. Las adaptaciones legibles para Word se conservan en `Presentacion_DAS/`.

El flujo 11 documenta `sin_solicitud` antes de enviar, preservación de adjuntos actuales al recargar, último archivo por tipo y documentos nuevos tras rechazo, revocación o cambio de especialidad. Solo enviar entra a Pendientes. Los documentos históricos no bloquean nuevas cargas por el antiguo límite global de veinte.

La revisión local actualiza 04, 07 y 08 para doce tablas implementadas de quince, agenda, reservas y mapa integrado con prueba real pendiente de clave. El modelo completo 02/03 sigue incluyendo conversaciones, mensajes y alimentación como capacidades futuras. 06 conserva el nuevo ingreso tras 409. Los diagramas 05, 09 y 10 permanecen como antecedentes en Sprint 2. El nuevo `12_Disponibilidad_y_Reservas` describe la implementación comprobada con MySQL real. Las exportaciones antiguas se conservan como historial.

Tras la fusión del nuevo PR: actualizar 04/07/08, agregar el marco 12 y sincronizar fuentes, imágenes y DAS en Drive. El flujo 11 sigue vigente; el DAS registra ahora la cuota de diez cargas por tipo y trámite aprobada en #20. Las aceptaciones de historias corresponden al PO; SMTP y Google Maps reales requieren configuración.

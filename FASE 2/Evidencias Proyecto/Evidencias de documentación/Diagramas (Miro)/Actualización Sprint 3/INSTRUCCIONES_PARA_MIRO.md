# Diagramas de FitSearch

## Versión vigente: DAS 1.18 · panel administrativo · 10-10-2026

La ampliación del PR #17 incorpora Dashboard, Profesionales, Verificaciones, Usuarios y Reportes. Configuración y Contenido quedan fuera del alcance autorizado. Revisión/fusión del PR y aceptación de FS-HU-12 siguen pendientes del PO; la planificación del backlog conserva Sprint 5.

Se actualizaron 01–04, 07 y 08 y se añadió 11. El modelo completo comprende 15 tablas: 10 implementadas en esta rama y 5 previstas. Se documentan cuenta activa y versión de sesión, documentos privados y metadatos, RUT, historial y revisión concurrente, rechazo/reenvío/revocación y reportes con datos existentes. El flujo 06 se conserva sin cambios.

Los nuevos marcos se crearon en Miro conservando los anteriores como historial. Los PNG/SVG locales se renderizaron desde las fuentes actualizadas; no son exportaciones nativas de los nuevos marcos de Miro. Se contrastaron las entidades y conexiones del tablero mediante su SVG. Exportar los nuevos marcos desde Miro es opcional para conservar además su disposición visual nativa.

- [DAS 1.18 · 01 Casos de uso](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777496)
- [DAS 1.18 · 02 Clases del dominio](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777497)
- [DAS 1.18 · 03 DER completo: 15 tablas](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777498)
- [DAS 1.18 · 04 DER implementado: 10 tablas](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777499)
- [DAS 1.18 · 07 Vista de desarrollo](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777500)
- [DAS 1.18 · 08 Vista física](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777501)
- [DAS 1.18 · 11 Verificación administrativa](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777502)
- [06 Elección de perfil y asistente: se conserva](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686730989749)

El DAS incluye vistas resumidas de asociaciones de clases y relaciones de tablas para facilitar la lectura en Word. Los campos completos permanecen en el diccionario y en las fuentes integrales 02/04. Las adaptaciones de presentación se conservan en `Presentacion_DAS/`. Las fuentes y las imágenes actualizadas se sincronizan en la carpeta existente de Drive; se conservan los IDs de los archivos que ya existían.

## Historial: colección del DAS 1.17


En Miro hay siete marcos nuevos titulados **Sprint 3 · 01/02/03/04/06/07/08 · … · 10-10-2026**. Exportar esos siete marcos como PNG, preferiblemente a máxima resolución. Los anteriores se conservan como historial.

| Diagrama | Versión vigente y alcance |
| --- | --- |
| 01 Casos de uso | Sprint 3: Inicio y búsqueda, comparación y valoración. Administración parcial; IA, alimentación y reservas previstas. |
| 02 Clases | Sprint 3: Favorito, Resena y rolConfirmado. |
| 03 DER completo | Sprint 3: modelo objetivo de 14 tablas, 9 implementadas y 5 previstas. |
| 04 DER implementado | Sprint 3: 9 tablas de dominio; excluye la tabla interna de migraciones. |
| 05 Recuperación | Sprint 2: se conserva. |
| 06 Elección y asistente | Sprint 3: ante 409 descarta sesión/JWT y pide otro ingreso; asistente de cuatro pasos, reanudación y edición. |
| 07 Desarrollo | Sprint 3: componentes actuales, Prisma compartido, verificación en profesional y Open-Meteo. |
| 08 Física | Sprint 3: 9 tablas actuales; Docker/Nginx son despliegue objetivo. Maps y Claude previstos. |
| 09 Reserva y 10 Estados | Sprint 2: diseños previstos, pendientes de implementación. |

El DAS usa 01, 02, 04, 06, 07 y 08. El DER completo 03 es una referencia adicional. Las fuentes Mermaid se mantienen en archivos MMD; Miro puede darles otra disposición visual, conservando las mismas entidades, mensajes y relaciones. FS-HU-12 sigue parcial hasta definir el alcance administrativo.

## Historial: DAS v1.15 · 08-10-2026

Preparado el 08-10-2026 para **Luis Méndez**.

El 08-10-2026 el tipo de cuenta salió del asistente de perfil: se elige una sola vez en la pantalla "Elegir perfil" y el profesional tiene su propio espacio con un Inicio que muestra el clima (DAS, decisiones D25 y D26). Cambiaron dos diagramas más:

| Diagrama | Qué cambió | Ilustración del DAS |
|---|---|---|
| 06 Secuencia: elegir perfil y asistente | Reemplaza al asistente de 5 pasos: primero "Elegir perfil" (PUT /api/perfil/tipo-cuenta, una sola vez, 409 si ya se eligió); el profesional va directo a su Inicio y el usuario sigue con un asistente de 4 pasos. Archivo nuevo: `06_Secuencia_Elegir_Perfil_y_Asistente` (PNG, SVG y MMD). | Ilustración 6 |
| 08 Vista física | Nodo nuevo Open-Meteo (HTTPS desde el backend, sin clave, caché de 30 minutos). El modelo completo contiene 14 tablas; la versión del 10-10-2026 distingue las 9 implementadas. | Ilustración 10 |

**Tarea:** en el tablero **FitSearch Architecture**, actualizar el marco 06 (se puede pegar el código MMD) y agregar el nodo Open-Meteo al marco 08. Exportar ambos como PNG y avisar a Rodrigo si quedó alguna diferencia.

---

# Diagramas del DAS v1.14: cambios para pasar a Miro

Preparado el 03-10-2026 para **Luis Méndez**.

El 03-10-2026 se implementaron el Inicio con sesión, la búsqueda avanzada de profesionales, los favoritos y las reseñas (FS-HU-21 a FS-HU-24, más la cercanía de FS-HU-05). Eso cambió cuatro diagramas del DAS. Esta carpeta trae su versión nueva en PNG, SVG y, cuando corresponde, código Mermaid (MMD). Los demás diagramas siguen como están en `Actualización Sprint 2`.

| Diagrama | Qué cambió | Ilustración del DAS |
|---|---|---|
| 01 Casos de uso | CU-01 suma "ver el Inicio" (FS-HU-20 y FS-HU-21). CU-03 pasa a "Buscar, comparar y valorar profesionales y establecimientos" (FS-HU-22, FS-HU-23 y FS-HU-24). | Ilustración 1 |
| 02 Clases | Clases nuevas Favorito y Resena; Profesional suma comuna, modalidad y calificacionPromedio(); Usuario suma rolConfirmado. | Ilustración 2 |
| 03 Modelo de datos completo | Tablas nuevas favoritos y resenas; columnas comuna y modalidad en profesionales y rol_confirmado en usuarios. | (solo en Miro) |
| 04 Modelo físico implementado | Ahora tiene las nueve tablas creadas hasta el Sprint 3: se agregan profesionales, establecimientos, favoritos y resenas, y rol_confirmado. | Ilustración 4 |

**Tarea:**
1. En el tablero **FitSearch Architecture** (https://miro.com/app/board/uXjVHtdZChE=/), actualizar los marcos 01, 02, 03 y 04. En el 01 basta con cambiar los textos de CU-01 y CU-03. En el 02, 03 y 04 se puede pegar el código MMD si Miro permite crear el diagrama desde Mermaid.
2. Exportar los marcos como PNG y avisar a Rodrigo si quedó alguna diferencia, para reemplazar las ilustraciones del DAS.

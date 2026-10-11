# Auditoría de diagramas y DAS

Estado al 11-10-2026: DAS local **1.19**, preparado para el PR #19. El PR #16 está fusionado; las correcciones de revisión administrativa siguen pendientes de aprobación. Drive y Miro mantienen la publicación anterior hasta la fusión. Las versiones históricas se conservan, pero no representan el estado actual del código.

## Inventario vigente

| Diagrama | Contenido y estado |
| --- | --- |
| 01 Casos de uso | Panel administrativo autorizado y funciones del modelo completo; Configuración y Contenido fuera del alcance |
| 02 Clases | Cuenta activa, versión de sesión, verificación y documentos privados; incluye entidades previstas |
| 03 DER completo | 15 tablas: 10 implementadas y 5 previstas |
| 04 DER implementado | 10 tablas de dominio; `_prisma_migrations` no entra en el conteo |
| 05 Recuperación | Vigente desde Sprint 2; duración por defecto configurable y SMTP sujeto a configuración |
| 06 Elección de perfil y asistente | Vigente: 409 descarta sesión y exige nuevo ingreso; presentación del DAS en tres partes |
| 07 Desarrollo | React/Vite, Express, rutas administrativas, servicios, modelos y Prisma compartido; Open-Meteo |
| 08 Física | Distingue desarrollo local y despliegue objetivo; almacenamiento documental privado |
| 09 Reservas | Diseño previsto de disponibilidad/reservas, sin implementación declarada |
| 10 Estados de reserva | Modelo previsto de FS-HU-14 |
| 11 Verificación administrativa | Actualizado localmente: ficha `sin_solicitud`, envío explícito, adjuntos vigentes persistentes y cierre por rechazo/revocación/cambio de especialidad |

Las correcciones del PR #19 no añaden entidades ni campos: cambian el valor por defecto de `estado_verificacion` y las reglas del trámite. Por ello 01–04, 06–08 conservan su estructura; se actualiza el flujo 11 y los textos del DAS. No se requieren nuevos diagramas de reservas, IA, Maps ni despliegue por esta corrección.

## Coherencia documental

El DAS distingue capacidades implementadas y previstas. Certificaciones conserva el último documento vigente de cada tipo al recargar; los archivos anteriores a un cierre no sirven para el trámite siguiente. El cambio de especialidad invalida la verificación y los documentos. Solo un envío explícito entra a Pendientes; aprobar y rechazar requieren solicitud pendiente y revisión vigente. Se elimina el bloqueo global de veinte versiones históricas.

La imagen del flujo 11 incrustada en el DOCX se sustituye por el PNG generado desde su fuente local. Los otros diagramas conservan sus imágenes verificadas y las adaptaciones de presentación en `Presentacion_DAS/`. Los documentos de seguimiento utilizan redacción impersonal y separan pruebas simuladas de la regresión de MySQL real.

## Publicación y límites

Las fuentes locales y exportaciones PNG/SVG son la preparación del PR; no se afirma que esta revisión esté publicada en Drive. La sincronización posterior a la fusión debe preservar los IDs/enlaces existentes y contrastar el DAS y flujo 11 con los archivos locales. La aprobación del PR tampoco equivale por sí sola a aceptación de FS-HU-12.

Fuentes: esquema Prisma, migraciones, rutas/servicios/modelos, Certificaciones, PanelAdministrador, DAS local y [Exportaciones_Miro.md](Exportaciones_Miro.md). Los antecedentes detallados de auditoría permanecen disponibles en el historial Git.

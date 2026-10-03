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

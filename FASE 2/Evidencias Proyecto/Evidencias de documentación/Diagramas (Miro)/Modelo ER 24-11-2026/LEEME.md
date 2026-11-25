# Modelo entidad-relación al 24-11-2026

Seis diagramas por módulo, generados desde `backend/prisma/schema.prisma` (32 tablas) para el Manual Técnico (sección 7).
Cada `.mmd` es el código Mermaid (`erDiagram`) del `.png` correspondiente; muestran solo las claves (PK, FK, UK).
El detalle de todas las columnas está en el diccionario de datos del Manual Técnico (sección 8).

| Archivo | Módulo |
|---|---|
| er_1_cuentas | Cuentas, perfiles y acceso |
| er_2_profesionales | Profesionales, verificación y favoritos |
| er_3_agenda | Agenda, reservas y reseñas |
| er_4_mensajes | Mensajes y progreso compartido |
| er_5_asistente | Asistente de IA y registro de alimentación |
| er_6_planes | Planes, metas y peso |

Incluye las tablas del 24-11-2026 (`registros_peso`, `planes_comida`, `plan_comida_items`, `permisos_compartir` y
`accesos_compartidos`), que aún no están en las ilustraciones del DAS (27 tablas).

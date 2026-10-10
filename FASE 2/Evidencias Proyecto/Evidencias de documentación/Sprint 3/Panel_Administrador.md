# Panel del administrador · avance del 10-10-2026

Rodrigo autorizó la vista administrativa. El alcance confirmado incluye Dashboard, Profesionales, Verificaciones, Usuarios y Reportes; excluye Configuración y Contenido. El mockup recibido se conserva en `Mockups del Product Owner/mockup_administrador_10-10-2026.jpg`.

## Implementación actual

Preparé una rama separada, `codex/panel-administrador`, a partir de los cambios del PR #16, todavía pendiente de fusión. No añadí el panel al PR #16.

- Entrada del administrador a `/admin/dashboard`, navegación propia, menú móvil y cierre de sesión.
- Dashboard con totales actuales, registros de los últimos 7, 30 o 90 días, gráfico y tabla de registros diarios. El período está expresado en UTC.
- Listado paginado de profesionales con búsqueda por nombre, especialidad y comuna; filtros de pendientes y verificados.
- Detalle de la ficha con correo, especialidad, comuna, modalidad y descripción. La aprobación pide confirmación y usa el endpoint administrativo existente; el resultado se vuelve a consultar al servidor.
- Listado paginado de usuarios con búsqueda por nombre/correo y filtro por rol.
- Reportes de registros con período seleccionable, gráfico y tabla. Los totales actuales están diferenciados de los registros del período.
- Consultas en `/api/administrador` protegidas con autenticación y rol administrador. Uso Prisma compartido y selecciono explícitamente los datos necesarios; no devuelvo contraseñas, identificadores de Google ni información de salud.

Las cifras del mockup son ilustrativas. No las incorporé como datos de la plataforma. Los registros cuentan la creación de cuentas y su rol actual; las fichas sin verificar no equivalen a solicitudes documentales con fecha de envío.

## Reglas pendientes de confirmar

El mockup muestra acciones y datos que el modelo actual no contempla. Consulté cómo debe funcionar:

1. **Rechazo:** motivo obligatorio o no, si puede volver a solicitarse, efecto sobre una ficha ya verificada y comunicación al profesional.
2. **Documentos/RUT:** qué se solicita, dónde lo carga el profesional, quién puede acceder y cómo se conserva el historial de revisión.
3. **Usuarios activos/inactivos:** efecto de desactivar una cuenta, tratamiento de sesiones existentes y posibilidad de reactivación.
4. **Reportes de ingresos/contactos:** no existen cobros ni registros de contactos en el sistema actual; falta definir la fuente de esos indicadores.

No implementé cambios de estado ni documentos simulados. La consulta de usuarios funciona; la desactivación y el rechazo siguen pendientes. Esta entrega todavía no completa todo el mockup ni la aceptación final de FS-HU-12.

## Validación del avance

- Backend: 179 pruebas en 20 suites aprobadas; lint correcto.
- Frontend: 149 pruebas en 20 archivos aprobadas; lint y build correctos.
- Navegador: cinco vistas en escritorio (1440 px) y móvil (390 px), menú móvil y aprobación comprobados con API simulada; sin errores de JavaScript ni desbordamiento horizontal. Corregí el tamaño del logo en móvil.
- MySQL local: consultas reales de resumen, listado de usuarios y filtro de profesionales pendientes ejecutadas sin modificar datos. En esa base había 4 usuarios y ninguna ficha pendiente. No ejecuté una aprobación real en esta continuación.
- Pruebas cubren 401/403 para las nuevas consultas, filtros inválidos, paginación, datos excluidos de las respuestas, 400/404 de detalle, confirmación de aprobación y recuperación tras error.

La revisión de permisos de sesión y aprobación existentes se mantiene; no hay una ruta pública para asignar el rol administrador.

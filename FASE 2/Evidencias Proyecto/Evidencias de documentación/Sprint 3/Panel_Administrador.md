# Panel del administrador

Entrega del PR #19, rama `codex/panel-administrador`, revisada el 11-10-2026. Rodrigo autorizó Dashboard, Profesionales, Verificaciones, Usuarios y Reportes y delegó las reglas de documentos, rechazo y desactivación. Configuración y Contenido quedan fuera. La aprobación técnica y la aceptación de FS-HU-12 siguen pendientes; su planificación conserva Sprint 5. El mockup se conserva en `Mockups del Product Owner/`.

## Solicitud y decisiones

Una ficha nueva comienza en `sin_solicitud`: no aparece en Pendientes ni incrementa su contador. Adjuntar documentos tampoco envía una solicitud. Solo «Enviar solicitud a revisión», con RUT válido y los documentos obligatorios, cambia el estado a `pendiente`.

La aprobación requiere solicitud pendiente, cuenta activa, revisión vigente, identidad y título actuales. Rechazar o revocar exige un motivo de 5 a 500 caracteres y cierra el trámite. Se retira la insignia y los documentos del ciclo anterior dejan de contar. El administrador no puede aprobar ni rechazar nuevamente hasta otro envío explícito del profesional. Cambiar la especialidad invalida los documentos anteriores; si estaba verificado o pendiente, cierra la solicitud como una revocación y exige documentos de la nueva especialidad.

Cada edición, carga o decisión incrementa la revisión. Una decisión sobre una versión anterior recibe 409. Las decisiones registran acción, fecha y administrador; el cambio de especialidad queda identificado en el historial. No hay acreditación externa automática de títulos.

## Certificaciones y documentos privados

La pantalla presenta bloques independientes para identidad y título obligatorios y antecedentes opcionales. Los botones de carga son azules y el envío final es naranjo. Seleccionar un archivo no lo sube: se utiliza «Adjuntar documento». Se admiten PDF, JPG y PNG válidos de hasta 5 MB, con comprobación de firma. El RUT agrega el guion antes del dígito verificador y mantiene su validación.

Recargar conserva los documentos vigentes y muestra únicamente el último de cada tipo. Reemplazar uno no acumula versiones en pantalla. Tras rechazo, revocación o cambio de especialidad, los apartados no muestran los archivos anteriores y exigen nuevas subidas. Las versiones históricas privadas no consumen cupos del trámite actual: desaparece el bloqueo global de veinte archivos. El historial conserva los eventos, pero no se ofrece una lista de versiones antiguas.

Solo el propietario y el administrador pueden descargar documentos con sesión vigente. Los archivos usan UUID fuera de carpetas públicas y de Git; MySQL guarda metadatos. Las respuestas no publican rutas internas, usan descarga adjunta y `nosniff`, sin caché compartida. No se incluyen antivirus, correo automático ni borrado documental desde el panel. En despliegue, `VERIFICATION_STORAGE_DIR` debe apuntar a almacenamiento persistente restringido, con respaldo junto a MySQL y HTTPS.

## Panel y cuentas

El administrador entra a `/admin/dashboard`. El encabezado permanece visible al desplazar y el menú móvil permite cierre con Escape. Dashboard y Reportes muestran datos existentes de los últimos 7, 30 o 90 días: registros, profesionales y verificaciones. El período usa UTC y los roles actuales. No se presentan cobros ni contactos ficticios.

Profesionales y Verificaciones permiten búsqueda, paginación, filtros y detalle con Información, Documentos e Historial. Usuarios permite búsqueda por rol/estado y desactivación reversible con confirmación. Desactivar bloquea el ingreso y las sesiones anteriores; reactivar exige nuevo ingreso. Los profesionales desactivados salen del directorio público. Las cuentas administrativas están protegidas de desactivación desde el panel.

## Instalación

Desde backend:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

En Windows se detiene primero la API si Prisma no puede sustituir su DLL. La migración `20261010203000_panel_administrativo` añade los datos administrativos. La nueva `20261011010000_solicitud_verificacion_explicita` cambia el valor por defecto y corrige pendientes sin envío válido, conservando fichas verificadas y solicitudes realmente enviadas. Se aplicó correctamente en MySQL local; hay once migraciones.

Para promover una cuenta existente, activa e independiente del rol profesional:

```powershell
npm run admin:promover -- --correo correo-de-la-cuenta --confirmar
```

La herramienta invalida sesiones anteriores y no imprime contraseñas. El registro público no permite elegir administrador.

## Contrato y arquitectura

Las rutas delegan en servicios y estos en modelos con Prisma compartido. La sesión contrasta cuenta activa y versión de sesión en cada petición.

| Ruta | Uso |
| --- | --- |
| GET `/api/administrador/resumen` | Totales y registros; días 7/30/90 |
| GET `/api/administrador/usuarios` | Búsqueda, rol, estado y paginación |
| PATCH `/api/administrador/usuarios/:id/estado` | Activación reversible |
| GET `/api/administrador/profesionales` | Búsqueda, estado y paginación |
| GET `/api/administrador/profesionales/:id` | Información, documentos actuales e historial |
| POST `/api/administrador/profesionales/:id/decision` | Aprobar/rechazar/revocar; revisión y motivo |
| GET/POST `/api/verificaciones/mi-solicitud` | Consultar y enviar solicitud propia |
| POST `/api/verificaciones/documentos` | Binario privado; tipo y nombre en query |
| GET `/api/verificaciones/documentos/:id` | Descarga privada autenticada |
| PATCH `/api/profesionales/:id/verificar` | Compatibilidad: requiere solicitud pendiente y documentos actuales; respuesta `{ id, verificado: true }` |

## Validación y publicación

213 pruebas backend en 25 suites y 165 frontend en 21 archivos aprobadas. La regresión adicional sobre Express y MySQL reales completó 49 comprobaciones, incluidas 22 cargas sucesivas del título, recarga, rechazo, reenvío, cambio de especialidad y endpoint compatible. Las cuentas y archivos temporales se eliminaron al terminar. Los casos y límites están en [FS-HU-12_Verificacion.md](../Plan%20de%20Pruebas/FS-HU-12_Verificacion.md).

El PR #16 está fusionado. El #17 quedó cerrado sin fusionar al desaparecer su rama base; la entrega continúa en el [PR #19](https://github.com/rodriacr/FitSearch/pull/19), dirigido a main. El DAS local 1.19 y flujo 11 reflejan estas correcciones. Drive y Miro conservan la publicación anterior; su sincronización se realizará después de fusionar el PR, conforme a la revisión de Rodrigo.

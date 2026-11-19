# Manual Técnico General — FitSearch

Versión 1.0 · corte 16-11-2026 · Sprint 5 · Duoc UC, sección 003D.

Documento de instalación local, arquitectura, configuración, operación y pruebas. Complementa [Manual_Tecnico_Despliegue_Docker.docx](Manual_Tecnico_Despliegue_Docker.docx), versión 1.1, que describe los contenedores. El modelo de datos y las decisiones de arquitectura se mantienen en el DAS 1.35. Estado: preparado para revisión del equipo y del PO; no acredita por sí mismo el cierre del sprint.

## 1. Arquitectura y límites

El navegador ejecuta una aplicación React con Vite. En desarrollo, Vite recibe las llamadas relativas a `/api` y las reenvía a Express en el puerto 3000. En Docker, Nginx sirve el frontend y cumple esa misma función de proxy. Express aplica autenticación y validaciones y delega en servicios de negocio; los modelos usan Prisma sobre MySQL 8. Los datos privados de verificación se almacenan fuera del frontend.

| Componente | Responsabilidad y ubicación dentro del sistema |
|---|---|
| `frontend/src/pages`, `components` | Pantallas y componentes de usuario, profesional y administrador |
| `frontend/src/context`, `services` | Sesión, cliente HTTP, navegación, formatos y validaciones |
| `backend/src/routes`, `controllers` | Rutas y coordinación de las solicitudes |
| `backend/src/middlewares`, `validators` | Sesión, rol, datos de entrada y errores |
| `backend/src/services`, `models` | Reglas de negocio y persistencia |
| `backend/prisma` | Esquema, migraciones versionadas y datos iniciales |
| `shared/reglas.json`, `regiones.json` | Límites y catálogos compartidos; regiones y comunas |

Los roles son `usuario`, `profesional` y `administrador`. Las reservas y mensajes exigen pertenencia, además de rol. La transacción de reservas evita que un bloque tenga dos reservas activas. Los cambios del plan de alimentación se aplican por fecha y conservan el historial. Las fechas de negocio utilizan `America/Santiago`.

FitSearch no procesa pagos: el precio del profesional es referencial. El asistente ofrece orientación general. El despliegue documentado sirve para desarrollo y demostración; la publicación con dominio y HTTPS requiere una configuración de infraestructura adicional.

## 2. Repositorio y requisitos locales

Repositorio: https://github.com/rodriacr/FitSearch. El código está en `FASE 2/Evidencias Proyecto/Evidencias de sistema/`; la documentación en la carpeta hermana `Evidencias de documentación/`. Las historias y el Product Backlog están en FASE 1. La Guía 2.4 enviada se conserva sin alteraciones.

Para ejecutar sin contenedores: Node.js compatible con `engines` de ambos `package.json`, npm y MySQL 8. En esta revisión las pruebas se ejecutaron con Node.js 24. Usar los `package-lock.json` versionados. Para Docker, seguir el manual específico y sus requisitos.

Desde una copia nueva, en PowerShell:

```powershell
git clone https://github.com/rodriacr/FitSearch.git
Set-Location 'FitSearch/FASE 2/Evidencias Proyecto/Evidencias de sistema'
```

En una copia existente con cambios, revisar `git status` y conservar el trabajo antes de actualizarla. Las instrucciones de instalación no requieren descartar archivos locales.

## 3. Base de datos e instalación local

En MySQL Workbench, ejecutar el contenido de `backend/prisma/crear_base_datos.sql` con permisos de administración, completando los valores de ejemplo en una consulta temporal. Crea `fitsearch`, la base auxiliar `fitsearch_shadow` y el usuario de aplicación. No guardar credenciales reales en el SQL versionado. La base auxiliar se utiliza para generar migraciones en desarrollo.

Primera terminal, desde la carpeta del sistema:

```powershell
Set-Location backend
npm ci
Copy-Item .env.example .env
# Completar .env antes de los comandos siguientes.
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

`db:migrate` aplica migraciones pendientes; `db:seed` carga los roles de forma repetible. No importa automáticamente las cuentas que existan en otra instalación. Una base local y el volumen MySQL de Docker son almacenamientos diferentes. Para transferir cuentas se necesita un respaldo y restauración explícitos, conservando también los documentos privados relacionados.

Segunda terminal, desde la carpeta del sistema:

```powershell
Set-Location frontend
npm ci
Copy-Item .env.example .env
# Completar el ID de Google si se utilizará ese acceso.
npm run dev -- --port 5173 --strictPort
```

Abrir `http://localhost:5173`. La API debe responder a `GET http://localhost:3000/api/salud` con `{"estado":"ok"}`. `--strictPort` evita que Vite cambie de puerto si 5173 está ocupado. Si se elige 5174, ajustar el origen autorizado de Google y `FRONTEND_URL`. Si cambia el puerto de la API, ajustar también el destino del proxy en `frontend/vite.config.js`.

## 4. Configuración y servicios externos

| Variable o grupo | Uso y comprobación |
|---|---|
| `DATABASE_URL`, `SHADOW_DATABASE_URL` | Conexiones de aplicación y desarrollo; coherentes con MySQL |
| `PORT` | Puerto de Express; valor de ejemplo 3000 |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REMEMBER_EXPIRES_IN` | Firma y vigencia de las sesiones |
| `BCRYPT_COST` | Costo del hash de contraseña; el ejemplo utiliza 10 |
| `FRONTEND_URL`, `RECOVERY_TOKEN_MINUTES` | Destino y vigencia de la recuperación de contraseña |
| `SMTP_*` | Servidor, cuenta, contraseña de aplicación y remitente de correo |
| `GOOGLE_CLIENT_ID` | ID web de Google validado por el backend |
| `VITE_GOOGLE_CLIENT_ID` | El mismo ID en el frontend; se incorpora al compilar |
| `IA_URL_BASE`, `IA_MODELO`, `IA_API_KEY`, `IA_MENSAJES_POR_DIA` | Proveedor del asistente y cuota diaria |
| `VERIFICATION_STORAGE_DIR` | Almacenamiento privado de los documentos de verificación |

Los ejemplos `.env.example` son la referencia de nombres y valores predeterminados. Los `.env` reales se mantienen fuera de Git y de las entregas. Al cambiar una variable del frontend, reiniciar Vite o reconstruir su imagen; al cambiar las del backend, reiniciar o recrear ese servicio.

Google utiliza orígenes exactos. Autorizar cada combinación que se usará, por ejemplo `http://localhost:5173`, `http://localhost:5174` y `http://localhost:8080`; no se configura un comodín para todos los puertos. El cliente debe ser el mismo en ambas capas y la cuenta debe poder acceder a la aplicación configurada. Que el botón aparezca no demuestra que CP-024/025 estén aprobados: se deben comprobar creación y vinculación con Google real.

Sin clave del asistente se utiliza el modo simulado. Sin contraseña SMTP válida los correos de desarrollo se muestran en consola; eso no demuestra entrega real. `npm run smtp:comprobar`, ejecutado en backend, comprueba la conexión sin enviar un mensaje. El mapa utiliza MapLibre/OpenFreeMap; las direcciones, Nominatim; el clima, Open-Meteo. Su disponibilidad requiere conexión de red y las respuestas externas pueden fallar.

## 5. API y contratos principales

Todas las rutas siguientes llevan el prefijo `/api`. La sesión se envía mediante `Authorization: Bearer <token>`; no introducir tokens en URLs ni publicarlos en evidencias. El catálogo completo se mantiene en [README.md](../../../../README.md) y los archivos de `backend/src/routes` son la fuente del contrato implementado.

| Grupo | Operaciones principales |
|---|---|
| `/auth` | Registro, login, Google, logout, recuperación y restablecimiento |
| `/perfil` | Perfil, tipo de cuenta y datos de cuenta; protección de campos por sección |
| `/profesionales` | Búsqueda, ficha, reseñas, ficha propia y verificación por rol |
| `/establecimientos` | Centros de salud/gimnasios y profesionales asociados |
| `/agenda`, `/reservas` | Disponibilidad, reservas, confirmación, cancelación e historial |
| `/chats` | Conversaciones de sus participantes, lectura, envío y eliminación propia |
| `/comidas` | Alimentos, registros por fecha, estadísticas, plan y meta de peso |
| `/agua` | Sumas y eliminación propia por día |
| `/asistente` | Conversaciones, respuestas y cuota de uso |
| `/administrador` | Cuentas, verificaciones, contenido e informes del administrador |

Comprobar el método y la ruta concreta en el README antes de integrar un cliente. Las respuestas de error usan `error` y, cuando corresponde, `detalles`. Son habituales 400 por datos inválidos, 401 por falta de sesión, 403 por rol, 404 para recursos inexistentes o ajenos, 409 por conflicto y 429 por cuota. No interpretar cualquier respuesta distinta de 200 como un fallo: creación puede responder 201 y eliminación, 204.

## 6. Datos, seguridad y mantenimiento

Las migraciones de `backend/prisma/migrations` constituyen el historial de la estructura. Para una instalación existente se usa `db:migrate`; la creación de una migración se hace en desarrollo con `db:migrate:dev`, revisando el SQL y el DAS antes de integrarla. No ejecutar restablecimientos de base como parte de una actualización normal.

Conservar respaldo de MySQL y del directorio de documentos privados. El manual de Docker detalla sus volúmenes y comandos. Las cuentas demo son opcionales y se cargan con `db:seed:profesionales` en entornos de desarrollo. Una cuenta administradora requiere la operación explícita `admin:promover`; no se convierte en administradora por editar el rol desde el navegador.

Las contraseñas se almacenan como hashes. La API valida sesión, rol y propiedad; los enlaces de foto no exponen el identificador directo de la cuenta y las reseñas no incorporan la foto de su autor. No publicar archivos privados, credenciales, sesiones ni datos de salud en capturas. Al cambiar esquema o reglas, sincronizar DAS, casos, defectos y documentación relacionada.

## 7. Verificación y resultados disponibles

En backend:

```powershell
npm test -- --runInBand
npm run lint
```

En frontend:

```powershell
npm test
npm run lint
npm run build
```

Los scripts `test:mysql:plan`, `test:mysql:especialidades`, `test:mysql:agenda` y `test:mysql:mejoras` requieren MySQL configurado y crean datos temporales de prueba. Revisar su configuración antes de ejecutarlos; agenda puede intentar enviar avisos. `test:carga` requiere la API en ejecución, genera carga y datos temporales y termina con código 1 si no cumple o no logra limpiar. Ejecutarlos en un entorno de pruebas preparado, sin una demostración en curso.

Al corte: backend 628 y frontend 489 pruebas aprobadas; lint/build correctos; 223 comprobaciones MySQL reales aprobadas. Las 33 comprobaciones adicionales de validadores y formatos se registran en `Plan de Pruebas/QA_Comprobaciones_2026-11-16.json`. La Planilla conserva 248 CP, con 247 aprobados y Google real CP-025 pendiente (CP-024 aprobado por reporte del PO). QA estándar: 21 OK, 11 NA y 24 pendientes. Los avisos SMTP y la repetición final de Docker no se acreditaron en este entorno.

La evidencia de carga histórica registra 515 profesionales: búsqueda p95 máximo 121 ms con 50 conexiones; login p95 2753 ms a esa carga, sobre el objetivo de 2 s. Se conserva esa limitación y el resultado `NO CUMPLE` de esa ejecución. No afirmar que toda la aplicación está certificada bajo cualquier carga.

## 8. Diagnóstico de problemas

| Síntoma | Revisión |
|---|---|
| Google rechaza 5174 | Origen exacto autorizado y coincidencia de IDs; reinicio/reconstrucción tras cambios |
| API no responde | Proceso de backend, puerto, `DATABASE_URL` y migraciones; revisar `/api/salud` |
| Web abre pero `/api` falla | Destino del proxy Vite o red/proxy Nginx; no confundir puerto web con API |
| Usuarios locales no aparecen en Docker | Se está consultando otra base o volumen; revisar el destino antes de importar datos |
| Correo solo aparece en consola | Configuración SMTP incompleta; verificar conectividad y contraseña de aplicación |
| Asistente responde modo de prueba | Falta la clave o el backend conserva configuración anterior |
| MySQL rechaza credenciales | Coherencia entre usuario, contraseña, host y la base/volumen realmente utilizado |
| Puerto ocupado | Detener el proceso propio identificado o elegir un puerto explícito y ajustar dependencias |

## 9. Documentos relacionados y pendientes

Referencias: DAS 1.35, Plan de Pruebas 1.0.3, Planilla de Casos, Registro de Defectos, manual Docker 1.1 y `Sprint 5/Cierre_Tecnico_Sprint5_2026-11-16.md`. Los valores de versión corresponden al corte indicado; revisar cambios posteriores antes de operar otra entrega.

Faltan la revisión del manual por el equipo/PO, aceptación de historias y cambios, validación de horas y acuerdos de retrospectiva (criterios FS-HU-32 y tres aportes ya registrados), QA residual, revisión independiente y reemplazo manual en Drive. Este manual completa el contenido general que no cubría el documento de Docker; no atribuye ese trabajo a una persona por su asignación inicial en el backlog.

# Manual Técnico General — FitSearch

Versión 1.2 · corte 24-11-2026 · Duoc UC, sección 003D.

Documento de instalación local, arquitectura, configuración, operación y pruebas. Complementa [Manual_Tecnico_Despliegue_Docker.docx](Manual_Tecnico_Despliegue_Docker.docx), versión 1.1, que describe los contenedores. El modelo de datos y las decisiones de arquitectura se mantienen en el DAS 1.41. Estado: preparado para revisión del equipo y del PO; no acredita por sí mismo el cierre del sprint. La versión 1.2 suma las mejoras del 24-11-2026 (SC-41 a SC-46, sección 12).

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
| `TRUST_PROXY` | Vacío en desarrollo; `1` cuando un proxy (nginx) reenvía `/api`, para que el límite de intentos lea la IP real. Docker ya lo fija en 1 |
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
| `/auth` | Registro, login, Google, logout, recuperación y restablecimiento, con límite de intentos (429 y `Retry-After`) |
| `/perfil` | Perfil, tipo de cuenta y datos de cuenta; protección de campos por sección; descargar mis datos (`GET /mis-datos`) y eliminar la cuenta (`DELETE /cuenta`) |
| `/profesionales` | Búsqueda, ficha, reseñas, ficha propia y verificación por rol |
| `/establecimientos` | Centros de salud/gimnasios y profesionales asociados |
| `/agenda`, `/reservas` | Disponibilidad, reservas, confirmación, cancelación e historial |
| `/chats` | Conversaciones de sus participantes, lectura, envío y eliminación propia; planes enviados por el profesional y «Guardar en mis planes» |
| `/comidas` | Alimentos, registros por fecha, estadísticas, plan de macronutrientes, meta de peso, pesajes y planes de comidas |
| `/compartir` | Permisos de la persona para que un profesional vea su progreso, por categoría |
| `/profesional` | Progreso que comparten sus clientes (solo lectura) y búsqueda de alimentos para armar planes |
| `/agua` | Sumas y eliminación propia por día |
| `/asistente` | Conversaciones, respuestas y cuota de uso |
| `/administrador` | Cuentas, verificaciones, contenido e informes del administrador |

Comprobar el método y la ruta concreta en el README antes de integrar un cliente. Las respuestas de error usan `error` y, cuando corresponde, `detalles`. Son habituales 400 por datos inválidos, 401 por falta de sesión, 403 por rol, 404 para recursos inexistentes o ajenos, 409 por conflicto y 429 por cuota. No interpretar cualquier respuesta distinta de 200 como un fallo: creación puede responder 201 y eliminación, 204.

## 6. Datos, seguridad y mantenimiento

Las migraciones de `backend/prisma/migrations` constituyen el historial de la estructura. Para una instalación existente se usa `db:migrate`; la creación de una migración se hace en desarrollo con `db:migrate:dev`, revisando el SQL y el DAS antes de integrarla. No ejecutar restablecimientos de base como parte de una actualización normal.

Conservar respaldo de MySQL y del directorio de documentos privados. El manual de Docker detalla sus volúmenes y comandos. Las cuentas demo son opcionales y se cargan con `db:seed:profesionales` en entornos de desarrollo. Una cuenta administradora requiere la operación explícita `admin:promover`; no se convierte en administradora por editar el rol desde el navegador.

Las contraseñas se almacenan como hashes. La API valida sesión, rol y propiedad; los enlaces de foto no exponen el identificador directo de la cuenta y las reseñas no incorporan la foto de su autor. No publicar archivos privados, credenciales, sesiones ni datos de salud en capturas. Al cambiar esquema o reglas, sincronizar DAS, casos, defectos y documentación relacionada.

Desde el 24-11-2026, eliminar una cuenta la anonimiza en vez de borrar la fila (`usuarios.eliminado_en`): se borran sus datos personales y de salud, comidas, agua, planes, pesajes, permisos para compartir y chats; las citas futuras se cancelan con aviso y las citas y reseñas pasadas quedan como «Usuario eliminado» o «Profesional eliminado». Toda tabla nueva con datos de la persona debe sumarse a la descarga de «Mis datos» y a la eliminación. Los contadores del límite de intentos viven en la memoria de la API: se reinician al reiniciarla y no se comparten entre procesos.

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

Los scripts `test:mysql:*` (acceso, agua, agenda, asistente, comidas, compartir, cuenta, especialidades, mejoras, peso, plan, planes-comida y planes-chat) requieren MySQL configurado y crean datos temporales de prueba que borran al terminar. Revisar su configuración antes de ejecutarlos; agenda puede intentar enviar avisos. `test:carga` requiere la API en ejecución, genera carga y datos temporales y termina con código 1 si no cumple o no logra limpiar. Ejecutarlos en un entorno de pruebas preparado, sin una demostración en curso.

Integración continua (SC-41): cada PR y cada push a `main` corren `.github/workflows/pruebas.yml` en GitHub Actions: lint y Jest del backend; lint, Vitest y build del frontend; y, en un MySQL 8.4 vacío, todas las migraciones, la comparación con `schema.prisma`, los roles y los scripts `test:mysql:*`. El trabajo «Pruebas completas» resume los tres.

Al 25-11-2026 (`main` en `b33a65d`, con los PR #93 a #100), la ejecución completa da backend 709 pruebas aprobadas (70 archivos) y frontend 588 (66 archivos): 1.297 en total. El Registro de Defectos tiene 59: 56 corregidos, 2 cerrados y 1 abierto (el 56).

Al corte del 24-11-2026 (CI sobre `main` con los PR #84 a #91): backend 695 y frontend 553 pruebas aprobadas (63 archivos), lint y build correctos y los 13 scripts MySQL reales aprobados; con la corrección del defecto 59 el backend pasa a 696. La Planilla registra 281 CP (CP-001 a CP-281): 280 aprobados y CP-025 pendiente. El Registro de Defectos tiene 59: 56 corregidos (el 59: un deadlock de MySQL en el primer uso simultáneo del cupo del asistente respondía 500), 2 cerrados (57 y 58) y 1 abierto (56: vulnerabilidad de `effect`, que llega por la CLI de Prisma 6.19; afecta las migraciones y la generación del cliente, no las rutas de la API, y se corrige cuando Prisma 6 publique la versión que la actualiza).

Al corte del 16-11-2026: backend 628 y frontend 489 pruebas aprobadas; lint/build correctos; 223 comprobaciones MySQL reales aprobadas. Las 33 comprobaciones adicionales de validadores y formatos se registran en `Plan de Pruebas/QA_Comprobaciones_2026-11-16.json`. La Planilla conserva 248 CP, con 247 aprobados y Google real CP-025 pendiente (CP-024 aprobado por reporte del PO). QA estándar: 21 OK, 11 NA y 24 pendientes. Los avisos SMTP y la repetición final de Docker no se acreditaron en este entorno.

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

Referencias: DAS 1.41, Plan de Pruebas 1.0.4, Planilla de Casos, Registro de Defectos, manual Docker 1.1 y `Sprint 5/Cierre_Tecnico_Sprint5_2026-11-16.md`. Los valores de versión corresponden al corte indicado; revisar cambios posteriores antes de operar otra entrega.

Faltan la revisión del manual por el equipo/PO, aceptación de historias y cambios, validación de horas y acuerdos de retrospectiva (criterios FS-HU-32 y tres aportes ya registrados), QA residual, revisión independiente y reemplazo manual en Drive. Este manual completa el contenido general que no cubría el documento de Docker; no atribuye ese trabajo a una persona por su asignación inicial en el backlog.


## 10. Navegación, tema y perfil — revisión del 23-11-2026

Las pantallas con sesión comparten una columna de navegación con la marca FitSearch, las secciones y «Más». En escritorio con mouse, la columna permanece contraída a los íconos y muestra solo el logo; al acercar el mouse o recorrerla con el teclado aparecen el nombre FitSearch y los nombres de las opciones sobre el contenido, sin desplazarlo. En pantallas táctiles grandes se mantiene completa. En móvil, el encabezado compacto muestra la marca centrada y el botón del menú; el panel lateral conserva el foco, se cierra con Escape y devuelve el foco al botón que lo abrió. La barra inferior mantiene los íconos con nombres accesibles. En el menú del usuario, el acceso al perfil queda debajo de Notificaciones; en el profesional queda debajo de Reportes. Usa la foto de la cuenta, o sus iniciales si no tiene foto o no carga; la selección se distingue con un anillo. La campana queda marcada mientras su panel compacto está abierto y lo despliega junto al botón pulsado, ajustándolo a los bordes de la pantalla y actualizándolo al desplegar el nav, desplazarlo o redimensionar la ventana. Los íconos laterales miden 26px; la barra móvil y el botón Más, 28px. La columna comparte el fondo del cuerpo, sin líneas de separación; sus opciones se centran verticalmente y Más permanece al pie. «Más» permite cambiar entre claro y oscuro y cerrar sesión; el tema se conserva en el navegador y se aplica también a los diálogos y avisos. La identidad del usuario y del profesional se presenta centrada. Se retiró el acceso duplicado «Pedir recomendación» del nav y el bloque de categorías del asistente, conservando sus tarjetas de acción, sugerencias y consejos. Si se abre una ruta protegida sin sesión, después de iniciar sesión se vuelve a ella con sus filtros.

`NavegacionCompacta.css` define la estructura compartida; `TemaAplicacion.css` contiene la paleta oscura y la identidad centrada. Las hojas de cada vista conservan sus colores claros y usan `light-dark()` para sus equivalentes oscuros. El tema se propaga con `data-tema` en el documento mientras está montado el diseño con sesión, de forma que los portales a `document.body` reciban la misma paleta. La preferencia se guarda como `fitsearch_aspecto` y sigue funcionando en memoria cuando el almacenamiento no está disponible.

`AvatarNavegacion` reutiliza la caché de foto de la cuenta; un guardado o eliminación desde el perfil actualiza el menú y la barra sin guardar imágenes en la sesión. La campana usa la versión activa de `Icono` mientras `aria-expanded` es verdadero. El foco del menú móvil incluye los radios habilitados de tema y recorre únicamente la opción tabulable de cada grupo.

La evidencia de ejecución y las limitaciones de comprobación visual se registran en [Revision_Navegacion_Tema_2026-11-23.md](../Plan%20de%20Pruebas/Revision_Navegacion_Tema_2026-11-23.md). No se acredita cierre formal de historias ni del sprint con esta revisión.



## 11. Carrusel de herramientas y escala de letra

En la portada pública, «Más herramientas para tu bienestar» es una cinta horizontal de movimiento continuo y vuelta sin corte: muestra una tarjeta en móvil, dos desde 40rem, tres desde 64rem y cuatro desde 90rem. Avanza a 45px/s en ventanas del carrusel menores de 900px y a 70px/s en las mayores. Se puede arrastrar o recorrer con las flechas y pausar/reanudar. Se detiene con el foco dentro de la cinta, fuera de pantalla y en pestañas ocultas; con movimiento reducido solo se recorre manualmente. Conserva las cinco herramientas y sus destinos. Las copias visuales completan el ciclo sin repetir opciones para lectores de pantalla ni para Tab, y sus enlaces activan la herramienta correspondiente.

`CarruselHerramientas.jsx/.css` anima únicamente el transform de una pista mediante Web Animations API, con duración calculada por ancho y velocidad. No espera intervalos entre tarjetas. Conserva la fase al redimensionar, muestra la herramienta enfocada y evita abrir un enlace al terminar un arrastre. Usa IntersectionObserver, ResizeObserver y la preferencia de movimiento reducido; libera animación, copias y manejadores al desmontar. Si no está disponible la animación, mantiene el desplazamiento nativo y las flechas. Los controles quedan fuera del área de pausa por foco, por lo que Reanudar puede activarse con teclado.

La base de letra de la página es 106,25% (17px con el tamaño predeterminado del navegador); las etiquetas del nav y Más son .95rem para conservar su proporción con los íconos. El ajuste sigue las preferencias de tamaño del navegador.

Comprobación completa actual: 58 archivos y 524 pruebas frontend aprobadas, compilación correcta y lint sin errores con la advertencia ya registrada de Mensajes.jsx. Se conserva la revisión visual pendiente.


### Distribución del espacio de la portada

Después del hero, las secciones y el pie aprovechan el ancho de la ventana con márgenes laterales fluidos de 1rem a 4rem, sin el límite anterior de 1240px. En escritorio, los encabezados de especialidades y herramientas reparten título y descripción entre ambos lados; el asistente combina texto a la izquierda con una conversación más amplia a la derecha, y el bloque profesional sitúa el ejemplo a la izquierda y sus beneficios a la derecha. Desde 80rem, Cómo funciona distribuye su introducción y los tres pasos en dos columnas. En móvil se conserva la lectura vertical y el desplazamiento horizontal queda dentro de los carruseles.


En el hero se retiraron los bordes dorados de ambas hojas, responsables de la línea central al entrar. Las hojas se solapan ligeramente para evitar una rendija de redondeo entre píxeles. La apertura conserva su comportamiento. Se recompiló después de este ajuste CSS; la revisión visual continúa pendiente.


### Movimiento y contorno del header — 24-11-2026

Las animaciones de la portada continúan al pasar el cursor: se retiró la pausa por hover de la cinta decorativa, la vitrina de objetivos y el carrusel de herramientas. Se conservan la pausa manual, la pausa al enfocar controles o enlaces y la preferencia de movimiento reducido. Las opciones del header y el acceso Iniciar sesión muestran un contorno tenue al pasar el mouse, sin subrayado; el foco de teclado mantiene su contorno visible.


### Menú profesional — 24-11-2026

El menú profesional muestra Inicio, Agenda, Clientes, Mensajes, Reportes y Perfil profesional, con la campana junto a Mensajes. Configuración se encuentra únicamente dentro de Más, el botón de hamburguesa al pie del nav, y conserva la ruta /profesional/configuracion. La barra inferior móvil mantiene sus accesos.


## 12. Mejoras del 24-11-2026 (SC-41 a SC-46)

Integradas en `main` con los PR #85 a #91. El detalle de rutas y reglas está en el [README](../../../../README.md); el diseño, en el DAS 1.41 (QS8 a QS10 y D41 a D47); la evidencia, en `Plan de Pruebas/` con fecha 24-11-2026.

| Cambio | Qué agrega | Datos y comprobación |
|---|---|---|
| SC-41 Límite de intentos e integración continua | Login, recuperar, restablecer, registro, Google y confirmación de contraseña responden 429 con `Retry-After` al superar el límite. CI en GitHub Actions y plantilla de PR con la DoD | Sin tablas nuevas; `test:mysql:acceso` |
| SC-42 Mis datos y eliminar la cuenta | Descarga en JSON de todos los datos de la cuenta y eliminación confirmada con ELIMINAR y la contraseña o Google | `usuarios.eliminado_en`; `test:mysql:cuenta` |
| SC-43 Historial de peso | Pesajes por día con gráfico contra la meta; el último pesaje actualiza el peso del perfil | `registros_peso`; `test:mysql:peso` |
| SC-44 Plan de comidas | Planes de un día o de una semana con alimentos y gramos, «Hoy te toca…» y «Lo comí». La pestaña «Plan de alimentación» pasa a llamarse «Plan de macronutrientes» | `planes_comida`, `plan_comida_items`; `test:mysql:planes-comida` |
| SC-45 Compartir el progreso | La persona elige, por categoría, qué ve cada profesional con el que tiene chat; registro de cada consulta | `permisos_compartir`, `accesos_compartidos`; `test:mysql:compartir` |
| SC-46 Planes por el chat | El profesional envía un plan de comidas o de macronutrientes y la persona lo guarda una sola vez | `mensajes_chat.adjunto` y `guardado_en`; `test:mysql:planes-chat` |

Las seis migraciones del 24-11-2026 (`20261124120000` a `20261124160000`) se aplican con `npm run db:migrate`. Después de actualizar una copia local, correr `npm run db:generate` (o `npx prisma generate`) en `backend`. Una base que ya tiene estas migraciones no debe usarse con una rama anterior que no las tenga: `prisma migrate reset` o `migrate dev` en esa rama borrarían los datos.

Pendiente de estas mejoras: aceptación del PO de SC-40 a SC-46, revisión de otro integrante (DoD-04) y el defecto 56.

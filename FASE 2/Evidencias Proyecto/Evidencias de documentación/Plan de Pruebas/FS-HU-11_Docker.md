# Despliegue con Docker (FS-HU-11)

Fecha: 13-11-2026. Rama `feat/fs-hu-11-docker`, sobre `090a87c` (PR #49 y #50 fusionados). Historia del Sprint 5 (tareas T1 a T3 y Manual Técnico T2); aceptación del PO pendiente.

## Comportamiento

- `docker compose up --build`, desde `FASE 2/Evidencias Proyecto/Evidencias de sistema`, levanta tres contenedores: **mysql** (MySQL 8.4 oficial), **backend** (API Node.js 22) y **frontend** (build de Vite servido por Nginx). La web queda en `http://localhost:8080` y la API en `http://localhost:3000/api`.
- `backend/Dockerfile` tiene dos etapas: dependencias con el cliente de Prisma, y una imagen final sin caché de npm. La API corre como `node` (uid 1000). El código es de solo lectura; solo escribe en el volumen de documentos de verificación.
- `frontend/Dockerfile` compila con Vite y entrega el resultado a `nginx-unprivileged` (uid 101). `frontend/nginx.conf` reenvía `/api` al backend, devuelve `index.html` en las rutas de React y acepta documentos de hasta 5 MB.
- `backend/docker/migrar.sh` se ejecuta en cada arranque. Aplica las migraciones pendientes con `prisma migrate deploy`, sin lista fija: hoy son 21. Luego carga los roles con `prisma/seed.js` (idempotente) e inicia la API. Si MySQL aún no responde, reintenta 10 veces. Si MySQL rechaza la contraseña (P1000), se detiene de inmediato y explica la causa.
- `.env.example` (en la carpeta del código) documenta las variables de Compose sin secretos. `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` y `JWT_SECRET` son obligatorias y Compose no arranca sin ellas. `.env` está ignorado por Git y por `.dockerignore`.
- Los contenedores usan la red por defecto de Compose y se encuentran por el nombre del servicio. No se usa `network_mode: host`.
- Los datos viven en los volúmenes `mysql-datos` y `verificaciones`, que sobreviven a `docker compose down`.
- `.gitattributes` fuerza saltos de línea LF en `*.sh`, `Dockerfile`, `*.conf`, `*.yml`, `.dockerignore` y `.env.example`.
- No agrega migraciones ni cambia la API. La única variable nueva es `PUERTO_WEB`/`PUERTO_API`, opcional y solo de Compose.

## Casos de prueba

| Caso | Historia | Qué se prueba | Resultado esperado | Cómo se ejecutó | Resultado |
|---|---|---|---|---|---|
| CP-170 | FS-HU-11 | Construcción de imágenes | `docker compose up --build` construye backend y frontend sin errores y los tres servicios quedan `healthy` | Instalación desde cero (sin imágenes, caché ni volúmenes) | Aprobado |
| CP-171 | FS-HU-11 | Variables de entorno | `.env.example` sin secretos; sin `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` o `JWT_SECRET`, Compose se detiene con «Falta … en .env»; ningún `.env` dentro de las imágenes | `docker compose config` con un `.env` incompleto y búsqueda de `.env` en los contenedores | Aprobado |
| CP-172 | FS-HU-11 | Migraciones al arrancar | Primer arranque: «All migrations have been successfully applied», 21 en `_prisma_migrations` (igual a las carpetas de `prisma/migrations`); segundo arranque: «No pending migrations to apply» | Log del backend y consulta a MySQL | Aprobado |
| CP-173 | FS-HU-11 | Datos iniciales | Roles usuario, profesional y administrador cargados; base `fitsearch_shadow` creada para `db:migrate:dev` | Consulta a MySQL | Aprobado |
| CP-174 | FS-HU-11 | API y web | `/api/salud` responde 200 `{"estado":"ok"}` directo (:3000) y por Nginx (:8080); la web y una ruta de React (`/profesionales`) responden 200 y cargan en el navegador | `curl`, PowerShell desde Windows y navegador | Aprobado |
| CP-175 | FS-HU-11 | Sin privilegios | API como `node` (uid 1000) y Nginx como `nginx` (uid 101); escribir en `src/`, `/app/shared`, la configuración de Nginx o la web falla con «Permission denied»; el volumen de verificaciones sí admite escritura | `docker compose exec … id`, `touch` | Aprobado |
| CP-176 | FS-HU-11 | Persistencia | Una cuenta creada por la API (`@example.test`) sigue en MySQL después de `docker compose down` y `up`, e inicia sesión (200) | `POST /api/auth/registro`, down/up y `POST /api/auth/login` | Aprobado |
| CP-177 | FS-HU-11 | Instalación completa con la red normal (QS4) | Desde cero y sin `network_mode: host`, el backend llega a `mysql` por nombre, sin P1001, y la instalación toma menos de 15 minutos | `docker compose up --build` cronometrado, después de `docker system prune -a --volumes` y `docker builder prune -a` | Aprobado (105 s) |

## Validación

- Equipo: Windows 10 IoT Enterprise LTSC 2021 (19044) con WSL 2 y Ubuntu 26.04. Docker Engine 29.9.3 y Docker Compose 5.7.1. Docker Desktop no se pudo instalar: exige Windows 10 22H2 (19045) o superior y el instalador se detiene en este equipo. Por eso se usó Docker Engine dentro de WSL 2, que es el mismo motor. El requisito y el procedimiento quedaron en el README y en el Manual Técnico.
- CP-177: en el entorno anterior, Docker bloqueaba la red entre contenedores (P1001 hacia `mysql`) y había que usar un override temporal con `network_mode: host`. En este equipo la red de Compose funciona sin cambios: `backend` resuelve `mysql` en `172.18.0.2` y el log no tiene errores P1001. El override no forma parte de la rama.
- Instalación desde cero: **105 s**, incluida la descarga de `node:22-bookworm-slim`, `nginx-unprivileged:1.27-alpine` y `mysql:8.4`, `npm ci` de backend y frontend, el build de Vite y las 21 migraciones. Una ejecución anterior, con la versión previa de los Dockerfiles, tomó 95 s.
- Imágenes: backend 801 MB (incluye la CLI de Prisma, necesaria para migrar al arrancar), frontend 76,8 MB y mysql 1,12 GB.
- Respecto de la planificación original: `main` ya trae 21 migraciones (la versión preparada antes de #49 y #50 consideraba 17). `migrar.sh` no lista migraciones, así que las nuevas se aplican solas. #49 y #50 no agregaron variables de entorno.
- Defectos encontrados y corregidos durante la prueba:
  1. Al construir desde la unidad de Windows (`/mnt/c`), los archivos llegaban a la imagen con permisos 777 y el usuario `node` podía modificar `src/`. Los Dockerfiles ahora normalizan los permisos (CP-175).
  2. Si cambiaba `MYSQL_PASSWORD` después de crear el volumen, el backend reintentaba 10 veces con el mensaje engañoso «MySQL aún no acepta conexiones». Ahora detecta P1000, explica la causa y termina en 2 s.
- La salida completa de la ejecución está en [FS-HU-11_Docker_2026-11-13.txt](FS-HU-11_Docker_2026-11-13.txt).
- Las contraseñas y `JWT_SECRET` del `.env` de prueba se generaron con `openssl rand` y no se registran. La cuenta temporal `docker.cp176.*@example.test` se eliminó al terminar. No se usaron cuentas reales ni se escribieron contraseñas en el navegador.

Los casos CP-170 a CP-177 continúan la numeración provisional después de CP-169 (FS-HU-27 y FS-HU-28). Se agregan a la Planilla de Casos de Prueba al consolidar la documentación después de la fusión del PR. Estas comprobaciones no equivalen a aceptación del PO.

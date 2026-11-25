# Despliegue de FitSearch en Railway

La aplicación usa tres servicios: MySQL, backend y frontend. El backend y la base de datos se comunican por la red privada. Solo el frontend necesita un dominio público.

## Código y construcción

Conectar ambos servicios de aplicación al mismo repositorio y rama. En los dos, usar como directorio raíz:

`/FASE 2/Evidencias Proyecto/Evidencias de sistema`

Configurar `RAILWAY_DOCKERFILE_PATH` como `backend/Dockerfile` o `frontend/Dockerfile`, según el servicio. No subir archivos `.env` ni documentos personales al repositorio.

## Backend

| Variable | Valor |
| --- | --- |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Referencia a `MySQL.MYSQL_URL` de Railway |
| `SHADOW_DATABASE_URL` | `mysql://sin_uso:sin_uso@127.0.0.1:3306/fitsearch_shadow` |
| `JWT_SECRET` | Un secreto nuevo y aleatorio, guardado únicamente en Railway |
| `TRUST_PROXY` | `2`, para la cadena Railway → Nginx → API; la API debe permanecer privada |
| `FRONTEND_URL` | Dirección HTTPS pública del frontend |
| `RAILWAY_RUN_UID` | `0`, únicamente para preparar los permisos del volumen al arrancar |

Montar un volumen en `/app/backend/storage/verificaciones`. El script `backend/docker/iniciar.sh` asigna la carpeta a `node` y baja los privilegios antes de aplicar migraciones o iniciar la API. En Docker local se conserva el usuario `node` y el arranque habitual. La comprobación de salud es `/api/salud`.

Las migraciones y los roles se cargan al iniciar el backend. No ejecutar `db:reset` sobre datos que se quieran conservar.

Prisma exige que la dirección auxiliar sea distinta de `DATABASE_URL`, incluso con `migrate deploy`. Ese comando no se conecta a la base auxiliar; la dirección de ejemplo solo permite validar la configuración. Para crear migraciones en desarrollo sí hace falta una base auxiliar real y separada.

## Frontend

| Variable | Valor |
| --- | --- |
| `PORT` | `8080` |
| `BACKEND_UPSTREAM` | `${{backend.RAILWAY_PRIVATE_DOMAIN}}:3000` |
| `VITE_GOOGLE_CLIENT_ID` | ID público de Google, si se habilita ese acceso |

Nginx genera su configuración al arrancar. Sustituye `BACKEND_UPSTREAM` y los servidores DNS detectados por su imagen (`NGINX_LOCAL_RESOLVERS`); conserva las variables propias de Nginx. Vuelve a resolver el destino cada diez segundos para admitir cambios de dirección del backend al desplegar. Sin configuración adicional, usa `backend:3000` para mantener la compatibilidad con Docker Compose.

Generar el dominio del frontend apuntando al puerto `8080`. Las llamadas `/api` pasan al backend por la red privada. Para Google, configurar también `GOOGLE_CLIENT_ID` en el backend y autorizar el origen HTTPS publicado en Google Cloud.

## Servicios externos y datos

- La IA requiere configurar su clave en Railway. No incluirla en el frontend ni en GitHub.
- Railway bloquea SMTP en los planes Free, Trial y Hobby. Los correos de Gmail actuales necesitan adaptarse a un proveedor con API HTTPS; configurar SMTP no basta para habilitarlos.
- MySQL y los documentos necesitan sus respectivos volúmenes. No guardar documentos únicamente en el disco temporal del contenedor.
- El crédito de prueba tiene un límite de importe y duración. El despliegue no garantiza alojamiento gratuito permanente. Revisar el consumo y exportar los datos antes de que termine la prueba; no habilitar un plan de pago sin autorización.

## Comprobación

Verificar la portada, una ruta interna tras recargar, `/api/salud`, registro e inicio de sesión, guardado y recarga de perfiles, y carga y descarga de documentos después de un nuevo despliegue. Comprobar por separado los correos, la IA y Google cuando estén configurados.

Referencias: [Dockerfiles](https://docs.railway.com/builds/dockerfiles), [volúmenes y permisos](https://docs.railway.com/volumes), [correo saliente](https://docs.railway.com/networking/outbound-networking#email-delivery) y [prueba gratuita](https://docs.railway.com/pricing/free-trial).

# Interfaz web de FitSearch (FS-HU-11). Se construye desde "Evidencias de sistema" porque usa ../shared:
#   docker compose build frontend
# Etapa 1: build de producción con Vite. Etapa 2: Nginx sin privilegios sirve los archivos y reenvía /api al backend.

FROM node:22-bookworm-slim AS build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY shared/ /app/shared/
COPY frontend/ ./
# ID de cliente OAuth de Google (no es secreto). Vacío: el botón «Continuar con Google» aparece desactivado.
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS final
# Solo lectura para el usuario de Nginx, aunque el archivo llegue con permisos 777 desde Windows o WSL.
COPY --chmod=644 frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chmod=u=rwX,go=rX /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

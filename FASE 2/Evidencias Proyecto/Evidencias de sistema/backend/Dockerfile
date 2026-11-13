# API de FitSearch (FS-HU-11). Se construye desde "Evidencias de sistema" porque usa ../shared:
#   docker compose build backend
# Etapa 1: dependencias y cliente de Prisma. Etapa 2: imagen final sin caché de npm, ejecutada sin privilegios.

FROM node:22-bookworm-slim AS base
# Prisma necesita OpenSSL para conectarse a MySQL.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencias
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
# Incluye la CLI de Prisma (devDependency), que la imagen final usa para aplicar las migraciones al arrancar.
RUN npm ci --no-audit --no-fund && npm cache clean --force
COPY backend/prisma ./prisma
RUN ./node_modules/.bin/prisma generate

FROM base AS final
ENV NODE_ENV=production
WORKDIR /app/backend
COPY --from=dependencias /app/backend/node_modules ./node_modules
COPY shared/ /app/shared/
COPY backend/ ./
# El código queda de solo lectura para el usuario de la API (al construir desde Windows o WSL los archivos
# pueden llegar con permisos 777). Única carpeta con escritura: documentos de verificación (volumen).
RUN find /app/shared /app/backend -path /app/backend/node_modules -prune -o -exec chmod u=rwX,go=rX {} + \
    && chmod 0755 docker/migrar.sh \
    && mkdir -p storage/verificaciones \
    && chown -R node:node storage
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/salud').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["sh", "docker/migrar.sh"]

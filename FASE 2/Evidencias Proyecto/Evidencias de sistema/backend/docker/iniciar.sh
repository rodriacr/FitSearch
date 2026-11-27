#!/bin/sh
set -eu

# Railway monta los volúmenes como root; la API continúa ejecutándose como node.
if [ "$(id -u)" -eq 0 ]; then
  carpeta="${VERIFICATION_STORAGE_DIR:-/app/backend/storage/verificaciones}"
  mkdir -p "$carpeta"
  chown node:node "$carpeta"
  exec gosu node sh docker/migrar.sh
fi

exec sh docker/migrar.sh

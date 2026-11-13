#!/bin/sh
# Arranque del contenedor de la API (FS-HU-11):
# 1. aplica las migraciones pendientes de prisma/migrations (prisma migrate deploy; no borra datos),
# 2. carga los datos iniciales obligatorios (roles; el seed usa upsert y se puede repetir),
# 3. inicia la API.
set -eu

intentos=0
until salida=$(./node_modules/.bin/prisma migrate deploy 2>&1); do
  echo "$salida"
  case "$salida" in
    *P1000*)
      # MySQL guarda la contraseña con que se creó el volumen; cambiarla después en .env no la actualiza.
      echo "MySQL rechazó la contraseña del usuario fitsearch. Si MYSQL_PASSWORD cambió después de la primera instalación," >&2
      echo "vuelve a la contraseña original o, si no necesitas los datos, borra el volumen con: docker compose down -v" >&2
      exit 1
      ;;
  esac
  intentos=$((intentos + 1))
  if [ "$intentos" -ge 10 ]; then
    echo "No se pudieron aplicar las migraciones después de 10 intentos. Revisa DATABASE_URL y el contenedor mysql." >&2
    exit 1
  fi
  echo "MySQL aún no acepta conexiones; reintento $intentos de 10 en 5 segundos."
  sleep 5
done
echo "$salida"

node prisma/seed.js

exec node src/server.js

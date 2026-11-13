-- Se ejecuta solo la primera vez que se crea el volumen de MySQL (docker-entrypoint-initdb.d).
-- La base fitsearch y el usuario fitsearch los crea la imagen oficial con MYSQL_DATABASE, MYSQL_USER y MYSQL_PASSWORD.
-- Esta base auxiliar la usa Prisma solo para generar migraciones nuevas (npm run db:migrate:dev), igual que en
-- prisma/crear_base_datos.sql.
CREATE DATABASE IF NOT EXISTS fitsearch_shadow CHARACTER SET utf8mb4;
GRANT ALL PRIVILEGES ON fitsearch_shadow.* TO 'fitsearch'@'%';
FLUSH PRIVILEGES;

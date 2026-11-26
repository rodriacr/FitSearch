-- Mejora del asistente de IA (SC-47): modalidad y orden de los profesionales recomendados, resumen del día y valoración
-- de cada respuesta. Prisma no representa las CHECK: viven solo en las migraciones, como en las tablas anteriores.
-- AlterTable
ALTER TABLE `mensajes` ADD COLUMN `modalidad` VARCHAR(20) NULL,
    ADD COLUMN `criterio` VARCHAR(20) NULL,
    ADD COLUMN `resumen_dia` JSON NULL,
    ADD COLUMN `valoracion` TINYINT NULL;

ALTER TABLE `mensajes` ADD CONSTRAINT `mensajes_modalidad_chk` CHECK (`modalidad` IS NULL OR `modalidad` IN ('presencial', 'online'));
ALTER TABLE `mensajes` ADD CONSTRAINT `mensajes_criterio_chk` CHECK (`criterio` IS NULL OR `criterio` IN ('cercania', 'calificacion', 'verificados'));
ALTER TABLE `mensajes` ADD CONSTRAINT `mensajes_valoracion_chk` CHECK (`valoracion` IS NULL OR `valoracion` IN (1, -1));

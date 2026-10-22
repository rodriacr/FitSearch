-- Recomendación de profesional del asistente IA (FS-HU-08, DAS D34): especialidad del catálogo recomendada en una
-- respuesta del asistente. Migración aditiva: columna nula, los mensajes existentes quedan sin recomendación.
ALTER TABLE `mensajes` ADD COLUMN `especialidad` VARCHAR(100) NULL;

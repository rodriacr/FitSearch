-- Dirección de atención propia del profesional (SC-24). Opcional: quien atiende solo online puede no indicarla.
ALTER TABLE `profesionales` ADD COLUMN `direccion` VARCHAR(150) NULL AFTER `comuna`;

ALTER TABLE `usuarios` ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `version_sesion` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `profesionales` ADD COLUMN `estado_verificacion` VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  ADD COLUMN `motivo_rechazo` VARCHAR(500) NULL,
  ADD COLUMN `historial_verificacion` JSON NULL,
  ADD COLUMN `revision_verificacion` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `rut` VARCHAR(12) NULL,
  ADD COLUMN `telefono` VARCHAR(20) NULL;
UPDATE `profesionales` SET `estado_verificacion` = 'verificado' WHERE `verificado` = true;
CREATE TABLE `documentos_profesionales` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `profesional_id` INTEGER NOT NULL,
  `tipo` VARCHAR(30) NOT NULL,
  `nombre` VARCHAR(150) NOT NULL,
  `clave` VARCHAR(50) NOT NULL,
  `mime` VARCHAR(40) NOT NULL,
  `tamano` INTEGER NOT NULL,
  `fecha_creacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `documentos_profesionales_clave_key` (`clave`),
  INDEX `documentos_profesionales_profesional_id_idx` (`profesional_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `documentos_profesionales_profesional_id_fkey`
    FOREIGN KEY (`profesional_id`) REFERENCES `profesionales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- FS-HU-22: comuna y modalidad de atención de cada profesional, para filtrar el directorio.
-- AlterTable
ALTER TABLE `profesionales` ADD COLUMN `comuna` VARCHAR(80) NULL,
    ADD COLUMN `modalidad` VARCHAR(20) NOT NULL DEFAULT 'presencial';

-- CreateIndex
CREATE INDEX `profesionales_comuna_idx` ON `profesionales`(`comuna`);

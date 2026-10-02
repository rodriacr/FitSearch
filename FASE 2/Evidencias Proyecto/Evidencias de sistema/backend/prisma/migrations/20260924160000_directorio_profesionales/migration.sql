-- CreateTable
CREATE TABLE `profesionales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `establecimiento_id` INTEGER NULL,
    `especialidad` VARCHAR(100) NOT NULL,
    `descripcion` TEXT NULL,
    `verificado` BOOLEAN NOT NULL DEFAULT false,
    `ubicacion_lat` DECIMAL(10, 7) NOT NULL,
    `ubicacion_lng` DECIMAL(10, 7) NOT NULL,

    UNIQUE INDEX `profesionales_usuario_id_key`(`usuario_id`),
    INDEX `profesionales_especialidad_idx`(`especialidad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `establecimientos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `categoria` VARCHAR(50) NOT NULL,
    `direccion` VARCHAR(255) NOT NULL,
    `ubicacion_lat` DECIMAL(10, 7) NOT NULL,
    `ubicacion_lng` DECIMAL(10, 7) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profesionales` ADD CONSTRAINT `profesionales_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profesionales` ADD CONSTRAINT `profesionales_establecimiento_id_fkey` FOREIGN KEY (`establecimiento_id`) REFERENCES `establecimientos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

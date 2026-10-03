-- FS-HU-24: calificación de 1 a 5 estrellas y comentario opcional (una reseña por usuario y profesional).
-- CreateTable
CREATE TABLE `resenas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `profesional_id` INTEGER NOT NULL,
    `puntaje` TINYINT NOT NULL,
    `comentario` VARCHAR(500) NULL,
    `fecha_creacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `fecha_actualizacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `resenas_profesional_id_idx`(`profesional_id`),
    UNIQUE INDEX `resenas_usuario_id_profesional_id_key`(`usuario_id`, `profesional_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `resenas` ADD CONSTRAINT `resenas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resenas` ADD CONSTRAINT `resenas_profesional_id_fkey` FOREIGN KEY (`profesional_id`) REFERENCES `profesionales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

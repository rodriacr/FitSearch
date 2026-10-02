-- AlterTable
ALTER TABLE `perfiles_usuario` ADD COLUMN `comidas_dia` TINYINT NULL,
    ADD COLUMN `horas_sueno` VARCHAR(20) NULL,
    ADD COLUMN `objetivo_principal` VARCHAR(30) NULL;

-- CreateTable
CREATE TABLE `informacion_salud` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `condiciones_medicas` JSON NOT NULL,
    `toma_medicamentos` BOOLEAN NOT NULL,
    `medicamentos` JSON NOT NULL,
    `alergias` JSON NOT NULL,
    `fecha_actualizacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `informacion_salud_usuario_id_key`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `informacion_salud` ADD CONSTRAINT `informacion_salud_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


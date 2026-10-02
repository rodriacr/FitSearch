-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `google_id` VARCHAR(255) NULL,
    MODIFY `password_hash` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `tokens_recuperacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `fecha_expiracion` DATETIME(0) NOT NULL,
    `fecha_uso` DATETIME(0) NULL,
    `fecha_creacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `tokens_recuperacion_token_hash_key`(`token_hash`),
    INDEX `tokens_recuperacion_usuario_id_idx`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `usuarios_google_id_key` ON `usuarios`(`google_id`);

-- AddForeignKey
ALTER TABLE `tokens_recuperacion` ADD CONSTRAINT `tokens_recuperacion_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


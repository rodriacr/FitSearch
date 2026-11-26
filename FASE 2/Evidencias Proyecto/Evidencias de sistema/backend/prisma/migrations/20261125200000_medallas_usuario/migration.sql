-- Logros y medallas (25-11-2026): medallas ganadas por cada persona. periodo distingue las ediciones de los retos de
-- temporada (por ejemplo, 2026); vista marca si ya se mostró el aviso de medalla nueva.
-- CreateTable
CREATE TABLE `medallas_usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `clave` VARCHAR(40) NOT NULL,
    `nivel` VARCHAR(10) NOT NULL,
    `periodo` VARCHAR(10) NOT NULL DEFAULT '',
    `fecha_obtenida` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `vista` BOOLEAN NOT NULL DEFAULT false,

    INDEX `medallas_usuario_usuario_id_fecha_obtenida_idx`(`usuario_id`, `fecha_obtenida`),
    UNIQUE INDEX `medallas_usuario_usuario_id_clave_nivel_periodo_key`(`usuario_id`, `clave`, `nivel`, `periodo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `medallas_usuario` ADD CONSTRAINT `medallas_usuario_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `usuarios`
    ADD COLUMN `recordatorios_citas` BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN `avisos_mensajes_correo` BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN `ultimo_aviso_mensajes` DATETIME(0) NULL;

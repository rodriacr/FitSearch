-- Permiso para que el asistente de IA use el perfil de la persona (SC-47): null mientras no responde, 'no', 'perfil'
-- (datos físicos, objetivos y plan) o 'perfil_salud' (además, condiciones, medicamentos y alergias), y cuándo lo decidió.
-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `permiso_perfil_ia` VARCHAR(20) NULL,
    ADD COLUMN `permiso_perfil_ia_fecha` DATETIME(0) NULL;

ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_permiso_perfil_ia_chk` CHECK (`permiso_perfil_ia` IS NULL OR `permiso_perfil_ia` IN ('no', 'perfil', 'perfil_salud'));

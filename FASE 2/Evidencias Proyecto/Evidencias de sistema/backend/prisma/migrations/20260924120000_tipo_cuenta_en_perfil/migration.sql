-- El tipo de cuenta (rol) ya no se elige en el registro, sino en el primer paso del asistente de perfil
-- (FS-HU-02 y FS-HU-17, cambio de flujo del 24-09-2026). Esta columna distingue el rol provisional
-- "usuario" que recibe toda cuenta nueva del rol que la persona confirmó en su perfil.

-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `rol_confirmado` BOOLEAN NOT NULL DEFAULT false;

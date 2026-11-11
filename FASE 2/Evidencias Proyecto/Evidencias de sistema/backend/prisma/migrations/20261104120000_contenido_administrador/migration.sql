-- Contenido del administrador (FS-HU-30, SC-32): catálogo de especialidades en la base de datos y estado activo de
-- alimentos y establecimientos. Migración aditiva: no borra datos.

-- Un alimento desactivado no aparece al registrar comidas; los registros que lo usan se conservan.
ALTER TABLE `alimentos` ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true;

-- Centros de salud y gimnasios del directorio (FS-HU-25): la comuna permite filtrarlos y uno desactivado no aparece.
ALTER TABLE `establecimientos` ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `comuna` VARCHAR(80) NULL;

-- Categorías del catálogo (shared/reglas.json): los establecimientos de demostración eran «Salud».
UPDATE `establecimientos` SET `categoria` = 'centro_salud' WHERE `categoria` = 'Salud';

-- Las especialidades salían de shared/reglas.json. Las fichas siguen guardando el nombre (profesionales.especialidad).
CREATE TABLE `especialidades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `fecha_creacion` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `especialidades_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `especialidades` (`nombre`) VALUES
    ('Entrenamiento personal'), ('Kinesiología'), ('Medicina deportiva'), ('Nutrición'), ('Psicología deportiva');

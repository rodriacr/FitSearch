-- Los bloques retirados conservan sus reservas y no admiten nuevas solicitudes.
ALTER TABLE `disponibilidades` ADD COLUMN `retirado` BOOLEAN NOT NULL DEFAULT false;

-- Registro de agua (FS-HU-33): lo que cada usuario toma en el día, sumado en vasos o mililitros desde el Inicio.
-- Migración aditiva: crea una tabla. Cada suma es una fila, para poder deshacer la última; el total del día es la suma.
CREATE TABLE registro_agua (
  id INTEGER NOT NULL AUTO_INCREMENT,
  usuario_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  ml INTEGER NOT NULL,
  fecha_creacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX registro_agua_usuario_id_fecha_idx(usuario_id, fecha),
  PRIMARY KEY(id),
  CONSTRAINT registro_agua_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT registro_agua_ml CHECK(ml > 0)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

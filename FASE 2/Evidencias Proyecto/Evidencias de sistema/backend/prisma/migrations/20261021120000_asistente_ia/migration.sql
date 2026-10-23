-- Asistente IA (FS-HU-07, DAS D33): conversaciones y mensajes de cada usuario con el asistente, y su uso diario.
-- Migración aditiva: no modifica tablas existentes. Se borran junto con la cuenta (CASCADE).
CREATE TABLE conversaciones (
  id INTEGER NOT NULL AUTO_INCREMENT,
  usuario_id INTEGER NOT NULL,
  titulo VARCHAR(80) NOT NULL,
  fijada BOOLEAN NOT NULL DEFAULT false,
  fecha_inicio DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX conversaciones_usuario_id_fecha_actualizacion_idx(usuario_id, fecha_actualizacion),
  PRIMARY KEY(id),
  CONSTRAINT conversaciones_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE mensajes (
  id INTEGER NOT NULL AUTO_INCREMENT,
  conversacion_id INTEGER NOT NULL,
  remitente VARCHAR(20) NOT NULL,
  contenido TEXT NOT NULL,
  fecha DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX mensajes_conversacion_id_fecha_idx(conversacion_id, fecha),
  PRIMARY KEY(id),
  CONSTRAINT mensajes_conversacion_id_fkey FOREIGN KEY(conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT mensaje_remitente CHECK(remitente IN ('usuario', 'asistente'))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Uso diario del asistente por usuario (límite de mensajes). Sin contenido: borrar conversaciones no devuelve el cupo.
CREATE TABLE uso_asistente (
  usuario_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  mensajes SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY(usuario_id),
  CONSTRAINT uso_asistente_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

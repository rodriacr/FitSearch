-- Mejoras del 09-11-2026: agenda semanal con fechas bloqueadas, lista de espera, reserva con modalidad
-- y primera visita, reseñas verificadas por una cita, experiencia y preferencias del profesional (FS-HU-29) y un chat por
-- usuario y profesional (FS-HU-31). Solo agrega columnas opcionales o con valor por defecto y tablas nuevas: no borra datos.

ALTER TABLE profesionales
  ADD COLUMN anios_experiencia TINYINT NULL,
  ADD COLUMN formacion JSON NULL,
  ADD COLUMN atiende_a JSON NULL,
  ADD COLUMN registro_sis VARCHAR(20) NULL,
  ADD COLUMN precio_desde INTEGER NULL,
  ADD COLUMN confirmacion_automatica BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN avisos_correo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN recordatorios BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE reservas
  ADD COLUMN modalidad VARCHAR(20) NULL,
  ADD COLUMN primera_visita BOOLEAN NULL,
  ADD COLUMN cancelada_por VARCHAR(20) NULL,
  ADD COLUMN fecha_cambio DATETIME(0) NULL,
  ADD COLUMN recordatorio_enviado DATETIME(0) NULL;

ALTER TABLE resenas
  ADD COLUMN reserva_id INTEGER NULL,
  ADD INDEX resenas_reserva_id_idx(reserva_id),
  ADD CONSTRAINT resenas_reserva_id_fkey FOREIGN KEY(reserva_id) REFERENCES reservas(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE bloqueos_agenda (
  id INTEGER NOT NULL AUTO_INCREMENT,
  profesional_id INTEGER NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  motivo VARCHAR(100) NULL,
  fecha_creacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX bloqueos_agenda_profesional_id_fecha_inicio_idx(profesional_id, fecha_inicio),
  PRIMARY KEY(id),
  CONSTRAINT bloqueos_agenda_profesional_id_fkey FOREIGN KEY(profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT bloqueo_fechas CHECK(fecha_fin >= fecha_inicio)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE lista_espera (
  id INTEGER NOT NULL AUTO_INCREMENT,
  usuario_id INTEGER NOT NULL,
  profesional_id INTEGER NOT NULL,
  fecha_creacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX lista_espera_usuario_id_profesional_id_key(usuario_id, profesional_id),
  INDEX lista_espera_profesional_id_idx(profesional_id),
  PRIMARY KEY(id),
  CONSTRAINT lista_espera_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT lista_espera_profesional_id_fkey FOREIGN KEY(profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Un chat por usuario y profesional. borrado_*_hasta guarda el último mensaje que cada uno eliminó para sí (0: ninguno)
-- y borrado_*_en, cuándo lo hizo (para ocultar también los avisos de reserva anteriores).
CREATE TABLE chats (
  id INTEGER NOT NULL AUTO_INCREMENT,
  usuario_id INTEGER NOT NULL,
  profesional_id INTEGER NOT NULL,
  borrado_usuario_hasta INTEGER NOT NULL DEFAULT 0,
  borrado_usuario_en DATETIME(0) NULL,
  borrado_profesional_hasta INTEGER NOT NULL DEFAULT 0,
  borrado_profesional_en DATETIME(0) NULL,
  fecha_creacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX chats_usuario_id_profesional_id_key(usuario_id, profesional_id),
  INDEX chats_profesional_id_idx(profesional_id),
  PRIMARY KEY(id),
  CONSTRAINT chats_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chats_profesional_id_fkey FOREIGN KEY(profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE mensajes_chat (
  id INTEGER NOT NULL AUTO_INCREMENT,
  chat_id INTEGER NOT NULL,
  autor_id INTEGER NOT NULL,
  texto VARCHAR(1000) NOT NULL,
  leido BOOLEAN NOT NULL DEFAULT false,
  fecha_creacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX mensajes_chat_chat_id_id_idx(chat_id, id),
  INDEX mensajes_chat_autor_id_idx(autor_id),
  PRIMARY KEY(id),
  CONSTRAINT mensajes_chat_chat_id_fkey FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT mensajes_chat_autor_id_fkey FOREIGN KEY(autor_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

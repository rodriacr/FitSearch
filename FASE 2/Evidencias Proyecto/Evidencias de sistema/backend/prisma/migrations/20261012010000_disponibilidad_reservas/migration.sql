CREATE TABLE disponibilidades (
  id INTEGER NOT NULL AUTO_INCREMENT,
  profesional_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME(0) NOT NULL,
  hora_fin TIME(0) NOT NULL,
  INDEX disponibilidades_profesional_id_fecha_idx(profesional_id, fecha),
  PRIMARY KEY(id),
  CONSTRAINT disponibilidades_profesional_id_fkey FOREIGN KEY(profesional_id) REFERENCES profesionales(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT disponibilidad_horas CHECK(hora_fin > hora_inicio)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE reservas (
  id INTEGER NOT NULL AUTO_INCREMENT,
  usuario_id INTEGER NOT NULL,
  disponibilidad_id INTEGER NOT NULL,
  mensaje VARCHAR(500) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  fecha_creacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX reservas_disponibilidad_id_estado_idx(disponibilidad_id, estado),
  INDEX reservas_usuario_id_idx(usuario_id),
  PRIMARY KEY(id),
  CONSTRAINT reservas_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT reservas_disponibilidad_id_fkey FOREIGN KEY(disponibilidad_id) REFERENCES disponibilidades(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT reserva_estado CHECK(estado IN ('pendiente', 'confirmada', 'cancelada'))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Plan de alimentación de cada usuario (11-11-2026; pedido del PO).
-- planes_personalizados: la lista de repartos propios con nombre (porcentajes entre 5 y 80 que suman 100), para ir
-- cambiando entre ellos.
-- planes_alimentacion: qué plan rige desde cada día. «meta»: calorías y reparto según la meta del perfil, sin
-- porcentajes. «personalizado»: copia los porcentajes del plan elegido, así los días pasados conservan su reparto aunque
-- ese plan se edite o se borre (al borrarlo, plan_personalizado_id queda en NULL).
-- MySQL no permite que una restricción CHECK use una columna con acción ON DELETE: que un plan «meta» no apunte a un
-- plan personalizado lo asegura el servicio.
CREATE TABLE planes_personalizados (
  id INTEGER NOT NULL AUTO_INCREMENT,
  usuario_id INTEGER NOT NULL,
  nombre VARCHAR(40) NOT NULL,
  proteinas_pct INTEGER NOT NULL,
  carbohidratos_pct INTEGER NOT NULL,
  grasas_pct INTEGER NOT NULL,
  fecha_creacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX planes_personalizados_usuario_id_nombre_key(usuario_id, nombre),
  PRIMARY KEY(id),
  CONSTRAINT planes_personalizados_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT planes_personalizados_porcentajes_chk CHECK (
    proteinas_pct BETWEEN 5 AND 80 AND carbohidratos_pct BETWEEN 5 AND 80 AND grasas_pct BETWEEN 5 AND 80
    AND proteinas_pct + carbohidratos_pct + grasas_pct = 100
  )
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE planes_alimentacion (
  id INTEGER NOT NULL AUTO_INCREMENT,
  usuario_id INTEGER NOT NULL,
  desde DATE NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  plan_personalizado_id INTEGER NULL,
  proteinas_pct INTEGER NULL,
  carbohidratos_pct INTEGER NULL,
  grasas_pct INTEGER NULL,
  fecha_actualizacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX planes_alimentacion_usuario_id_desde_key(usuario_id, desde),
  INDEX planes_alimentacion_plan_personalizado_id_idx(plan_personalizado_id),
  PRIMARY KEY(id),
  CONSTRAINT planes_alimentacion_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT planes_alimentacion_plan_personalizado_id_fkey FOREIGN KEY(plan_personalizado_id) REFERENCES planes_personalizados(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT planes_alimentacion_tipo_chk CHECK (tipo IN ('meta', 'personalizado')),
  CONSTRAINT planes_alimentacion_porcentajes_chk CHECK (
    (tipo = 'meta' AND proteinas_pct IS NULL AND carbohidratos_pct IS NULL AND grasas_pct IS NULL)
    OR (tipo = 'personalizado'
      AND proteinas_pct BETWEEN 5 AND 80 AND carbohidratos_pct BETWEEN 5 AND 80 AND grasas_pct BETWEEN 5 AND 80
      AND proteinas_pct + carbohidratos_pct + grasas_pct = 100)
  )
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Meta de peso (11-11-2026): peso al que se quiere llegar y a qué ritmo por semana. Solo para «Bajar de peso» o
-- «Aumentar masa muscular»; se guarda el peso con que se empezó para mostrar el avance. Si la meta del perfil cambia,
-- esta fila deja de aplicarse (objetivo distinto) hasta que se actualice.
CREATE TABLE metas_peso (
  id INTEGER NOT NULL AUTO_INCREMENT,
  usuario_id INTEGER NOT NULL,
  objetivo VARCHAR(30) NOT NULL,
  peso_inicial_kg DECIMAL(5, 2) NOT NULL,
  peso_objetivo_kg DECIMAL(5, 2) NOT NULL,
  ritmo_semanal_kg DECIMAL(3, 2) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_actualizacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX metas_peso_usuario_id_key(usuario_id),
  PRIMARY KEY(id),
  CONSTRAINT metas_peso_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT metas_peso_objetivo_chk CHECK (
    (objetivo = 'bajar_peso' AND peso_objetivo_kg < peso_inicial_kg)
    OR (objetivo = 'aumentar_masa' AND peso_objetivo_kg > peso_inicial_kg)
  ),
  CONSTRAINT metas_peso_valores_chk CHECK (
    peso_inicial_kg BETWEEN 30 AND 300 AND peso_objetivo_kg BETWEEN 30 AND 300 AND ritmo_semanal_kg BETWEEN 0.1 AND 1
  )
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

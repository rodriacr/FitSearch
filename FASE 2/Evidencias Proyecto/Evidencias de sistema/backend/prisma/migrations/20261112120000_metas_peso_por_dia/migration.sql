-- Meta de peso por día (revisión del PR #52, 12-11-2026). Antes había una sola fila por usuario y los días pasados
-- leían la meta de hoy: guardar una meta nueva cambiaba el objetivo de calorías de ayer. Ahora cada cambio es una fila
-- que rige desde su día, como el plan de alimentación; quitar la meta deja una fila con activa = FALSE desde ese día.
-- Solo agrega columnas e índices: las metas existentes rigen desde su fecha de inicio.

ALTER TABLE metas_peso
  ADD COLUMN desde DATE NULL AFTER usuario_id,
  ADD COLUMN activa BOOLEAN NOT NULL DEFAULT TRUE AFTER desde;

UPDATE metas_peso SET desde = fecha_inicio WHERE desde IS NULL;

ALTER TABLE metas_peso MODIFY desde DATE NOT NULL;

-- El índice nuevo empieza por usuario_id, así la llave foránea sigue teniendo índice al quitar el único por usuario.
CREATE UNIQUE INDEX metas_peso_usuario_id_desde_key ON metas_peso(usuario_id, desde);
DROP INDEX metas_peso_usuario_id_key ON metas_peso;

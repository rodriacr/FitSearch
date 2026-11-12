-- Reintento de los avisos por correo (revisión del PR #49). Mientras se envía un recordatorio o un aviso de la lista de
-- espera, la fila guarda la hora del intento: dos procesos no pueden tomar la misma y, si el correo falla o el proceso
-- se cae, la marca se suelta (o vence a los 15 minutos) y se vuelve a intentar. Solo agrega columnas opcionales.
ALTER TABLE reservas
  ADD COLUMN recordatorio_intento DATETIME(0) NULL;

ALTER TABLE lista_espera
  ADD COLUMN aviso_intento DATETIME(0) NULL;

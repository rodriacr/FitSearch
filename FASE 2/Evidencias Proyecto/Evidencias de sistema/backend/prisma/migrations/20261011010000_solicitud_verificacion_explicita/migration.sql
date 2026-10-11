-- La ficha no entra en revisión hasta que el profesional envía una solicitud.
ALTER TABLE profesionales MODIFY estado_verificacion VARCHAR(20) NOT NULL DEFAULT 'sin_solicitud';

-- Repara pendientes creados por defecto y solicitudes cerradas por cambio de especialidad.
-- Conserva las verificaciones existentes y las solicitudes enviadas después del último cierre.
UPDATE profesionales p
JOIN (
  SELECT f.id,
    MAX(CASE WHEN eventos.accion = 'solicitud' THEN eventos.orden ELSE 0 END) AS ultimo_envio,
    MAX(CASE WHEN eventos.accion IN ('rechazar', 'revocar', 'cambio_especialidad') THEN eventos.orden ELSE 0 END) AS ultimo_cierre
  FROM profesionales f
  LEFT JOIN JSON_TABLE(COALESCE(f.historial_verificacion, JSON_ARRAY()), '$[*]'
    COLUMNS (orden FOR ORDINALITY, accion VARCHAR(30) PATH '$.accion')) eventos ON TRUE
  GROUP BY f.id
) historial ON historial.id = p.id
SET p.estado_verificacion = CASE WHEN historial.ultimo_cierre > 0 THEN 'rechazado' ELSE 'sin_solicitud' END
WHERE p.verificado = FALSE AND p.estado_verificacion = 'pendiente'
  AND (historial.ultimo_envio = 0 OR historial.ultimo_envio <= historial.ultimo_cierre);

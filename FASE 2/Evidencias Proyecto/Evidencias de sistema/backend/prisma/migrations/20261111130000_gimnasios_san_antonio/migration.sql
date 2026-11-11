-- Gimnasios de San Antonio, Región de Valparaíso (11-11-2026; pedido del PO) y su cuenta de Instagram.
-- Migración aditiva: no borra ni cambia datos existentes.
--
-- 1. Cuenta de Instagram de cada establecimiento: solo el usuario, sin «@» ni enlace (máximo 30 caracteres, el largo
--    que permite Instagram). El administrador la edita en Contenido.
ALTER TABLE `establecimientos` ADD COLUMN `instagram` VARCHAR(30) NULL;

-- 2. Gimnasios de la comuna de San Antonio (incluye Llolleo y Barrancas). Nombres y direcciones del directorio público
--    de gimnasios de San Antonio de AgendaPro (revisado el 11-11-2026); Instagram, de los perfiles públicos de cada
--    gimnasio (solo de los que tienen una cuenta que muestra esa misma dirección o nombre). Coordenadas de OpenStreetMap
--    (Nominatim) con el mismo servicio de la app: la mayoría a nivel de calle, por eso el marcador queda en la calle y no
--    exactamente en el número. Gimnasio Arrayán se corre unos metros para que su marcador no tape al de Olimpo (misma
--    calle, a 16 números). Se insertan solo si no existen (mismo nombre y dirección), para poder aplicarla de nuevo.
INSERT INTO `establecimientos` (`nombre`, `categoria`, `comuna`, `direccion`, `ubicacion_lat`, `ubicacion_lng`, `activo`, `instagram`)
SELECT datos.nombre, 'gimnasio', 'San Antonio', datos.direccion, datos.lat, datos.lng, true, datos.instagram
FROM (
  SELECT 'Gimnasio Pacific San Antonio' AS nombre, 'Centenario 396' AS direccion, -33.5770679 AS lat, -71.6040607 AS lng, 'pacific_sanantonio' AS instagram
  UNION ALL SELECT 'Gimnasio Power Fitness', 'Lautaro 1940, Barrancas', -33.5986289, -71.6108823, 'powerfitnesssanantonio'
  UNION ALL SELECT 'Olimpo Gimnasio', 'Del Canelo 269, Llolleo', -33.6110956, -71.5980704, 'gimnasio_olimpo_'
  UNION ALL SELECT 'San Antonio Training Box', 'La Marina 1875, Barrancas', -33.5974610, -71.6124368, 'sanantoniotraining'
  UNION ALL SELECT 'Gimnasio Esparta', 'Perquenco 1172', -33.5994015, -71.5995338, NULL
  UNION ALL SELECT 'SO2 Fitness', 'José Miguel Carrera 425, Llolleo', -33.6109424, -71.6093377, NULL
  UNION ALL SELECT 'EBody Llolleo', 'Santa Lucía 410, Llolleo', -33.6123506, -71.6136315, NULL
  UNION ALL SELECT 'American Fit', 'Sanfuentes 1410', -33.6014095, -71.6145597, NULL
  UNION ALL SELECT 'Oranges Fitness Sport Gym Club', 'José Manuel Orella 359', -33.5974185, -71.5998462, NULL
  UNION ALL SELECT 'Gimnasio Arrayán', 'Del Canelo 285, Llolleo', -33.6112600, -71.5979300, NULL
  UNION ALL SELECT 'Fitness Estudio', 'El Sauce 485, Llolleo', -33.6138616, -71.5986725, NULL
) AS datos
WHERE NOT EXISTS (
  SELECT 1 FROM `establecimientos` e WHERE e.`nombre` = datos.nombre AND e.`direccion` = datos.direccion
);

-- Gestor de alimentación (FS-HU-09 y FS-HU-10, DAS CU-06): catálogo de alimentos y comidas registradas por cada usuario.
-- Migración aditiva: crea dos tablas y agrega a mensajes la lista de alimentos que el asistente agregó en esa respuesta.

-- Catálogo de alimentos con su aporte por 100 g de porción comestible. Valores de referencia aproximados, redondeados a
-- partir de USDA FoodData Central (dominio público); las preparaciones chilenas usan el alimento más parecido. Los
-- sinónimos permiten encontrar el alimento con las palabras de uso común (por ejemplo, «pollo» o «palta»).
CREATE TABLE alimentos (
  id INTEGER NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  sinonimos VARCHAR(255) NOT NULL DEFAULT '',
  calorias DECIMAL(6, 1) NOT NULL,
  proteinas_g DECIMAL(5, 1) NOT NULL,
  carbohidratos_g DECIMAL(5, 1) NOT NULL,
  grasas_g DECIMAL(5, 1) NOT NULL,
  UNIQUE INDEX alimentos_nombre_key(nombre),
  PRIMARY KEY(id),
  CONSTRAINT alimento_valores CHECK(calorias >= 0 AND proteinas_g >= 0 AND carbohidratos_g >= 0 AND grasas_g >= 0)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO alimentos (nombre, sinonimos, calorias, proteinas_g, carbohidratos_g, grasas_g) VALUES
  ('Pechuga de pollo cocida', 'pollo, pechuga, pollo a la plancha, pollo asado', 165, 31.0, 0, 3.6),
  ('Trutro de pollo cocido, sin piel', 'trutro, muslo de pollo, pierna de pollo', 209, 25.9, 0, 10.9),
  ('Huevo cocido', 'huevo, huevos, huevo duro', 155, 12.6, 1.1, 10.6),
  ('Clara de huevo', 'clara, claras', 52, 10.9, 0.7, 0.2),
  ('Carne molida de vacuno 10 % grasa, cocida', 'carne, carne molida, vacuno, res', 217, 26.1, 0, 11.8),
  ('Salmón cocido', 'salmon, salmón al horno', 206, 22.1, 0, 12.4),
  ('Atún en agua, escurrido', 'atun, atún, atún en lata', 116, 25.5, 0, 0.8),
  ('Pescado blanco cocido (merluza o reineta)', 'pescado, merluza, reineta', 105, 22.8, 0, 0.9),
  ('Leche entera', 'leche', 61, 3.2, 4.8, 3.3),
  ('Leche descremada', 'leche descremada, leche sin grasa', 34, 3.4, 5.0, 0.1),
  ('Yogur natural', 'yogur, yogurt, yoghurt', 61, 3.5, 4.7, 3.3),
  ('Yogur griego natural', 'yogur griego, yogurt griego', 97, 9.0, 4.0, 5.0),
  ('Queso gauda', 'queso, queso gouda, queso mantecoso', 356, 24.9, 2.2, 27.4),
  ('Queso cottage', 'cottage', 98, 11.1, 3.4, 4.3),
  ('Mantequilla', 'mantequilla', 717, 0.9, 0.1, 81.1),
  ('Avena en hojuelas', 'avena, hojuelas de avena', 389, 16.9, 66.3, 6.9),
  ('Arroz blanco cocido', 'arroz', 130, 2.7, 28.2, 0.3),
  ('Arroz integral cocido', 'arroz integral', 123, 2.7, 25.6, 1.0),
  ('Fideos cocidos', 'fideos, pasta, tallarines, spaghetti', 158, 5.8, 30.9, 0.9),
  ('Pan blanco (marraqueta)', 'pan, marraqueta, pan batido, pan blanco', 266, 7.6, 49.4, 3.3),
  ('Pan integral', 'pan integral, pan de molde integral', 252, 12.4, 42.7, 3.5),
  ('Quinoa cocida', 'quinoa, quínoa', 120, 4.4, 21.3, 1.9),
  ('Granola', 'granola', 489, 13.7, 53.9, 24.3),
  ('Choclo cocido', 'choclo, maíz, maiz', 96, 3.4, 21.0, 1.5),
  ('Lentejas cocidas', 'lentejas', 116, 9.0, 20.1, 0.4),
  ('Porotos negros cocidos', 'porotos, frijoles, porotos negros', 132, 8.9, 23.7, 0.5),
  ('Garbanzos cocidos', 'garbanzos', 164, 8.9, 27.4, 2.6),
  ('Papa cocida', 'papa, papas, patata', 87, 1.9, 20.1, 0.1),
  ('Camote cocido', 'camote, batata', 90, 2.0, 20.7, 0.2),
  ('Papas fritas', 'papas fritas, papitas fritas', 312, 3.4, 41.4, 14.7),
  ('Lechuga', 'lechuga', 15, 1.4, 2.9, 0.2),
  ('Tomate', 'tomate, tomates', 18, 0.9, 3.9, 0.2),
  ('Zanahoria', 'zanahoria, zanahorias', 41, 0.9, 9.6, 0.2),
  ('Brócoli cocido', 'brocoli, brócoli', 35, 2.4, 7.2, 0.4),
  ('Espinaca', 'espinaca, espinacas', 23, 2.9, 3.6, 0.4),
  ('Pepino', 'pepino', 15, 0.7, 3.6, 0.1),
  ('Cebolla', 'cebolla', 40, 1.1, 9.3, 0.1),
  ('Zapallo italiano', 'zapallo italiano, zucchini, calabacín', 17, 1.2, 3.1, 0.3),
  ('Palta', 'palta, aguacate', 160, 2.0, 8.5, 14.7),
  ('Plátano', 'platano, plátano, banana, banano', 89, 1.1, 22.8, 0.3),
  ('Manzana', 'manzana, manzanas', 52, 0.3, 13.8, 0.2),
  ('Naranja', 'naranja, naranjas', 47, 0.9, 11.8, 0.1),
  ('Pera', 'pera, peras', 57, 0.4, 15.2, 0.1),
  ('Frutillas', 'frutilla, frutillas, fresas', 32, 0.7, 7.7, 0.3),
  ('Arándanos', 'arandanos, arándanos, berries, frutos rojos', 57, 0.7, 14.5, 0.3),
  ('Uvas', 'uva, uvas', 69, 0.7, 18.1, 0.2),
  ('Kiwi', 'kiwi', 61, 1.1, 14.7, 0.5),
  ('Almendras', 'almendras', 579, 21.2, 21.6, 49.9),
  ('Nueces', 'nueces, nuez', 654, 15.2, 13.7, 65.2),
  ('Maní', 'mani, maní, cacahuate', 567, 25.8, 16.1, 49.2),
  ('Mantequilla de maní', 'mantequilla de mani, crema de maní', 588, 25.1, 19.6, 50.4),
  ('Aceite de oliva', 'aceite, aceite de oliva', 884, 0, 0, 100),
  ('Azúcar', 'azucar, azúcar', 387, 0, 100, 0),
  ('Miel', 'miel', 304, 0.3, 82.4, 0),
  ('Chocolate amargo 70 %', 'chocolate, chocolate amargo', 598, 7.8, 45.9, 42.6),
  ('Jugo de naranja', 'jugo, jugo de naranja', 45, 0.7, 10.4, 0.2),
  ('Bebida cola', 'bebida, gaseosa, coca cola', 42, 0, 10.6, 0),
  ('Café negro', 'cafe, café', 1, 0.1, 0, 0);

-- Comidas registradas por cada usuario (DAS, tabla registro_comida). Cada fila es un alimento con sus gramos y el aporte
-- calculado al registrarlo, para que el historial no cambie si después se corrige el catálogo. momento: catálogo de
-- shared/reglas.json; origen: manual (pantalla Comidas) o asistente (agregado desde el chat).
CREATE TABLE registro_comida (
  id INTEGER NOT NULL AUTO_INCREMENT,
  usuario_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  momento VARCHAR(20) NOT NULL,
  alimento_id INTEGER NULL,
  descripcion_alimento VARCHAR(255) NOT NULL,
  gramos DECIMAL(6, 1) NOT NULL,
  calorias INTEGER NULL,
  proteinas_g DECIMAL(6, 2) NULL,
  carbohidratos_g DECIMAL(6, 2) NULL,
  grasas_g DECIMAL(6, 2) NULL,
  origen VARCHAR(20) NOT NULL DEFAULT 'manual',
  fecha_creacion DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX registro_comida_usuario_id_fecha_idx(usuario_id, fecha),
  INDEX registro_comida_alimento_id_idx(alimento_id),
  PRIMARY KEY(id),
  CONSTRAINT registro_comida_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT registro_comida_alimento_id_fkey FOREIGN KEY(alimento_id) REFERENCES alimentos(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT registro_comida_momento CHECK(momento IN ('desayuno', 'media_manana', 'almuerzo', 'merienda', 'cena')),
  CONSTRAINT registro_comida_gramos CHECK(gramos > 0),
  CONSTRAINT registro_comida_origen CHECK(origen IN ('manual', 'asistente'))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alimentos que el asistente agregó a las comidas en esa respuesta (FS-HU-09), para mostrarlos en el chat.
ALTER TABLE `mensajes` ADD COLUMN `comidas_agregadas` JSON NULL;

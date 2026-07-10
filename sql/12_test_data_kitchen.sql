-- ============================================================================
-- DATOS DE EJEMPLO - MÓDULO DE COCINA
-- Sistema PAE - Programa de Alimentación Escolar
-- Resolución 0003 de 2026
-- ============================================================================
-- Este script crea:
-- - 50 ítems de cocina con información nutricional completa
-- - 1 ciclo de menú de 20 días
-- - 20 minutas (desayuno y almuerzo) con sus respectivos ítems
-- ============================================================================

-- Limpiar datos anteriores (solo para testing)
DELETE FROM menu_items;
DELETE FROM menus;
DELETE FROM menu_cycles;
DELETE FROM items;

-- ============================================================================
-- CONFIGURACIÓN DE PAE_ID
-- ============================================================================
-- Usar el PAE existente con ID = 3
SET @pae_id = 3;

SELECT CONCAT('Usando PAE ID: ', @pae_id) as 'Configuración';


-- ============================================================================
-- ÍTEMS DE COCINA (50 ítems variados)
-- ============================================================================

-- CEREALES Y TUBÉRCULOS (10 ítems)
INSERT INTO items (pae_id, code, name, description, food_group_id, measurement_unit_id, 
    gross_weight, net_weight, waste_percentage, calories, proteins, carbohydrates, fats, 
    fiber, iron, calcium, sodium, vitamin_a, vitamin_c, status) VALUES
(@pae_id, 'CER-001', 'ARROZ BLANCO', 'Arroz blanco de primera calidad', 1, 1, 1000, 1000, 0, 130, 2.7, 28.2, 0.3, 0.4, 0.8, 10, 1, 0, 0, 'ACTIVO'),
(@pae_id, 'CER-002', 'PASTA ESPAGUETI', 'Pasta de trigo enriquecida', 1, 1, 1000, 1000, 0, 371, 13, 75, 1.5, 3.2, 3.3, 21, 6, 0, 0, 'ACTIVO'),
(@pae_id, 'CER-003', 'PAPA CRIOLLA', 'Papa criolla fresca', 1, 1, 1000, 850, 15, 77, 2, 17, 0.1, 2.2, 0.8, 12, 6, 0, 19.7, 'ACTIVO'),
(@pae_id, 'CER-004', 'YUCA', 'Yuca fresca pelada', 1, 1, 1000, 750, 25, 160, 1.4, 38.1, 0.3, 1.8, 0.3, 16, 14, 13, 20.6, 'ACTIVO'),
(@pae_id, 'CER-005', 'PLÁTANO VERDE', 'Plátano verde para cocinar', 1, 1, 1000, 650, 35, 122, 1.3, 31.9, 0.4, 2.3, 0.6, 3, 4, 1127, 18.4, 'ACTIVO'),
(@pae_id, 'CER-006', 'AREPA DE MAÍZ', 'Arepa de maíz blanco', 1, 5, 100, 100, 0, 218, 4.5, 45, 1.2, 2.8, 1.5, 80, 350, 0, 0, 'ACTIVO'),
(@pae_id, 'CER-007', 'PAN INTEGRAL', 'Pan integral tajado', 1, 5, 500, 500, 0, 247, 8.5, 41, 3.5, 6.5, 2.5, 60, 450, 0, 0, 'ACTIVO'),
(@pae_id, 'CER-008', 'AVENA EN HOJUELAS', 'Avena en hojuelas natural', 1, 1, 1000, 1000, 0, 389, 16.9, 66.3, 6.9, 10.6, 4.7, 54, 2, 0, 0, 'ACTIVO'),
(@pae_id, 'CER-009', 'MAÍZ PIRA', 'Maíz pira para palomitas', 1, 1, 1000, 1000, 0, 382, 12.9, 74.3, 4.7, 15.1, 2.7, 7, 7, 214, 0, 'ACTIVO'),
(@pae_id, 'CER-010', 'ÑAME', 'Ñame fresco pelado', 1, 1, 1000, 800, 20, 118, 1.5, 27.9, 0.2, 4.1, 0.5, 17, 9, 138, 17.1, 'ACTIVO');

-- ALIMENTOS PROTEICOS (12 ítems)
INSERT INTO items (pae_id, code, name, description, food_group_id, measurement_unit_id,
    gross_weight, net_weight, waste_percentage, calories, proteins, carbohydrates, fats,
    fiber, iron, calcium, sodium, vitamin_a, vitamin_c, contains_eggs, status) VALUES
(@pae_id, 'PRO-001', 'POLLO PECHUGA', 'Pechuga de pollo sin piel', 2, 1, 1000, 850, 15, 165, 31, 0, 3.6, 0, 0.9, 15, 74, 21, 1.6, 0, 'ACTIVO'),
(@pae_id, 'PRO-002', 'CARNE DE RES MOLIDA', 'Carne molida magra', 2, 1, 1000, 1000, 0, 250, 26, 0, 15, 0, 2.6, 18, 75, 0, 0, 0, 'ACTIVO'),
(@pae_id, 'PRO-003', 'HUEVO', 'Huevo de gallina fresco', 2, 5, 60, 50, 16.7, 155, 13, 1.1, 11, 0, 1.8, 56, 124, 520, 0, 1, 'ACTIVO'),
(@pae_id, 'PRO-004', 'FRIJOL ROJO', 'Frijol rojo seco', 2, 1, 1000, 1000, 0, 333, 23.6, 60.3, 1.2, 15.2, 8.2, 143, 12, 0, 4.5, 0, 'ACTIVO'),
(@pae_id, 'PRO-005', 'LENTEJA', 'Lenteja seca', 2, 1, 1000, 1000, 0, 352, 25.8, 63.4, 1.1, 10.7, 7.5, 56, 6, 39, 4.5, 0, 'ACTIVO'),
(@pae_id, 'PRO-006', 'GARBANZO', 'Garbanzo seco', 2, 1, 1000, 1000, 0, 364, 19.3, 60.7, 6.0, 17.4, 6.2, 105, 24, 67, 4, 0, 'ACTIVO'),
(@pae_id, 'PRO-007', 'ATÚN EN AGUA', 'Atún enlatado en agua', 2, 1, 170, 170, 0, 116, 25.5, 0, 0.8, 0, 1.3, 10, 354, 18, 0, 0, 'ACTIVO'),
(@pae_id, 'PRO-008', 'SALCHICHA DE POLLO', 'Salchicha de pollo', 2, 1, 1000, 1000, 0, 257, 12, 3.5, 22, 0, 1.2, 50, 950, 0, 0, 0, 'ACTIVO'),
(@pae_id, 'PRO-009', 'CARNE DE CERDO', 'Carne de cerdo magra', 2, 1, 1000, 900, 10, 242, 27.3, 0, 13.9, 0, 0.9, 19, 62, 2, 0.7, 0, 'ACTIVO'),
(@pae_id, 'PRO-010', 'PESCADO TILAPIA', 'Filete de tilapia fresco', 2, 1, 1000, 700, 30, 96, 20.1, 0, 1.7, 0, 0.6, 10, 52, 0, 0, 0, 'ACTIVO'),
(@pae_id, 'PRO-011', 'ARVEJA SECA', 'Arveja seca partida', 2, 1, 1000, 1000, 0, 341, 24.6, 60.4, 1.2, 25.5, 4.4, 55, 26, 149, 1.8, 0, 'ACTIVO'),
(@pae_id, 'PRO-012', 'BLANQUILLO', 'Blanquillo (frijol blanco)', 2, 1, 1000, 1000, 0, 337, 23.4, 60.3, 0.9, 15.2, 10.4, 240, 16, 0, 0, 0, 'ACTIVO');

-- LÁCTEOS (5 ítems)
INSERT INTO items (pae_id, code, name, description, food_group_id, measurement_unit_id,
    gross_weight, net_weight, waste_percentage, calories, proteins, carbohydrates, fats,
    fiber, iron, calcium, sodium, vitamin_a, vitamin_c, contains_lactose, status) VALUES
(@pae_id, 'LAC-001', 'LECHE ENTERA', 'Leche entera pasteurizada', 3, 3, 1000, 1000, 0, 61, 3.2, 4.8, 3.3, 0, 0.1, 113, 49, 46, 1.5, 1, 'ACTIVO'),
(@pae_id, 'LAC-002', 'QUESO CAMPESINO', 'Queso campesino fresco', 3, 1, 1000, 1000, 0, 264, 18, 3.1, 21, 0, 0.4, 674, 621, 173, 0, 1, 'ACTIVO'),
(@pae_id, 'LAC-003', 'YOGURT NATURAL', 'Yogurt natural sin azúcar', 3, 3, 1000, 1000, 0, 59, 3.5, 4.7, 3.3, 0, 0.1, 121, 46, 27, 0.5, 1, 'ACTIVO'),
(@pae_id, 'LAC-004', 'KUMIS', 'Kumis natural', 3, 3, 1000, 1000, 0, 78, 3.3, 11.4, 2.0, 0, 0.1, 120, 50, 15, 1.0, 1, 'ACTIVO'),
(@pae_id, 'LAC-005', 'LECHE EN POLVO', 'Leche entera en polvo', 3, 1, 1000, 1000, 0, 496, 26.3, 38.4, 26.7, 0, 0.5, 912, 371, 270, 7.0, 1, 'ACTIVO');

-- FRUTAS (8 ítems)
INSERT INTO items (pae_id, code, name, description, food_group_id, measurement_unit_id,
    gross_weight, net_weight, waste_percentage, calories, proteins, carbohydrates, fats,
    fiber, iron, calcium, sodium, vitamin_a, vitamin_c, status) VALUES
(@pae_id, 'FRU-001', 'BANANO', 'Banano maduro', 4, 5, 200, 130, 35, 89, 1.1, 22.8, 0.3, 2.6, 0.3, 5, 1, 64, 8.7, 'ACTIVO'),
(@pae_id, 'FRU-002', 'MANZANA', 'Manzana roja fresca', 4, 5, 200, 180, 10, 52, 0.3, 13.8, 0.2, 2.4, 0.1, 6, 1, 54, 4.6, 'ACTIVO'),
(@pae_id, 'FRU-003', 'NARANJA', 'Naranja valencia', 4, 5, 200, 120, 40, 47, 0.9, 11.8, 0.1, 2.4, 0.1, 40, 0, 225, 53.2, 'ACTIVO'),
(@pae_id, 'FRU-004', 'PAPAYA', 'Papaya madura', 4, 1, 1000, 650, 35, 43, 0.5, 10.8, 0.3, 1.7, 0.3, 20, 8, 950, 60.9, 'ACTIVO'),
(@pae_id, 'FRU-005', 'SANDÍA', 'Sandía fresca', 4, 1, 1000, 600, 40, 30, 0.6, 7.6, 0.2, 0.4, 0.2, 7, 1, 569, 8.1, 'ACTIVO'),
(@pae_id, 'FRU-006', 'GUAYABA', 'Guayaba madura', 4, 5, 100, 90, 10, 68, 2.6, 14.3, 0.9, 5.4, 0.3, 18, 2, 624, 228.3, 'ACTIVO'),
(@pae_id, 'FRU-007', 'PIÑA', 'Piña madura', 4, 1, 1000, 550, 45, 50, 0.5, 13.1, 0.1, 1.4, 0.3, 13, 1, 58, 47.8, 'ACTIVO'),
(@pae_id, 'FRU-008', 'MANDARINA', 'Mandarina fresca', 4, 5, 100, 70, 30, 53, 0.8, 13.3, 0.3, 1.8, 0.2, 37, 2, 681, 26.7, 'ACTIVO');

-- VERDURAS Y HORTALIZAS (10 ítems)
INSERT INTO items (pae_id, code, name, description, food_group_id, measurement_unit_id,
    gross_weight, net_weight, waste_percentage, calories, proteins, carbohydrates, fats,
    fiber, iron, calcium, sodium, vitamin_a, vitamin_c, status) VALUES
(@pae_id, 'VER-001', 'ZANAHORIA', 'Zanahoria fresca', 5, 1, 1000, 900, 10, 41, 0.9, 9.6, 0.2, 2.8, 0.3, 33, 69, 16706, 5.9, 'ACTIVO'),
(@pae_id, 'VER-002', 'TOMATE', 'Tomate chonto maduro', 5, 1, 1000, 950, 5, 18, 0.9, 3.9, 0.2, 1.2, 0.3, 10, 5, 833, 13.7, 'ACTIVO'),
(@pae_id, 'VER-003', 'CEBOLLA CABEZONA', 'Cebolla cabezona blanca', 5, 1, 1000, 900, 10, 40, 1.1, 9.3, 0.1, 1.7, 0.2, 23, 4, 2, 7.4, 'ACTIVO'),
(@pae_id, 'VER-004', 'LECHUGA', 'Lechuga crespa fresca', 5, 1, 1000, 800, 20, 15, 1.4, 2.9, 0.2, 1.3, 0.9, 36, 28, 7405, 9.2, 'ACTIVO'),
(@pae_id, 'VER-005', 'REPOLLO', 'Repollo verde', 5, 1, 1000, 850, 15, 25, 1.3, 5.8, 0.1, 2.5, 0.5, 40, 18, 98, 36.6, 'ACTIVO'),
(@pae_id, 'VER-006', 'HABICHUELA', 'Habichuela verde fresca', 5, 1, 1000, 900, 10, 31, 1.8, 7.0, 0.1, 3.4, 1.0, 37, 6, 690, 16.3, 'ACTIVO'),
(@pae_id, 'VER-007', 'AHUYAMA', 'Ahuyama (calabaza)', 5, 1, 1000, 750, 25, 26, 1.0, 6.5, 0.1, 0.5, 0.8, 21, 1, 7384, 9.0, 'ACTIVO'),
(@pae_id, 'VER-008', 'ESPINACA', 'Espinaca fresca', 5, 1, 1000, 900, 10, 23, 2.9, 3.6, 0.4, 2.2, 2.7, 99, 79, 9377, 28.1, 'ACTIVO'),
(@pae_id, 'VER-009', 'PEPINO COHOMBRO', 'Pepino cohombro fresco', 5, 1, 1000, 900, 10, 15, 0.7, 3.6, 0.1, 0.5, 0.3, 16, 2, 105, 2.8, 'ACTIVO'),
(@pae_id, 'VER-010', 'REMOLACHA', 'Remolacha fresca', 5, 1, 1000, 850, 15, 43, 1.6, 9.6, 0.2, 2.8, 0.8, 16, 78, 33, 4.9, 'ACTIVO');

-- GRASAS Y ACEITES (3 ítems)
INSERT INTO items (pae_id, code, name, description, food_group_id, measurement_unit_id,
    gross_weight, net_weight, waste_percentage, calories, proteins, carbohydrates, fats,
    fiber, iron, calcium, sodium, status) VALUES
(@pae_id, 'GRA-001', 'ACEITE VEGETAL', 'Aceite vegetal comestible', 6, 3, 1000, 1000, 0, 884, 0, 0, 100, 0, 0, 0, 0, 'ACTIVO'),
(@pae_id, 'GRA-002', 'MARGARINA', 'Margarina con sal', 6, 1, 1000, 1000, 0, 717, 0.2, 0.9, 80.5, 0, 0, 20, 943, 'ACTIVO'),
(@pae_id, 'GRA-003', 'MANTEQUILLA', 'Mantequilla con sal', 6, 1, 1000, 1000, 0, 717, 0.9, 0.1, 81.1, 0, 0.2, 24, 714, 'ACTIVO');

-- CONDIMENTOS Y ESPECIAS (2 ítems)
INSERT INTO items (pae_id, code, name, description, food_group_id, measurement_unit_id,
    gross_weight, net_weight, waste_percentage, calories, proteins, carbohydrates, fats,
    fiber, iron, calcium, sodium, status) VALUES
(@pae_id, 'CON-001', 'SAL', 'Sal de cocina yodada', 7, 1, 1000, 1000, 0, 0, 0, 0, 0, 0, 0.3, 24, 38758, 'ACTIVO'),
(@pae_id, 'CON-002', 'AJO', 'Ajo fresco pelado', 7, 1, 1000, 900, 10, 149, 6.4, 33.1, 0.5, 2.1, 1.7, 181, 17, 'ACTIVO');

-- ============================================================================
-- CICLO DE MENÚ (1 ciclo de 20 días)
-- ============================================================================

INSERT INTO menu_cycles (pae_id, name, description, start_date, end_date, status) VALUES
(@pae_id, 'CICLO ENERO 2026', 'Ciclo de menú para el mes de enero 2026 - 20 días escolares', '2026-01-06', '2026-01-31', 'ACTIVO');

SET @cycle_id = LAST_INSERT_ID();

-- ============================================================================
-- MINUTAS (20 días x 2 comidas = 40 minutas)
-- ============================================================================

-- DÍA 1
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, 1, 'DESAYUNO', 'Arepa con Huevo y Chocolate');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-006'), 1, 'Arepa asada'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-003'), 1, 'Huevo revuelto'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-001'), 200, 'Chocolate caliente');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, 1, 'ALMUERZO', 'Arroz con Pollo y Ensalada');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz blanco cocido'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-001'), 120, 'Pechuga a la plancha'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-001'), 50, 'Zanahoria rallada'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-004'), 30, 'Lechuga'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-001'), 1, 'Banano de postre');

-- DÍA 2
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-008'), 40, 'Avena en leche'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-001'), 200, 'Leche para la avena'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-007'), 60, 'Pan integral'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-002'), 30, 'Queso campesino');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-002'), 120, 'Pasta cocida'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-002'), 100, 'Carne molida en salsa'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-002'), 80, 'Tomate en salsa'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-003'), 30, 'Cebolla sofrita'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-003'), 1, 'Naranja');

-- DÍA 3
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-001'), 250, 'Chocolate caliente'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-002'), 80, 'Pandebono (queso + almidón)');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz blanco'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-004'), 100, 'Frijol rojo guisado'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-009'), 80, 'Carne de cerdo'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-005'), 80, 'Tajadas de plátano'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-004'), 100, 'Papaya');

-- DÍA 4
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-003'), 200, 'Yogurt natural'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-008'), 30, 'Avena como granola'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-001'), 1, 'Banano picado');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz con coco'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-010'), 120, 'Tilapia al horno'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-002'), 50, 'Tomate'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-009'), 40, 'Pepino'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-006'), 1, 'Guayaba');

-- DÍA 5
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-003'), 2, 'Huevos revueltos con tomate y cebolla'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-006'), 1, 'Arepa'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-001'), 200, 'Chocolate');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz blanco'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-005'), 120, 'Lentejas guisadas'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-001'), 50, 'Zanahoria cocida'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-005'), 40, 'Repollo'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-007'), 100, 'Piña');

-- DÍA 6
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-007'), 80, 'Pan integral'),
(@menu_id, (SELECT id FROM items WHERE code = 'GRA-003'), 10, 'Mantequilla'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-004'), 200, 'Kumis');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-007'), 100, 'Atún en agua'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-002'), 60, 'Tomate'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-006'), 50, 'Habichuela'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-002'), 1, 'Manzana');

-- DÍA 7
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-006'), 1, 'Arepa'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-002'), 40, 'Queso'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-001'), 200, 'Chocolate');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-001'), 100, 'Pollo en presa'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-003'), 100, 'Papa criolla'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-004'), 80, 'Yuca'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-005'), 60, 'Plátano verde'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-001'), 40, 'Zanahoria'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 100, 'Arroz blanco aparte'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-008'), 1, 'Mandarina');

-- DÍA 8
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-008'), 40, 'Avena'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-001'), 200, 'Leche'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-002'), 1, 'Manzana picada');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-006'), 100, 'Garbanzos guisados'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-002'), 80, 'Carne molida'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-007'), 60, 'Ahuyama'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-005'), 100, 'Sandía');

-- DÍA 9
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-007'), 60, 'Pan'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-003'), 1, 'Huevo cocido'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-003'), 2, 'Jugo de naranja natural');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-002'), 120, 'Pasta'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-001'), 100, 'Pollo desmenuzado'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-008'), 50, 'Espinaca'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-002'), 60, 'Tomate'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-001'), 1, 'Banano');

-- DÍA 10
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-003'), 200, 'Yogurt'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-009'), 30, 'Maíz pira inflado'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-006'), 1, 'Guayaba');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-012'), 120, 'Blanquillo guisado'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-010'), 50, 'Remolacha rallada'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-004'), 30, 'Lechuga'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-004'), 100, 'Papaya');

-- DÍA 11
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-001'), 250, 'Chocolate'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-002'), 60, 'Buñuelo (queso + almidón)');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-008'), 100, 'Salchicha de pollo'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-003'), 100, 'Papa criolla cocida'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-001'), 40, 'Zanahoria'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-007'), 100, 'Piña');

-- DÍA 12
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-008'), 40, 'Avena en leche'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-001'), 200, 'Leche'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-007'), 60, 'Pan integral');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-011'), 100, 'Arveja seca guisada'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-002'), 80, 'Carne molida'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-002'), 50, 'Tomate'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-003'), 1, 'Naranja');

-- DÍA 13
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-006'), 1, 'Arepa'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-003'), 1, 'Huevo'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-004'), 200, 'Kumis');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-002'), 120, 'Pasta'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-002'), 100, 'Carne molida en salsa'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-002'), 80, 'Tomate'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-004'), 30, 'Lechuga'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-002'), 1, 'Manzana');

-- DÍA 14
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-003'), 200, 'Yogurt'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-008'), 30, 'Avena'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-007'), 80, 'Piña picada');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-001'), 120, 'Pollo guisado'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-003'), 80, 'Papa criolla'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-001'), 50, 'Zanahoria'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-001'), 1, 'Banano');

-- DÍA 15
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-007'), 70, 'Pan'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-002'), 40, 'Queso'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-001'), 200, 'Chocolate');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-004'), 120, 'Frijol rojo'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-005'), 80, 'Plátano maduro frito'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-005'), 40, 'Repollo'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-006'), 1, 'Guayaba');

-- DÍA 16
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-008'), 40, 'Avena'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-001'), 200, 'Leche'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-003'), 1, 'Huevo cocido');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-010'), 120, 'Tilapia'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-006'), 60, 'Habichuela'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-001'), 40, 'Zanahoria'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-005'), 100, 'Sandía');

-- DÍA 17
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-001'), 250, 'Chocolate'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 50, 'Empanada (arroz + carne)'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-002'), 30, 'Carne para empanada');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-005'), 120, 'Lentejas'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-009'), 80, 'Carne de cerdo'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-007'), 50, 'Ahuyama'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-004'), 100, 'Papaya');

-- DÍA 18
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-004'), 200, 'Kumis'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-007'), 70, 'Pan');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-002'), 120, 'Pasta'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-007'), 100, 'Atún'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-002'), 60, 'Tomate'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-008'), 40, 'Espinaca'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-008'), 1, 'Mandarina');

-- DÍA 19
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-006'), 1, 'Arepa'),
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-002'), 40, 'Queso'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-003'), 2, 'Jugo de naranja');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-006'), 120, 'Garbanzos'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-001'), 50, 'Zanahoria'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-006'), 50, 'Habichuela'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-007'), 100, 'Piña');

-- DÍA 20
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'LAC-003'), 200, 'Yogurt'),
(@menu_id, (SELECT id FROM items WHERE code = 'CER-008'), 30, 'Avena'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-001'), 1, 'Banano');

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, , '', '');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'CER-001'), 150, 'Arroz'),
(@menu_id, (SELECT id FROM items WHERE code = 'PRO-001'), 120, 'Pollo'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-004'), 30, 'Lechuga'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-002'), 40, 'Tomate'),
(@menu_id, (SELECT id FROM items WHERE code = 'VER-009'), 30, 'Pepino'),
(@menu_id, (SELECT id FROM items WHERE code = 'FRU-002'), 1, 'Manzana');

-- ============================================================================
-- VERIFICACIÓN DE DATOS
-- ============================================================================

SELECT '=== RESUMEN DE DATOS CREADOS ===' as '';
SELECT COUNT(*) as 'Total Ítems' FROM items;
SELECT COUNT(*) as 'Total Ciclos' FROM menu_cycles;
SELECT COUNT(*) as 'Total Minutas' FROM menus;
SELECT COUNT(*) as 'Total Items en Minutas' FROM menu_items;

SELECT '=== ÍTEMS POR GRUPO ===' as '';
SELECT fg.name as 'Grupo', COUNT(i.id) as 'Cantidad'
FROM food_groups fg
LEFT JOIN items i ON fg.id = i.food_group_id
GROUP BY fg.id, fg.name
ORDER BY fg.name;

SELECT '=== MINUTAS POR TIPO ===' as '';
SELECT meal_type as 'Tipo Comida', COUNT(*) as 'Cantidad'
FROM menus
GROUP BY meal_type;

SELECT '=== EJEMPLO DE MINUTA ===' as '';
SELECT 
    m.day_number as 'Día',
    m.meal_type as 'Comida',
    m.name as 'Nombre Minuta',
    i.name as 'Ítem',
    mi.quantity_per_serving as 'Cantidad',
    mu.abbreviation as 'Unidad'
FROM menus m
INNER JOIN menu_items mi ON m.id = mi.menu_id
INNER JOIN items i ON mi.item_id = i.id
INNER JOIN measurement_units mu ON i.measurement_unit_id = mu.id
WHERE m.day_number = 1
ORDER BY m.meal_type, i.name;

-- ============================================================================
-- DATOS DE EJEMPLO - MÓDULO DE COCINA (VERSIÓN SIMPLIFICADA - 3 DÍAS)
-- Sistema PAE - Programa de Alimentación Escolar
-- ============================================================================

-- Limpiar datos anteriores
DELETE FROM menu_items;
DELETE FROM menus;
DELETE FROM menu_cycles;
DELETE FROM items WHERE pae_id = 3;

-- Configurar PAE ID
SET @pae_id = 3;

-- Crear Ciclo de Menú
INSERT INTO menu_cycles (pae_id, name, start_date, end_date, status) VALUES
(@pae_id, 'CICLO PRUEBA 2026', '2026-02-03', '2026-02-07', 'ACTIVO');
SET @cycle_id = LAST_INSERT_ID();

-- Crear algunos ítems básicos
INSERT INTO items (pae_id, code, name, food_group_id, measurement_unit_id, status) VALUES
(@pae_id, 'ARROZ', 'ARROZ BLANCO', 1, 1, 'ACTIVO'),
(@pae_id, 'POLLO', 'POLLO PECHUGA', 2, 1, 'ACTIVO'),
(@pae_id, 'HUEVO', 'HUEVO', 2, 5, 'ACTIVO'),
(@pae_id, 'LECHE', 'LECHE ENTERA', 3, 3, 'ACTIVO'),
(@pae_id, 'AREPA', 'AREPA DE MAÍZ', 1, 5, 'ACTIVO'),
(@pae_id, 'BANANO', 'BANANO', 4, 5, 'ACTIVO'),
(@pae_id, 'ZANAHORIA', 'ZANAHORIA', 5, 1, 'ACTIVO');

-- DÍA 1
INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, 1, 'DESAYUNO', 'Arepa con Huevo y Chocolate');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'AREPA' AND pae_id = @pae_id), 1),
(@menu_id, (SELECT id FROM items WHERE code = 'HUEVO' AND pae_id = @pae_id), 1),
(@menu_id, (SELECT id FROM items WHERE code = 'LECHE' AND pae_id = @pae_id), 200);

INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) VALUES
(@pae_id, @cycle_id, 1, 'ALMUERZO', 'Arroz con Pollo');
SET @menu_id = LAST_INSERT_ID();
INSERT INTO menu_items (menu_id, item_id, standard_quantity) VALUES
(@menu_id, (SELECT id FROM items WHERE code = 'ARROZ' AND pae_id = @pae_id), 150),
(@menu_id, (SELECT id FROM items WHERE code = 'POLLO' AND pae_id = @pae_id), 120),
(@menu_id, (SELECT id FROM items WHERE code = 'ZANAHORIA' AND pae_id = @pae_id), 50),
(@menu_id, (SELECT id FROM items WHERE code = 'BANANO' AND pae_id = @pae_id), 1);

-- Verificación
SELECT '=== RESUMEN ===' as '';
SELECT COUNT(*) as 'Ítems' FROM items WHERE pae_id = @pae_id;
SELECT COUNT(*) as 'Minutas' FROM menus WHERE pae_id = @pae_id;
SELECT COUNT(*) as 'Items en Minutas' FROM menu_items mi 
INNER JOIN menus m ON mi.menu_id = m.id WHERE m.pae_id = @pae_id;

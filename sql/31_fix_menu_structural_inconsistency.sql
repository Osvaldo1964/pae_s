-- =====================================================
-- MIGRACIÓN 31: CORRECCIÓN DE INCONSISTENCIA ESTRUCTURAL
-- =====================================================

-- 1. Añadir ration_type_id a la tabla 'menus'
-- Esto permite que una minuta diaria esté vinculada a un tipo de ración específico (ej: Almuerzo Regular vs Almuerzo Indígena)
SET @exist_menus := (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'menus' AND column_name = 'ration_type_id');
SET @sql_menus := IF (@exist_menus = 0, 'ALTER TABLE menus ADD COLUMN ration_type_id INT NULL AFTER cycle_id', 'SELECT "Column ration_type_id already exists in menus"');
PREPARE stmt_menus FROM @sql_menus;
EXECUTE stmt_menus;

-- Añadir FK para menus.ration_type_id
SET @exist_fk_menus := (SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_name = 'fk_menus_ration_type');
SET @sql_fk_menus := IF (@exist_fk_menus = 0, 'ALTER TABLE menus ADD CONSTRAINT fk_menus_ration_type FOREIGN KEY (ration_type_id) REFERENCES pae_ration_types(id) ON DELETE SET NULL', 'SELECT "FK already exists in menus"');
PREPARE stmt_fk_menus FROM @sql_fk_menus;
EXECUTE stmt_fk_menus;

-- 2. Añadir ration_type_id a la tabla 'menu_recipes' (Opcional pero recomendado para consistencia)
SET @exist_mr := (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'menu_recipes' AND column_name = 'ration_type_id');
SET @sql_mr := IF (@exist_mr = 0, 'ALTER TABLE menu_recipes ADD COLUMN ration_type_id INT NULL AFTER recipe_id', 'SELECT "Column ration_type_id already exists in menu_recipes"');
PREPARE stmt_mr FROM @sql_mr;
EXECUTE stmt_mr;

-- Añadir FK para menu_recipes.ration_type_id
SET @exist_fk_mr := (SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_name = 'fk_menu_recipes_ration_type');
SET @sql_fk_mr := IF (@exist_fk_mr = 0, 'ALTER TABLE menu_recipes ADD CONSTRAINT fk_menu_recipes_ration_type FOREIGN KEY (ration_type_id) REFERENCES pae_ration_types(id) ON DELETE SET NULL', 'SELECT "FK already exists in menu_recipes"');
PREPARE stmt_fk_mr FROM @sql_fk_mr;
EXECUTE stmt_fk_mr;

-- 3. Limpieza de huérfanos en menu_items (Si el usuario intentó meter IDs de recetas en tabla de ítems)
-- Esta consulta busca registros en menu_items cuyo item_id NO existe en la tabla items pero SI existe en la tabla recipes
-- y los elimina para evitar corromper la planilla de producción.
DELETE mi FROM menu_items mi
LEFT JOIN items i ON mi.item_id = i.id
JOIN recipes r ON mi.item_id = r.id
WHERE i.id IS NULL;

-- 4. Índices adicionales para rendimiento
CREATE INDEX idx_menus_ration_type ON menus(ration_type_id);
CREATE INDEX idx_menu_recipes_ration_type ON menu_recipes(ration_type_id);

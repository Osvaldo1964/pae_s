-- ============================================================================
-- RECOVERY MIGRACIÓN A GRUPOS ETARIOS 2026 (RESOLUCIÓN 0003)
-- Ejecutar este script si el original falló a mitad de camino
-- ============================================================================

-- 1. Asegurar que ENUMs en nutritional_parameters y menus estén correctos
ALTER TABLE nutritional_parameters 
MODIFY COLUMN age_group ENUM('PREESCOLAR', 'PRIMARIA_A', 'PRIMARIA_B', 'SECUNDARIA') NOT NULL;

ALTER TABLE menus 
MODIFY COLUMN age_group ENUM('PREESCOLAR', 'PRIMARIA_A', 'PRIMARIA_B', 'SECUNDARIA', 'TODOS') DEFAULT 'TODOS';

-- 2. Reparar recipe_items
-- Asegurar que la columna existe y tiene el ENUM correcto
ALTER TABLE recipe_items 
MODIFY COLUMN age_group ENUM('PREESCOLAR', 'PRIMARIA_A', 'PRIMARIA_B', 'SECUNDARIA') DEFAULT NULL;

-- ELIMINAR EL ÍNDICE ÚNICO VIEJO (Si existe)
-- Usamos un procedimiento para manejar las dependencias de FK
SET @s = (SELECT IF(
    (SELECT COUNT(*)
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE table_name = 'recipe_items'
     AND index_name = 'unique_item_per_recipe'
     AND table_schema = DATABASE()
    ) > 0,
    'ALTER TABLE recipe_items ADD INDEX temp_recipe_idx (recipe_id), DROP INDEX unique_item_per_recipe',
    'SELECT 1'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migración de datos: Duplicar registros actuales para los 4 grupos solo si hay nulos
INSERT INTO recipe_items (recipe_id, item_id, age_group, quantity, preparation_method)
SELECT recipe_id, item_id, 'PRIMARIA_A', quantity, preparation_method FROM recipe_items WHERE age_group IS NULL;

INSERT INTO recipe_items (recipe_id, item_id, age_group, quantity, preparation_method)
SELECT recipe_id, item_id, 'PRIMARIA_B', quantity, preparation_method FROM recipe_items WHERE age_group IS NULL;

INSERT INTO recipe_items (recipe_id, item_id, age_group, quantity, preparation_method)
SELECT recipe_id, item_id, 'SECUNDARIA', quantity, preparation_method FROM recipe_items WHERE age_group IS NULL;

-- El registro original lo marcamos como PREESCOLAR
UPDATE recipe_items SET age_group = 'PREESCOLAR' WHERE age_group IS NULL;

-- Ahora sí, ponemos NOT NULL
ALTER TABLE recipe_items MODIFY COLUMN age_group ENUM('PREESCOLAR', 'PRIMARIA_A', 'PRIMARIA_B', 'SECUNDARIA') NOT NULL;

-- 4. Agregar nuevo índice compuesto (Si no existe)
-- Y remover el índice temporal
SET @s = (SELECT IF(
    (SELECT COUNT(*)
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE table_name = 'recipe_items'
     AND index_name = 'unique_item_recipe_group'
     AND table_schema = DATABASE()
    ) = 0,
    'ALTER TABLE recipe_items ADD UNIQUE KEY unique_item_recipe_group (recipe_id, item_id, age_group), DROP INDEX temp_recipe_idx',
    'SELECT @temp := 1'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Eliminar temp_recipe_idx si por casualidad quedó (si unique_item_recipe_group ya existía pero temp_recipe_idx también)
SET @s = (SELECT IF(
    (SELECT COUNT(*)
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE table_name = 'recipe_items'
     AND index_name = 'temp_recipe_idx'
     AND table_schema = DATABASE()
    ) > 0,
    'ALTER TABLE recipe_items DROP INDEX temp_recipe_idx',
    'SELECT 1'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Crear tabla para almacenar nutrición por grupo de cada receta (Normalización)
CREATE TABLE IF NOT EXISTS recipe_nutrition (
    recipe_id INT NOT NULL,
    age_group ENUM('PREESCOLAR', 'PRIMARIA_A', 'PRIMARIA_B', 'SECUNDARIA') NOT NULL,
    total_calories DECIMAL(10,2) DEFAULT 0.00,
    total_proteins DECIMAL(10,2) DEFAULT 0.00,
    total_carbohydrates DECIMAL(10,2) DEFAULT 0.00,
    total_fats DECIMAL(10,2) DEFAULT 0.00,
    PRIMARY KEY (recipe_id, age_group),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Agregar flag de Extraedad a beneficiarios (Si no existe)
SET @s = (SELECT IF(
    (SELECT COUNT(*)
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = 'beneficiaries'
     AND COLUMN_NAME = 'is_overage'
     AND TABLE_SCHEMA = DATABASE()
    ) = 0,
    'ALTER TABLE beneficiaries ADD COLUMN is_overage TINYINT(1) DEFAULT 0 AFTER sisben_category',
    'SELECT 1'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

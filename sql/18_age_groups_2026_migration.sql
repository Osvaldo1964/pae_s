-- ============================================================================
-- MIGRACIÓN A GRUPOS ETARIOS 2026 (RESOLUCIÓN 0003)
-- ============================================================================

-- 1. Actualizar ENUM en nutritional_parameters (Paso a paso para no perder datos)
ALTER TABLE nutritional_parameters 
MODIFY COLUMN age_group ENUM('PREESCOLAR', 'PRIMARIA', 'BACHILLERATO', 'PRIMARIA_A', 'PRIMARIA_B', 'SECUNDARIA') NOT NULL;

UPDATE nutritional_parameters SET age_group = 'PRIMARIA_A' WHERE age_group = 'PRIMARIA';
UPDATE nutritional_parameters SET age_group = 'SECUNDARIA' WHERE age_group = 'BACHILLERATO';

ALTER TABLE nutritional_parameters 
MODIFY COLUMN age_group ENUM('PREESCOLAR', 'PRIMARIA_A', 'PRIMARIA_B', 'SECUNDARIA') NOT NULL;

-- 2. Actualizar ENUM en menus
ALTER TABLE menus 
MODIFY COLUMN age_group ENUM('PREESCOLAR', 'PRIMARIA', 'BACHILLERATO', 'PRIMARIA_A', 'PRIMARIA_B', 'SECUNDARIA', 'TODOS') DEFAULT 'TODOS';

UPDATE menus SET age_group = 'PRIMARIA_A' WHERE age_group = 'PRIMARIA';
UPDATE menus SET age_group = 'SECUNDARIA' WHERE age_group = 'BACHILLERATO';

ALTER TABLE menus 
MODIFY COLUMN age_group ENUM('PREESCOLAR', 'PRIMARIA_A', 'PRIMARIA_B', 'SECUNDARIA', 'TODOS') DEFAULT 'TODOS';

-- 3. Actualizar recipe_items para soportar gramajes por grupo
-- Primero, agregamos la columna
ALTER TABLE recipe_items 
ADD COLUMN age_group ENUM('PREESCOLAR', 'PRIMARIA_A', 'PRIMARIA_B', 'SECUNDARIA') DEFAULT NULL AFTER item_id;

-- ELIMINAR EL ÍNDICE ÚNICO VIEJO ANTES DE DUPLICAR DATOS
-- Si no se elimina aquí, el INSERT de abajo fallará por duplicado (recipe_id, item_id)
ALTER TABLE recipe_items DROP INDEX unique_item_per_recipe;

-- Migración de datos: Duplicar registros actuales para los 4 grupos
-- (Asumiendo que los registros actuales no tenían grupo y queremos que todos empiecen con el mismo gramaje)
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

-- 4. Agregar nuevo índice compuesto
ALTER TABLE recipe_items ADD UNIQUE KEY unique_item_recipe_group (recipe_id, item_id, age_group);

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

-- 6. Agregar flag de Extraedad a beneficiarios
ALTER TABLE beneficiaries ADD COLUMN is_overage TINYINT(1) DEFAULT 0 AFTER sisben_category;

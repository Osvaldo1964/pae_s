-- ============================================================================
-- MÓDULO DE RECETARIO MAESTRO (ESTANDARIZACIÓN)
-- Define platos base que se pueden reutilizar en múltiples ciclos
-- ============================================================================

-- 1. TABLA DE RECETAS (MAESTRO DE PLATOS)
CREATE TABLE IF NOT EXISTS recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    
    name VARCHAR(255) NOT NULL, -- Ej: "Arroz con Pollo Tipo A"
    meal_type ENUM('DESAYUNO', 'MEDIA MAÑANA', 'ALMUERZO', 'ONCES', 'CENA') NOT NULL,
    description TEXT,
    
    -- Totales Nutricionales de la Receta (para pre-validación)
    total_calories DECIMAL(10,2) DEFAULT 0.00,
    total_proteins DECIMAL(10,2) DEFAULT 0.00,
    total_carbohydrates DECIMAL(10,2) DEFAULT 0.00,
    total_fats DECIMAL(10,2) DEFAULT 0.00,
    
    status ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. DETALLE DE LA RECETA (INGREDIENTES ESTÁNDAR)
CREATE TABLE IF NOT EXISTS recipe_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    item_id INT NOT NULL,
    
    quantity DECIMAL(10,2) NOT NULL, -- Cantidad patrón estándar
    preparation_method VARCHAR(255),
    
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_item_per_recipe (recipe_id, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA DE PLANTILLAS DE CICLO (ESTRUCTURA DE 20 DÍAS)
-- Permite definir que el Día 1 lleva la Receta X, el Día 2 la Receta Y...
CREATE TABLE IF NOT EXISTS cycle_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    name VARCHAR(255) NOT NULL, -- Ej: "Plantilla Standard Costa Mar"
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. DETALLE DE LA PLANTILLA
CREATE TABLE IF NOT EXISTS cycle_template_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    day_number INT NOT NULL, -- 1 al 20
    meal_type ENUM('DESAYUNO', 'ALMUERZO') NOT NULL,
    recipe_id INT NOT NULL,
    
    FOREIGN KEY (template_id) REFERENCES cycle_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    UNIQUE KEY unique_meal_per_day (template_id, day_number, meal_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices
CREATE INDEX idx_recipe_pae ON recipes(pae_id);
CREATE INDEX idx_recipe_type ON recipes(meal_type);
CREATE INDEX idx_template_pae ON cycle_templates(pae_id);

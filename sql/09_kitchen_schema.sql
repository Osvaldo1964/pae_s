-- =====================================================
-- MÓDULO DE COCINA - RESOLUCIÓN 0003 DE 2026
-- Gestión de Ítems, Minutas y Composición Nutricional
-- =====================================================

-- =====================================================
-- 1. GRUPOS DE ALIMENTOS (Clasificación Legal)
-- =====================================================
CREATE TABLE IF NOT EXISTS food_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20), -- Para UI (ej: #FF5733)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO food_groups (code, name, description, color) VALUES
('CEREALES', 'Cereales y Tubérculos', 'Arroz, pasta, papa, yuca, plátano, pan', '#F4A460'),
('PROTEICOS', 'Alimentos Proteicos', 'Carnes, pollo, pescado, huevos, leguminosas', '#DC143C'),
('LACTEOS', 'Lácteos', 'Leche, yogurt, queso, kumis', '#4169E1'),
('FRUTAS', 'Frutas', 'Frutas frescas y procesadas', '#FFD700'),
('VERDURAS', 'Verduras y Hortalizas', 'Vegetales frescos y procesados', '#32CD32'),
('GRASAS', 'Grasas y Aceites', 'Aceites vegetales, mantequilla, margarina', '#FF8C00'),
('AZUCARES', 'Azúcares y Dulces', 'Azúcar, panela, miel', '#FF69B4'),
('CONDIMENTOS', 'Condimentos y Especias', 'Sal, ajo, cebolla, especias', '#8B4513'),
('BEBIDAS', 'Bebidas', 'Jugos, refrescos, infusiones', '#00CED1');

-- =====================================================
-- 2. UNIDADES DE MEDIDA
-- =====================================================
CREATE TABLE IF NOT EXISTS measurement_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    type ENUM('PESO', 'VOLUMEN', 'UNIDAD') DEFAULT 'PESO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO measurement_units (code, name, abbreviation, type) VALUES
('KG', 'Kilogramos', 'kg', 'PESO'),
('G', 'Gramos', 'g', 'PESO'),
('L', 'Litros', 'L', 'VOLUMEN'),
('ML', 'Mililitros', 'ml', 'VOLUMEN'),
('UND', 'Unidades', 'und', 'UNIDAD'),
('LB', 'Libras', 'lb', 'PESO');

-- =====================================================
-- 3. ÍTEMS (INSUMOS/INGREDIENTES)
-- =====================================================
CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    
    -- Identificación
    code VARCHAR(50), -- Código interno del ítem
    name VARCHAR(255) NOT NULL,
    description TEXT,
    food_group_id INT NOT NULL,
    measurement_unit_id INT NOT NULL,
    
    -- Factor de Rendimiento (Crucial para inventarios)
    gross_weight DECIMAL(10,2) DEFAULT 100.00, -- Peso bruto (como se compra)
    net_weight DECIMAL(10,2) DEFAULT 100.00, -- Peso neto (después de limpiar)
    waste_percentage DECIMAL(5,2) DEFAULT 0.00, -- % de desperdicio
    
    -- Información Nutricional (por 100g o 100ml)
    calories DECIMAL(10,2) DEFAULT 0.00, -- kcal
    proteins DECIMAL(10,2) DEFAULT 0.00, -- g
    carbohydrates DECIMAL(10,2) DEFAULT 0.00, -- g
    fats DECIMAL(10,2) DEFAULT 0.00, -- g
    fiber DECIMAL(10,2) DEFAULT 0.00, -- g
    iron DECIMAL(10,2) DEFAULT 0.00, -- mg
    calcium DECIMAL(10,2) DEFAULT 0.00, -- mg
    sodium DECIMAL(10,2) DEFAULT 0.00, -- mg (control ultraprocesados)
    vitamin_a DECIMAL(10,2) DEFAULT 0.00, -- µg
    vitamin_c DECIMAL(10,2) DEFAULT 0.00, -- mg
    
    -- Alérgenos
    contains_gluten BOOLEAN DEFAULT FALSE,
    contains_lactose BOOLEAN DEFAULT FALSE,
    contains_peanuts BOOLEAN DEFAULT FALSE,
    contains_seafood BOOLEAN DEFAULT FALSE,
    contains_eggs BOOLEAN DEFAULT FALSE,
    contains_soy BOOLEAN DEFAULT FALSE,
    
    -- Compra Local (Ley 2046 - 30% compra local)
    is_local_purchase BOOLEAN DEFAULT FALSE,
    local_producer VARCHAR(255), -- Nombre del productor local
    
    -- Trazabilidad
    sanitary_registry VARCHAR(100), -- RSA/RSNV
    requires_refrigeration BOOLEAN DEFAULT FALSE,
    shelf_life_days INT, -- Vida útil en días
    
    -- Costos
    unit_cost DECIMAL(10,2) DEFAULT 0.00, -- Costo por unidad de medida
    last_purchase_date DATE,
    
    -- Control
    status ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (food_group_id) REFERENCES food_groups(id),
    FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id),
    UNIQUE KEY unique_item_per_pae (pae_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. CICLOS DE MENÚS
-- =====================================================
CREATE TABLE IF NOT EXISTS menu_cycles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    
    name VARCHAR(255) NOT NULL, -- Ej: "Ciclo Enero 2026"
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT DEFAULT 20, -- Ciclo típico de 20 días
    
    -- Validación Nutricional
    is_validated BOOLEAN DEFAULT FALSE,
    validated_by INT, -- user_id del nutricionista
    validated_at TIMESTAMP NULL,
    
    status ENUM('BORRADOR', 'ACTIVO', 'FINALIZADO') DEFAULT 'BORRADOR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. MINUTAS (MENÚS DIARIOS)
-- =====================================================
CREATE TABLE IF NOT EXISTS menus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    cycle_id INT,
    
    -- Identificación
    name VARCHAR(255) NOT NULL, -- Ej: "Arroz con Pollo y Ensalada"
    day_number INT, -- Día del ciclo (1-20)
    meal_type ENUM('DESAYUNO', 'MEDIA MAÑANA', 'ALMUERZO', 'ONCES', 'CENA') DEFAULT 'ALMUERZO',
    
    -- Derivación Etárea (Grupos de Edad)
    age_group ENUM('PREESCOLAR', 'PRIMARIA', 'BACHILLERATO', 'TODOS') DEFAULT 'TODOS',
    
    -- Componentes Obligatorios (Validación)
    has_dairy BOOLEAN DEFAULT FALSE, -- Bebida láctea
    has_protein BOOLEAN DEFAULT FALSE, -- Alimento proteico
    has_cereal BOOLEAN DEFAULT FALSE, -- Cereal o tubérculo
    has_fruit BOOLEAN DEFAULT FALSE, -- Fruta
    has_vegetable BOOLEAN DEFAULT FALSE, -- Verdura
    
    -- Información Nutricional Total (calculada)
    total_calories DECIMAL(10,2) DEFAULT 0.00,
    total_proteins DECIMAL(10,2) DEFAULT 0.00,
    total_carbohydrates DECIMAL(10,2) DEFAULT 0.00,
    total_fats DECIMAL(10,2) DEFAULT 0.00,
    total_iron DECIMAL(10,2) DEFAULT 0.00,
    total_calcium DECIMAL(10,2) DEFAULT 0.00,
    
    -- Costo Total
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    
    -- Observaciones
    preparation_instructions TEXT,
    allergen_warnings TEXT,
    
    status ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES menu_cycles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. COMPOSICIÓN DE MINUTAS (Explosión de Víveres)
-- =====================================================
CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_id INT NOT NULL,
    item_id INT NOT NULL,
    
    -- Cantidad Patrón (Estándar Legal)
    standard_quantity DECIMAL(10,2) NOT NULL, -- Cantidad neta por porción
    
    -- Cantidad Real (Preparación)
    gross_quantity DECIMAL(10,2), -- Cantidad bruta considerando desperdicio
    
    -- Preparación
    preparation_method VARCHAR(255), -- Ej: "Cocido", "Frito", "Al vapor"
    
    -- Orden de presentación en el plato
    display_order INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_item_per_menu (menu_id, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. PARÁMETROS NUTRICIONALES (Resolución 0003)
-- =====================================================
CREATE TABLE IF NOT EXISTS nutritional_parameters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    age_group ENUM('PREESCOLAR', 'PRIMARIA', 'BACHILLERATO') NOT NULL,
    meal_type ENUM('DESAYUNO', 'MEDIA MAÑANA', 'ALMUERZO', 'ONCES', 'CENA') NOT NULL,
    
    -- Rangos Nutricionales
    min_calories DECIMAL(10,2) NOT NULL,
    max_calories DECIMAL(10,2) NOT NULL,
    min_proteins DECIMAL(10,2) NOT NULL,
    max_proteins DECIMAL(10,2) NOT NULL,
    min_iron DECIMAL(10,2) NOT NULL,
    min_calcium DECIMAL(10,2) NOT NULL,
    max_sodium DECIMAL(10,2), -- Control de ultraprocesados
    
    -- Frecuencias Máximas Semanales
    max_egg_frequency INT DEFAULT 2, -- Máximo 2 veces huevo como proteína principal
    max_fried_frequency INT DEFAULT 1, -- Máximo 1 vez frito a la semana
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_params (age_group, meal_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos de ejemplo (Resolución 0003 de 2026)
INSERT IGNORE INTO nutritional_parameters (age_group, meal_type, min_calories, max_calories, min_proteins, max_proteins, min_iron, min_calcium) VALUES
('PREESCOLAR', 'ALMUERZO', 300, 400, 10, 15, 2.5, 150),
('PRIMARIA', 'ALMUERZO', 450, 550, 15, 20, 3.5, 200),
('BACHILLERATO', 'ALMUERZO', 550, 700, 20, 30, 4.5, 250),
('PREESCOLAR', 'MEDIA MAÑANA', 150, 200, 5, 8, 1.0, 100),
('PRIMARIA', 'MEDIA MAÑANA', 200, 250, 8, 12, 1.5, 150),
('BACHILLERATO', 'MEDIA MAÑANA', 250, 300, 10, 15, 2.0, 200);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX idx_items_pae ON items(pae_id);
CREATE INDEX idx_items_group ON items(food_group_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_menus_pae ON menus(pae_id);
CREATE INDEX idx_menus_cycle ON menus(cycle_id);
CREATE INDEX idx_menus_age ON menus(age_group);
CREATE INDEX idx_menu_items_menu ON menu_items(menu_id);
CREATE INDEX idx_menu_items_item ON menu_items(item_id);
CREATE INDEX idx_cycles_pae ON menu_cycles(pae_id);

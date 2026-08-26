-- =====================================================
-- MÓDULO DE INVENTARIOS Y ALMACÉN PAE
-- Listas de Intercambio (Nutricionales)
-- =====================================================

-- 1. Crear tabla de grupos de intercambio
CREATE TABLE IF NOT EXISTS exchange_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar los grupos básicos del ICBF
INSERT IGNORE INTO exchange_groups (id, name, description) VALUES
(1, 'Cereales, Raíces, Tubérculos y Plátanos', 'Alimentos ricos en carbohidratos complejos'),
(2, 'Leche y Productos Lácteos', 'Fuente de calcio y proteína de alto valor biológico'),
(3, 'Carnes, Huevos y Leguminosas Secas', 'Fuentes principales de proteína y hierro'),
(4, 'Verduras y Hortalizas', 'Fuentes de vitaminas, minerales y fibra'),
(5, 'Frutas', 'Fuentes de vitaminas, minerales y azúcares simples'),
(6, 'Grasas', 'Fuentes de lípidos y energía concentrada'),
(7, 'Azúcares y Dulces', 'Carbohidratos de rápida absorción');

-- 2. Modificar tabla items
ALTER TABLE items 
ADD COLUMN exchange_group_id INT NULL AFTER food_group_id,
ADD COLUMN exchange_weight_g DECIMAL(10,2) DEFAULT 0.00 AFTER exchange_group_id;

ALTER TABLE items
ADD CONSTRAINT fk_item_exchange_group FOREIGN KEY (exchange_group_id) REFERENCES exchange_groups(id) ON DELETE SET NULL;

-- 3. Trazabilidad en Movimientos
ALTER TABLE inventory_movement_details
ADD COLUMN substituted_for_item_id INT NULL AFTER item_id;

ALTER TABLE inventory_movement_details
ADD CONSTRAINT fk_mov_detail_substituted FOREIGN KEY (substituted_for_item_id) REFERENCES items(id) ON DELETE SET NULL;

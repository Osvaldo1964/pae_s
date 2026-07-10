-- =====================================================
-- AJUSTE DE PRECISIÓN PARA CANTIDADES (3 DECIMALES)
-- =====================================================

-- 1. Recetario Maestro
ALTER TABLE recipe_items 
MODIFY COLUMN quantity DECIMAL(10,3) NOT NULL;

-- 2. Minutas y Menús
ALTER TABLE menu_items 
MODIFY COLUMN standard_quantity DECIMAL(10,3) NOT NULL,
MODIFY COLUMN gross_quantity DECIMAL(10,3);

-- 3. Almacén e Inventarios
ALTER TABLE inventory 
MODIFY COLUMN current_stock DECIMAL(12,3) DEFAULT 0.000,
MODIFY COLUMN minimum_stock DECIMAL(12,3) DEFAULT 0.000;

-- 4. Movimientos de Almacén
ALTER TABLE inventory_movement_details 
MODIFY COLUMN quantity DECIMAL(12,3) NOT NULL;

-- 5. Cotizaciones
ALTER TABLE inventory_quote_details 
MODIFY COLUMN quantity DECIMAL(12,3) NOT NULL;

-- 6. Órdenes de Compra
ALTER TABLE purchase_order_details 
MODIFY COLUMN quantity_ordered DECIMAL(12,3) NOT NULL,
MODIFY COLUMN quantity_received DECIMAL(12,3) DEFAULT 0.000;

-- 7. Remisiones
ALTER TABLE inventory_remission_details 
MODIFY COLUMN quantity_sent DECIMAL(12,3) NOT NULL,
MODIFY COLUMN quantity_received DECIMAL(12,3) DEFAULT 0.000;

-- Verificación de cambios
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND COLUMN_NAME IN ('quantity', 'standard_quantity', 'gross_quantity', 'current_stock', 'quantity_ordered', 'quantity_sent')
AND TABLE_NAME IN ('recipe_items', 'menu_items', 'inventory', 'purchase_order_details', 'inventory_remission_details');

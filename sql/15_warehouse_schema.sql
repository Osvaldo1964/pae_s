-- ============================================================================
-- MÓDULO DE ALMACÉN E INVENTARIOS (PAE)
-- Gestión de entradas, salidas, lotes y existencias
-- ============================================================================

-- 1. TABLA DE EXISTENCIAS (STOCK ACTUAL)
-- Relaciona los ítems con su cantidad disponible real en bodega
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    item_id INT NOT NULL,
    
    current_stock DECIMAL(12,2) DEFAULT 0.00,
    minimum_stock DECIMAL(12,2) DEFAULT 0.00, -- Alerta de reabastecimiento
    
    last_entry_date DATE,
    last_exit_date DATE,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_inventory (pae_id, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA DE PROVEEDORES
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    
    nit VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    
    status ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. CABECERA DE MOVIMIENTOS (Entradas / Salidas / Ajustes)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    user_id INT NOT NULL,
    supplier_id INT, -- Solo para entradas
    
    movement_type ENUM('ENTRADA', 'SALIDA', 'AJUSTE', 'DESPERDICIO') NOT NULL,
    reference_number VARCHAR(50), -- Factura, remisión o ID de minuta
    movement_date DATE NOT NULL,
    
    notes TEXT,
    total_value DECIMAL(12,2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. DETALLE DE MOVIMIENTOS (Ítems movidos)
CREATE TABLE IF NOT EXISTS inventory_movement_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movement_id INT NOT NULL,
    item_id INT NOT NULL,
    
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) DEFAULT 0.00,
    
    batch_number VARCHAR(50), -- Lote
    expiry_date DATE, -- Fecha de vencimiento
    
    FOREIGN KEY (movement_id) REFERENCES inventory_movements(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TRIGGER PARA ACTUALIZAR STOCK AUTOMÁTICAMENTE
-- Actualiza la tabla 'inventory' cada vez que se inserta un detalle de movimiento
DELIMITER //

CREATE TRIGGER after_movement_detail_insert
AFTER INSERT ON inventory_movement_details
FOR EACH ROW
BEGIN
    DECLARE mov_type VARCHAR(20);
    DECLARE p_id INT;
    
    -- Obtener el tipo de movimiento y el pae_id
    SELECT movement_type, pae_id INTO mov_type, p_id 
    FROM inventory_movements 
    WHERE id = NEW.movement_id;
    
    -- Asegurar que el registro de inventario existe
    INSERT IGNORE INTO inventory (pae_id, item_id, current_stock) 
    VALUES (p_id, NEW.item_id, 0);
    
    -- Actualizar stock según tipo
    IF mov_type = 'ENTRADA' OR mov_type = 'AJUSTE' AND NEW.quantity > 0 THEN
        UPDATE inventory 
        SET current_stock = current_stock + NEW.quantity,
            last_entry_date = CURDATE()
        WHERE pae_id = p_id AND item_id = NEW.item_id;
    ELSEIF mov_type = 'SALIDA' OR mov_type = 'DESPERDICIO' OR (mov_type = 'AJUSTE' AND NEW.quantity < 0) THEN
        UPDATE inventory 
        SET current_stock = current_stock - ABS(NEW.quantity),
            last_exit_date = CURDATE()
        WHERE pae_id = p_id AND item_id = NEW.item_id;
    END IF;
END //

DELIMITER ;

-- Índices
CREATE INDEX idx_inv_pae ON inventory(pae_id);
CREATE INDEX idx_mov_type ON inventory_movements(movement_type);
CREATE INDEX idx_mov_date ON inventory_movements(movement_date);

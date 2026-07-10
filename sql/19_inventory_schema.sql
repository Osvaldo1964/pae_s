-- =====================================================
-- MÓDULO DE INVENTARIOS Y ALMACÉN PAE
-- Gestión de Existencias, Compras, Remisiones y Trazabilidad
-- =====================================================

-- 1. Inventory Summary (Stock Actual por PAE e Ítem)
CREATE TABLE IF NOT EXISTS inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    item_id INT NOT NULL,
    current_stock DECIMAL(10,2) DEFAULT 0.00,
    minimum_stock DECIMAL(10,2) DEFAULT 0.00,
    last_entry_date DATE,
    last_exit_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_inventory (pae_id, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Movements Header (Cabecera de Entradas/Salidas/Ajustes)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    user_id INT NOT NULL,
    supplier_id INT,
    movement_type ENUM('ENTRADA', 'SALIDA', 'AJUSTE', 'TRASLADO') NOT NULL,
    reference_number VARCHAR(50), -- Factura, Remisión, etc.
    movement_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Movement Details (Detalle de Ítems movidos)
CREATE TABLE IF NOT EXISTS inventory_movement_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movement_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    batch_number VARCHAR(50),
    expiry_date DATE,
    FOREIGN KEY (movement_id) REFERENCES inventory_movements(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Quotes (Registro de Cotizaciones de Proveedores)
CREATE TABLE IF NOT EXISTS inventory_quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    user_id INT NOT NULL,
    supplier_id INT NOT NULL,
    quote_number VARCHAR(50),
    quote_date DATE NOT NULL,
    valid_until DATE,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    status ENUM('BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA') DEFAULT 'BORRADOR',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Quote Details
CREATE TABLE IF NOT EXISTS inventory_quote_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_percentage DECIMAL(5,2) DEFAULT 0.00,
    subtotal DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (quote_id) REFERENCES inventory_quotes(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Purchase Orders (Órdenes de Compra)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    user_id INT NOT NULL,
    supplier_id INT NOT NULL,
    quote_id INT, -- Referencia opcional a cotización
    po_number VARCHAR(50) NOT NULL,
    po_date DATE NOT NULL,
    expected_delivery DATE,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    status ENUM('PENDIENTE', 'RECIBIDA_PARCIAL', 'RECIBIDA_TOTAL', 'CANCELADA') DEFAULT 'PENDIENTE',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (quote_id) REFERENCES inventory_quotes(id) ON DELETE SET NULL,
    UNIQUE KEY unique_po_pae (pae_id, po_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Purchase Order Details
CREATE TABLE IF NOT EXISTS purchase_order_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity_ordered DECIMAL(10,2) NOT NULL,
    quantity_received DECIMAL(10,2) DEFAULT 0.00,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Remissions (Salidas directas a Sedes Educativas)
CREATE TABLE IF NOT EXISTS inventory_remissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    user_id INT NOT NULL,
    branch_id INT NOT NULL, -- Destino
    remission_number VARCHAR(50) NOT NULL,
    remission_date DATE NOT NULL,
    carrier_name VARCHAR(100),
    vehicle_plate VARCHAR(20),
    status ENUM('CAMINO', 'ENTREGADA', 'CON_NOVEDAD') DEFAULT 'CAMINO',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (branch_id) REFERENCES school_branches(id),
    UNIQUE KEY unique_remission_pae (pae_id, remission_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Remission Details
CREATE TABLE IF NOT EXISTS inventory_remission_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remission_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity_sent DECIMAL(10,2) NOT NULL,
    quantity_received DECIMAL(10,2) DEFAULT 0.00, -- Verificado en sede
    novelty_notes TEXT,
    FOREIGN KEY (remission_id) REFERENCES inventory_remissions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

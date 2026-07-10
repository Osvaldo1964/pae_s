-- =====================================================
-- OPTIMIZACIÓN DE INVENTARIOS: PROYECCIONES Y REMISIONES BIMODALES
-- =====================================================

-- 1. Tabla de Proyecciones (Demanda Congelada por Sede e Ítem)
CREATE TABLE IF NOT EXISTS cycle_projections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycle_id INT NOT NULL,
    branch_id INT NOT NULL,
    item_id INT NOT NULL,
    total_quantity DECIMAL(12,4) NOT NULL, -- Mayor precisión para gramajes acumulados
    beneficiary_count INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cycle_id) REFERENCES menu_cycles(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES school_branches(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_projection (cycle_id, branch_id, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Vincular Órdenes de Compra con el Ciclo que las genera
ALTER TABLE purchase_orders 
ADD COLUMN cycle_id INT AFTER pae_id,
ADD CONSTRAINT fk_po_cycle FOREIGN KEY (cycle_id) REFERENCES menu_cycles(id) ON DELETE SET NULL;

-- 3. Evolucionar tabla de Remisiones para ser Bimodal (Entradas OC / Salidas Sede)
ALTER TABLE inventory_remissions
ADD COLUMN type ENUM('ENTRADA_OC', 'SALIDA_SEDE') NOT NULL DEFAULT 'SALIDA_SEDE' AFTER pae_id,
ADD COLUMN cycle_id INT AFTER type,
ADD COLUMN po_id INT AFTER cycle_id,
ADD COLUMN supplier_id INT AFTER po_id,
MODIFY COLUMN branch_id INT NULL, 
ADD CONSTRAINT fk_remission_cycle FOREIGN KEY (cycle_id) REFERENCES menu_cycles(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_remission_po FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_remission_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- 4. Reestructuración del Menú de Inventarios
-- Modificar módulo 20: Ahora es Salidas de Almacén
UPDATE modules SET 
    name = 'Salidas de Almacén', 
    description = 'Entregas a instituciones educativas (Sedes)', 
    route_key = 'salidas' 
WHERE id = 20;

-- Insertar módulo 21: Remisiones (Entradas desde Proveedor / OC)
INSERT IGNORE INTO modules (id, group_id, name, description, route_key, icon) VALUES
(21, 4, 'Remisiones (Entradas)', 'Recibo de mercancía basado en Órdenes de Compra', 'remisiones', 'fas fa-file-import');

-- 5. Asignación de Permisos para el nuevo módulo (Super Admin y Admin PAE)
INSERT IGNORE INTO module_permissions (role_id, module_id, pae_id, can_read, can_create, can_update, can_delete)
SELECT 1, 21, id, 1, 1, 1, 1 FROM pae_programs;

INSERT IGNORE INTO module_permissions (role_id, module_id, pae_id, can_read, can_create, can_update, can_delete)
SELECT 6, 21, id, 1, 1, 1, 1 FROM pae_programs;

-- 6. Índices Adicionales para el cruce de proyecciones
CREATE INDEX idx_proj_cycle ON cycle_projections(cycle_id);
CREATE INDEX idx_proj_branch ON cycle_projections(branch_id);
CREATE INDEX idx_proj_item ON cycle_projections(item_id);

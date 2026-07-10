-- Suppliers Table with Multitenancy Support
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    nit VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address VARCHAR(255),
    city VARCHAR(100),
    type ENUM('NATURAL', 'JURIDICA') DEFAULT 'JURIDICA',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_nit_pae (nit, pae_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure missing permissions for the 'proveedores' module are added for existing roles
-- Module ID for 'proveedores' is usually 4 based on 01_auth_schema.sql (but let's query it)
INSERT INTO `module_permissions` (`role_id`, `pae_id`, `module_id`, `can_create`, `can_read`, `can_update`, `can_delete`)
SELECT r.id, p.id, m.id, 1, 1, 1, 1
FROM roles r
JOIN pae_programs p
JOIN modules m ON m.route_key = 'proveedores'
LEFT JOIN module_permissions mp ON mp.role_id = r.id AND mp.pae_id = p.id AND mp.module_id = m.id
WHERE mp.id IS NULL AND r.id = 1; -- Only for Super Admin by default or grant to all if needed

-- Add index for nit lookup
CREATE INDEX idx_suppliers_nit ON suppliers(nit);
CREATE INDEX idx_suppliers_pae ON suppliers(pae_id);

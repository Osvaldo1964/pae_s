-- =====================================================
-- REGISTRO DE NUEVOS MÓDULOS DE INVENTARIOS EN EL MENÚ
-- =====================================================

-- 1. Insertar Módulos
INSERT IGNORE INTO modules (id, group_id, name, description, route_key, icon) VALUES
(18, 4, 'Cotizaciones', 'Gestión de precios de proveedores', 'cotizaciones', 'fas fa-file-invoice-dollar'),
(19, 4, 'Órdenes de Compra', 'Gestión de pedidos a proveedores', 'compras', 'fas fa-shopping-cart'),
(20, 4, 'Remisiones', 'Control de entregas a sedes', 'remisiones', 'fas fa-truck-loading');

-- 2. Asignar Permisos (Asumiendo Super Admin = 1 y Admin PAE = 6)
-- Super Admin
INSERT IGNORE INTO module_permissions (role_id, module_id, pae_id, can_read, can_create, can_update, can_delete)
SELECT 1, m.id, p.id, 1, 1, 1, 1
FROM modules m
CROSS JOIN pae_programs p
WHERE m.id IN (18, 19, 20);

-- Admin PAE
INSERT IGNORE INTO module_permissions (role_id, module_id, pae_id, can_read, can_create, can_update, can_delete)
SELECT 6, m.id, p.id, 1, 1, 1, 1
FROM modules m
CROSS JOIN pae_programs p
WHERE m.id IN (18, 19, 20);

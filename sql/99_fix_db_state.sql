-- =====================================================
-- SCRIPT DE CORRECCIÓN DE BASE DE DATOS - PAE CONTROL
-- =====================================================

-- 1. Asegurar que el grupo "Inventarios" existe y está bien configurado
INSERT IGNORE INTO module_groups (id, name, icon, order_index) 
VALUES (6, 'Inventarios', 'fas fa-boxes', 5);

UPDATE module_groups SET order_index = 6 WHERE id = 5; -- Mover Reportes al final

-- 2. Registrar módulos de Inventario (sin forzar ID para evitar conflictos)
-- Primero borramos duplicados por route_key si existen con IDs erróneos
-- (En este caso no existían según mi análisis, pero es más seguro)

INSERT INTO modules (group_id, name, description, route_key, icon)
SELECT 6, 'Cotizaciones', 'Gestión de precios de proveedores', 'cotizaciones', 'fas fa-file-invoice-dollar'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM modules WHERE route_key = 'cotizaciones');

INSERT INTO modules (group_id, name, description, route_key, icon)
SELECT 6, 'Órdenes de Compra', 'Gestión de pedidos a proveedores', 'compras', 'fas fa-shopping-cart'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM modules WHERE route_key = 'compras');

INSERT INTO modules (group_id, name, description, route_key, icon)
SELECT 6, 'Remisiones', 'Control de entregas a sedes', 'remisiones', 'fas fa-truck-loading'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM modules WHERE route_key = 'remisiones');

-- 3. Mover módulos existentes al grupo correcto
UPDATE modules SET group_id = 6 WHERE route_key IN ('almacen', 'proveedores');

-- 4. Asignar Permisos Automáticos para el nuevo módulo
-- Super Admin (Role 1)
INSERT IGNORE INTO module_permissions (role_id, module_id, pae_id, can_read, can_create, can_update, can_delete)
SELECT 1, m.id, p.id, 1, 1, 1, 1
FROM modules m
CROSS JOIN pae_programs p
WHERE m.route_key IN ('cotizaciones', 'compras', 'remisiones');

-- Admin PAE (Role 6)
INSERT IGNORE INTO module_permissions (role_id, module_id, pae_id, can_read, can_create, can_update, can_delete)
SELECT 6, m.id, p.id, 1, 1, 1, 1
FROM modules m
CROSS JOIN pae_programs p
WHERE m.route_key IN ('cotizaciones', 'compras', 'remisiones');

-- 5. Completar Parámetros Nutricionales (PRIMARIA_B)
INSERT IGNORE INTO nutritional_parameters 
(age_group, meal_type, min_calories, max_calories, min_proteins, max_proteins, min_iron, min_calcium)
VALUES 
('PRIMARIA_B', 'ALMUERZO', 500, 600, 18, 25, 4.0, 220),
('PRIMARIA_B', 'MEDIA MAÑANA', 220, 270, 9, 13, 1.8, 170);

-- 6. Ejecutar carga de datos de prueba completos (50 ítems)
-- Nota: Esto limpiará los datos actuales del PAE 3 en items, menus, etc.
SOURCE c:/xampp/htdocs/pae/sql/14_test_data_complete.sql;

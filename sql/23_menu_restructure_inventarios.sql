-- =====================================================
-- REORGANIZACIÓN DEL MENÚ: NUEVO NODO INVENTARIOS
-- =====================================================

-- 1. Crear el nuevo grupo de módulos "INVENTARIOS"
INSERT IGNORE INTO module_groups (id, name, icon, order_index) 
VALUES (6, 'Inventarios', 'fas fa-boxes', 5);

-- Ajustar el orden del grupo "Reportes" para que Inventarios quede antes o después
UPDATE module_groups SET order_index = 6 WHERE id = 5;

-- 2. Mover los módulos relacionados a Inventarios al nuevo grupo
UPDATE modules 
SET group_id = 6 
WHERE route_key IN ('cotizaciones', 'compras', 'remisiones', 'almacen');

-- 3. Asegurarse de que el módulo 'almacen' use el mismo grupo
-- (Ya incluido en el UPDATE anterior, pero por si acaso hay variaciones en el ID)
UPDATE modules 
SET group_id = 6 
WHERE id = 17 OR route_key = 'almacen';

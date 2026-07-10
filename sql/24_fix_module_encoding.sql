-- =====================================================
-- CORRECCIÓN DE TEXTOS Y CODIFICACIÓN EN MÓDULOS
-- =====================================================

SET NAMES 'utf8mb4';

-- 1. Corregir Grupo
UPDATE module_groups SET name = 'Inventarios' WHERE id = 6;

-- 2. Corregir Módulos con caracteres especiales
UPDATE modules 
SET name = 'Cotizaciones', 
    description = 'Gestión de precios de proveedores' 
WHERE route_key = 'cotizaciones';

UPDATE modules 
SET name = 'Órdenes de Compra', 
    description = 'Gestión de pedidos a proveedores' 
WHERE route_key = 'compras';

UPDATE modules 
SET name = 'Remisiones', 
    description = 'Control de entregas a sedes' 
WHERE route_key = 'remisiones';

UPDATE modules 
SET name = 'Almacén', 
    description = 'Control de stock e inventario' 
WHERE route_key = 'almacen';

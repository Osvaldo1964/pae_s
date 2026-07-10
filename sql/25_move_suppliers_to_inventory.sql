-- =====================================================
-- MOVER MÓDULO PROVEEDORES A INVENTARIOS
-- =====================================================

-- Mover el módulo 'proveedores' al grupo 'Inventarios' (id 6)
UPDATE modules 
SET group_id = 6 
WHERE route_key = 'proveedores';

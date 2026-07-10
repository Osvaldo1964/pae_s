-- Insert Recetario module in the Kitchen group (group_id = 4)
-- We insert it before Minutas if possible, or just append it.
-- Logical order: Items -> Recetario -> Minutas -> Almacen

-- Get the group ID for 'Minuta Patrón y Cocina' (should be 4)
SET @kitchen_group_id = (SELECT id FROM module_groups WHERE name LIKE '%Cocina%' LIMIT 1);

-- Re-insert everything in the correct logical order for the Kitchen group
-- First, backup current modules belonging to this group
CREATE TEMPORARY TABLE temp_kitchen_modules AS
SELECT * FROM modules WHERE group_id = @kitchen_group_id;

-- Delete them to re-insert in order
DELETE FROM modules WHERE group_id = @kitchen_group_id;

-- Re-insert with the new 'Recetario' module included
INSERT INTO modules (group_id, name, description, route_key, icon) VALUES
(@kitchen_group_id, 'Ítems', 'Gestión de insumos e ingredientes', 'items', 'fas fa-apple-alt'),
(@kitchen_group_id, 'Recetario', 'Maestro de recetas y platos base', 'recetario', 'fas fa-book-medical'),
(@kitchen_group_id, 'Minutas', 'Planeación de menús y ciclos', 'minutas', 'fas fa-tasks'),
(@kitchen_group_id, 'Almacén', 'Entradas, salidas e inventario', 'almacen', 'fas fa-warehouse');

SELECT 'Módulos de cocina actualizados correctamente' as Resultado;

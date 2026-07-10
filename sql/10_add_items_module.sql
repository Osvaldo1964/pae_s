-- Add Items module to Cocina group
-- This module was implemented but not registered in the database

-- Insert Items module into Cocina group (group_id = 4)
INSERT INTO `modules` (`group_id`, `name`, `description`, `route_key`, `icon`) VALUES
(4, 'Ítems', 'Gestión de insumos e ingredientes', 'items', 'fas fa-carrot');

-- Verify the insertion
SELECT m.id, mg.name as 'Grupo', m.name as 'Módulo', m.route_key, m.icon
FROM modules m
INNER JOIN module_groups mg ON m.group_id = mg.id
WHERE mg.name = 'Cocina'
ORDER BY m.id;

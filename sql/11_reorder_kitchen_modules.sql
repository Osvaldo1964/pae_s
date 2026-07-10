-- Reorder Kitchen modules in logical sequence
-- 1. Items (ingredients first)
-- 2. Minutas (menu planning using items)
-- 3. Almacen (inventory management)

-- Update the order by updating the IDs or adding an order_index column
-- Since modules table doesn't have order_index, we'll update by ID sequence

-- First, let's see current IDs
SELECT id, name, route_key FROM modules WHERE group_id = 4 ORDER BY id;

-- The modules are displayed in the order they were inserted (by ID)
-- We need to ensure Items has the lowest ID, then Minutas, then Almacen

-- Option 1: Delete and re-insert in correct order
-- (This preserves permissions if they reference module names, not IDs)

-- Backup current modules
CREATE TEMPORARY TABLE temp_kitchen_modules AS
SELECT * FROM modules WHERE group_id = 4;

-- Delete current kitchen modules
DELETE FROM modules WHERE group_id = 4;

-- Re-insert in correct order
INSERT INTO modules (group_id, name, description, route_key, icon) VALUES
(4, 'Ítems', 'Gestión de insumos e ingredientes', 'items', 'fas fa-carrot'),
(4, 'Minutas', 'Planeación de menús y ciclos', 'minutas', 'fas fa-book-open'),
(4, 'Almacén', 'Entradas, salidas e inventario', 'almacen', 'fas fa-warehouse');

-- Verify new order
SELECT id, name, route_key FROM modules WHERE group_id = 4 ORDER BY id;

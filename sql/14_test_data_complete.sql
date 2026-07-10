-- ============================================================================
-- DATOS COMPLETOS - MÓDULO DE COCINA (20 DÍAS)
-- Sistema PAE - Programa de Alimentación Escolar
-- PAE ID: 3
-- ============================================================================

-- Limpiar datos anteriores para este PAE
DELETE FROM menu_items WHERE menu_id IN (SELECT id FROM menus WHERE pae_id = 3);
DELETE FROM menus WHERE pae_id = 3;
DELETE FROM menu_cycles WHERE pae_id = 3;
DELETE FROM items WHERE pae_id = 3;

-- Configurar PAE ID
SET @pae_id = 3;

-- ============================================================================
-- 1. ÍTEMS (50 Insumos)
-- ============================================================================

-- CEREALES (1-10)
INSERT INTO items (pae_id, code, name, food_group_id, measurement_unit_id, gross_weight, net_weight, waste_percentage, calories, proteins, carbohydrates, fats, status) VALUES
(@pae_id, 'ARROZ', 'ARROZ BLANCO', 1, 1, 1000, 1000, 0, 130, 2.7, 28, 0.3, 'ACTIVO'),
(@pae_id, 'PASTA', 'PASTA ESPAGUETI', 1, 1, 1000, 1000, 0, 157, 5.8, 30, 0.9, 'ACTIVO'),
(@pae_id, 'PAPA', 'PAPA SABANERA', 1, 1, 1000, 850, 15, 77, 2.0, 17, 0.1, 'ACTIVO'),
(@pae_id, 'YUCA', 'YUCA FRESCA', 1, 1, 1000, 750, 25, 160, 1.4, 38, 0.3, 'ACTIVO'),
(@pae_id, 'PLATANO', 'PLATANO MADURO', 1, 1, 1000, 650, 35, 122, 1.3, 32, 0.4, 'ACTIVO'),
(@pae_id, 'AREPA', 'AREPA DE MAIZ', 1, 5, 1, 1, 0, 218, 4.5, 45, 1.2, 'ACTIVO'),
(@pae_id, 'PAN', 'PAN TAJADO INTEGRAL', 1, 5, 1, 1, 0, 247, 8.5, 41, 3.5, 'ACTIVO'),
(@pae_id, 'AVENA', 'AVENA EN HOJUELAS', 1, 1, 1000, 1000, 0, 389, 16, 66, 6.9, 'ACTIVO'),
(@pae_id, 'GALLETA', 'GALLETA INTEGRAL', 1, 5, 1, 1, 0, 450, 7.0, 70, 15, 'ACTIVO'),
(@pae_id, 'TOSTADA', 'TOSTADA DE ARROZ', 1, 5, 1, 1, 0, 380, 8.0, 80, 2.5, 'ACTIVO');

-- PROTEINAS (11-22)
INSERT INTO items (pae_id, code, name, food_group_id, measurement_unit_id, gross_weight, net_weight, waste_percentage, calories, proteins, carbohydrates, fats, status, contains_eggs) VALUES
(@pae_id, 'POLLO', 'PECHUGA DE POLLO', 2, 1, 1000, 850, 15, 165, 31, 0, 3.6, 'ACTIVO', 0),
(@pae_id, 'CARNE', 'CARNE DE RES (MURILLO)', 2, 1, 1000, 950, 5, 250, 26, 0, 15, 'ACTIVO', 0),
(@pae_id, 'CERDO', 'LOMO DE CERDO', 2, 1, 1000, 950, 5, 242, 27, 0, 14, 'ACTIVO', 0),
(@pae_id, 'HUEVO', 'HUEVO AA FRESCO', 2, 5, 60, 50, 16, 155, 13, 1.1, 11, 'ACTIVO', 1),
(@pae_id, 'FRIJOL', 'FRIJOL CARGAMANTO', 2, 1, 1000, 1000, 0, 333, 23, 60, 1.2, 'ACTIVO', 0),
(@pae_id, 'LENTEJA', 'LENTEJA SECA', 2, 1, 1000, 1000, 0, 352, 25, 63, 1.1, 'ACTIVO', 0),
(@pae_id, 'GARBANZO', 'GARBANZO SECO', 2, 1, 1000, 1000, 0, 364, 19, 61, 6.0, 'ACTIVO', 0),
(@pae_id, 'PESCADO', 'FILETE DE TILAPIA', 2, 1, 1000, 900, 10, 96, 20, 0, 1.7, 'ACTIVO', 0),
(@pae_id, 'ATUN', 'ATUN EN AGUA (LATA)', 2, 1, 170, 120, 30, 116, 25, 0, 0.8, 'ACTIVO', 0),
(@pae_id, 'ARVEJA', 'ARVEJA SECA', 2, 1, 1000, 1000, 0, 341, 24, 60, 1.2, 'ACTIVO', 0),
(@pae_id, 'BLANQUILLO', 'FRIJOL BLANQUILLO', 2, 1, 1000, 1000, 0, 337, 23, 60, 1.0, 'ACTIVO', 0),
(@pae_id, 'QUESO', 'QUESO CAMPESINO', 3, 1, 1000, 1000, 0, 264, 18, 3, 20, 'ACTIVO', 0);

-- LACTEOS (23-27)
INSERT INTO items (pae_id, code, name, food_group_id, measurement_unit_id, calories, proteins, status, contains_lactose) VALUES
(@pae_id, 'LECHE', 'LECHE ENTERA PASTEURIZADA', 3, 3, 61, 3.2, 'ACTIVO', 1),
(@pae_id, 'YOGURT', 'YOGURT NATURAL', 3, 3, 59, 3.5, 'ACTIVO', 1),
(@pae_id, 'KUMIS', 'KUMIS FRESCO', 3, 3, 78, 3.3, 'ACTIVO', 1),
(@pae_id, 'AVENALAC', 'AVENA CON LECHE PREPARADA', 3, 3, 120, 4.0, 'ACTIVO', 1),
(@pae_id, 'MATANTE', 'BIENESTARINA MASAMORRA', 3, 3, 110, 5.0, 'ACTIVO', 0);

-- FRUTAS Y VERDURAS (28-45)
INSERT INTO items (pae_id, code, name, food_group_id, measurement_unit_id, waste_percentage, status) VALUES
(@pae_id, 'ZANAHORIA', 'ZANAHORIA FRESCA', 5, 1, 10, 'ACTIVO'),
(@pae_id, 'TOMATE', 'TOMATE CHONTO', 5, 1, 5, 'ACTIVO'),
(@pae_id, 'CEBOLLA', 'CEBOLLA CABEZONA', 5, 1, 10, 'ACTIVO'),
(@pae_id, 'HABICHUELA', 'HABICHUELA VERDE', 5, 1, 8, 'ACTIVO'),
(@pae_id, 'REPOLLO', 'REPOLLO BLANCO', 5, 1, 15, 'ACTIVO'),
(@pae_id, 'TOMATEA', 'TOMATE DE ARBOL', 4, 1, 20, 'ACTIVO'),
(@pae_id, 'GUAYABA', 'GUAYABA PERA', 4, 1, 15, 'ACTIVO'),
(@pae_id, 'NARANJA', 'NARANJA TANGERINA', 4, 1, 40, 'ACTIVO'),
(@pae_id, 'MANZANA', 'MANZANA ROJA', 4, 1, 10, 'ACTIVO'),
(@pae_id, 'BANANO', 'BANANO URABA', 4, 1, 35, 'ACTIVO'),
(@pae_id, 'PAPAYA', 'PAPAYA MELON', 4, 1, 25, 'ACTIVO'),
(@pae_id, 'AHUYAMA', 'AHUYAMA BOLO', 5, 1, 25, 'ACTIVO'),
(@pae_id, 'ESPINACA', 'ESPINACA BOGOTANA', 5, 1, 15, 'ACTIVO'),
(@pae_id, 'LECHUGA', 'LECHUGA BATAVIA', 5, 1, 20, 'ACTIVO'),
(@pae_id, 'PEPINO', 'PEPINO COHOMBRO', 5, 1, 10, 'ACTIVO'),
(@pae_id, 'PIÑA', 'PIÑA ORO MIEL', 4, 1, 45, 'ACTIVO'),
(@pae_id, 'MORA', 'MORA DE CASTILLA', 4, 1, 5, 'ACTIVO'),
(@pae_id, 'LIMON', 'LIMON TAHITI', 4, 1, 50, 'ACTIVO');

-- OTROS (46-50)
INSERT INTO items (pae_id, code, name, food_group_id, measurement_unit_id, status) VALUES
(@pae_id, 'ACEITE', 'ACEITE VEGETAL DE GIRASOL', 6, 3, 'ACTIVO'),
(@pae_id, 'SAL', 'SAL REFINADA YODADA', 7, 1, 'ACTIVO'),
(@pae_id, 'AZUCAR', 'AZUCAR BLANCA', 7, 1, 'ACTIVO'),
(@pae_id, 'PANELA', 'PANELA REDONDA', 7, 1, 'ACTIVO'),
(@pae_id, 'AJO', 'AJO EN PASTA', 7, 1, 'ACTIVO');

-- ============================================================================
-- 2. CICLO DE MENÚ
-- ============================================================================
INSERT INTO menu_cycles (pae_id, name, description, start_date, end_date, status) VALUES
(@pae_id, 'CICLO 1 - FEBRERO 2026', 'Primer ciclo de 20 días del año lectivo', '2026-02-01', '2026-02-28', 'ACTIVO');
SET @cycle_id = LAST_INSERT_ID();

-- ============================================================================
-- 3. MINUTAS Y COMPOSICIÓN (20 DÍAS)
-- ============================================================================

-- REPETIR EL PATRON PARA 20 DIAS
DELIMITER //

CREATE PROCEDURE InsertMenus()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE current_menu_id INT;
    
    WHILE i <= 20 DO
        -- DESAYUNO DIA i
        INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) 
        VALUES (3, @cycle_id, i, 'DESAYUNO', CONCAT('Desayuno Nutritivo Día ', i));
        SET current_menu_id = LAST_INSERT_ID();
        
        -- Items Desayuno (Leche + Cereal + Proteina/Fruta)
        INSERT INTO menu_items (menu_id, item_id, standard_quantity) VALUES
        (current_menu_id, (SELECT id FROM items WHERE code = 'LECHE' AND pae_id = 3), 200),
        (current_menu_id, (SELECT id FROM items WHERE code = 'AREPA' AND pae_id = 3), 1);
        
        IF (i % 2 = 0) THEN
            INSERT INTO menu_items (menu_id, item_id, standard_quantity) 
            VALUES (current_menu_id, (SELECT id FROM items WHERE code = 'HUEVO' AND pae_id = 3), 1);
        ELSE
            INSERT INTO menu_items (menu_id, item_id, standard_quantity) 
            VALUES (current_menu_id, (SELECT id FROM items WHERE code = 'QUESO' AND pae_id = 3), 30);
        END IF;

        -- ALMUERZO DIA i
        INSERT INTO menus (pae_id, cycle_id, day_number, meal_type, name) 
        VALUES (3, @cycle_id, i, 'ALMUERZO', CONCAT('Almuerzo Balanceado Día ', i));
        SET current_menu_id = LAST_INSERT_ID();
        
        -- Items Almuerzo (Arroz + Proteina + Verdura + Fruta)
        INSERT INTO menu_items (menu_id, item_id, standard_quantity) VALUES
        (current_menu_id, (SELECT id FROM items WHERE code = 'ARROZ' AND pae_id = 3), 150),
        (current_menu_id, (SELECT id FROM items WHERE code = 'FRIJOL' AND pae_id = 3), 80);
        
        IF (i % 3 = 0) THEN
            INSERT INTO menu_items (menu_id, item_id, standard_quantity) 
            VALUES (current_menu_id, (SELECT id FROM items WHERE code = 'POLLO' AND pae_id = 3), 120);
        ELSEIF (i % 3 = 1) THEN
            INSERT INTO menu_items (menu_id, item_id, standard_quantity) 
            VALUES (current_menu_id, (SELECT id FROM items WHERE code = 'CARNE' AND pae_id = 3), 100);
        ELSE
            INSERT INTO menu_items (menu_id, item_id, standard_quantity) 
            VALUES (current_menu_id, (SELECT id FROM items WHERE code = 'CERDO' AND pae_id = 3), 100);
        END IF;
        
        INSERT INTO menu_items (menu_id, item_id, standard_quantity) 
        VALUES (current_menu_id, (SELECT id FROM items WHERE code = 'ZANAHORIA' AND pae_id = 3), 40);
        
        SET i = i + 1;
    END WHILE;
END //

DELIMITER ;

CALL InsertMenus();
DROP PROCEDURE InsertMenus;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT 'CARGA COMPLETA EXITOSA' as 'Mensaje';
SELECT (SELECT COUNT(*) FROM items WHERE pae_id = 3) as 'Items Cargados',
       (SELECT COUNT(*) FROM menus WHERE pae_id = 3) as 'Minutas Creadas (20 días)';

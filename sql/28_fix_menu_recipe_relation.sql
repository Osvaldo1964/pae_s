-- =====================================================
-- CORRECCIÓN DE RELACIONES: MENÚS Y RECETAS
-- =====================================================

-- 1. Tabla para vincular Menús con Recetas (Muchos a Muchos)
-- Permite que un menú diario (ej: Día 1) tenga varias recetas (ej: Plato Principal + Bebida)
CREATE TABLE IF NOT EXISTS menu_recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_id INT NOT NULL,
    recipe_id INT NOT NULL,
    meal_type ENUM('DESAYUNO', 'MEDIA MAÑANA', 'ALMUERZO', 'ONCES', 'CENA') NOT NULL,
    FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Índices para búsqueda rápida
CREATE INDEX idx_menu_recipes_menu ON menu_recipes(menu_id);
CREATE INDEX idx_menu_recipes_recipe ON menu_recipes(recipe_id);

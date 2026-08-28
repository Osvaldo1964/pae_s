-- 1. Añadir el tipo a la tabla de preparaciones
ALTER TABLE `recipes` 
ADD COLUMN `type` ENUM('SUBPREPARACION', 'MINUTA') NOT NULL DEFAULT 'SUBPREPARACION' AFTER `description`;

-- 2. Crear tabla puente para que una minuta (receta padre) contenga sub-preparaciones (recetas hijas)
CREATE TABLE `recipe_subpreparations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parent_recipe_id` int(11) NOT NULL COMMENT 'ID de la Minuta',
  `child_recipe_id` int(11) NOT NULL COMMENT 'ID de la Sub-preparacion',
  PRIMARY KEY (`id`),
  KEY `idx_rsp_parent` (`parent_recipe_id`),
  KEY `idx_rsp_child` (`child_recipe_id`),
  CONSTRAINT `fk_rsp_parent` FOREIGN KEY (`parent_recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rsp_child` FOREIGN KEY (`child_recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

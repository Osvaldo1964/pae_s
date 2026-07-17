-- =============================================================================
-- MIGRACIÓN: Réplica de Funcionalidad - Fines de Semana y Nombre de Plantilla
-- DESCRIPCIÓN: Agrega la columna `template_id` e índice de búsqueda de forma segura e idempotente.
-- =============================================================================

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS update_menu_cycles_table()
BEGIN
    -- 1. Agregar la columna 'template_id' si no existe
    IF NOT EXISTS (
        SELECT * FROM information_schema.columns 
        WHERE table_schema = DATABASE() 
        AND table_name = 'menu_cycles' 
        AND column_name = 'template_id'
    ) THEN
        ALTER TABLE `menu_cycles` 
        ADD COLUMN `template_id` INT NULL AFTER `pae_id`;
    END IF;

    -- 2. Agregar el índice 'idx_menu_cycles_template' si no existe
    IF NOT EXISTS (
        SELECT * FROM information_schema.statistics 
        WHERE table_schema = DATABASE() 
        AND table_name = 'menu_cycles' 
        AND index_name = 'idx_menu_cycles_template'
    ) THEN
        ALTER TABLE `menu_cycles`
        ADD INDEX `idx_menu_cycles_template` (`template_id`);
    END IF;
END //

DELIMITER ;

-- Ejecutar el procedimiento
CALL update_menu_cycles_table();

-- Limpiar el procedimiento
DROP PROCEDURE IF EXISTS update_menu_cycles_table;

-- ========================================================
-- Migración: Tabla Pivot para Ciclos Focalizados por Sedes
-- ========================================================

-- Esta tabla almacena la relación de qué sedes aplica un ciclo específico.
-- Si un ciclo no tiene registros aquí, automáticamente aplicará de forma GLOBAL a todas las sedes del PAE.

CREATE TABLE IF NOT EXISTS menu_cycle_branches (
    cycle_id INT(11) NOT NULL,
    branch_id INT(11) NOT NULL,
    PRIMARY KEY (cycle_id, branch_id),
    FOREIGN KEY (cycle_id) REFERENCES menu_cycles(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES school_branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

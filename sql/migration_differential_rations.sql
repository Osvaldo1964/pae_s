-- =====================================================
-- MIGRACIÓN: DIFERENCIAL DE RACIONES Y POBLACIÓN
-- =====================================================

-- 1. Crear tabla de Tipos de Población
CREATE TABLE IF NOT EXISTS pae_population_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    name VARCHAR(100) NOT NULL, -- Ej: "Regular", "Indígena", "Afro"
    description TEXT,
    status ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_pop_pae (pae_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Modificar Tipos de Ración para incluir Población
-- Primero añadimos la columna si no existe
SET @exist := (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'pae_ration_types' AND column_name = 'population_type_id');
SET @sql := IF (@exist = 0, 'ALTER TABLE pae_ration_types ADD COLUMN population_type_id INT NULL', 'SELECT "Column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;

-- Añadir FK
SET @exist_fk := (SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_name = 'fk_ration_population');
SET @sql_fk := IF (@exist_fk = 0, 'ALTER TABLE pae_ration_types ADD CONSTRAINT fk_ration_population FOREIGN KEY (population_type_id) REFERENCES pae_population_types(id) ON DELETE SET NULL', 'SELECT "Constraint already exists"');
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;

-- 3. Crear tabla de Derechos de Beneficiario (Muchos a Muchos)
CREATE TABLE IF NOT EXISTS beneficiary_ration_rights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    beneficiary_id INT NOT NULL,
    ration_type_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE CASCADE,
    FOREIGN KEY (ration_type_id) REFERENCES pae_ration_types(id) ON DELETE CASCADE,
    UNIQUE KEY unique_right (beneficiary_id, ration_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. MIGRACIÓN DE DATOS (CRÍTICO)
-- Insertar un derecho de ración para cada beneficiario existente basado en su configuración actual
-- Solo si tiene un ration_type_id válido
INSERT IGNORE INTO beneficiary_ration_rights (beneficiary_id, ration_type_id)
SELECT id, ration_type_id 
FROM beneficiaries 
WHERE ration_type_id IS NOT NULL;

-- 5. Crear poblaciones por defecto para los PAE existentes
-- Se asume población "REGULAR" por defecto
INSERT IGNORE INTO pae_population_types (pae_id, name, description)
SELECT id, 'POBLACIÓN REGULAR', 'Población general escolarizada'
FROM pae_programs;

-- 6. Asignar las raciones existentes a la población REGULAR de su respectivo PAE
UPDATE pae_ration_types rt
JOIN pae_population_types pt ON rt.pae_id = pt.pae_id
SET rt.population_type_id = pt.id
WHERE rt.population_type_id IS NULL 
AND pt.name = 'POBLACIÓN REGULAR';

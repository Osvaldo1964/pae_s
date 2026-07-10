-- Refine beneficiaries table for Resolution 0003 compliance
ALTER TABLE beneficiaries 
  CHANGE COLUMN last_name last_name1 VARCHAR(100) NOT NULL,
  ADD COLUMN second_name VARCHAR(100) AFTER first_name,
  ADD COLUMN last_name2 VARCHAR(100) AFTER last_name1,
  ADD COLUMN disability_type VARCHAR(50) DEFAULT 'NINGUNA' AFTER sisben_category,
  ADD COLUMN enrollment_date DATE AFTER birth_date,
  ADD COLUMN group_name VARCHAR(50) AFTER grade,
  CHANGE COLUMN is_conflict_victim is_victim BOOLEAN DEFAULT FALSE,
  CHANGE COLUMN attention_modality modality ENUM('RACION PREPARADA EN SITIO', 'RACION INDUSTRIALIZADA', 'BONO ALIMENTARIO') DEFAULT 'RACION PREPARADA EN SITIO',
  CHANGE COLUMN ration_type ration_type ENUM('COMPLEMENTO MAÑANA', 'COMPLEMENTO TARDE', 'ALMUERZO') DEFAULT 'ALMUERZO',
  CHANGE COLUMN gender gender VARCHAR(20) DEFAULT 'MASCULINO',
  CHANGE COLUMN shift shift VARCHAR(20) DEFAULT 'UNICA',
  CHANGE COLUMN status status VARCHAR(20) DEFAULT 'ACTIVO';

-- Add missing guardian fields used in controller
ALTER TABLE beneficiaries
  CHANGE COLUMN guardian_name guardian_name VARCHAR(255),
  ADD COLUMN guardian_relationship VARCHAR(100) AFTER guardian_name,
  CHANGE COLUMN guardian_phone guardian_phone VARCHAR(50);

-- Drop unused columns if needed or just leave them
-- ALTER TABLE beneficiaries DROP COLUMN group_letter;

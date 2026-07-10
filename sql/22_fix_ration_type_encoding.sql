-- ============================================================================
-- FIX RATION_TYPE ENUM ENCODING
-- ============================================================================

-- Fix the ENUM definition
ALTER TABLE beneficiaries 
MODIFY COLUMN ration_type ENUM('COMPLEMENTO MAÑANA', 'COMPLEMENTO TARDE', 'ALMUERZO') 
DEFAULT 'ALMUERZO';

-- Recover possible lost values based on shift if they are now empty
UPDATE beneficiaries SET ration_type = 'COMPLEMENTO MAÑANA' 
WHERE (ration_type IS NULL OR ration_type = '') AND shift = 'MAÑANA';

UPDATE beneficiaries SET ration_type = 'COMPLEMENTO TARDE' 
WHERE (ration_type IS NULL OR ration_type = '') AND shift = 'TARDE';

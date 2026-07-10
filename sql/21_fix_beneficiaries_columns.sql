-- ============================================================================
-- FIX MISSING COLUMNS IN BENEFICIARIES TABLE
-- ============================================================================

-- Add is_overage if not exists
SET @dbname = DATABASE();
SET @tablename = 'beneficiaries';
SET @columnname = 'is_overage';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
     AND TABLE_NAME = @tablename
     AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE beneficiaries ADD COLUMN is_overage TINYINT(1) DEFAULT 0 AFTER sisben_category'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add observations if not exists
SET @columnname = 'observations';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
     AND TABLE_NAME = @tablename
     AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE beneficiaries ADD COLUMN observations TEXT DEFAULT NULL AFTER medical_restrictions'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

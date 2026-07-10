-- Add Operator details and Logo columns to pae_programs
-- Created: 2026-01-31

START TRANSACTION;

ALTER TABLE `pae_programs` 
    ADD COLUMN `operator_nit` VARCHAR(20) DEFAULT NULL AFTER `operator_name`,
    ADD COLUMN `operator_address` VARCHAR(200) DEFAULT NULL AFTER `operator_nit`,
    ADD COLUMN `operator_phone` VARCHAR(20) DEFAULT NULL AFTER `operator_address`,
    ADD COLUMN `operator_email` VARCHAR(100) DEFAULT NULL AFTER `operator_phone`,
    ADD COLUMN `entity_logo_path` VARCHAR(255) DEFAULT NULL AFTER `department`,
    ADD COLUMN `operator_logo_path` VARCHAR(255) DEFAULT NULL AFTER `entity_logo_path`,
    MODIFY COLUMN `logo_path` VARCHAR(255) DEFAULT NULL COMMENT 'Logo Principal (Usualmente el de la Entidad o compuesto)';

COMMIT;

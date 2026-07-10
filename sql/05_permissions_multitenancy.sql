-- Schema Update: Role Permissions with Multitenancy Support
-- Created: 2026-01-31
-- Purpose: Add pae_id to module_permissions for program-specific permissions

START TRANSACTION;

-- Add pae_id to module_permissions table
ALTER TABLE `module_permissions`
ADD COLUMN `pae_id` INT(11) DEFAULT NULL AFTER `role_id`,
ADD KEY `idx_perm_pae` (`pae_id`),
ADD CONSTRAINT `fk_perm_pae` FOREIGN KEY (`pae_id`) REFERENCES `pae_programs` (`id`) ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate permissions
ALTER TABLE `module_permissions`
ADD UNIQUE KEY `unique_role_module_pae` (`role_id`, `module_id`, `pae_id`);

-- Seed: Default permissions for SUPER_ADMIN (global, pae_id = NULL)
-- Super Admin has full access to all modules
INSERT INTO `module_permissions` (`role_id`, `pae_id`, `module_id`, `can_create`, `can_read`, `can_update`, `can_delete`)
SELECT 1, NULL, id, 1, 1, 1, 1 FROM `modules`;

COMMIT;

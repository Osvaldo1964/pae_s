-- Multi-Tenancy Migration
-- Created: 2026-01-31

START TRANSACTION;

-- 1. Create Tenant Table
CREATE TABLE `pae_programs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Nombre del Programa (PAE Magdalena)',
  `operator_name` varchar(100) DEFAULT NULL COMMENT 'Empresa que opera',
  `entity_name` varchar(100) DEFAULT NULL COMMENT 'Entidad Territorial',
  `nit` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `city` varchar(50) DEFAULT NULL,
  `department` varchar(50) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Add Tenant ID to Users
ALTER TABLE `users` ADD COLUMN `pae_id` INT(11) DEFAULT NULL AFTER `role_id`;
ALTER TABLE `users` ADD CONSTRAINT `fk_user_pae` FOREIGN KEY (`pae_id`) REFERENCES `pae_programs` (`id`) ON DELETE CASCADE;

-- 3. Add PAE_ADMIN Role
INSERT INTO `roles` (`name`, `description`) VALUES ('PAE_ADMIN', 'Administrador total de un Programa PAE específico');

-- 4. Ensure current Super Admin is Global (pae_id is already NULL by default, but let's be explicit)
-- Logic: pae_id NULL = Global Super Admin (OVCSYSTEMS)
-- Logic: pae_id NOT NULL = User belonging to that specific Program

COMMIT;

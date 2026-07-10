-- Migración: Servicios Granulares por Beneficiario
-- Este script crea la tabla para servicios por beneficiario y realiza la población inicial
-- basándose en los servicios que tiene cada programa actualmente.

-- 1. Crear tabla de servicios por beneficiario
CREATE TABLE IF NOT EXISTS `beneficiary_services` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `pae_id` INT NOT NULL,
    `beneficiary_id` INT NOT NULL,
    `service_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_bs_pae` FOREIGN KEY (`pae_id`) REFERENCES `pae_programs`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bs_beneficiary` FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiaries`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bs_service` FOREIGN KEY (`service_id`) REFERENCES `program_services`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Población inicial: Asignar a cada beneficiario todos los servicios de su programa
-- Esto asegura que el sistema siga funcionando igual para los datos existentes
INSERT IGNORE INTO `beneficiary_services` (pae_id, beneficiary_id, service_id)
SELECT 
    b.pae_id, 
    b.id, 
    ps.service_id 
FROM beneficiaries b
JOIN pae_program_services ps ON b.pae_id = ps.pae_id;

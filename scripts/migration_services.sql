-- Migración para Hostinger: Implementación de Servicios PAE
-- Ejecutar este script en su base de datos de Hostinger

-- 1. Crear tabla de servicios disponibles
CREATE TABLE IF NOT EXISTS `program_services` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Crear tabla de unión para programas y servicios
CREATE TABLE IF NOT EXISTS `pae_program_services` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `pae_id` INT NOT NULL,
    `service_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pae_program` FOREIGN KEY (`pae_id`) REFERENCES `pae_programs`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_program_service` FOREIGN KEY (`service_id`) REFERENCES `program_services`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Insertar servicios iniciales requeridos
INSERT IGNORE INTO `program_services` (`id`, `name`) VALUES 
(1, 'ALIMENTACIÓN'),
(2, 'PRESUPUESTO'),
(3, 'NÓMINA'),
(4, 'TRANSPORTE');

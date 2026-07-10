<?php
require_once __DIR__ . '/../api/utils/Env.php';
require_once __DIR__ . '/../api/config/Database.php';

use Config\Database;

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    $sql = "
        CREATE TABLE IF NOT EXISTS `program_services` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `name` VARCHAR(100) NOT NULL,
            `status` ENUM('active', 'inactive') DEFAULT 'active',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS `pae_program_services` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `pae_id` INT NOT NULL,
            `service_id` INT NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`pae_id`) REFERENCES `pae_programs`(`id`) ON DELETE CASCADE,
            FOREIGN KEY (`service_id`) REFERENCES `program_services`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- Insert initial services
        INSERT IGNORE INTO `program_services` (`name`) VALUES 
        ('ALIMENTACIÓN'),
        ('PRESUPUESTO'),
        ('NÓMINA'),
        ('TRANSPORTE');
    ";

    $conn->exec($sql);
    echo "Tablas creadas y servicios iniciales insertados correctamente.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

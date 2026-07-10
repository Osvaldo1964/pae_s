<?php
require_once __DIR__ . '/../config/Database.php';

use Config\Database;

try {
    $conn = Database::getInstance()->getConnection();
    $conn->beginTransaction();

    echo "Creating Human Resources tables...\n";

    // 1. Create hr_positions table
    $conn->exec("CREATE TABLE IF NOT EXISTS hr_positions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        status ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (pae_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 2. Create hr_employees table
    $conn->exec("CREATE TABLE IF NOT EXISTS hr_employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name1 VARCHAR(100) NOT NULL,
        last_name2 VARCHAR(100) DEFAULT NULL,
        document_number VARCHAR(20) NOT NULL,
        address VARCHAR(255) DEFAULT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        email VARCHAR(100) DEFAULT NULL,
        position_id INT DEFAULT NULL,
        hire_date DATE DEFAULT NULL,
        termination_date DATE DEFAULT NULL,
        eps VARCHAR(100) DEFAULT NULL,
        afp VARCHAR(100) DEFAULT NULL,
        arl VARCHAR(100) DEFAULT NULL,
        salary DECIMAL(12,2) DEFAULT 0.00,
        status ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (pae_id),
        INDEX (position_id),
        FOREIGN KEY (position_id) REFERENCES hr_positions(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    echo "Adding HR to Menu...\n";

    // 3. Add to module_groups
    $stmt = $conn->prepare("INSERT INTO module_groups (name, icon, order_index) VALUES (?, ?, ?)");
    $stmt->execute(['Recurso Humano', 'fas fa-id-card', 7]);
    $groupId = $conn->lastInsertId();

    // 4. Add to modules
    $stmtMod = $conn->prepare("INSERT INTO modules (group_id, name, description, route_key, icon, order_index) VALUES (?, ?, ?, ?, ?, ?)");
    $stmtMod->execute([$groupId, 'Cargos', 'Gestión de cargos y perfiles', 'hr-positions', 'fas fa-briefcase', 1]);
    $stmtMod->execute([$groupId, 'Empleados', 'Maestro de empleados y nómina', 'hr-employees', 'fas fa-user-tie', 2]);

    $conn->commit();
    echo "Migration completed successfully.\n";
} catch (Exception $e) {
    if (isset($conn)) $conn->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}

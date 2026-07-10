<?php
require_once __DIR__ . '/../config/Database.php';

use Config\Database;

try {
    $db = Database::getInstance()->getConnection();

    $sql = "CREATE TABLE IF NOT EXISTS daily_consumptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        branch_id INT NOT NULL,
        beneficiary_id INT NOT NULL,
        date DATE NOT NULL,
        meal_type ENUM('DESAYUNO', 'ALMUERZO', 'AM', 'PM', 'CENA') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        synced_at TIMESTAMP NULL DEFAULT NULL,
        UNIQUE KEY unique_consumption (beneficiary_id, date, meal_type),
        INDEX idx_consumption_date (date),
        INDEX idx_consumption_branch (branch_id),
        FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES school_branches(id) ON DELETE CASCADE,
        FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $db->exec($sql);
    echo "Migration successful: 'daily_consumptions' table created.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

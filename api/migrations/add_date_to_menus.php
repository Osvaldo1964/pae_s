<?php
require_once __DIR__ . '/../config/Database.php';

try {
    $db = \Config\Database::getInstance()->getConnection();
    echo "Connected to DB.\n";

    // 1. Check if column exists
    $stmt = $db->query("SHOW COLUMNS FROM menus LIKE 'date'");
    $exists = $stmt->fetch();

    if (!$exists) {
        echo "Adding 'date' column to menus table...\n";
        $sql = "ALTER TABLE menus ADD COLUMN date DATE NULL AFTER cycle_id";
        $db->exec($sql);
        echo "Column 'date' added successfully.\n";

        // Add index
        $db->exec("CREATE INDEX idx_menus_date ON menus(date)");
        echo "Index on 'date' added.\n";
    } else {
        echo "Column 'date' already exists.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}

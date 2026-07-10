<?php

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../utils/Env.php';

use Config\Database;

function runQuery($conn, $sql)
{
    echo "[INFO] Attempting: " . $sql . "\n";
    try {
        $conn->exec($sql);
        echo "[SUCCESS]\n";
    } catch (Exception $e) {
        echo "[ERROR] SQL failed: " . $e->getMessage() . "\n";
        throw $e;
    }
}

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    echo "Starting migration: Add 'is_perishable' to 'items' table...\n";

    // 1. Add the column at the end
    runQuery($conn, "ALTER TABLE items ADD COLUMN is_perishable TINYINT(1) DEFAULT 0");

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "MIGRATION FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

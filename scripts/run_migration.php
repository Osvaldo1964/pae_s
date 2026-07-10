<?php
require_once __DIR__ . '/../api/utils/Env.php';
require_once __DIR__ . '/../api/config/Database.php';

try {
    $conn = \Config\Database::getInstance()->getConnection();
    $sql = file_get_contents(__DIR__ . '/migration_beneficiary_services.sql');

    // Split by semicolon to execute one by one if needed, but exec should handle multiple if configured
    // For safety with MySQL, we'll execute the whole content
    $conn->exec($sql);
    echo "Migration successful\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}

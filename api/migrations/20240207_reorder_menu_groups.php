<?php

/**
 * Migration: Reorder module groups
 * Move Recurso Humano before Reportes
 */

require_once __DIR__ . '/../config/Database.php';

try {
    $db = \Config\Database::getInstance()->getConnection();

    // Set Recurso Humano to 6 and Reportes to 7
    $db->exec("UPDATE module_groups SET order_index = 6 WHERE name = 'Recurso Humano'");
    $db->exec("UPDATE module_groups SET order_index = 7 WHERE name = 'Reportes'");

    echo "Module groups reordered successfully: Recurso Humano (6) < Reportes (7).\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

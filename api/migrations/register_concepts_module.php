<?php
// Script CORREGIDO para registrar el módulo de Conceptos
$env = [];
$lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0)
        continue;
    list($name, $value) = explode('=', $line, 2);
    $env[trim($name)] = trim($value);
}

$host = $env['DB_HOST'] ?? 'localhost';
$dbname = $env['DB_NAME'] ?? 'db-pae';
$user = $env['DB_USER'] ?? 'root';
$pass = $env['DB_PASS'] ?? '';

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Obtener ID del grupo "Recurso Humano"
    $stmtG = $conn->query("SELECT id FROM module_groups WHERE name = 'Recurso Humano'");
    $groupId = $stmtG->fetchColumn();

    if (!$groupId) {
        $groupId = 4; // ID fallback
    }

    // 2. Registrar el módulo con las columnas correctas: group_id, name, description, route_key, icon, order_index
    $stmtIns = $conn->prepare("INSERT INTO modules (group_id, name, description, route_key, icon, order_index) 
                               VALUES (?, 'Conceptos Nómina', 'Gestión de pagos y descuentos', 'hr-payroll-concepts', 'fas fa-tags', 4)
                               ON DUPLICATE KEY UPDATE name = 'Conceptos Nómina', description = 'Gestión de pagos y descuentos'");
    $stmtIns->execute([$groupId]);

    echo "Module 'Conceptos Nómina' registered successfully in group ID: $groupId\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

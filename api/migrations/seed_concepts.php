<?php
// Seeder de conceptos básicos
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
    $paes = $conn->query('SELECT id FROM pae_programs')->fetchAll(PDO::FETCH_COLUMN);
    $concepts = [
        ['Horas Extras', 'DEVENGADO'],
        ['Bonificación', 'DEVENGADO'],
        ['Préstamo', 'DEDUCCION'],
        ['Libranza', 'DEDUCCION']
    ];

    foreach ($paes as $pae_id) {
        foreach ($concepts as $c) {
            $stmt = $conn->prepare('INSERT INTO hr_payroll_concepts (pae_id, name, type, status) 
                                   SELECT ?, ?, ?, \'ACTIVO\' 
                                   WHERE NOT EXISTS (SELECT 1 FROM hr_payroll_concepts WHERE pae_id = ? AND name = ?)');
            $stmt->execute([$pae_id, $c[0], $c[1], $pae_id, $c[0]]);
        }
    }
    echo "Concepts seeded successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

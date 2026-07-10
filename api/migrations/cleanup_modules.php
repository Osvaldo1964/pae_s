<?php
// Script de limpieza de módulos duplicados
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

    echo "Cleaning duplicate modules...\n";

    // Encontrar duplicados por route_key
    $stmt = $conn->query("SELECT route_key, COUNT(*) as count FROM modules GROUP BY route_key HAVING count > 1");
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($duplicates as $dup) {
        $route_key = $dup['route_key'];
        echo "Fixing duplicates for route: $route_key\n";

        // Mantener el ID más bajo y borrar el resto
        $stmtFind = $conn->prepare("SELECT id FROM modules WHERE route_key = ? ORDER BY id ASC");
        $stmtFind->execute([$route_key]);
        $ids = $stmtFind->fetchAll(PDO::FETCH_COLUMN);

        $keepId = array_shift($ids);
        if (!empty($ids)) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $stmtDel = $conn->prepare("DELETE FROM modules WHERE id IN ($placeholders)");
            $stmtDel->execute($ids);
            echo "Deleted " . count($ids) . " duplicate(ids: " . implode(',', $ids) . ")\n";
        }
    }

    echo "Cleanup completed successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}

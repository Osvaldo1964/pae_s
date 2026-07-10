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

    echo "Starting migration: Create 'presupuesto_movimiento_tipos' table and alter 'presupuesto_movimientos'...\n";

    // 1. Alter table
    runQuery($conn, "ALTER TABLE presupuesto_movimientos MODIFY COLUMN tipo_movimiento VARCHAR(100) NOT NULL");

    // 2. Create table
    runQuery($conn, "CREATE TABLE IF NOT EXISTS presupuesto_movimiento_tipos (
        id_tipo_movimiento INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 3. Seed default types for existing programs
    echo "[INFO] Seeding default movement types for existing programs...\n";
    $programs = $conn->query("SELECT id FROM pae_programs")->fetchAll(PDO::FETCH_ASSOC);
    $defaults = ['PAGO', 'COMPRA', 'NOMINA', 'SERVICIO', 'OTRO'];
    
    $stmt = $conn->prepare("INSERT INTO presupuesto_movimiento_tipos (pae_id, nombre, descripcion) VALUES (:pae_id, :nombre, :descripcion)");
    
    foreach ($programs as $p) {
        $pae_id = $p['id'];
        foreach ($defaults as $d) {
            $stmtCheck = $conn->prepare("SELECT COUNT(*) FROM presupuesto_movimiento_tipos WHERE pae_id = ? AND nombre = ?");
            $stmtCheck->execute([$pae_id, $d]);
            if ($stmtCheck->fetchColumn() == 0) {
                $stmt->execute([
                    ":pae_id" => $pae_id,
                    ":nombre" => $d,
                    ":descripcion" => "Tipo de movimiento predeterminado"
                ]);
            }
        }
    }
    echo "[SUCCESS] Default seeding completed.\n";

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "MIGRATION FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

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

    echo "Starting migration: Create 'presupuesto_ajustes' table...\n";

    $sql = "CREATE TABLE IF NOT EXISTS presupuesto_ajustes (
        id_ajuste INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        fecha DATE NOT NULL,
        asignacion_id INT NOT NULL,
        tipo_ajuste ENUM('ADICION', 'REDUCCION') NOT NULL,
        valor DECIMAL(15,2) NOT NULL,
        justificacion TEXT NOT NULL,
        usuario_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asignacion_id) REFERENCES presupuesto_asignacion(id_asignacion) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

    runQuery($conn, $sql);

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "MIGRATION FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

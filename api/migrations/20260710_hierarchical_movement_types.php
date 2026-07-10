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

    echo "Starting migration: Hierarchical movement types columns...\n";

    // 1. Add padre_id to presupuesto_movimiento_tipos
    try {
        runQuery($conn, "ALTER TABLE presupuesto_movimiento_tipos ADD COLUMN padre_id INT NULL DEFAULT NULL");
        runQuery($conn, "ALTER TABLE presupuesto_movimiento_tipos ADD CONSTRAINT fk_tipo_movimiento_padre FOREIGN KEY (padre_id) REFERENCES presupuesto_movimiento_tipos(id_tipo_movimiento) ON DELETE SET NULL");
        echo "[INFO] Added padre_id column and foreign key to presupuesto_movimiento_tipos.\n";
    } catch (Exception $e) {
        echo "[INFO] Column padre_id might already exist or error occurred: " . $e->getMessage() . "\n";
    }

    // 2. Add tipo_movimiento_id to presupuesto_movimientos
    try {
        runQuery($conn, "ALTER TABLE presupuesto_movimientos ADD COLUMN tipo_movimiento_id INT NULL DEFAULT NULL");
        runQuery($conn, "ALTER TABLE presupuesto_movimientos ADD CONSTRAINT fk_movimiento_tipo FOREIGN KEY (tipo_movimiento_id) REFERENCES presupuesto_movimiento_tipos(id_tipo_movimiento) ON DELETE SET NULL");
        echo "[INFO] Added tipo_movimiento_id column and foreign key to presupuesto_movimientos.\n";
    } catch (Exception $e) {
        echo "[INFO] Column tipo_movimiento_id might already exist or error occurred: " . $e->getMessage() . "\n";
    }

    // 3. Map existing string-based tipo_movimiento to tipo_movimiento_id with Collation fix
    echo "[INFO] Mapping existing transactions to the new tipo_movimiento_id column...\n";
    $updateSql = "
        UPDATE presupuesto_movimientos m
        JOIN presupuesto_movimiento_tipos t ON m.pae_id = t.pae_id AND UPPER(TRIM(m.tipo_movimiento)) = UPPER(TRIM(t.nombre)) COLLATE utf8mb4_unicode_ci
        SET m.tipo_movimiento_id = t.id_tipo_movimiento
        WHERE m.tipo_movimiento_id IS NULL
    ";
    runQuery($conn, $updateSql);
    echo "[SUCCESS] Existing movements mapped to IDs.\n";

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "MIGRATION FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

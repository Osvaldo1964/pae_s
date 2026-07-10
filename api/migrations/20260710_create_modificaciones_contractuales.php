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

    echo "Starting migration: Modificaciones Contractuales tables and data migration...\n";

    // 1. Create presupuesto_modificaciones
    $sql1 = "CREATE TABLE IF NOT EXISTS presupuesto_modificaciones (
        id_modificacion INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        fecha DATE NOT NULL,
        tipo_modificacion ENUM('ADICION', 'REDUCCION', 'TRASLADO') NOT NULL,
        justificacion TEXT NOT NULL,
        usuario_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    runQuery($conn, $sql1);

    // 2. Create presupuesto_modificaciones_detalles
    $sql2 = "CREATE TABLE IF NOT EXISTS presupuesto_modificaciones_detalles (
        id_detalle INT AUTO_INCREMENT PRIMARY KEY,
        modificacion_id INT NOT NULL,
        asignacion_id INT NOT NULL,
        tipo_afectacion ENUM('ADICION', 'REDUCCION') NOT NULL,
        valor DECIMAL(15,2) NOT NULL,
        FOREIGN KEY (modificacion_id) REFERENCES presupuesto_modificaciones(id_modificacion) ON DELETE CASCADE,
        FOREIGN KEY (asignacion_id) REFERENCES presupuesto_asignacion(id_asignacion) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    runQuery($conn, $sql2);

    $renameAjustes = false;
    $renameTraslados = false;

    // Check tables
    $stmtCheckBackupAjustes = $conn->query("SHOW TABLES LIKE 'backup_presupuesto_ajustes'");
    $backupAjustesExists = $stmtCheckBackupAjustes->rowCount() > 0;

    $stmtCheckAjustes = $conn->query("SHOW TABLES LIKE 'presupuesto_ajustes'");
    $ajustesExists = $stmtCheckAjustes->rowCount() > 0;

    $stmtCheckBackupTraslados = $conn->query("SHOW TABLES LIKE 'backup_presupuesto_traslados'");
    $backupTrasladosExists = $stmtCheckBackupTraslados->rowCount() > 0;

    $stmtCheckTraslados = $conn->query("SHOW TABLES LIKE 'presupuesto_traslados'");
    $trasladosExists = $stmtCheckTraslados->rowCount() > 0;

    // Start transaction for DML operations (inserts)
    $conn->beginTransaction();

    if ($ajustesExists && !$backupAjustesExists) {
        echo "[INFO] Migrating data from presupuesto_ajustes...\n";
        $stmt = $conn->query("SELECT * FROM presupuesto_ajustes");
        $ajustes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($ajustes as $aj) {
            $stmtMaster = $conn->prepare("INSERT INTO presupuesto_modificaciones (pae_id, fecha, tipo_modificacion, justificacion, usuario_id, created_at) VALUES (:pae_id, :fecha, :tipo_modificacion, :justificacion, :usuario_id, :created_at)");
            $stmtMaster->execute([
                ':pae_id' => $aj['pae_id'],
                ':fecha' => $aj['fecha'],
                ':tipo_modificacion' => $aj['tipo_ajuste'],
                ':justificacion' => $aj['justificacion'],
                ':usuario_id' => $aj['usuario_id'],
                ':created_at' => $aj['created_at']
            ]);
            $mod_id = $conn->lastInsertId();

            $stmtDetail = $conn->prepare("INSERT INTO presupuesto_modificaciones_detalles (modificacion_id, asignacion_id, tipo_afectacion, valor) VALUES (:modificacion_id, :asignacion_id, :tipo_afectacion, :valor)");
            $stmtDetail->execute([
                ':modificacion_id' => $mod_id,
                ':asignacion_id' => $aj['asignacion_id'],
                ':tipo_afectacion' => $aj['tipo_ajuste'],
                ':valor' => $aj['valor']
            ]);
        }
        echo "[SUCCESS] Migrated " . count($ajustes) . " adjustments.\n";
        $renameAjustes = true;
    }

    if ($trasladosExists && !$backupTrasladosExists) {
        echo "[INFO] Migrating data from presupuesto_traslados...\n";
        $stmt = $conn->query("SELECT * FROM presupuesto_traslados");
        $traslados = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($traslados as $tr) {
            $stmtMaster = $conn->prepare("INSERT INTO presupuesto_modificaciones (pae_id, fecha, tipo_modificacion, justificacion, usuario_id, created_at) VALUES (:pae_id, :fecha, 'TRASLADO', :justificacion, :usuario_id, :created_at)");
            $stmtMaster->execute([
                ':pae_id' => $tr['pae_id'],
                ':fecha' => $tr['fecha'],
                ':justificacion' => $tr['justificacion'],
                ':usuario_id' => $tr['usuario_id'],
                ':created_at' => $tr['created_at']
            ]);
            $mod_id = $conn->lastInsertId();

            $stmtDetail = $conn->prepare("INSERT INTO presupuesto_modificaciones_detalles (modificacion_id, asignacion_id, tipo_afectacion, valor) VALUES (:modificacion_id, :asignacion_id, 'REDUCCION', :valor)");
            $stmtDetail->execute([
                ':modificacion_id' => $mod_id,
                ':asignacion_id' => $tr['origen_id'],
                ':valor' => $tr['valor']
            ]);

            $stmtDetail->execute([
                ':modificacion_id' => $mod_id,
                ':asignacion_id' => $tr['destino_id'],
                ':tipo_afectacion' => 'ADICION',
                ':valor' => $tr['valor']
            ]);
        }
        echo "[SUCCESS] Migrated " . count($traslados) . " transfers.\n";
        $renameTraslados = true;
    }

    // Commit DML inserts first
    $conn->commit();
    echo "[INFO] Data migration committed successfully.\n";

    // Run DDL RENAME commands outside transaction
    if ($renameAjustes) {
        runQuery($conn, "RENAME TABLE presupuesto_ajustes TO backup_presupuesto_ajustes");
    }
    if ($renameTraslados) {
        runQuery($conn, "RENAME TABLE presupuesto_traslados TO backup_presupuesto_traslados");
    }

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    echo "MIGRATION FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

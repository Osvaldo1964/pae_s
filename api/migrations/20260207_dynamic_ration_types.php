<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../utils/Env.php';

use Config\Database;

function runQuery($conn, $sql)
{
    echo "[DEBUG] Attempting: " . substr($sql, 0, 100) . "...\n";
    try {
        $conn->exec($sql);
        echo "OK\n";
    } catch (Exception $e) {
        $msg = "[ERROR] SQL failed: " . $sql . "\n" . "[ERROR] Message: " . $e->getMessage() . "\n";
        fwrite(STDERR, $msg);
        echo $msg;
        throw $e;
    }
}

try {
    $conn = Database::getInstance()->getConnection();
    $conn->beginTransaction();

    echo "--- 1. Creating Table ---\n";
    runQuery($conn, "CREATE TABLE IF NOT EXISTS pae_ration_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT DEFAULT NULL,
        status ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (pae_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    echo "--- 2. Seeding ---\n";
    $stmt = $conn->query("SELECT id FROM pae_programs");
    $programs = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $defaultRations = ['DESAYUNO', 'ALMUERZO', 'REFRIGERIO'];
    foreach ($programs as $pae_id) {
        foreach ($defaultRations as $name) {
            $check = $conn->prepare("SELECT id FROM pae_ration_types WHERE pae_id = ? AND name = ?");
            $check->execute([$pae_id, $name]);
            if (!$check->fetch()) {
                $conn->prepare("INSERT INTO pae_ration_types (pae_id, name) VALUES (?, ?)")->execute([$pae_id, $name]);
            }
        }
    }

    echo "--- 3. Direct Tables ---\n";
    $directTables = [
        'beneficiaries' => 'ration_type',
        'recipes' => 'meal_type',
        'daily_consumptions' => 'meal_type',
        'menus' => 'meal_type'
    ];
    foreach ($directTables as $table => $column) {
        runQuery($conn, "ALTER TABLE $table ADD COLUMN IF NOT EXISTS ration_type_id INT AFTER $column");
        runQuery($conn, "UPDATE $table t JOIN pae_ration_types rt ON t.pae_id = rt.pae_id AND t.$column = rt.name SET t.ration_type_id = rt.id");
    }

    echo "--- 4. Child Tables ---\n";
    runQuery($conn, "ALTER TABLE cycle_template_days ADD COLUMN IF NOT EXISTS ration_type_id INT AFTER meal_type");
    runQuery($conn, "UPDATE cycle_template_days ctd JOIN cycle_templates ct ON ctd.template_id = ct.id JOIN pae_ration_types rt ON ct.pae_id = rt.pae_id AND ctd.meal_type = rt.name SET ctd.ration_type_id = rt.id");

    runQuery($conn, "ALTER TABLE menu_recipes ADD COLUMN IF NOT EXISTS ration_type_id INT AFTER meal_type");
    runQuery($conn, "UPDATE menu_recipes mr JOIN menus m ON mr.menu_id = m.id JOIN pae_ration_types rt ON m.pae_id = rt.pae_id AND mr.meal_type = rt.name SET mr.ration_type_id = rt.id");

    echo "--- 5. Nutritional Parameters ---\n";
    $checkNP = $conn->query("SHOW COLUMNS FROM nutritional_parameters LIKE 'pae_id'");
    if (!$checkNP->fetch()) {
        runQuery($conn, "ALTER TABLE nutritional_parameters ADD COLUMN pae_id INT DEFAULT NULL AFTER id");
        if (!empty($programs)) {
            runQuery($conn, "UPDATE nutritional_parameters SET pae_id = " . $programs[0]);
        }
    }
    runQuery($conn, "ALTER TABLE nutritional_parameters ADD COLUMN IF NOT EXISTS ration_type_id INT AFTER meal_type");
    runQuery($conn, "UPDATE nutritional_parameters np JOIN pae_ration_types rt ON np.pae_id = rt.pae_id AND (np.meal_type = rt.name OR (np.meal_type = '' AND rt.name = 'REFRIGERIO')) SET np.ration_type_id = rt.id");

    $conn->commit();
    echo "DONE\n";
} catch (Exception $e) {
    if (isset($conn))
        $conn->rollBack();
    echo "--- FATAL ERROR ---\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

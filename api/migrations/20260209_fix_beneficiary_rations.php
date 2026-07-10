<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../utils/Env.php';

use Config\Database;

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();

    echo "Sincronizando ration_type_id para beneficiarios...\n";

    // 1. Sincronizar basados en el texto original
    $sql = "UPDATE beneficiaries b 
            JOIN pae_ration_types rt ON b.pae_id = rt.pae_id AND b.ration_type = rt.name 
            SET b.ration_type_id = rt.id 
            WHERE b.ration_type_id IS NULL OR b.ration_type_id = 0";
    $affected = $conn->exec($sql);
    echo "  - Sincronizados basándose en texto: $affected registros.\n";

    // 2. Asignar un ID por defecto (el primero del programa) para los que aún no tienen y tienen estatus ACTIVO
    // Esto previene que se ignoren en el cálculo si el campo string también estaba vacío
    $sqlDefault = "UPDATE beneficiaries b 
                   SET b.ration_type_id = (SELECT id FROM pae_ration_types WHERE pae_id = b.pae_id LIMIT 1) 
                   WHERE (b.ration_type_id IS NULL OR b.ration_type_id = 0) AND b.status = 'ACTIVO'";
    $affectedDefault = $conn->exec($sqlDefault);
    echo "  - Asignados por defecto a estudiantes activos sin tipo: $affectedDefault registros.\n";

    echo "Sincronización completada.\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

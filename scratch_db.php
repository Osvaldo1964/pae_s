<?php
require 'api/utils/Env.php';
require 'api/config/Database.php';

$db = Config\Database::getInstance()->getConnection();

try {
    $db->beginTransaction();

    // Find all beneficiaries who have ration rights but do not have the ALIMENTACIÓN service (ID 1)
    $stmt = $db->query("
        INSERT IGNORE INTO beneficiary_services (pae_id, beneficiary_id, service_id)
        SELECT DISTINCT brr.pae_id, brr.beneficiary_id, 1 
        FROM beneficiary_ration_rights brr
        LEFT JOIN beneficiary_services bs 
            ON brr.beneficiary_id = bs.beneficiary_id AND bs.service_id = 1
        WHERE bs.id IS NULL
    ");

    $count = $stmt->rowCount();
    $db->commit();
    echo "Fixed $count beneficiaries missing ALIMENTACIÓN service.\n";
} catch (Exception $e) {
    $db->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}

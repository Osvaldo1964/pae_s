<?php
require_once __DIR__ . '/../config/Database.php';

use Config\Database;

try {
    $conn = Database::getInstance()->getConnection();
    $conn->beginTransaction();

    echo "Starting migration: Updating meal types to align with PAE document...\n";

    // 1. Update beneficiaries table (ration_type)
    echo "Updating beneficiaries...\n";
    $conn->exec("ALTER TABLE beneficiaries MODIFY COLUMN ration_type VARCHAR(100)");
    $conn->exec("UPDATE beneficiaries SET ration_type = 'DESAYUNO' WHERE ration_type = 'COMPLEMENTO MAÑANA'");
    $conn->exec("UPDATE beneficiaries SET ration_type = 'COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE' WHERE ration_type = 'COMPLEMENTO TARDE'");
    $conn->exec("ALTER TABLE beneficiaries MODIFY COLUMN ration_type ENUM(
        'DESAYUNO', 
        'COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE', 
        'ALMUERZO', 
        'REFRIGERIO',
        'REFRIGERIO REFORZADO INDUSTRIALIZADO',
        'DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS'
    ) DEFAULT 'ALMUERZO'");

    // 2. Update cycle_template_days table
    echo "Updating cycle_template_days...\n";
    $conn->exec("ALTER TABLE cycle_template_days MODIFY COLUMN meal_type ENUM(
        'DESAYUNO', 
        'COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE', 
        'ALMUERZO', 
        'REFRIGERIO',
        'REFRIGERIO REFORZADO INDUSTRIALIZADO',
        'DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS'
    ) NOT NULL");

    // 3. Update daily_consumptions table
    echo "Updating daily_consumptions...\n";
    $conn->exec("ALTER TABLE daily_consumptions MODIFY COLUMN meal_type VARCHAR(100)");
    $conn->exec("UPDATE daily_consumptions SET meal_type = 'REFRIGERIO' WHERE meal_type IN ('AM', 'PM')");
    $conn->exec("ALTER TABLE daily_consumptions MODIFY COLUMN meal_type ENUM(
        'DESAYUNO', 
        'COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE', 
        'ALMUERZO', 
        'REFRIGERIO',
        'REFRIGERIO REFORZADO INDUSTRIALIZADO',
        'DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS'
    ) NOT NULL");

    // 4. Update recipes table
    echo "Updating recipes...\n";
    $conn->exec("ALTER TABLE recipes MODIFY COLUMN meal_type VARCHAR(100)");
    $conn->exec("UPDATE recipes SET meal_type = 'REFRIGERIO' WHERE meal_type IN ('MEDIA MAÑANA', 'ONCES', 'CENA')");
    $conn->exec("ALTER TABLE recipes MODIFY COLUMN meal_type ENUM(
        'DESAYUNO', 
        'COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE', 
        'ALMUERZO', 
        'REFRIGERIO',
        'REFRIGERIO REFORZADO INDUSTRIALIZADO',
        'DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS'
    ) NOT NULL");

    // 5. Update menus table
    echo "Updating menus...\n";
    $conn->exec("ALTER TABLE menus MODIFY COLUMN meal_type VARCHAR(100)");
    $conn->exec("UPDATE menus SET meal_type = 'REFRIGERIO' WHERE meal_type IN ('MEDIA MAÑANA', 'ONCES', 'CENA')");
    $conn->exec("ALTER TABLE menus MODIFY COLUMN meal_type ENUM(
        'DESAYUNO', 
        'COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE', 
        'ALMUERZO', 
        'REFRIGERIO',
        'REFRIGERIO REFORZADO INDUSTRIALIZADO',
        'DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS'
    ) DEFAULT 'ALMUERZO'");

    // 6. Update menu_recipes table
    echo "Updating menu_recipes...\n";
    $conn->exec("ALTER TABLE menu_recipes MODIFY COLUMN meal_type VARCHAR(100)");
    $conn->exec("UPDATE menu_recipes SET meal_type = 'REFRIGERIO' WHERE meal_type IN ('MEDIA MAÑANA', 'ONCES', 'CENA')");
    // Handle the weird encoding if present
    $conn->exec("UPDATE menu_recipes SET meal_type = 'REFRIGERIO' WHERE meal_type LIKE 'MEDIA MA%'");
    $conn->exec("ALTER TABLE menu_recipes MODIFY COLUMN meal_type ENUM(
        'DESAYUNO', 
        'COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE', 
        'ALMUERZO', 
        'REFRIGERIO',
        'REFRIGERIO REFORZADO INDUSTRIALIZADO',
        'DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS'
    ) NOT NULL");

    // 7. Update nutritional_parameters table
    echo "Updating nutritional_parameters...\n";
    $conn->exec("ALTER TABLE nutritional_parameters MODIFY COLUMN meal_type VARCHAR(100)");
    $conn->exec("UPDATE nutritional_parameters SET meal_type = 'REFRIGERIO' WHERE meal_type IN ('MEDIA MAÑANA', 'ONCES', 'CENA', '')");
    $conn->exec("ALTER TABLE nutritional_parameters MODIFY COLUMN meal_type ENUM(
        'DESAYUNO', 
        'COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE', 
        'ALMUERZO', 
        'REFRIGERIO',
        'REFRIGERIO REFORZADO INDUSTRIALIZADO',
        'DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS'
    ) NOT NULL");



    $conn->commit();
    echo "Migration completed successfully.\n";
} catch (Exception $e) {
    if (isset($conn)) $conn->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}

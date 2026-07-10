<?php
require_once __DIR__ . '/../config/Database.php';

use Config\Database;

$steps = [
    "Table beneficiaries: VARCHAR" => "ALTER TABLE beneficiaries MODIFY COLUMN ration_type VARCHAR(100)",
    "Table beneficiaries: Map 1" => "UPDATE beneficiaries SET ration_type = 'DESAYUNO' WHERE ration_type = 'COMPLEMENTO MAÑANA'",
    "Table beneficiaries: Map 2" => "UPDATE beneficiaries SET ration_type = 'COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE' WHERE ration_type = 'COMPLEMENTO TARDE'",
    "Table beneficiaries: ENUM" => "ALTER TABLE beneficiaries MODIFY COLUMN ration_type ENUM('DESAYUNO','COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE','ALMUERZO','REFRIGERIO','REFRIGERIO REFORZADO INDUSTRIALIZADO','DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS') DEFAULT 'ALMUERZO'",

    "Table cycle_template_days: ENUM" => "ALTER TABLE cycle_template_days MODIFY COLUMN meal_type ENUM('DESAYUNO','COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE','ALMUERZO','REFRIGERIO','REFRIGERIO REFORZADO INDUSTRIALIZADO','DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS') NOT NULL",

    "Table daily_consumptions: VARCHAR" => "ALTER TABLE daily_consumptions MODIFY COLUMN meal_type VARCHAR(100)",
    "Table daily_consumptions: Map" => "UPDATE daily_consumptions SET meal_type = 'REFRIGERIO' WHERE meal_type IN ('AM', 'PM')",
    "Table daily_consumptions: ENUM" => "ALTER TABLE daily_consumptions MODIFY COLUMN meal_type ENUM('DESAYUNO','COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE','ALMUERZO','REFRIGERIO','REFRIGERIO REFORZADO INDUSTRIALIZADO','DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS') NOT NULL",

    "Table recipes: VARCHAR" => "ALTER TABLE recipes MODIFY COLUMN meal_type VARCHAR(100)",
    "Table recipes: Map" => "UPDATE recipes SET meal_type = 'REFRIGERIO' WHERE meal_type IN ('MEDIA MAÑANA', 'ONCES', 'CENA')",
    "Table recipes: ENUM" => "ALTER TABLE recipes MODIFY COLUMN meal_type ENUM('DESAYUNO','COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE','ALMUERZO','REFRIGERIO','REFRIGERIO REFORZADO INDUSTRIALIZADO','DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS') NOT NULL",

    "Table menus: VARCHAR" => "ALTER TABLE menus MODIFY COLUMN meal_type VARCHAR(100)",
    "Table menus: Map" => "UPDATE menus SET meal_type = 'REFRIGERIO' WHERE meal_type IN ('MEDIA MAÑANA', 'ONCES', 'CENA')",
    "Table menus: ENUM" => "ALTER TABLE menus MODIFY COLUMN meal_type ENUM('DESAYUNO','COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE','ALMUERZO','REFRIGERIO','REFRIGERIO REFORZADO INDUSTRIALIZADO','DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS') DEFAULT 'ALMUERZO'",

    "Table menu_recipes: VARCHAR" => "ALTER TABLE menu_recipes MODIFY COLUMN meal_type VARCHAR(100)",
    "Table menu_recipes: Map" => "UPDATE menu_recipes SET meal_type = 'REFRIGERIO' WHERE meal_type IN ('MEDIA MAÑANA', 'ONCES', 'CENA') OR meal_type LIKE 'MEDIA MA%'",
    "Table menu_recipes: ENUM" => "ALTER TABLE menu_recipes MODIFY COLUMN meal_type ENUM('DESAYUNO','COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE','ALMUERZO','REFRIGERIO','REFRIGERIO REFORZADO INDUSTRIALIZADO','DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS') NOT NULL",

    "Table nutritional_parameters: VARCHAR" => "ALTER TABLE nutritional_parameters MODIFY COLUMN meal_type VARCHAR(100)",
    "Table nutritional_parameters: Map" => "UPDATE nutritional_parameters SET meal_type = 'REFRIGERIO' WHERE meal_type IN ('MEDIA MAÑANA', 'ONCES', 'CENA', '')",
    "Table nutritional_parameters: ENUM" => "ALTER TABLE nutritional_parameters MODIFY COLUMN meal_type ENUM('DESAYUNO','COMPLEMENTO ALIMENTARIO JORNADA DE LA TARDE','ALMUERZO','REFRIGERIO','REFRIGERIO REFORZADO INDUSTRIALIZADO','DESAYUNO INDUSTRIALIZADO PARA EMERGENCIAS') NOT NULL"
];

try {
    $conn = Database::getInstance()->getConnection();
    echo "Running steps...\n";
    foreach ($steps as $name => $sql) {
        echo "Step: $name...";
        $conn->exec($sql);
        echo " OK\n";
    }
    echo "All steps completed.\n";
} catch (Exception $e) {
    echo " FAILED\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "SQL that failed: " . ($sql ?? 'none') . "\n";
}

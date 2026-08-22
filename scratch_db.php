<?php
require 'api/utils/Env.php';
require 'api/config/Database.php';

$db = Config\Database::getInstance()->getConnection();

try {
    // 1. Añadir las columnas a la base de datos (Hostinger)
    $stmtCheck = $db->query("SHOW COLUMNS FROM recipe_nutrition LIKE 'total_calcium'");
    if ($stmtCheck->rowCount() == 0) {
        $db->exec("ALTER TABLE recipe_nutrition 
                   ADD COLUMN total_calcium DECIMAL(10,2) DEFAULT 0.00,
                   ADD COLUMN total_iron DECIMAL(10,2) DEFAULT 0.00,
                   ADD COLUMN total_sodium DECIMAL(10,2) DEFAULT 0.00");
        echo "Columnas añadidas con éxito.<br>\n";
    } else {
        echo "Las columnas ya existían.<br>\n";
    }

    // 2. Recalcular las minutas
    $stmt = $db->query("SELECT id FROM recipes");
    $recipes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    require_once 'api/controllers/RecipeController.php';
    $controller = new \Controllers\RecipeController();
    
    // Hacemos accesible el método privado de recálculo
    $reflection = new ReflectionClass($controller);
    $method = $reflection->getMethod('recalculateNutrition');
    $method->setAccessible(true);

    $count = 0;
    foreach ($recipes as $r) {
        $method->invokeArgs($controller, [$r['id']]);
        $count++;
    }

    echo "Éxito: Se recalcularon las fórmulas de $count recetas.<br>\n";
    echo "<b>¡Ya puedes eliminar este archivo del servidor!</b>";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "<br>\n";
}

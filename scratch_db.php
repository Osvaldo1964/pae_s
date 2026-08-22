<?php
require 'api/utils/Env.php';
require 'api/config/Database.php';

$db = Config\Database::getInstance()->getConnection();

try {
    $stmt = $db->query("SELECT id FROM recipes");
    $recipes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    require_once 'api/controllers/RecipeController.php';
    $controller = new \Controllers\RecipeController();
    
    // Use reflection to make the private recalculateNutrition method accessible
    $reflection = new ReflectionClass($controller);
    $method = $reflection->getMethod('recalculateNutrition');
    $method->setAccessible(true);

    $count = 0;
    foreach ($recipes as $r) {
        $method->invokeArgs($controller, [$r['id']]);
        $count++;
    }

    echo "Successfully recalculated nutrition for $count recipes.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

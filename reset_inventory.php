<?php
/**
 * Script para reiniciar los datos del inventario de forma segura.
 * Solo puede ser ejecutado desde la línea de comandos (Terminal).
 */

if (php_sapi_name() !== 'cli') {
    die("Error: Este script solo puede ser ejecutado desde la línea de comandos (CLI).");
}

// Configurar Autoloader igual que en api/index.php
spl_autoload_register(function ($class_name) {
    $base_dir = __DIR__ . '/api/';
    $prefix_map = [
        'Config\\' => 'config/',
        'Controllers\\' => 'controllers/',
        'Models\\' => 'models/',
        'Utils\\' => 'utils/',
        'Middleware\\' => 'middleware/'
    ];

    foreach ($prefix_map as $prefix => $dir) {
        $len = strlen($prefix);
        if (strncmp($prefix, $class_name, $len) !== 0) {
            continue;
        }
        $relative_class = substr($class_name, $len);
        $file = $base_dir . $dir . str_replace('\\', '/', $relative_class) . '.php';
        if (file_exists($file)) {
            require $file;
        }
    }
});

// Cargar la configuración de la base de datos
require_once __DIR__ . '/api/config/Database.php';

echo "==========================================================\n";
echo " ADVERTENCIA: REINICIO DE INVENTARIO\n";
echo "==========================================================\n";
echo "Estás a punto de ELIMINAR todos los registros de:\n";
echo "- Movimientos de inventario (Entradas y Salidas)\n";
echo "- Detalles de los movimientos\n";
echo "- Costos guardados por ciclo\n";
echo "- Stock actual de los insumos\n";
echo "----------------------------------------------------------\n";
echo "¿Estás seguro de que deseas continuar? (escribe 'si' para confirmar): ";

$handle = fopen("php://stdin", "r");
$line = trim(strtolower(fgets($handle)));

if ($line !== 'si') {
    echo "Operación cancelada. No se ha modificado nada.\n";
    exit;
}

try {
    $conn = Config\Database::getInstance()->getConnection();
    
    // Desactivar temporalmente la verificación de llaves foráneas para poder hacer TRUNCATE
    $conn->exec("SET FOREIGN_KEY_CHECKS = 0;");
    
    echo "1/9 Vaciando detalles de movimientos (inventory_movement_details)...\n";
    $conn->exec("TRUNCATE TABLE inventory_movement_details");
    
    echo "2/9 Vaciando cabeceras de movimientos (inventory_movements)...\n";
    $conn->exec("TRUNCATE TABLE inventory_movements");
    
    echo "3/9 Vaciando detalles de remisiones (inventory_remission_details)...\n";
    $conn->exec("TRUNCATE TABLE inventory_remission_details");
    
    echo "4/9 Vaciando cabeceras de remisiones (inventory_remissions)...\n";
    $conn->exec("TRUNCATE TABLE inventory_remissions");
    
    echo "5/9 Vaciando detalles de compras (purchase_order_details)...\n";
    $conn->exec("TRUNCATE TABLE purchase_order_details");
    
    echo "6/9 Vaciando cabeceras de compras (purchase_orders)...\n";
    $conn->exec("TRUNCATE TABLE purchase_orders");
    
    echo "7/9 Vaciando los costos por ciclo (item_cycle_costs)...\n";
    $conn->exec("TRUNCATE TABLE item_cycle_costs");
    
    echo "8/9 Vaciando el stock actual (inventory)...\n";
    $conn->exec("TRUNCATE TABLE inventory");

    echo "9/9 Vaciando registro de entregas diarias (daily_consumptions)...\n";
    $conn->exec("TRUNCATE TABLE daily_consumptions");
    
    // Volver a activar llaves foráneas
    $conn->exec("SET FOREIGN_KEY_CHECKS = 1;");
    
    echo "==========================================================\n";
    echo " EXITO: El inventario ha sido reiniciado a ceros correctamente.\n";
    echo "==========================================================\n";
    
} catch (Exception $e) {
    echo "\n[ERROR]: " . $e->getMessage() . "\n";
}

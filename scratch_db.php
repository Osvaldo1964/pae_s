<?php
spl_autoload_register(function ($class_name) {
    $base_dir = __DIR__ . '/api/';
    $prefix_map = [
        'Config\\' => 'config/',
        'Controllers\\' => 'controllers/',
        'Utils\\' => 'utils/',
    ];
    foreach ($prefix_map as $prefix => $dir) {
        $len = strlen($prefix);
        if (strncmp($prefix, $class_name, $len) !== 0) continue;
        $relative_class = substr($class_name, $len);
        $file = $base_dir . $dir . str_replace('\\', '/', $relative_class) . '.php';
        if (file_exists($file)) {
            require $file;
            return;
        }
    }
});

use Config\Database;

$db = Database::getInstance()->getConnection();

$sql = file_get_contents('sql/32_exchange_lists_schema.sql');

try {
    $db->exec($sql);
    echo "Migration completed successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

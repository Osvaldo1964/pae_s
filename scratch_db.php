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
$stmt = $db->query("DESCRIBE items;"); print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

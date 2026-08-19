<?php
require 'api/utils/Env.php';
require 'api/config/Database.php';
$db = Config\Database::getInstance()->getConnection();
$stmt = $db->prepare('INSERT INTO roles (name, description) VALUES (?, ?)');
$stmt->execute(['PAE_CONSULTAS', 'Rol de solo consulta y reportes. Sin permisos de modificación.']);
echo "Role created with ID: " . $db->lastInsertId() . "\n";

<?php
require 'api/utils/Env.php';
require 'api/config/Database.php';
$db = Config\Database::getInstance()->getConnection();
print_r($db->query('SHOW CREATE TABLE recipe_items')->fetch(PDO::FETCH_ASSOC));
print_r($db->query('SHOW CREATE TABLE recipes')->fetch(PDO::FETCH_ASSOC));
print_r($db->query('SHOW CREATE TABLE recipe_nutrition')->fetch(PDO::FETCH_ASSOC));

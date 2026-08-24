<?php
require 'api/utils/Env.php';
require 'api/config/Database.php';
$db = Config\Database::getInstance()->getConnection();
print_r($db->query("SHOW CREATE TABLE beneficiaries")->fetch(PDO::FETCH_ASSOC));

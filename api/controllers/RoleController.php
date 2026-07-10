<?php

namespace Controllers;

use Config\Database;
use PDO;

class RoleController
{
    private $conn;
    private $table_name = "roles";

    public function __construct()
    {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }

    public function index()
    {
        // Fetch all roles
        $query = "SELECT id, name FROM " . $this->table_name . " ORDER BY id ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($roles);
    }
}

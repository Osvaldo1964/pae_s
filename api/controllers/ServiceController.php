<?php

namespace Controllers;

use Config\Database;
use PDO;

class ServiceController
{
    private $conn;

    public function __construct()
    {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }

    /**
     * List all active services
     */
    public function index()
    {
        try {
            $stmt = $this->conn->prepare("SELECT id, name FROM program_services WHERE status = 'active' ORDER BY name ASC");
            $stmt->execute();
            $services = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode($services);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener servicios: ' . $e->getMessage()]);
        }
    }
}

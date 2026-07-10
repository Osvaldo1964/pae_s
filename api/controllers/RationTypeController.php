<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class RationTypeController
{
    private $conn;

    public function __construct()
    {
        $this->conn = Database::getInstance()->getConnection();
    }

    private function getPaeIdFromToken()
    {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
            try {
                $decoded = \Utils\JWT::decode($matches[1]);
                if (is_object($decoded)) return $decoded->data->pae_id ?? null;
                if (is_array($decoded)) return $decoded['data']['pae_id'] ?? null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    public function index()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $query = "SELECT rt.*, pt.name as population_name 
                      FROM pae_ration_types rt 
                      LEFT JOIN pae_population_types pt ON rt.population_type_id = pt.id 
                      WHERE rt.pae_id = :pae_id AND rt.status = 'ACTIVO' 
                      ORDER BY rt.name";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':pae_id', $pae_id);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function store()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();

            $query = "INSERT INTO pae_ration_types (pae_id, name, description, status, population_type_id, service_time) 
                      VALUES (:pae_id, :name, :description, :status, :population_type_id, :service_time)";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':name' => $data['name'],
                ':description' => $data['description'] ?? null,
                ':status' => $data['status'] ?? 'ACTIVO',
                ':population_type_id' => $data['population_type_id'] ?? null,
                ':service_time' => !empty($data['service_time']) ? $data['service_time'] : null
            ]);

            echo json_encode(['success' => true, 'message' => 'Tipo de ración creado correctamente', 'id' => $this->conn->lastInsertId()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function update($id)
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
                return;
            }

            $query = "UPDATE pae_ration_types SET name = :name, description = :description, status = :status, population_type_id = :population_type_id, service_time = :service_time WHERE id = :id AND pae_id = :pae_id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':id' => $id,
                ':pae_id' => $pae_id,
                ':name' => $data['name'],
                ':description' => $data['description'] ?? null,
                ':status' => $data['status'] ?? 'ACTIVO',
                ':population_type_id' => $data['population_type_id'] ?? null,
                ':service_time' => !empty($data['service_time']) ? $data['service_time'] : null
            ]);

            echo json_encode(['success' => true, 'message' => 'Tipo de ración actualizado']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function delete($id)
    {
        try {
            // Check usage (beneficiaries, recipes, etc)
            // For now, simple check on recipes
            $stmtCheck = $this->conn->prepare("SELECT COUNT(*) FROM recipes WHERE ration_type_id = ?");
            $stmtCheck->execute([$id]);
            if ($stmtCheck->fetchColumn() > 0) {
                throw new Exception("No se puede eliminar porque está siendo usado en recetas.");
            }

            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) return; // Should handle error better

            $query = "DELETE FROM pae_ration_types WHERE id = :id AND pae_id = :pae_id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':id' => $id, ':pae_id' => $pae_id]);
            echo json_encode(['success' => true, 'message' => 'Tipo de ración eliminado']);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class PopulationTypeController
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
            if (!$pae_id) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'No autorizado']);
                return;
            }

            $query = "SELECT * FROM pae_population_types WHERE pae_id = :pae_id AND status = 'ACTIVO' ORDER BY name";
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
            if (!$pae_id) {
                throw new Exception("No autorizado");
            }

            if (empty($data['name'])) {
                throw new Exception("El nombre es obligatorio");
            }

            $query = "INSERT INTO pae_population_types (pae_id, name, description, status) 
                      VALUES (:pae_id, :name, :description, :status)";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':name' => $data['name'],
                ':description' => $data['description'] ?? null,
                ':status' => $data['status'] ?? 'ACTIVO'
            ]);

            echo json_encode(['success' => true, 'message' => 'Tipo de Población creado correctamente', 'id' => $this->conn->lastInsertId()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function update($id)
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);

            // Validate ownership/pae_id ideally

            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
                return;
            }

            $query = "UPDATE pae_population_types SET name = :name, description = :description, status = :status WHERE id = :id AND pae_id = :pae_id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':id' => $id,
                ':pae_id' => $pae_id,
                ':name' => $data['name'],
                ':description' => $data['description'] ?? null,
                ':status' => $data['status'] ?? 'ACTIVO'
            ]);

            echo json_encode(['success' => true, 'message' => 'Tipo de Población actualizado']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function delete($id)
    {
        try {
            // Check usage in ration types
            $stmtCheck = $this->conn->prepare("SELECT COUNT(*) FROM pae_ration_types WHERE population_type_id = ?");
            $stmtCheck->execute([$id]);
            if ($stmtCheck->fetchColumn() > 0) {
                throw new Exception("No se puede eliminar porque hay Tipos de Ración asociados a esta población.");
            }

            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) return; // Should handle error better but complying with flow

            $query = "DELETE FROM pae_population_types WHERE id = :id AND pae_id = :pae_id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':id' => $id, ':pae_id' => $pae_id]);
            echo json_encode(['success' => true, 'message' => 'Tipo de Población eliminado']);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

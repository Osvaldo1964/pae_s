<?php

namespace Controllers;

use PDO;
use Exception;

class HRPositionController extends BaseController
{
    public function index()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $query = "SELECT * FROM hr_positions WHERE pae_id = :pae_id ORDER BY description";
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

            $query = "INSERT INTO hr_positions (pae_id, description, arl_risk_percent, status) VALUES (:pae_id, :description, :arl_risk_percent, :status)";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':description' => $data['description'],
                ':arl_risk_percent' => $data['arl_risk_percent'] ?? 0.522,
                ':status' => $data['status'] ?? 'ACTIVO'
            ]);

            echo json_encode(['success' => true, 'message' => 'Cargo creado correctamente', 'id' => $this->conn->lastInsertId()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function update($id)
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $query = "UPDATE hr_positions SET description = :description, arl_risk_percent = :arl_risk_percent, status = :status WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':id' => $id,
                ':description' => $data['description'],
                ':arl_risk_percent' => $data['arl_risk_percent'] ?? 0.522,
                ':status' => $data['status']
            ]);

            echo json_encode(['success' => true, 'message' => 'Cargo actualizado']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function delete($id)
    {
        try {
            // Check if position is used by employees
            $stmtCheck = $this->conn->prepare("SELECT COUNT(*) FROM hr_employees WHERE position_id = ?");
            $stmtCheck->execute([$id]);
            if ($stmtCheck->fetchColumn() > 0) {
                throw new Exception("No se puede eliminar el cargo porque tiene empleados asociados.");
            }

            $query = "DELETE FROM hr_positions WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':id' => $id]);
            echo json_encode(['success' => true, 'message' => 'Cargo eliminado']);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

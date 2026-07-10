<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class HREmployeeController
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
                if (is_object($decoded))
                    return $decoded->data->pae_id ?? null;
                if (is_array($decoded))
                    return $decoded['data']['pae_id'] ?? null;
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
            $query = "SELECT e.*, p.description as position_name 
                      FROM hr_employees e
                      LEFT JOIN hr_positions p ON e.position_id = p.id
                      WHERE e.pae_id = :pae_id 
                      ORDER BY e.last_name1, e.first_name";
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

            $query = "INSERT INTO hr_employees (
                        pae_id, first_name, last_name1, last_name2, document_number,
                        address, phone, email, position_id, hire_date, termination_date,
                        eps, afp, arl, salary, status
                      ) VALUES (
                        :pae_id, :first_name, :last_name1, :last_name2, :document_number,
                        :address, :phone, :email, :position_id, :hire_date, :termination_date,
                        :eps, :afp, :arl, :salary, :status
                      )";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':first_name' => $data['first_name'],
                ':last_name1' => $data['last_name1'],
                ':last_name2' => $data['last_name2'] ?? null,
                ':document_number' => $data['document_number'],
                ':address' => $data['address'] ?? null,
                ':phone' => $data['phone'] ?? null,
                ':email' => $data['email'] ?? null,
                ':position_id' => !empty($data['position_id']) ? $data['position_id'] : null,
                ':hire_date' => !empty($data['hire_date']) ? $data['hire_date'] : null,
                ':termination_date' => !empty($data['termination_date']) ? $data['termination_date'] : null,
                ':eps' => $data['eps'] ?? null,
                ':afp' => $data['afp'] ?? null,
                ':arl' => $data['arl'] ?? null,
                ':salary' => !empty($data['salary']) ? $data['salary'] : 0,
                ':status' => $data['status'] ?? 'ACTIVO'
            ]);

            echo json_encode(['success' => true, 'message' => 'Empleado registrado correctamente', 'id' => $this->conn->lastInsertId()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function update($id)
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);

            $query = "UPDATE hr_employees SET 
                        first_name = :first_name, 
                        last_name1 = :last_name1, 
                        last_name2 = :last_name2, 
                        document_number = :document_number,
                        address = :address, 
                        phone = :phone, 
                        email = :email, 
                        position_id = :position_id, 
                        hire_date = :hire_date, 
                        termination_date = :termination_date,
                        eps = :eps, 
                        afp = :afp, 
                        arl = :arl, 
                        salary = :salary, 
                        status = :status
                      WHERE id = :id";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':id' => $id,
                ':first_name' => $data['first_name'],
                ':last_name1' => $data['last_name1'],
                ':last_name2' => $data['last_name2'] ?? null,
                ':document_number' => $data['document_number'],
                ':address' => $data['address'] ?? null,
                ':phone' => $data['phone'] ?? null,
                ':email' => $data['email'] ?? null,
                ':position_id' => !empty($data['position_id']) ? $data['position_id'] : null,
                ':hire_date' => !empty($data['hire_date']) ? $data['hire_date'] : null,
                ':termination_date' => !empty($data['termination_date']) ? $data['termination_date'] : null,
                ':eps' => $data['eps'] ?? null,
                ':afp' => $data['afp'] ?? null,
                ':arl' => $data['arl'] ?? null,
                ':salary' => !empty($data['salary']) ? $data['salary'] : 0,
                ':status' => $data['status']
            ]);

            echo json_encode(['success' => true, 'message' => 'Empleado actualizado correctamente']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function delete($id)
    {
        try {
            $query = "DELETE FROM hr_employees WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':id' => $id]);
            echo json_encode(['success' => true, 'message' => 'Empleado eliminado']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

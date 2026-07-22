<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use PDO;
use Exception;

class ConsumptionController
{
    private $conn;
    private $table_name = "daily_consumptions";

    public function __construct()
    {
        $this->conn = Database::getInstance()->getConnection();
    }

    private function getAuthData()
    {
        $headers = null;
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }

        if (!$headers)
            return null;

        $arr = explode(" ", $headers);
        $jwt = isset($arr[1]) ? $arr[1] : "";

        if ($jwt) {
            try {
                $decoded = JWT::decode($jwt);
                // Return full data payload
                return isset($decoded['data']) ? $decoded['data'] : (isset($decoded->data) ? (array) $decoded->data : null);
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * POST /api/consumptions
     * Records a new consumption
     */
    public function store()
    {
        $auth = $this->getAuthData();
        if (!$auth || empty($auth['pae_id'])) {
            http_response_code(401);
            echo json_encode(["message" => "No autorizado."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if ((empty($data['beneficiary_id']) && empty($data['document_number'])) || empty($data['ration_type_id']) || empty($data['branch_id'])) {
            http_response_code(400);
            echo json_encode(["message" => "Datos incompletos (Beneficiario, Tipo Ración, Sede)."]);
            return;
        }

        $date = date('Y-m-d'); // Always record for TODAY by server time

        // 1. Verify Beneficiary exists in this PAE and Branch
        if (!empty($data['beneficiary_id'])) {
            $stmtCheck = $this->conn->prepare("SELECT id, first_name, last_name1, modality_id FROM beneficiaries WHERE id = ? AND pae_id = ?");
            $stmtCheck->execute([$data['beneficiary_id'], $auth['pae_id']]);
        } else {
            $stmtCheck = $this->conn->prepare("SELECT id, first_name, last_name1, modality_id FROM beneficiaries WHERE document_number = ? AND pae_id = ?");
            $stmtCheck->execute([$data['document_number'], $auth['pae_id']]);
        }
        
        $beneficiary = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$beneficiary) {
            http_response_code(404);
            echo json_encode(["message" => "Beneficiario no encontrado en este programa."]);
            return;
        }
        
        // Ensure beneficiary_id is set for downstream logic
        $data['beneficiary_id'] = $beneficiary['id'];

        // 1.5 Verify Ration is allowed for Beneficiary's Modality
        if (!empty($beneficiary['modality_id'])) {
            $stmtMod = $this->conn->prepare("SELECT 1 FROM pae_modality_rations WHERE modality_id = ? AND ration_type_id = ? limit 1");
            $stmtMod->execute([$beneficiary['modality_id'], $data['ration_type_id']]);
            if ($stmtMod->rowCount() == 0) {
                http_response_code(400);
                echo json_encode(["message" => "Ración no autorizada para la modalidad del beneficiario."]);
                return;
            }
        }

        // 2. Check for Duplicate
        $stmtDup = $this->conn->prepare("SELECT id, created_at FROM daily_consumptions WHERE beneficiary_id = ? AND date = ? AND ration_type_id = ?");
        $stmtDup->execute([$data['beneficiary_id'], $date, $data['ration_type_id']]);
        $existing = $stmtDup->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            http_response_code(409); // Conflict
            $time = date('H:i', strtotime($existing['created_at']));
            echo json_encode([
                "message" => "El beneficiario ya recibió esta ración hoy a las {$time}.",
                "duplicate" => true
            ]);
            return;
        }

        // 3. Insert
        try {
            $query = "INSERT INTO daily_consumptions (pae_id, branch_id, beneficiary_id, date, ration_type_id, meal_type, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                $auth['pae_id'],
                $data['branch_id'],
                $data['beneficiary_id'],
                $date,
                $data['ration_type_id'],
                $data['meal_type'] ?? ''
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Entrega registrada correctamente",
                "beneficiary_name" => $beneficiary['first_name'] . ' ' . $beneficiary['last_name1']
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Error al guardar el consumo: " . $e->getMessage()]);
        }
    }

    /**
     * GET /api/consumptions/stats
     * Returns stats for the current user/branch for today
     */
    public function stats()
    {
        $auth = $this->getAuthData();
        if (!$auth) {
            http_response_code(401);
            echo json_encode(["message" => "No autorizado."]);
            return;
        }

        $branch_id = $_GET['branch_id'] ?? null;
        $date = date('Y-m-d');

        $query = "SELECT COUNT(*) as total FROM daily_consumptions WHERE pae_id = ? AND date = ?";
        $params = [$auth['pae_id'], $date];

        if ($branch_id) {
            $query .= " AND branch_id = ?";
            $params[] = $branch_id;
        }

        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        // Calculate progress (Mocked for now or complex query)
        // For simple progress, let's assume we want % of total active beneficiaries in that branch
        $progress = 0;
        if ($branch_id) {
            $stmtCount = $this->conn->prepare("SELECT COUNT(*) as total FROM beneficiaries WHERE branch_id = ? AND status = 'ACTIVO'");
            $stmtCount->execute([$branch_id]);
            $totalBen = $stmtCount->fetch(PDO::FETCH_ASSOC)['total'];

            if ($totalBen > 0) {
                $progress = round(($result['total'] / $totalBen) * 100);
            }
        }

        echo json_encode([
            "success" => true,
            "today_count" => $result['total'],
            "progress" => $progress
        ]);
    }

    /**
     * GET /api/consumptions/report
     * Returns detailed report of consumptions with filters
     */
    public function report()
    {
        $auth = $this->getAuthData();
        if (!$auth) {
            http_response_code(401);
            echo json_encode(["message" => "No autorizado."]);
            return;
        }

        $date = $_GET['date'] ?? null;
        $start_date = $_GET['start_date'] ?? null;
        $end_date = $_GET['end_date'] ?? null;
        
        // Default to today if neither date nor range is provided
        if (!$date && !$start_date) {
            $date = date('Y-m-d');
        }

        $branch_id = $_GET['branch_id'] ?? null;
        $meal_type = $_GET['meal_type'] ?? null;

        $query = "SELECT 
                    dc.id as consumption_id, dc.created_at as time, dc.date as consumption_date, rt.name as meal_type, rt.service_time,
                    b.document_number, b.first_name, b.last_name1, b.grade, b.group_name,
                    sb.name as branch_name, s.name as school_name,
                    p.name as program_name, p.entity_logo_path, p.operator_logo_path
                  FROM beneficiaries b
                  JOIN school_branches sb ON b.branch_id = sb.id
                  JOIN schools s ON sb.school_id = s.id
                  JOIN pae_programs p ON b.pae_id = p.id
                  LEFT JOIN daily_consumptions dc ON dc.beneficiary_id = b.id AND (";

        $params = [];
        if ($start_date && $end_date) {
            $query .= "dc.date BETWEEN ? AND ?";
            $params[] = $start_date;
            $params[] = $end_date;
        } else {
            $query .= "dc.date = ?";
            $params[] = $date;
        }
        $query .= ")";

        if ($meal_type) {
            $query .= " AND dc.ration_type_id = ?";
            $params[] = $meal_type;
        }
        
        $query .= " LEFT JOIN pae_ration_types rt ON dc.ration_type_id = rt.id
                  WHERE b.pae_id = ? AND b.status = 'ACTIVO'";

        $params[] = $auth['pae_id'];

        if ($branch_id) {
            $query .= " AND b.branch_id = ?";
            $params[] = $branch_id;
        }

        $query .= " ORDER BY b.last_name1 ASC, b.first_name ASC";

        try {
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($meal_type) {
                $stmtRt = $this->conn->prepare("SELECT name, service_time FROM pae_ration_types WHERE id = ?");
                $stmtRt->execute([$meal_type]);
                $rationData = $stmtRt->fetch(PDO::FETCH_ASSOC);
            } else {
                $stmtRt = $this->conn->prepare("SELECT name, service_time FROM pae_ration_types WHERE pae_id = ? AND status = 'ACTIVO' ORDER BY id ASC LIMIT 1");
                $stmtRt->execute([$auth['pae_id']]);
                $rationData = $stmtRt->fetch(PDO::FETCH_ASSOC);
            }
                
            if ($rationData) {
                foreach ($data as &$row) {
                    if (empty($row['meal_type'])) {
                        $row['meal_type'] = $rationData['name'];
                    }
                    if (empty($row['service_time'])) {
                        $row['service_time'] = $rationData['service_time'];
                    }
                }
            }

            echo json_encode([
                "success" => true,
                "data" => $data
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Error generating report: " . $e->getMessage()]);
        }
    }
}

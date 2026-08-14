<?php

namespace Controllers;

use Config\Database;
use Config\Config;
use PDO;
use Exception;

class DeliveryController
{

    private $conn;
    private $table_name = "daily_deliveries";

    public function __construct()
    {
        $this->conn = Database::getInstance()->getConnection();
    }

    // Helper para verificar PAE y Usuario desde el Token (Ya implementado en otros controladores)
    private function getAuthData()
    {
        $headers = null;
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } else if (isset($_SERVER['HTTP_X_AUTH_TOKEN'])) {
            $headers = trim($_SERVER["HTTP_X_AUTH_TOKEN"]);
        } elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            } elseif (isset($requestHeaders['X-Auth-Token'])) {
                $headers = trim($requestHeaders['X-Auth-Token']);
            }
        }

        if (!$headers) {
            return null;
        }

        $jwt = $headers;
        if (preg_match('/Bearer\s+(.*)$/i', $headers, $matches)) {
            $jwt = $matches[1];
        }

        try {
            $payload = \Utils\JWT::decode($jwt);
            return $payload['data'] ?? null;
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Registrar una entrega individual (Escaneo QR)
     * POST /api/deliveries
     */
    public function register()
    {
        $auth = $this->getAuthData();
        if (!$auth) {
            http_response_code(401);
            echo json_encode(["message" => "No autorizado"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        // Validar campos requeridos
        if (empty($data['beneficiary_id']) || empty($data['branch_id']) || empty($data['meal_type'])) {
            http_response_code(400);
            echo json_encode(["message" => "Faltan datos requeridos (beneficiary_id, branch_id, meal_type)"]);
            return;
        }

        // 1. Validar que el beneficiario exista y sea de este PAE
        $stmt = $this->conn->prepare("SELECT id, status, branch_id FROM beneficiaries WHERE id = :id AND pae_id = :pae_id");
        $stmt->execute([':id' => $data['beneficiary_id'], ':pae_id' => $auth['pae_id']]);
        $beneficiary = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$beneficiary) {
            http_response_code(404);
            echo json_encode(["message" => "Beneficiario no encontrado en este programa PAE."]);
            return;
        }

        if ($beneficiary['status'] !== 'ACTIVO') {
            http_response_code(400);
            echo json_encode(["message" => "El estudiante está INACTIVO o RETIRADO."]);
            return;
        }

        // Opcional: Validar si pertenece a la sede donde se está entregando
        // Se puede permitir entrega en otra sede si es contingencia, pero idealmente warnning.
        if ($beneficiary['branch_id'] != $data['branch_id']) {
            // Podríamos bloquear o solo advertir. Por ahora permitimos pero registramos la sede real de entrega.
        }

        // 2. Verificar duplicidad hoy
        $today = date('Y-m-d');
        $checkStmt = $this->conn->prepare("SELECT id FROM " . $this->table_name . " 
                                           WHERE beneficiary_id = :b_id 
                                           AND delivery_date = :date 
                                           AND meal_type = :type");
        $checkStmt->execute([
            ':b_id' => $data['beneficiary_id'],
            ':date' => $today,
            ':type' => $data['meal_type']
        ]);

        if ($checkStmt->rowCount() > 0) {
            http_response_code(409); // Conflict
            echo json_encode(["message" => "¡ALERTA! Este estudiante ya recibió su complemento " . $data['meal_type'] . " hoy."]);
            return;
        }

        // 3. Registrar Entrega
        $query = "INSERT INTO " . $this->table_name . " 
                  (pae_id, branch_id, beneficiary_id, user_id, delivery_date, delivery_time, meal_type)
                  VALUES (:pae, :branch, :ben, :user, :date, :time, :type)";

        $insertStmt = $this->conn->prepare($query);
        $success = $insertStmt->execute([
            ':pae' => $auth['pae_id'],
            ':branch' => $data['branch_id'],
            ':ben' => $data['beneficiary_id'],
            ':user' => $auth['id'],
            ':date' => $today,
            ':time' => date('H:i:s'),
            ':type' => $data['meal_type']
        ]);

        if ($success) {
            http_response_code(201);
            echo json_encode(["message" => "Entrega registrada exitosamente", "id" => $this->conn->lastInsertId()]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error interno al registrar la entrega."]);
        }
    }

    /**
     * Obtener historial de entregas de una sede en una fecha
     * GET /api/deliveries?branch_id=X&date=YYYY-MM-DD
     */
    public function index()
    {
        $auth = $this->getAuthData();
        if (!$auth) {
            http_response_code(401);
            return;
        }

        $branch_id = $_GET['branch_id'] ?? null;
        $date = $_GET['date'] ?? date('Y-m-d');

        if (!$branch_id) {
            echo json_encode([]);
            return;
        }

        $query = "SELECT d.*, 
                         b.first_name, b.last_name1, b.document_number, b.grade, b.group_name
                  FROM " . $this->table_name . " d
                  JOIN beneficiaries b ON d.beneficiary_id = b.id
                  WHERE d.pae_id = :pae 
                  AND d.branch_id = :branch 
                  AND d.delivery_date = :date
                  ORDER BY d.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            ':pae' => $auth['pae_id'],
            ':branch' => $branch_id,
            ':date' => $date
        ]);

        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    /**
     * Registrar entrega masiva por Grupo / Curso (QR Grupal)
     * POST /api/deliveries/group
     */
    public function registerGroupDelivery()
    {
        $auth = $this->getAuthData();
        if (!$auth) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "No autorizado"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['branch_id'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Falta la sede (branch_id)"]);
            return;
        }

        $mealType = !empty($data['meal_type']) ? $data['meal_type'] : 'ALMUERZO';
        $grade = isset($data['grade']) ? trim($data['grade']) : null;
        $groupName = isset($data['group_name']) ? trim($data['group_name']) : (isset($data['group']) ? trim($data['group']) : null);
        $today = date('Y-m-d');
        $currentTime = date('H:i:s');

        try {
            $this->conn->beginTransaction();

            // 1. Obtener todos los beneficiarios activos que coinciden con la sede, grado y grupo
            $sql = "SELECT id, first_name, last_name1, document_number 
                    FROM beneficiaries 
                    WHERE pae_id = :pae 
                    AND branch_id = :branch 
                    AND status = 'ACTIVO'";

            $params = [
                ':pae' => $auth['pae_id'],
                ':branch' => $data['branch_id']
            ];

            if ($grade !== null && $grade !== '') {
                $sql .= " AND grade = :grade";
                $params[':grade'] = $grade;
            }

            if ($groupName !== null && $groupName !== '') {
                $sql .= " AND (group_name = :group OR group_letter = :group)";
                $params[':group'] = $groupName;
            }

            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            $beneficiaries = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($beneficiaries)) {
                $this->conn->rollBack();
                http_response_code(404);
                echo json_encode([
                    "success" => false, 
                    "message" => "No se encontraron beneficiarios activos para Grado " . ($grade ?: 'Todos') . " Grupo " . ($groupName ?: 'Todos')
                ]);
                return;
            }

            // 2. Obtener lista de IDs que ya recibieron la ración de este tipo hoy
            $benIds = array_column($beneficiaries, 'id');
            $inClause = implode(',', array_fill(0, count($benIds), '?'));

            $checkSql = "SELECT beneficiary_id FROM " . $this->table_name . " 
                         WHERE pae_id = ? AND delivery_date = ? AND meal_type = ? 
                         AND beneficiary_id IN ($inClause)";
            
            $checkParams = array_merge([$auth['pae_id'], $today, $mealType], $benIds);
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->execute($checkParams);
            $alreadyServed = $checkStmt->fetchAll(PDO::FETCH_COLUMN, 0);
            $alreadyServedSet = array_flip($alreadyServed);

            // 3. Registrar a los beneficiarios pendientes
            $insertSql = "INSERT INTO " . $this->table_name . " 
                          (pae_id, branch_id, beneficiary_id, user_id, delivery_date, delivery_time, meal_type)
                          VALUES (?, ?, ?, ?, ?, ?, ?)";
            $insertStmt = $this->conn->prepare($insertSql);

            $registeredCount = 0;
            $skippedCount = 0;

            foreach ($beneficiaries as $b) {
                if (isset($alreadyServedSet[$b['id']])) {
                    $skippedCount++;
                    continue;
                }

                $insertStmt->execute([
                    $auth['pae_id'],
                    $data['branch_id'],
                    $b['id'],
                    $auth['id'],
                    $today,
                    $currentTime,
                    $mealType
                ]);
                $registeredCount++;
            }

            $this->conn->commit();

            $msg = "Se registraron {$registeredCount} entregas de {$mealType} para Grado " . ($grade ?: 'General') . " - Grupo " . ($groupName ?: 'General');
            if ($skippedCount > 0) {
                $msg .= " ({$skippedCount} ya habían sido atendidos hoy).";
            }

            echo json_encode([
                "success" => true,
                "total_students" => count($beneficiaries),
                "registered" => $registeredCount,
                "skipped_already_served" => $skippedCount,
                "meal_type" => $mealType,
                "grade" => $grade,
                "group" => $groupName,
                "message" => $msg
            ]);

        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error interno: " . $e->getMessage()]);
        }
    }
}


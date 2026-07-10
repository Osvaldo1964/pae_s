<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use PDO;
use Exception;

class MovimientoController
{
    private $conn;

    public function __construct()
    {
        $this->conn = Database::getInstance()->getConnection();
    }

    private function getPaeIdFromToken()
    {
        $headers = null;
        if (isset($_SERVER['Authorization'])) $headers = trim($_SERVER["Authorization"]);
        else if (isset($_SERVER['HTTP_AUTHORIZATION'])) $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization'])) $headers = trim($requestHeaders['Authorization']);
        }
        if (!$headers) return null;
        $arr = explode(" ", $headers);
        $jwt = isset($arr[1]) ? $arr[1] : "";
        if ($jwt) {
            try {
                $decoded = JWT::decode($jwt);
                return $decoded['data']['pae_id'] ?? null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    private function getUserIdFromToken()
    {
        $headers = null;
        if (isset($_SERVER['Authorization'])) $headers = trim($_SERVER["Authorization"]);
        else if (isset($_SERVER['HTTP_AUTHORIZATION'])) $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization'])) $headers = trim($requestHeaders['Authorization']);
        }
        if (!$headers) return null;
        $arr = explode(" ", $headers);
        $jwt = isset($arr[1]) ? $arr[1] : "";
        if ($jwt) {
            try {
                $decoded = JWT::decode($jwt);
                return $decoded['data']['id'] ?? null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    public function index()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $query = "SELECT m.*, t.nombres as tercero_nombre, i.nombre as item_nombre, b.name as branch_name, s.name as school_name, i.codigo as item_codigo
                  FROM presupuesto_movimientos m
                  JOIN terceros t ON m.tercero_id = t.id_tercero
                  JOIN presupuesto_asignacion a ON m.asignacion_id = a.id_asignacion
                  JOIN presupuesto_items i ON a.item_id = i.id_item
                  JOIN school_branches b ON a.branch_id = b.id
                  JOIN schools s ON b.school_id = s.id
                  WHERE m.pae_id = :pae_id";

        $params = [":pae_id" => $pae_id];

        $item_id = $_GET['item_id'] ?? null;
        if ($item_id) {
            $query .= " AND a.item_id = :item_id";
            $params[":item_id"] = $item_id;
        }

        $tipo = $_GET['tipo'] ?? null;
        if ($tipo) {
            $query .= " AND UPPER(m.tipo_movimiento) = :tipo";
            $params[":tipo"] = strtoupper(trim($tipo));
        }

        $start_date = $_GET['start_date'] ?? null;
        if ($start_date) {
            $query .= " AND m.fecha >= :start_date";
            $params[":start_date"] = $start_date;
        }

        $end_date = $_GET['end_date'] ?? null;
        if ($end_date) {
            $query .= " AND m.fecha <= :end_date";
            $params[":end_date"] = $end_date;
        }

        $query .= " ORDER BY m.fecha DESC, m.datecreated DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($results);
    }

    public function getActiveBudget()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $query = "SELECT a.id_asignacion, i.codigo, i.nombre as item_nombre, b.name as branch_name, s.name as school_name, 
                         (a.valor_inicial + a.valor_adiciones - a.valor_reducciones - a.valor_ejecutado) as saldo_disponible
                  FROM presupuesto_asignacion a
                  JOIN presupuesto_items i ON a.item_id = i.id_item
                  JOIN school_branches b ON a.branch_id = b.id
                  JOIN schools s ON b.school_id = s.id
                  WHERE a.pae_id = :pae_id AND i.estado = 1 AND (a.valor_inicial + a.valor_adiciones - a.valor_reducciones - a.valor_ejecutado) > 0
                  ORDER BY i.codigo, s.name, b.name";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($results);
    }

    public function store()
    {
        $pae_id = $this->getPaeIdFromToken();
        $usuario_id = $this->getUserIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        // Handle file upload if present
        $soporte_url = null;
        if (isset($_FILES['soporte']) && $_FILES['soporte']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = __DIR__ . '/../../uploads/presupuesto/';
            if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);

            $file_ext = pathinfo($_FILES['soporte']['name'], PATHINFO_EXTENSION);
            $file_name = uniqid('soporte_') . '.' . $file_ext;
            if (move_uploaded_file($_FILES['soporte']['tmp_name'], $upload_dir . $file_name)) {
                $soporte_url = 'uploads/presupuesto/' . $file_name;
            }
        }

        $data = $_POST; // Using $_POST because of the file upload

        try {
            $this->conn->beginTransaction();

            // 1. Insert Movement
            $query = "INSERT INTO presupuesto_movimientos 
                      (pae_id, asignacion_id, tercero_id, tipo_movimiento, fecha, numero_documento, detalle, valor, soporte_url, usuario_id) 
                      VALUES (:pae_id, :asignacion_id, :tercero_id, :tipo_movimiento, :fecha, :numero_documento, :detalle, :valor, :soporte_url, :usuario_id)";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ":pae_id" => $pae_id,
                ":asignacion_id" => $data['asignacion_id'],
                ":tercero_id" => $data['tercero_id'],
                ":tipo_movimiento" => $data['tipo_movimiento'],
                ":fecha" => $data['fecha'],
                ":numero_documento" => $data['numero_documento'] ?? '',
                ":detalle" => $data['detalle'] ?? '',
                ":valor" => $data['valor'],
                ":soporte_url" => $soporte_url,
                ":usuario_id" => $usuario_id
            ]);

            // 2. Update Executed Value in Asignacion
            $queryUpdate = "UPDATE presupuesto_asignacion SET valor_ejecutado = valor_ejecutado + :valor WHERE id_asignacion = :id";
            $stmtUpdate = $this->conn->prepare($queryUpdate);
            $stmtUpdate->execute([":valor" => $data['valor'], ":id" => $data['asignacion_id']]);

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Movimiento registrado exitosamente."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }

    public function show($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        $query = "SELECT m.*, i.nombre as item_nombre, b.name as branch_name, s.name as school_name, i.codigo as item_codigo,
                         (a.valor_inicial + a.valor_adiciones - a.valor_reducciones - a.valor_ejecutado + m.valor) as saldo_disponible_con_mov
                  FROM presupuesto_movimientos m
                  JOIN presupuesto_asignacion a ON m.asignacion_id = a.id_asignacion
                  JOIN presupuesto_items i ON a.item_id = i.id_item
                  JOIN school_branches b ON a.branch_id = b.id
                  JOIN schools s ON b.school_id = s.id
                  WHERE m.id_movimiento = :id AND m.pae_id = :pae_id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([":id" => $id, ":pae_id" => $pae_id]);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    }

    public function update($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        // Get current movement to reconcile budget
        $stmtOld = $this->conn->prepare("SELECT asignacion_id, valor, soporte_url FROM presupuesto_movimientos WHERE id_movimiento = :id AND pae_id = :pae_id");
        $stmtOld->execute([":id" => $id, ":pae_id" => $pae_id]);
        $oldMov = $stmtOld->fetch(PDO::FETCH_ASSOC);

        if (!$oldMov) {
            echo json_encode(["success" => false, "message" => "Movimiento no encontrado."]);
            return;
        }

        $data = $_POST;
        $soporte_url = $oldMov['soporte_url'];

        if (isset($_FILES['soporte']) && $_FILES['soporte']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = __DIR__ . '/../../uploads/presupuesto/';
            if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
            $file_ext = pathinfo($_FILES['soporte']['name'], PATHINFO_EXTENSION);
            $file_name = uniqid('soporte_') . '.' . $file_ext;
            if (move_uploaded_file($_FILES['soporte']['tmp_name'], $upload_dir . $file_name)) {
                $soporte_url = 'uploads/presupuesto/' . $file_name;
            }
        }

        try {
            $this->conn->beginTransaction();

            // 1. Revert old budget execution
            $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_ejecutado = valor_ejecutado - :valor WHERE id_asignacion = :id")
                ->execute([":valor" => $oldMov['valor'], ":id" => $oldMov['asignacion_id']]);

            // 2. Update movement
            $query = "UPDATE presupuesto_movimientos SET 
                      tercero_id = :tercero_id, tipo_movimiento = :tipo_movimiento, 
                      fecha = :fecha, numero_documento = :numero_documento, 
                      detalle = :detalle, valor = :valor, soporte_url = :soporte_url
                      WHERE id_movimiento = :id AND pae_id = :pae_id";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ":id" => $id,
                ":pae_id" => $pae_id,
                ":tercero_id" => $data['tercero_id'],
                ":tipo_movimiento" => $data['tipo_movimiento'],
                ":fecha" => $data['fecha'],
                ":numero_documento" => $data['numero_documento'] ?? '',
                ":detalle" => $data['detalle'] ?? '',
                ":valor" => $data['valor'],
                ":soporte_url" => $soporte_url
            ]);

            // 3. Apply new budget execution
            $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_ejecutado = valor_ejecutado + :valor WHERE id_asignacion = :id")
                ->execute([":valor" => $data['valor'], ":id" => $oldMov['asignacion_id']]);

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Movimiento actualizado."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }

    public function delete($id)
    {
        $pae_id = $this->getPaeIdFromToken();

        $stmt = $this->conn->prepare("SELECT asignacion_id, valor FROM presupuesto_movimientos WHERE id_movimiento = :id AND pae_id = :pae_id");
        $stmt->execute([":id" => $id, ":pae_id" => $pae_id]);
        $mov = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$mov) {
            echo json_encode(["success" => false, "message" => "No existe."]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // 1. Restore budget
            $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_ejecutado = valor_ejecutado - :valor WHERE id_asignacion = :id")
                ->execute([":valor" => $mov['valor'], ":id" => $mov['asignacion_id']]);

            // 2. Physical delete
            $this->conn->prepare("DELETE FROM presupuesto_movimientos WHERE id_movimiento = :id")->execute([":id" => $id]);

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Movimiento eliminado y presupuesto restaurado."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }
}

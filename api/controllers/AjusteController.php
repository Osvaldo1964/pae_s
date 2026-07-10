<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use PDO;
use Exception;

class AjusteController
{
    private $conn;

    public function __construct()
    {
        $this->conn = Database::getInstance()->getConnection();
    }

    private function getPaeIdFromToken()
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

        $query = "SELECT a.*, 
                         i.codigo as item_codigo, i.nombre as item_nombre, b.name as branch_name, s.name as school_name
                  FROM presupuesto_ajustes a
                  JOIN presupuesto_asignacion ao ON a.asignacion_id = ao.id_asignacion
                  JOIN presupuesto_items i ON ao.item_id = i.id_item
                  JOIN school_branches b ON ao.branch_id = b.id
                  JOIN schools s ON b.school_id = s.id
                  WHERE a.pae_id = :pae_id 
                  ORDER BY a.fecha DESC, a.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($results);
    }

    public function getAllocations()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $query = "SELECT a.id_asignacion, i.codigo, i.nombre as item_nombre, b.name as branch_name, s.name as school_name,
                         a.valor_inicial, a.valor_adiciones, a.valor_reducciones, a.valor_ejecutado,
                         (a.valor_inicial + a.valor_adiciones - a.valor_reducciones - a.valor_ejecutado) as saldo_disponible
                  FROM presupuesto_asignacion a
                  JOIN presupuesto_items i ON a.item_id = i.id_item
                  JOIN school_branches b ON a.branch_id = b.id
                  JOIN schools s ON b.school_id = s.id
                  WHERE a.pae_id = :pae_id AND i.estado = 1
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

        $data = json_decode(file_get_contents("php://input"));
        if (!$data || empty($data->fecha) || empty($data->asignacion_id) || empty($data->tipo_ajuste) || !isset($data->valor)) {
            http_response_code(400);
            echo json_encode(["message" => "Datos incompletos o inválidos."]);
            return;
        }

        $valor = floatval($data->valor);
        if ($valor <= 0) {
            http_response_code(400);
            echo json_encode(["message" => "El valor del ajuste debe ser mayor a cero."]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Fetch current allocation details for validation
            $stmtAlloc = $this->conn->prepare("SELECT (valor_inicial + valor_adiciones - valor_reducciones - valor_ejecutado) as saldo_disponible FROM presupuesto_asignacion WHERE id_asignacion = :id AND pae_id = :pae_id");
            $stmtAlloc->execute([":id" => $data->asignacion_id, ":pae_id" => $pae_id]);
            $alloc = $stmtAlloc->fetch(PDO::FETCH_ASSOC);

            if (!$alloc) {
                throw new Exception("Rubro asignado no encontrado.");
            }

            // Reduction validation: Can't reduce beyond available budget
            if ($data->tipo_ajuste === 'REDUCCION') {
                $saldo = floatval($alloc['saldo_disponible']);
                if ($saldo < $valor) {
                    http_response_code(400);
                    echo json_encode(["message" => "El rubro no cuenta con saldo disponible suficiente para realizar esta reducción. Saldo actual: $" . number_format($saldo, 2)]);
                    $this->conn->rollBack();
                    return;
                }
            }

            // 1. Insert Adjustment
            $query = "INSERT INTO presupuesto_ajustes 
                      (pae_id, fecha, asignacion_id, tipo_ajuste, valor, justificacion, usuario_id) 
                      VALUES (:pae_id, :fecha, :asignacion_id, :tipo_ajuste, :valor, :justificacion, :usuario_id)";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ":pae_id" => $pae_id,
                ":fecha" => $data->fecha,
                ":asignacion_id" => $data->asignacion_id,
                ":tipo_ajuste" => $data->tipo_ajuste,
                ":valor" => $valor,
                ":justificacion" => $data->justificacion ?? '',
                ":usuario_id" => $usuario_id
            ]);

            // 2. Update Budget Allocation
            if ($data->tipo_ajuste === 'ADICION') {
                $queryUpdate = "UPDATE presupuesto_asignacion SET valor_adiciones = valor_adiciones + :valor WHERE id_asignacion = :id";
            } else {
                $queryUpdate = "UPDATE presupuesto_asignacion SET valor_reducciones = valor_reducciones + :valor WHERE id_asignacion = :id";
            }
            $stmtUpdate = $this->conn->prepare($queryUpdate);
            $stmtUpdate->execute([":valor" => $valor, ":id" => $data->asignacion_id]);

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Ajuste presupuestal registrado con éxito."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => "Error al registrar el ajuste: " . $e->getMessage()]);
        }
    }

    public function show($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $query = "SELECT a.*, 
                         i.codigo as item_codigo, i.nombre as item_nombre, b.name as branch_name, s.name as school_name,
                         (ao.valor_inicial + ao.valor_adiciones - ao.valor_reducciones - ao.valor_ejecutado) as saldo_actual
                  FROM presupuesto_ajustes a
                  JOIN presupuesto_asignacion ao ON a.asignacion_id = ao.id_asignacion
                  JOIN presupuesto_items i ON ao.item_id = i.id_item
                  JOIN school_branches b ON ao.branch_id = b.id
                  JOIN schools s ON b.school_id = s.id
                  WHERE a.id_ajuste = :id AND a.pae_id = :pae_id";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([":id" => $id, ":pae_id" => $pae_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            http_response_code(404);
            echo json_encode(["message" => "Ajuste no encontrado."]);
            return;
        }

        echo json_encode($result);
    }

    public function update($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"));
        if (!$data || empty($data->fecha) || empty($data->tipo_ajuste) || !isset($data->valor)) {
            http_response_code(400);
            echo json_encode(["message" => "Datos incompletos o inválidos."]);
            return;
        }

        $new_valor = floatval($data->valor);
        if ($new_valor <= 0) {
            http_response_code(400);
            echo json_encode(["message" => "El valor del ajuste debe ser mayor a cero."]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Get existing adjustment details
            $stmtOld = $this->conn->prepare("SELECT * FROM presupuesto_ajustes WHERE id_ajuste = :id AND pae_id = :pae_id");
            $stmtOld->execute([":id" => $id, ":pae_id" => $pae_id]);
            $old = $stmtOld->fetch(PDO::FETCH_ASSOC);

            if (!$old) {
                http_response_code(404);
                echo json_encode(["message" => "Ajuste no encontrado."]);
                $this->conn->rollBack();
                return;
            }

            // Fetch current allocation totals
            $stmtAlloc = $this->conn->prepare("SELECT valor_inicial, valor_adiciones, valor_reducciones, valor_ejecutado FROM presupuesto_asignacion WHERE id_asignacion = :id");
            $stmtAlloc->execute([":id" => $old['asignacion_id']]);
            $alloc = $stmtAlloc->fetch(PDO::FETCH_ASSOC);

            if (!$alloc) {
                throw new Exception("Rubro presupuestal no encontrado.");
            }

            // Calculate balance with the old adjustment reverted
            $old_valor = floatval($old['valor']);
            $val_inicial = floatval($alloc['valor_inicial']);
            $val_adiciones = floatval($alloc['valor_adiciones']);
            $val_reducciones = floatval($alloc['valor_reducciones']);
            $val_ejecutado = floatval($alloc['valor_ejecutado']);

            // Revert old adjustment in memory to find the net baseline
            if ($old['tipo_ajuste'] === 'ADICION') {
                $val_adiciones_reverted = $val_adiciones - $old_valor;
                $val_reducciones_reverted = $val_reducciones;
            } else {
                $val_adiciones_reverted = $val_adiciones;
                $val_reducciones_reverted = $val_reducciones - $old_valor;
            }

            // Calculate new hypothetical balance
            if ($data->tipo_ajuste === 'ADICION') {
                $hypothetical_saldo = $val_inicial + ($val_adiciones_reverted + $new_valor) - $val_reducciones_reverted - $val_ejecutado;
            } else {
                $hypothetical_saldo = $val_inicial + $val_adiciones_reverted - ($val_reducciones_reverted + $new_valor) - $val_ejecutado;
            }

            // If the updated balance goes negative, block it
            if ($hypothetical_saldo < 0) {
                http_response_code(400);
                echo json_encode(["message" => "La modificación no se puede aplicar porque dejaría el rubro con saldo disponible negativo ($" . number_format($hypothetical_saldo, 2) . ")."]);
                $this->conn->rollBack();
                return;
            }

            // 1. Revert Old Adjustment on Asignacion
            if ($old['tipo_ajuste'] === 'ADICION') {
                $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_adiciones = valor_adiciones - :v WHERE id_asignacion = :id")
                    ->execute([":v" => $old_valor, ":id" => $old['asignacion_id']]);
            } else {
                $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_reducciones = valor_reducciones - :v WHERE id_asignacion = :id")
                    ->execute([":v" => $old_valor, ":id" => $old['asignacion_id']]);
            }

            // 2. Apply New Adjustment on Asignacion
            if ($data->tipo_ajuste === 'ADICION') {
                $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_adiciones = valor_adiciones + :v WHERE id_asignacion = :id")
                    ->execute([":v" => $new_valor, ":id" => $old['asignacion_id']]);
            } else {
                $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_reducciones = valor_reducciones + :v WHERE id_asignacion = :id")
                    ->execute([":v" => $new_valor, ":id" => $old['asignacion_id']]);
            }

            // 3. Update Adjustment details
            $query = "UPDATE presupuesto_ajustes SET 
                      fecha = :fecha, tipo_ajuste = :tipo_ajuste, valor = :valor, justificacion = :justificacion 
                      WHERE id_ajuste = :id AND pae_id = :pae_id";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ":id" => $id,
                ":pae_id" => $pae_id,
                ":fecha" => $data->fecha,
                ":tipo_ajuste" => $data->tipo_ajuste,
                ":valor" => $new_valor,
                ":justificacion" => $data->justificacion ?? ''
            ]);

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Ajuste presupuestal actualizado con éxito."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar el ajuste: " . $e->getMessage()]);
        }
    }

    public function delete($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Fetch adjustment details
            $stmt = $this->conn->prepare("SELECT * FROM presupuesto_ajustes WHERE id_ajuste = :id AND pae_id = :pae_id");
            $stmt->execute([":id" => $id, ":pae_id" => $pae_id]);
            $ajuste = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$ajuste) {
                http_response_code(404);
                echo json_encode(["message" => "Ajuste no encontrado."]);
                $this->conn->rollBack();
                return;
            }

            // Fetch current allocation totals
            $stmtAlloc = $this->conn->prepare("SELECT valor_inicial, valor_adiciones, valor_reducciones, valor_ejecutado FROM presupuesto_asignacion WHERE id_asignacion = :id");
            $stmtAlloc->execute([":id" => $ajuste['asignacion_id']]);
            $alloc = $stmtAlloc->fetch(PDO::FETCH_ASSOC);

            if (!$alloc) {
                throw new Exception("Rubro presupuestal no encontrado.");
            }

            $valor = floatval($ajuste['valor']);
            $val_inicial = floatval($alloc['valor_inicial']);
            $val_adiciones = floatval($alloc['valor_adiciones']);
            $val_reducciones = floatval($alloc['valor_reducciones']);
            $val_ejecutado = floatval($alloc['valor_ejecutado']);

            // If it was an ADICION, deleting it will decrease budget. 
            // We must verify the new balance doesn't go below 0 (for example, if they spent the addition already).
            if ($ajuste['tipo_ajuste'] === 'ADICION') {
                $hypothetical_saldo = $val_inicial + ($val_adiciones - $valor) - $val_reducciones - $val_ejecutado;
                if ($hypothetical_saldo < 0) {
                    http_response_code(400);
                    echo json_encode(["message" => "No se puede eliminar esta adición porque dejaría el rubro con saldo disponible negativo ($" . number_format($hypothetical_saldo, 2) . "). Cancele o disminuya los gastos ejecutados primero."]);
                    $this->conn->rollBack();
                    return;
                }
            }

            // Revert Adjustment from Asignacion
            if ($ajuste['tipo_ajuste'] === 'ADICION') {
                $queryUpdate = "UPDATE presupuesto_asignacion SET valor_adiciones = valor_adiciones - :valor WHERE id_asignacion = :id";
            } else {
                $queryUpdate = "UPDATE presupuesto_asignacion SET valor_reducciones = valor_reducciones - :valor WHERE id_asignacion = :id";
            }
            $stmtUpdate = $this->conn->prepare($queryUpdate);
            $stmtUpdate->execute([":valor" => $valor, ":id" => $ajuste['asignacion_id']]);

            // Delete from Ajustes
            $stmtDel = $this->conn->prepare("DELETE FROM presupuesto_ajustes WHERE id_ajuste = :id");
            $stmtDel->execute([":id" => $id]);

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Ajuste presupuestal eliminado con éxito y saldo revertido."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar el ajuste: " . $e->getMessage()]);
        }
    }
}

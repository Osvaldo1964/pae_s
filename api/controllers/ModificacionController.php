<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use PDO;
use Exception;

class ModificacionController
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
        if (!$pae_id) { http_response_code(403); echo json_encode(["message" => "Acceso denegado."]); return; }

        // Get all masters with aggregated totals
        $query = "SELECT m.id_modificacion, m.pae_id, m.fecha, m.tipo_modificacion, m.justificacion, m.usuario_id, m.created_at,
                         COALESCE(SUM(CASE WHEN d.tipo_afectacion = 'ADICION' THEN d.valor ELSE 0 END), 0) as total_adicion,
                         COALESCE(SUM(CASE WHEN d.tipo_afectacion = 'REDUCCION' THEN d.valor ELSE 0 END), 0) as total_reduccion
                  FROM presupuesto_modificaciones m
                  LEFT JOIN presupuesto_modificaciones_detalles d ON m.id_modificacion = d.modificacion_id
                  WHERE m.pae_id = :pae_id
                  GROUP BY m.id_modificacion
                  ORDER BY m.fecha DESC, m.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->execute();
        $masters = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Attach detail rows per master
        foreach ($masters as &$mod) {
            $stmtDet = $this->conn->prepare(
                "SELECT d.id_detalle, d.asignacion_id, d.tipo_afectacion, d.valor,
                        i.codigo, i.nombre as item_nombre, b.name as branch_name, s.name as school_name
                 FROM presupuesto_modificaciones_detalles d
                 JOIN presupuesto_asignacion a ON d.asignacion_id = a.id_asignacion
                 JOIN presupuesto_items i ON a.item_id = i.id_item
                 JOIN school_branches b ON a.branch_id = b.id
                 JOIN schools s ON b.school_id = s.id
                 WHERE d.modificacion_id = :id"
            );
            $stmtDet->execute([':id' => $mod['id_modificacion']]);
            $mod['detalles'] = $stmtDet->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode($masters);
    }

    public function show($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) { http_response_code(403); echo json_encode(["message" => "Acceso denegado."]); return; }

        $stmt = $this->conn->prepare("SELECT * FROM presupuesto_modificaciones WHERE id_modificacion = :id AND pae_id = :pae_id");
        $stmt->execute([':id' => $id, ':pae_id' => $pae_id]);
        $mod = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$mod) { echo json_encode(null); return; }

        $stmtDet = $this->conn->prepare(
            "SELECT d.id_detalle, d.asignacion_id, d.tipo_afectacion, d.valor,
                    i.codigo, i.nombre as item_nombre, b.name as branch_name, s.name as school_name,
                    (a.valor_inicial + a.valor_adiciones - a.valor_reducciones - a.valor_ejecutado) as saldo_disponible
             FROM presupuesto_modificaciones_detalles d
             JOIN presupuesto_asignacion a ON d.asignacion_id = a.id_asignacion
             JOIN presupuesto_items i ON a.item_id = i.id_item
             JOIN school_branches b ON a.branch_id = b.id
             JOIN schools s ON b.school_id = s.id
             WHERE d.modificacion_id = :id"
        );
        $stmtDet->execute([':id' => $id]);
        $mod['detalles'] = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($mod);
    }

    public function getAllocations()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) { http_response_code(403); echo json_encode(["message" => "Acceso denegado."]); return; }

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
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function store()
    {
        $pae_id   = $this->getPaeIdFromToken();
        $usuario_id = $this->getUserIdFromToken();
        if (!$pae_id) { http_response_code(403); echo json_encode(["message" => "Acceso denegado."]); return; }

        $data = json_decode(file_get_contents("php://input"));
        if (!$data || empty($data->fecha) || empty($data->tipo_modificacion) || empty($data->justificacion) || empty($data->detalles)) {
            http_response_code(400);
            echo json_encode(["message" => "Datos incompletos o inválidos."]);
            return;
        }

        $tipo = strtoupper($data->tipo_modificacion);
        $detalles = $data->detalles;

        // --- Validations ---
        if (!in_array($tipo, ['ADICION', 'REDUCCION', 'TRASLADO'])) {
            http_response_code(400);
            echo json_encode(["message" => "Tipo de modificación no válido."]);
            return;
        }

        if ($tipo === 'TRASLADO') {
            $sumaOrigen = array_sum(array_map(fn($d) => floatval($d->valor), array_filter($detalles, fn($d) => strtoupper($d->tipo_afectacion) === 'REDUCCION')));
            $sumaDestino = array_sum(array_map(fn($d) => floatval($d->valor), array_filter($detalles, fn($d) => strtoupper($d->tipo_afectacion) === 'ADICION')));

            if (abs($sumaOrigen - $sumaDestino) > 0.01) {
                http_response_code(400);
                echo json_encode(["message" => "Error de partida doble: el total de disminuciones (" . number_format($sumaOrigen, 2) . ") debe ser igual al total de adiciones (" . number_format($sumaDestino, 2) . ")."]);
                return;
            }
            if ($sumaOrigen <= 0) {
                http_response_code(400);
                echo json_encode(["message" => "El traslado debe incluir al menos un rubro de origen y uno de destino con valor mayor a cero."]);
                return;
            }
        }

        try {
            $this->conn->beginTransaction();

            // 1. Insert master record
            $stmtMaster = $this->conn->prepare(
                "INSERT INTO presupuesto_modificaciones (pae_id, fecha, tipo_modificacion, justificacion, usuario_id)
                 VALUES (:pae_id, :fecha, :tipo, :justificacion, :usuario_id)"
            );
            $stmtMaster->execute([
                ':pae_id'       => $pae_id,
                ':fecha'        => $data->fecha,
                ':tipo'         => $tipo,
                ':justificacion' => $data->justificacion,
                ':usuario_id'   => $usuario_id ?: 0
            ]);
            $mod_id = $this->conn->lastInsertId();

            // 2. Insert details and update balances
            $stmtDet = $this->conn->prepare(
                "INSERT INTO presupuesto_modificaciones_detalles (modificacion_id, asignacion_id, tipo_afectacion, valor)
                 VALUES (:modificacion_id, :asignacion_id, :tipo_afectacion, :valor)"
            );

            foreach ($detalles as $detalle) {
                $afectacion = strtoupper($detalle->tipo_afectacion);
                $valor      = floatval($detalle->valor);
                $asig_id    = intval($detalle->asignacion_id);

                if ($valor <= 0) continue;

                // Validate pae_id ownership of asignacion
                $stmtCheck = $this->conn->prepare("SELECT id_asignacion FROM presupuesto_asignacion WHERE id_asignacion = :id AND pae_id = :pae_id");
                $stmtCheck->execute([':id' => $asig_id, ':pae_id' => $pae_id]);
                if (!$stmtCheck->fetch()) {
                    throw new Exception("Rubro ID $asig_id no pertenece al programa activo.");
                }

                // Validate sufficient balance for REDUCCION
                if ($afectacion === 'REDUCCION') {
                    $stmtSaldo = $this->conn->prepare("SELECT (valor_inicial + valor_adiciones - valor_reducciones - valor_ejecutado) as saldo FROM presupuesto_asignacion WHERE id_asignacion = :id");
                    $stmtSaldo->execute([':id' => $asig_id]);
                    $row = $stmtSaldo->fetch(PDO::FETCH_ASSOC);
                    $saldo = floatval($row['saldo'] ?? 0);
                    if ($valor > $saldo + 0.01) {
                        throw new Exception("Saldo insuficiente en rubro ID $asig_id. Disponible: " . number_format($saldo, 2));
                    }
                }

                // Insert detail
                $stmtDet->execute([
                    ':modificacion_id' => $mod_id,
                    ':asignacion_id'   => $asig_id,
                    ':tipo_afectacion' => $afectacion,
                    ':valor'           => $valor
                ]);

                // Update balance in presupuesto_asignacion
                if ($tipo === 'TRASLADO') {
                    if ($afectacion === 'REDUCCION') {
                        $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_reducciones = valor_reducciones + :v, valor_traslados_contracredito = valor_traslados_contracredito + :v WHERE id_asignacion = :id")
                            ->execute([':v' => $valor, ':id' => $asig_id]);
                    } else {
                        $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_adiciones = valor_adiciones + :v, valor_traslados_credito = valor_traslados_credito + :v WHERE id_asignacion = :id")
                            ->execute([':v' => $valor, ':id' => $asig_id]);
                    }
                } elseif ($afectacion === 'ADICION') {
                    $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_adiciones = valor_adiciones + :v WHERE id_asignacion = :id")
                        ->execute([':v' => $valor, ':id' => $asig_id]);
                } else {
                    $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_reducciones = valor_reducciones + :v WHERE id_asignacion = :id")
                        ->execute([':v' => $valor, ':id' => $asig_id]);
                }
            }

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Modificación contractual registrada exitosamente.", "id" => $mod_id]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(400);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    public function update($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) { http_response_code(403); echo json_encode(["message" => "Acceso denegado."]); return; }

        // Only justificacion and fecha can be updated; detalles/amounts are fixed once saved
        $data = json_decode(file_get_contents("php://input"));

        $stmtOld = $this->conn->prepare("SELECT * FROM presupuesto_modificaciones WHERE id_modificacion = :id AND pae_id = :pae_id");
        $stmtOld->execute([':id' => $id, ':pae_id' => $pae_id]);
        $old = $stmtOld->fetch(PDO::FETCH_ASSOC);
        if (!$old) { echo json_encode(["success" => false, "message" => "Modificación no encontrada."]); return; }

        try {
            $this->conn->prepare("UPDATE presupuesto_modificaciones SET fecha = :fecha, justificacion = :justificacion WHERE id_modificacion = :id AND pae_id = :pae_id")
                ->execute([':fecha' => $data->fecha ?? $old['fecha'], ':justificacion' => $data->justificacion ?? $old['justificacion'], ':id' => $id, ':pae_id' => $pae_id]);
            echo json_encode(["success" => true, "message" => "Modificación actualizada correctamente."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    public function delete($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) { http_response_code(403); echo json_encode(["message" => "Acceso denegado."]); return; }

        $stmtOld = $this->conn->prepare("SELECT * FROM presupuesto_modificaciones WHERE id_modificacion = :id AND pae_id = :pae_id");
        $stmtOld->execute([':id' => $id, ':pae_id' => $pae_id]);
        $old = $stmtOld->fetch(PDO::FETCH_ASSOC);
        if (!$old) { echo json_encode(["success" => false, "message" => "Modificación no encontrada."]); return; }

        // Load all detalles to revert balances
        $stmtDet = $this->conn->prepare("SELECT * FROM presupuesto_modificaciones_detalles WHERE modificacion_id = :id");
        $stmtDet->execute([':id' => $id]);
        $detalles = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

        try {
            $this->conn->beginTransaction();

            foreach ($detalles as $det) {
                $afectacion = strtoupper($det['tipo_afectacion']);
                $valor      = floatval($det['valor']);
                $asig_id    = intval($det['asignacion_id']);
                $tipo       = strtoupper($old['tipo_modificacion']);

                if ($tipo === 'TRASLADO') {
                    if ($afectacion === 'REDUCCION') {
                        $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_reducciones = valor_reducciones - :v, valor_traslados_contracredito = valor_traslados_contracredito - :v WHERE id_asignacion = :id")
                            ->execute([':v' => $valor, ':id' => $asig_id]);
                    } else {
                        $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_adiciones = valor_adiciones - :v, valor_traslados_credito = valor_traslados_credito - :v WHERE id_asignacion = :id")
                            ->execute([':v' => $valor, ':id' => $asig_id]);
                    }
                } elseif ($afectacion === 'ADICION') {
                    $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_adiciones = valor_adiciones - :v WHERE id_asignacion = :id")
                        ->execute([':v' => $valor, ':id' => $asig_id]);
                } else {
                    $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_reducciones = valor_reducciones - :v WHERE id_asignacion = :id")
                        ->execute([':v' => $valor, ':id' => $asig_id]);
                }
            }

            // Delete master (cascade deletes detalles)
            $this->conn->prepare("DELETE FROM presupuesto_modificaciones WHERE id_modificacion = :id")
                ->execute([':id' => $id]);

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Modificación eliminada y saldos revertidos exitosamente."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }
}

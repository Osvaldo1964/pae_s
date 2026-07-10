<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use PDO;
use Exception;

class TrasladoController
{
    private $conn;

    public function __construct()
    {
        $this->conn = Database::getInstance()->getConnection();
    }

    private function getPaeIdFromToken()
    {
        $headers = null;
        if (isset($_SERVER['Authorization']))
            $headers = trim($_SERVER["Authorization"]);
        else if (isset($_SERVER['HTTP_AUTHORIZATION']))
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization']))
                $headers = trim($requestHeaders['Authorization']);
        }
        if (!$headers)
            return null;
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
        if (isset($_SERVER['Authorization']))
            $headers = trim($_SERVER["Authorization"]);
        else if (isset($_SERVER['HTTP_AUTHORIZATION']))
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization']))
                $headers = trim($requestHeaders['Authorization']);
        }
        if (!$headers)
            return null;
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

        $query = "SELECT t.*, 
                         io.codigo as cod_origen, io.nombre as nom_origen, bo.name as branch_origen, so.name as school_origen,
                         id.codigo as cod_destino, id.nombre as nom_destino, bd.name as branch_destino, sd.name as school_destino
                  FROM presupuesto_traslados t
                  JOIN presupuesto_asignacion ao ON t.origen_id = ao.id_asignacion
                  JOIN presupuesto_items io ON ao.item_id = io.id_item
                  JOIN school_branches bo ON ao.branch_id = bo.id
                  JOIN schools so ON bo.school_id = so.id
                  JOIN presupuesto_asignacion ad ON t.destino_id = ad.id_asignacion
                  JOIN presupuesto_items id ON ad.item_id = id.id_item
                  JOIN school_branches bd ON ad.branch_id = bd.id
                  JOIN schools sd ON bd.school_id = sd.id
                  WHERE t.pae_id = :pae_id 
                  ORDER BY t.created_at DESC";

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

        try {
            $this->conn->beginTransaction();

            // 1. Insert Transfer record
            $query = "INSERT INTO presupuesto_traslados 
                      (pae_id, fecha, origen_id, destino_id, valor, justificacion, usuario_id) 
                      VALUES (:pae_id, :fecha, :origen_id, :destino_id, :valor, :justificacion, :usuario_id)";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ":pae_id" => $pae_id,
                ":fecha" => $data->fecha,
                ":origen_id" => $data->origen_id,
                ":destino_id" => $data->destino_id,
                ":valor" => $data->valor,
                ":justificacion" => $data->justificacion,
                ":usuario_id" => $usuario_id
            ]);

            // 2. Update Source (Reduction)
            $queryOrig = "UPDATE presupuesto_asignacion 
                          SET valor_reducciones = valor_reducciones + :valor,
                              valor_traslados_contracredito = valor_traslados_contracredito + :valor
                          WHERE id_asignacion = :id";
            $stmtOrig = $this->conn->prepare($queryOrig);
            $stmtOrig->execute([":valor" => $data->valor, ":id" => $data->origen_id]);

            // 3. Update Destination (Addition)
            $queryDest = "UPDATE presupuesto_asignacion 
                          SET valor_adiciones = valor_adiciones + :valor,
                              valor_traslados_credito = valor_traslados_credito + :valor
                          WHERE id_asignacion = :id";
            $stmtDest = $this->conn->prepare($queryDest);
            $stmtDest->execute([":valor" => $data->valor, ":id" => $data->destino_id]);

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Traslado presupuestal realizado con éxito."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }

    public function show($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        $query = "SELECT t.*, 
                         io.codigo as cod_origen, io.nombre as nom_origen, bo.name as branch_origen, so.name as school_origen,
                         id.codigo as cod_destino, id.nombre as nom_destino, bd.name as branch_destino, sd.name as school_destino,
                         (ao.valor_inicial + ao.valor_adiciones - ao.valor_reducciones - ao.valor_ejecutado + t.valor) as saldo_disponible_origen_con_tras
                  FROM presupuesto_traslados t
                  JOIN presupuesto_asignacion ao ON t.origen_id = ao.id_asignacion
                  JOIN presupuesto_items io ON ao.item_id = io.id_item
                  JOIN school_branches bo ON ao.branch_id = bo.id
                  JOIN schools so ON bo.school_id = so.id
                  JOIN presupuesto_asignacion ad ON t.destino_id = ad.id_asignacion
                  JOIN presupuesto_items id ON ad.item_id = id.id_item
                  JOIN school_branches bd ON ad.branch_id = bd.id
                  JOIN schools sd ON bd.school_id = sd.id
                  WHERE t.id_traslado = :id AND t.pae_id = :pae_id";

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

        $stmtOld = $this->conn->prepare("SELECT * FROM presupuesto_traslados WHERE id_traslado = :id AND pae_id = :pae_id");
        $stmtOld->execute([":id" => $id, ":pae_id" => $pae_id]);
        $old = $stmtOld->fetch(PDO::FETCH_ASSOC);

        if (!$old) {
            echo json_encode(["success" => false, "message" => "Traslado no encontrado."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"));

        try {
            $this->conn->beginTransaction();

            // 1. Revert OLD values
            // Source (Reduction -)
            $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_reducciones = valor_reducciones - :v, valor_traslados_contracredito = valor_traslados_contracredito - :v WHERE id_asignacion = :id")
                ->execute([":v" => $old['valor'], ":id" => $old['origen_id']]);
            // Destination (Addition -)
            $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_adiciones = valor_adiciones - :v, valor_traslados_credito = valor_traslados_credito - :v WHERE id_asignacion = :id")
                ->execute([":v" => $old['valor'], ":id" => $old['destino_id']]);

            // 2. Apply NEW values
            // New Source (Reduction +)
            $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_reducciones = valor_reducciones + :v, valor_traslados_contracredito = valor_traslados_contracredito + :v WHERE id_asignacion = :id")
                ->execute([":v" => $data->valor, ":id" => $old['origen_id']]); // Origin/Dest usually locked in edit for simplicity but we could allow change
            // New Destination (Addition +)
            $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_adiciones = valor_adiciones + :v, valor_traslados_credito = valor_traslados_credito + :v WHERE id_asignacion = :id")
                ->execute([":v" => $data->valor, ":id" => $old['destino_id']]);

            // 3. Update Record
            $query = "UPDATE presupuesto_traslados SET 
                      fecha = :fecha, valor = :valor, justificacion = :justificacion 
                      WHERE id_traslado = :id AND pae_id = :pae_id";
            $this->conn->prepare($query)->execute([
                ":id" => $id,
                ":pae_id" => $pae_id,
                ":fecha" => $data->fecha,
                ":valor" => $data->valor,
                ":justificacion" => $data->justificacion
            ]);

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Traslado actualizado."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }

    public function delete($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        $stmt = $this->conn->prepare("SELECT * FROM presupuesto_traslados WHERE id_traslado = :id AND pae_id = :pae_id");
        $stmt->execute([":id" => $id, ":pae_id" => $pae_id]);
        $mov = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$mov) {
            echo json_encode(["success" => false, "message" => "No existe."]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // Revert balances
            $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_reducciones = valor_reducciones - :v, valor_traslados_contracredito = valor_traslados_contracredito - :v WHERE id_asignacion = :id")
                ->execute([":v" => $mov['valor'], ":id" => $mov['origen_id']]);
            $this->conn->prepare("UPDATE presupuesto_asignacion SET valor_adiciones = valor_adiciones - :v, valor_traslados_credito = valor_traslados_credito - :v WHERE id_asignacion = :id")
                ->execute([":v" => $mov['valor'], ":id" => $mov['destino_id']]);

            // Delete Record
            $this->conn->prepare("DELETE FROM presupuesto_traslados WHERE id_traslado = :id")->execute([":id" => $id]);

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Traslado eliminado y saldos revertidos."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }
}

<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use PDO;
use Exception;

class PresupuestoController
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

    public function index()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $query = "SELECT * FROM presupuesto_items WHERE pae_id = :pae_id AND estado = 1 ORDER BY codigo ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->execute();
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($items);
    }

    public function getAsignaciones()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $query = "SELECT * FROM presupuesto_asignacion WHERE pae_id = :pae_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->execute();
        $asignaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($asignaciones);
    }

    public function getBranches()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        // Get branches associated with schools of this PAE
        $query = "SELECT sb.*, s.name as school_name 
                  FROM school_branches sb
                  JOIN schools s ON sb.school_id = s.id
                  WHERE s.pae_id = :pae_id
                  ORDER BY s.name, sb.name";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->execute();
        $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($branches);
    }

    public function store()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"));
        if (!$data) {
            http_response_code(400);
            echo json_encode(["message" => "Datos inválidos."]);
            return;
        }

        try {
            $this->conn->beginTransaction();

            // 1. Insert Rubro
            $query = "INSERT INTO presupuesto_items 
                      (pae_id, codigo, nombre, descripcion, padre_id, unidad_medida, cantidad_global, tiempo_global, valor_unitario_oficial, valor_total_oficial) 
                      VALUES (:pae_id, :codigo, :nombre, :descripcion, :padre_id, :unidad_medida, :cantidad_global, :tiempo_global, :valor_unitario_oficial, :valor_total_oficial)";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ":pae_id" => $pae_id,
                ":codigo" => $data->codigo,
                ":nombre" => $data->nombre,
                ":descripcion" => $data->descripcion ?? '',
                ":padre_id" => !empty($data->padre_id) ? $data->padre_id : null,
                ":unidad_medida" => $data->unidad_medida ?? '',
                ":cantidad_global" => $data->cantidad_global ?? 0,
                ":tiempo_global" => $data->tiempo_global ?? 0,
                ":valor_unitario_oficial" => $data->valor_unitario_oficial ?? 0,
                ":valor_total_oficial" => $data->valor_total_oficial ?? 0
            ]);

            $item_id = $this->conn->lastInsertId();

            // 2. Insert Split/Assignments
            if (!empty($data->distribucion)) {
                $queryAsig = "INSERT INTO presupuesto_asignacion 
                              (pae_id, item_id, branch_id, cantidad, meses, valor_unitario, valor_inicial) 
                              VALUES (:pae_id, :item_id, :branch_id, :cantidad, :meses, :valor_unitario, :valor_inicial)";
                $stmtAsig = $this->conn->prepare($queryAsig);

                foreach ($data->distribucion as $dist) {
                    if ($dist->total > 0) {
                        $stmtAsig->execute([
                            ":pae_id" => $pae_id,
                            ":item_id" => $item_id,
                            ":branch_id" => $dist->branch_id,
                            ":cantidad" => $dist->cantidad,
                            ":meses" => $dist->meses,
                            ":valor_unitario" => $dist->valor_unitario,
                            ":valor_inicial" => $dist->total
                        ]);
                    }
                }
            }

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Presupuesto guardado exitosamente."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }

    public function show($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        $query = "SELECT * FROM presupuesto_items WHERE id_item = :id AND pae_id = :pae_id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([":id" => $id, ":pae_id" => $pae_id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($item) {
            // Get distribution
            $queryDist = "SELECT * FROM presupuesto_asignacion WHERE item_id = :id";
            $stmtDist = $this->conn->prepare($queryDist);
            $stmtDist->execute([":id" => $id]);
            $item['distribucion'] = $stmtDist->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode($item);
    }

    public function update($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        $data = json_decode(file_get_contents("php://input"));

        try {
            $this->conn->beginTransaction();

            $query = "UPDATE presupuesto_items SET 
                      codigo = :codigo, nombre = :nombre, descripcion = :descripcion, 
                      padre_id = :padre_id, unidad_medida = :unidad_medida, 
                      cantidad_global = :cantidad_global, tiempo_global = :tiempo_global, 
                      valor_unitario_oficial = :valor_unitario_oficial, valor_total_oficial = :valor_total_oficial
                      WHERE id_item = :id AND pae_id = :pae_id";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ":id" => $id,
                ":pae_id" => $pae_id,
                ":codigo" => $data->codigo,
                ":nombre" => $data->nombre,
                ":descripcion" => $data->descripcion ?? '',
                ":padre_id" => !empty($data->padre_id) ? $data->padre_id : null,
                ":unidad_medida" => $data->unidad_medida ?? '',
                ":cantidad_global" => $data->cantidad_global ?? 0,
                ":tiempo_global" => $data->tiempo_global ?? 0,
                ":valor_unitario_oficial" => $data->valor_unitario_oficial ?? 0,
                ":valor_total_oficial" => $data->valor_total_oficial ?? 0
            ]);

            // Sync distribution without deleting existing records (to avoid FK errors with movements)
            if (!empty($data->distribucion)) {
                $checkStmt = $this->conn->prepare("SELECT id_asignacion FROM presupuesto_asignacion WHERE item_id = :item_id AND branch_id = :branch_id");

                $queryInsert = "INSERT INTO presupuesto_asignacion 
                                (pae_id, item_id, branch_id, cantidad, meses, valor_unitario, valor_inicial) 
                                VALUES (:pae_id, :item_id, :branch_id, :cantidad, :meses, :valor_unitario, :valor_inicial)";

                $queryUpdate = "UPDATE presupuesto_asignacion SET 
                                cantidad = :cantidad, meses = :meses, valor_unitario = :valor_unitario, valor_inicial = :valor_inicial
                                WHERE item_id = :item_id AND branch_id = :branch_id";

                foreach ($data->distribucion as $dist) {
                    $checkStmt->execute([":item_id" => $id, ":branch_id" => $dist->branch_id]);
                    $exists = $checkStmt->fetch();

                    if ($exists) {
                        $stmtUpdate = $this->conn->prepare($queryUpdate);
                        $stmtUpdate->execute([
                            ":item_id" => $id,
                            ":branch_id" => $dist->branch_id,
                            ":cantidad" => $dist->cantidad,
                            ":meses" => $dist->meses,
                            ":valor_unitario" => $dist->valor_unitario,
                            ":valor_inicial" => $dist->total
                        ]);
                    } else {
                        if ($dist->total > 0) {
                            $stmtInsert = $this->conn->prepare($queryInsert);
                            $stmtInsert->execute([
                                ":pae_id" => $pae_id,
                                ":item_id" => $id,
                                ":branch_id" => $dist->branch_id,
                                ":cantidad" => $dist->cantidad,
                                ":meses" => $dist->meses,
                                ":valor_unitario" => $dist->valor_unitario,
                                ":valor_inicial" => $dist->total
                            ]);
                        }
                    }
                }
            }

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Presupuesto actualizado."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => $e->getMessage()]);
        }
    }

    public function delete($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        $query = "UPDATE presupuesto_items SET estado = 0 WHERE id_item = :id AND pae_id = :pae_id";
        $stmt = $this->conn->prepare($query);
        $res = $stmt->execute([":id" => $id, ":pae_id" => $pae_id]);
        echo json_encode(["success" => $res]);
    }

    public function getActiveProgram()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $query = "SELECT id, name, entity_name, nit, department, city, email,
                         operator_name, operator_nit, operator_address, operator_phone, operator_email,
                         entity_logo_path, operator_logo_path, contract_number, contract_value, start_date, end_date
                  FROM pae_programs 
                  WHERE id = :pae_id LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->execute();
        $program = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($program) {
            echo json_encode($program);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Programa no encontrado."]);
        }
    }
}

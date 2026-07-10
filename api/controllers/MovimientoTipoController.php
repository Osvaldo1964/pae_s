<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use PDO;
use Exception;

class MovimientoTipoController
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

    public function index()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        // Lazy seeding fallback: ensure defaults exist
        $stmtCheck = $this->conn->prepare("SELECT COUNT(*) as total FROM presupuesto_movimiento_tipos WHERE pae_id = :pae_id");
        $stmtCheck->execute([":pae_id" => $pae_id]);
        $count = $stmtCheck->fetch(PDO::FETCH_ASSOC)['total'];

        if ($count == 0) {
            $defaults = ['PAGO', 'COMPRA', 'NOMINA', 'SERVICIO', 'OTRO'];
            $stmtInsert = $this->conn->prepare("INSERT INTO presupuesto_movimiento_tipos (pae_id, nombre, descripcion) VALUES (:pae_id, :nombre, :descripcion)");
            foreach ($defaults as $d) {
                $stmtInsert->execute([
                    ":pae_id" => $pae_id,
                    ":nombre" => $d,
                    ":descripcion" => "Tipo de movimiento predeterminado"
                ]);
            }
        }

        $query = "SELECT * FROM presupuesto_movimiento_tipos WHERE pae_id = :pae_id ORDER BY nombre ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($results);
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
        if (!$data || empty($data->nombre)) {
            http_response_code(400);
            echo json_encode(["message" => "El nombre es obligatorio."]);
            return;
        }

        $nombre = strtoupper(trim($data->nombre));

        // Check duplicates
        $stmtCheck = $this->conn->prepare("SELECT COUNT(*) FROM presupuesto_movimiento_tipos WHERE pae_id = :pae_id AND UPPER(nombre) = :nombre");
        $stmtCheck->execute([":pae_id" => $pae_id, ":nombre" => $nombre]);
        if ($stmtCheck->fetchColumn() > 0) {
            http_response_code(400);
            echo json_encode(["message" => "Ya existe un tipo de movimiento con ese nombre en este programa."]);
            return;
        }

        try {
            $query = "INSERT INTO presupuesto_movimiento_tipos (pae_id, nombre, descripcion) VALUES (:pae_id, :nombre, :descripcion)";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ":pae_id" => $pae_id,
                ":nombre" => $nombre,
                ":descripcion" => $data->descripcion ?? ''
            ]);

            echo json_encode(["success" => true, "message" => "Tipo de movimiento registrado exitosamente."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Error al registrar el tipo: " . $e->getMessage()]);
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

        $stmt = $this->conn->prepare("SELECT * FROM presupuesto_movimiento_tipos WHERE id_tipo_movimiento = :id AND pae_id = :pae_id");
        $stmt->execute([":id" => $id, ":pae_id" => $pae_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            http_response_code(404);
            echo json_encode(["message" => "Tipo de movimiento no encontrado."]);
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
        if (!$data || empty($data->nombre)) {
            http_response_code(400);
            echo json_encode(["message" => "El nombre es obligatorio."]);
            return;
        }

        $nombre = strtoupper(trim($data->nombre));

        // Check duplicate name for OTHER types
        $stmtCheck = $this->conn->prepare("SELECT COUNT(*) FROM presupuesto_movimiento_tipos WHERE pae_id = :pae_id AND UPPER(nombre) = :nombre AND id_tipo_movimiento != :id");
        $stmtCheck->execute([":pae_id" => $pae_id, ":nombre" => $nombre, ":id" => $id]);
        if ($stmtCheck->fetchColumn() > 0) {
            http_response_code(400);
            echo json_encode(["message" => "Ya existe otro tipo de movimiento con ese nombre en este programa."]);
            return;
        }

        try {
            // Get original name to update references (optional, but a nice touch: if they rename 'PAGO' to 'PAGO FACTURA', we could update existing movements too!)
            $stmtOrig = $this->conn->prepare("SELECT nombre FROM presupuesto_movimiento_tipos WHERE id_tipo_movimiento = :id AND pae_id = :pae_id");
            $stmtOrig->execute([":id" => $id, ":pae_id" => $pae_id]);
            $originalName = $stmtOrig->fetchColumn();

            $this->conn->beginTransaction();

            // Update type record
            $query = "UPDATE presupuesto_movimiento_tipos SET nombre = :nombre, descripcion = :descripcion WHERE id_tipo_movimiento = :id AND pae_id = :pae_id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ":id" => $id,
                ":pae_id" => $pae_id,
                ":nombre" => $nombre,
                ":descripcion" => $data->descripcion ?? ''
            ]);

            // If name changed, update historical entries so they are not broken!
            if ($originalName && strcasecmp($originalName, $nombre) !== 0) {
                $stmtUpdateHist = $this->conn->prepare("UPDATE presupuesto_movimientos SET tipo_movimiento = :new_name WHERE pae_id = :pae_id AND tipo_movimiento = :old_name");
                $stmtUpdateHist->execute([
                    ":new_name" => $nombre,
                    ":pae_id" => $pae_id,
                    ":old_name" => $originalName
                ]);
            }

            $this->conn->commit();
            echo json_encode(["success" => true, "message" => "Tipo de movimiento actualizado exitosamente."]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar el tipo: " . $e->getMessage()]);
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
            // Fetch name first to check usage
            $stmtOrig = $this->conn->prepare("SELECT nombre FROM presupuesto_movimiento_tipos WHERE id_tipo_movimiento = :id AND pae_id = :pae_id");
            $stmtOrig->execute([":id" => $id, ":pae_id" => $pae_id]);
            $name = $stmtOrig->fetchColumn();

            if (!$name) {
                http_response_code(404);
                echo json_encode(["message" => "Tipo de movimiento no encontrado."]);
                return;
            }

            // Check if name is in use in movements
            $stmtCount = $this->conn->prepare("SELECT COUNT(*) FROM presupuesto_movimientos WHERE pae_id = :pae_id AND UPPER(tipo_movimiento) = :name");
            $stmtCount->execute([":pae_id" => $pae_id, ":name" => strtoupper($name)]);
            $count = $stmtCount->fetchColumn();

            if ($count > 0) {
                http_response_code(400);
                echo json_encode(["message" => "No se puede eliminar este tipo de movimiento porque ya está siendo utilizado en {$count} movimientos registrados."]);
                return;
            }

            // Delete
            $stmtDel = $this->conn->prepare("DELETE FROM presupuesto_movimiento_tipos WHERE id_tipo_movimiento = :id");
            $stmtDel->execute([":id" => $id]);

            echo json_encode(["success" => true, "message" => "Tipo de movimiento eliminado exitosamente."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar: " . $e->getMessage()]);
        }
    }
}

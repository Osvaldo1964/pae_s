<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use PDO;
use Exception;

class TerceroController
{
    private $conn;
    private $table_name = "terceros";

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

        // We check if pae_id column exists (assuming we added it for multi-tenancy)
        $query = "SELECT * FROM " . $this->table_name . " WHERE pae_id = :pae_id AND estado = 1 ORDER BY nombres ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);

        try {
            $stmt->execute();
            $terceros = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($terceros);
        } catch (Exception $e) {
            // Fallback for missing pae_id if user hasn't added it yet (though we should)
            $query = "SELECT * FROM " . $this->table_name . " WHERE estado = 1 ORDER BY nombres ASC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $terceros = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($terceros);
        }
    }

    public function create()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"));

        if (!$data || empty($data->identificacion) || empty($data->nombres)) {
            http_response_code(400);
            echo json_encode(["message" => "Identificación y Nombres son obligatorios."]);
            return;
        }

        $query = "INSERT INTO " . $this->table_name . " 
                  (pae_id, identificacion, nombres, direccion, telefono, email, tipo_tercero) 
                  VALUES (:pae_id, :identificacion, :nombres, :direccion, :telefono, :email, :tipo_tercero)";

        $stmt = $this->conn->prepare($query);
        $params = [
            ":pae_id" => $pae_id,
            ":identificacion" => $data->identificacion,
            ":nombres" => mb_strtoupper($data->nombres, 'UTF-8'),
            ":direccion" => mb_strtoupper($data->direccion ?? '', 'UTF-8'),
            ":telefono" => $data->telefono ?? '',
            ":email" => strtolower($data->email ?? ''),
            ":tipo_tercero" => $data->tipo_tercero ?? 'Proveedor'
        ];

        try {
            if ($stmt->execute($params)) {
                echo json_encode(["success" => true, "message" => "Tercero creado exitosamente.", "id" => $this->conn->lastInsertId()]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Error al crear tercero."]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => $e->getMessage()]);
        }
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
        if (!$data) {
            http_response_code(400);
            echo json_encode(["message" => "Datos inválidos."]);
            return;
        }

        $query = "UPDATE " . $this->table_name . " 
                  SET identificacion = :identificacion, nombres = :nombres, 
                      direccion = :direccion, telefono = :telefono, 
                      email = :email, tipo_tercero = :tipo_tercero 
                  WHERE id_tercero = :id AND pae_id = :pae_id";

        $stmt = $this->conn->prepare($query);
        $params = [
            ":identificacion" => $data->identificacion,
            ":nombres" => mb_strtoupper($data->nombres, 'UTF-8'),
            ":direccion" => mb_strtoupper($data->direccion ?? '', 'UTF-8'),
            ":telefono" => $data->telefono ?? '',
            ":email" => strtolower($data->email ?? ''),
            ":tipo_tercero" => $data->tipo_tercero ?? 'Proveedor',
            ":id" => $id,
            ":pae_id" => $pae_id
        ];

        if ($stmt->execute($params)) {
            echo json_encode(["success" => true, "message" => "Tercero actualizado exitosamente."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar tercero."]);
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

        // Soft delete
        $query = "UPDATE " . $this->table_name . " SET estado = 0 WHERE id_tercero = :id AND pae_id = :pae_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":pae_id", $pae_id);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Tercero eliminado exitosamente."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar tercero."]);
        }
    }
}

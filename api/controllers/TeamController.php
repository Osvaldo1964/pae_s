<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use PDO;
use Exception;

class TeamController
{
    private $conn;
    private $table_name = "users";

    public function __construct()
    {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }

    private function getUserDataFromToken()
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
                return $decoded['data'] ?? null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * GET /api/team - List team members (users of the same PAE)
     */
    public function index()
    {
        $userData = $this->getUserDataFromToken();
        if (!$userData || !isset($userData['pae_id'])) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado. Token inválido o sin PAE ID."]);
            return;
        }

        $pae_id = $userData['pae_id'];
        $current_user_id = $userData['id'];

        // List all users from THIS PAE, excluding Super Admin role
        // Include the current user in the list
        $query = "SELECT u.id, u.username, u.full_name, u.address, u.phone, u.role_id, r.name as role_name, u.created_at 
                  FROM " . $this->table_name . " u
                  LEFT JOIN roles r ON u.role_id = r.id
                  WHERE u.pae_id = :pae_id 
                    AND u.role_id != 1
                  ORDER BY u.full_name ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id, PDO::PARAM_INT);
        $stmt->execute();

        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($users);
    }

    /**
     * POST /api/team - Create new team member
     */
    public function create()
    {
        $userData = $this->getUserDataFromToken();
        if (!$userData || !isset($userData['pae_id'])) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $pae_id = $userData['pae_id'];
        $data = json_decode(file_get_contents("php://input"));

        // Enforce casing
        if (isset($data->full_name)) $data->full_name = mb_strtoupper($data->full_name, 'UTF-8');
        if (isset($data->username)) $data->username = strtolower($data->username);

        if (!empty($data->username) && !empty($data->password) && !empty($data->full_name) && !empty($data->role_id)) {

            // Security: Prevent creating Super Admin
            if ($data->role_id == 1) {
                http_response_code(403);
                echo json_encode(["message" => "No tiene permisos para crear Super Administradores."]);
                return;
            }

            // Check if username exists
            $checkQuery = "SELECT id FROM " . $this->table_name . " WHERE username = :username";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(":username", $data->username);
            $checkStmt->execute();
            if ($checkStmt->rowCount() > 0) {
                http_response_code(400);
                echo json_encode(["message" => "El nombre de usuario ya existe."]);
                return;
            }

            $query = "INSERT INTO " . $this->table_name . " 
                      (username, password_hash, full_name, address, phone, role_id, pae_id) 
                      VALUES (:username, :password, :full_name, :address, :phone, :role_id, :pae_id)";

            $stmt = $this->conn->prepare($query);

            $password_hash = password_hash($data->password, PASSWORD_BCRYPT);

            $stmt->bindParam(":username", $data->username);
            $stmt->bindParam(":password", $password_hash);
            $stmt->bindParam(":full_name", $data->full_name);
            $stmt->bindParam(":address", $data->address);
            $stmt->bindParam(":phone", $data->phone);
            $stmt->bindParam(":role_id", $data->role_id);
            $stmt->bindParam(":pae_id", $pae_id, PDO::PARAM_INT);

            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode(["message" => "Miembro del equipo creado exitosamente."]);
            } else {
                http_response_code(503);
                echo json_encode(["message" => "No se pudo crear el miembro del equipo."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Datos incompletos."]);
        }
    }

    /**
     * PUT /api/team/{id} - Update team member
     */
    public function update($id)
    {
        $userData = $this->getUserDataFromToken();
        if (!$userData || !isset($userData['pae_id'])) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $pae_id = $userData['pae_id'];
        $data = json_decode(file_get_contents("php://input"));

        // Enforce casing
        if (isset($data->full_name)) $data->full_name = mb_strtoupper($data->full_name, 'UTF-8');
        if (isset($data->username)) $data->username = strtolower($data->username);

        // Verify User Ownership & Existence
        // SECURITY: Ensure user belongs to THIS PAE and is not Super Admin
        $checkQuery = "SELECT id FROM " . $this->table_name . " 
                       WHERE id = :id 
                         AND pae_id = :pae_id 
                         AND role_id != 1";
        $checkStmt = $this->conn->prepare($checkQuery);
        $checkStmt->bindParam(":id", $id, PDO::PARAM_INT);
        $checkStmt->bindParam(":pae_id", $pae_id, PDO::PARAM_INT);
        $checkStmt->execute();

        if ($checkStmt->rowCount() == 0) {
            http_response_code(404);
            echo json_encode(["message" => "Miembro del equipo no encontrado o no tiene permisos."]);
            return;
        }

        // Prevent escalation
        if (isset($data->role_id) && $data->role_id == 1) {
            http_response_code(403);
            echo json_encode(["message" => "No puede asignar rol de Super Administrador."]);
            return;
        }

        $query = "UPDATE " . $this->table_name . " SET full_name = :full_name, address = :address, phone = :phone, role_id = :role_id";

        // Only update password if provided
        if (!empty($data->password)) {
            $query .= ", password_hash = :password";
        }

        $query .= " WHERE id = :id AND pae_id = :pae_id";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":full_name", $data->full_name);
        $stmt->bindParam(":address", $data->address);
        $stmt->bindParam(":phone", $data->phone);
        $stmt->bindParam(":role_id", $data->role_id);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->bindParam(":pae_id", $pae_id, PDO::PARAM_INT);

        if (!empty($data->password)) {
            $password_hash = password_hash($data->password, PASSWORD_BCRYPT);
            $stmt->bindParam(":password", $password_hash);
        }

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["message" => "Miembro del equipo actualizado."]);
        } else {
            http_response_code(503);
            echo json_encode(["message" => "No se pudo actualizar el miembro del equipo."]);
        }
    }

    /**
     * DELETE /api/team/{id} - Delete team member
     */
    public function delete($id)
    {
        $userData = $this->getUserDataFromToken();
        if (!$userData || !isset($userData['pae_id'])) {
            http_response_code(403);
            echo json_encode(["message" => "Acceso denegado."]);
            return;
        }

        $pae_id = $userData['pae_id'];
        $current_user_id = $userData['id'];

        // Prevent self-deletion
        if ($id == $current_user_id) {
            http_response_code(400);
            echo json_encode(["message" => "No puede eliminarse a sí mismo."]);
            return;
        }

        // Verify Ownership
        // SECURITY: Ensure user belongs to THIS PAE and is not Super Admin
        $checkQuery = "SELECT id FROM " . $this->table_name . " 
                       WHERE id = :id 
                         AND pae_id = :pae_id 
                         AND role_id != 1";
        $checkStmt = $this->conn->prepare($checkQuery);
        $checkStmt->bindParam(":id", $id, PDO::PARAM_INT);
        $checkStmt->bindParam(":pae_id", $pae_id, PDO::PARAM_INT);
        $checkStmt->execute();

        if ($checkStmt->rowCount() == 0) {
            http_response_code(404);
            echo json_encode(["message" => "Miembro del equipo no encontrado o permisos insuficientes."]);
            return;
        }

        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["message" => "Miembro del equipo eliminado."]);
        } else {
            http_response_code(503);
            echo json_encode(["message" => "No se pudo eliminar el miembro del equipo."]);
        }
    }
}

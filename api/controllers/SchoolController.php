<?php

namespace Controllers;

use Config\Database;
use Config\Config;
use Utils\JWT;
use PDO;
use Exception;

class SchoolController extends BaseController
{
    private $table_name = "schools";

    public function index()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        $query = "SELECT * FROM " . $this->table_name . " WHERE pae_id = :pae_id ORDER BY name ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->execute();

        $schools = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->sendResponse($schools);
    }

    public function create()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        // Support both JSON or FormData (for logo upload)
        $data = $_POST;
        // Enforce casing
        if (isset($data['name']))
            $data['name'] = mb_strtoupper($data['name'], 'UTF-8');
        if (isset($data['rector']))
            $data['rector'] = mb_strtoupper($data['rector'], 'UTF-8');
        if (isset($data['email']))
            $data['email'] = strtolower($data['email']);

        if (empty($data)) {
            $data = (array) json_decode(file_get_contents("php://input"));
        }

        if (empty($data['name'])) {
            return $this->sendError("Nombre del colegio es requerido.");
        }

        $logo_path = $this->uploadLogo($_FILES['logo'] ?? null);

        $this->conn->beginTransaction();

        try {
            $query = "INSERT INTO " . $this->table_name . " 
                      (pae_id, dane_code, name, rector, address, phone, email, logo_path, department, municipality, school_type, area_type) 
                      VALUES (:pae_id, :dane_code, :name, :rector, :address, :phone, :email, :logo_path, :department, :municipality, :school_type, :area_type)";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":pae_id", $pae_id);
            $stmt->bindParam(":dane_code", $data['dane_code']);
            $stmt->bindParam(":name", $data['name']);
            $stmt->bindParam(":rector", $data['rector']);
            $stmt->bindParam(":address", $data['address']);
            $stmt->bindParam(":phone", $data['phone']);
            $stmt->bindParam(":email", $data['email']);
            $stmt->bindParam(":logo_path", $logo_path);
            $stmt->bindParam(":department", $data['department']);
            $stmt->bindParam(":municipality", $data['municipality']);
            $stmt->bindParam(":school_type", $data['school_type']);
            $stmt->bindParam(":area_type", $data['area_type']);

            if ($stmt->execute()) {
                $school_id = $this->conn->lastInsertId();

                // AUTOMATICALLY CREATE PRINCIPAL BRANCH
                $queryBranch = "INSERT INTO school_branches 
                                (school_id, pae_id, dane_code, name, address, phone, manager_name, area_type) 
                                VALUES (:school_id, :pae_id, :dane_code, 'PRINCIPAL', :address, :phone, :rector, :area_type)";

                $stmtBranch = $this->conn->prepare($queryBranch);
                $stmtBranch->bindParam(":school_id", $school_id);
                $stmtBranch->bindParam(":pae_id", $pae_id);
                $stmtBranch->bindParam(":dane_code", $data['dane_code']);
                $stmtBranch->bindParam(":address", $data['address']);
                $stmtBranch->bindParam(":phone", $data['phone']);
                $stmtBranch->bindParam(":rector", $data['rector']);
                $stmtBranch->bindParam(":area_type", $data['area_type']);
                $stmtBranch->execute();

                $this->conn->commit();
                $this->sendResponse(["message" => "Colegio y sede principal creados exitosamente.", "id" => $school_id], 201);
            } else {
                throw new Exception("Error al insertar colegio.");
            }
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->sendError("Error al crear colegio: " . $e->getMessage(), 500);
        }
    }

    public function update($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        $data = $_POST;
        // Enforce casing
        if (isset($data['name']))
            $data['name'] = mb_strtoupper($data['name'], 'UTF-8');
        if (isset($data['rector']))
            $data['rector'] = mb_strtoupper($data['rector'], 'UTF-8');
        if (isset($data['email']))
            $data['email'] = strtolower($data['email']);

        if (empty($data)) {
            $data = (array) json_decode(file_get_contents("php://input"));
        }

        // Verify ownership
        $check = $this->conn->prepare("SELECT id FROM schools WHERE id = :id AND pae_id = :pae_id");
        $check->execute(['id' => $id, 'pae_id' => $pae_id]);
        if ($check->rowCount() == 0) {
            return $this->sendError("Colegio no encontrado.", 404);
        }

        $query = "UPDATE " . $this->table_name . " 
                  SET dane_code = :dane_code, name = :name, rector = :rector, address = :address, phone = :phone, 
                      email = :email, department = :department, municipality = :municipality, 
                      school_type = :school_type, area_type = :area_type";

        $logo_path = $this->uploadLogo($_FILES['logo'] ?? null);
        if ($logo_path) {
            $query .= ", logo_path = :logo_path";
        }

        $query .= " WHERE id = :id AND pae_id = :pae_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":dane_code", $data['dane_code']);
        $stmt->bindParam(":name", $data['name']);
        $stmt->bindParam(":rector", $data['rector']);
        $stmt->bindParam(":address", $data['address']);
        $stmt->bindParam(":phone", $data['phone']);
        $stmt->bindParam(":email", $data['email']);
        $stmt->bindParam(":department", $data['department']);
        $stmt->bindParam(":municipality", $data['municipality']);
        $stmt->bindParam(":school_type", $data['school_type']);
        $stmt->bindParam(":area_type", $data['area_type']);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":pae_id", $pae_id);

        if ($logo_path) {
            $stmt->bindParam(":logo_path", $logo_path);
        }

        if ($stmt->execute()) {
            $this->sendResponse(["message" => "Colegio actualizado exitosamente."]);
        } else {
            $this->sendError("Error al actualizar colegio.", 500);
        }
    }

    public function delete($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id AND pae_id = :pae_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":pae_id", $pae_id);

        if ($stmt->execute()) {
            $this->sendResponse(["message" => "Colegio eliminado exitosamente."]);
        } else {
            $this->sendError("Error al eliminar colegio.", 500);
        }
    }

    private function uploadLogo($file)
    {
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            return null;
        }

        $uploadDir = Config::getUploadDir();
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'school_' . uniqid() . '.' . $ext;
        $filepath = $uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            return 'assets/img/logos/' . $filename;
        }

        return null;
    }
}

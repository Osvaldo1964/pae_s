<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use PDO;
use Exception;

class BranchController extends BaseController
{
    private $table_name = "school_branches";

    public function index($school_id = null)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        $query = "SELECT b.*, s.name as school_name 
                  FROM " . $this->table_name . " b
                  JOIN schools s ON b.school_id = s.id
                  WHERE b.pae_id = :pae_id";

        if ($school_id) {
            $query .= " AND b.school_id = :school_id";
        }

        $query .= " ORDER BY b.name ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);
        if ($school_id) {
            $stmt->bindParam(":school_id", $school_id);
        }
        $stmt->execute();

        $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->sendResponse($branches);
    }

    public function create()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        $data = json_decode(file_get_contents("php://input"));
        // Enforce casing
        if (isset($data->name))
            $data->name = mb_strtoupper($data->name, 'UTF-8');
        if (isset($data->manager_name))
            $data->manager_name = mb_strtoupper($data->manager_name, 'UTF-8');


        if (empty($data->school_id) || empty($data->name)) {
            return $this->sendError("ID de colegio y nombre de sede son requeridos.", 400);
        }

        // Verify school ownership
        $check = $this->conn->prepare("SELECT id FROM schools WHERE id = :id AND pae_id = :pae_id");
        $check->execute(['id' => $data->school_id, 'pae_id' => $pae_id]);
        if ($check->rowCount() == 0) {
            return $this->sendError("Colegio no encontrado.", 404);
        }

        $query = "INSERT INTO " . $this->table_name . " 
                  (school_id, pae_id, dane_code, name, address, phone, manager_name, area_type, total_beneficiaries) 
                  VALUES (:school_id, :pae_id, :dane_code, :name, :address, :phone, :manager_name, :area_type, :total_beneficiaries)";

        $stmt = $this->conn->prepare($query);
        $params = [
            ":school_id" => $data->school_id,
            ":pae_id" => $pae_id,
            ":dane_code" => $data->dane_code ?? null,
            ":name" => $data->name,
            ":address" => $data->address ?? null,
            ":phone" => $data->phone ?? null,
            ":manager_name" => $data->manager_name ?? null,
            ":area_type" => $data->area_type ?? null,
            ":total_beneficiaries" => $data->total_beneficiaries ?? 0
        ];

        if ($stmt->execute($params)) {
            $this->sendResponse(["message" => "Sede creada exitosamente.", "id" => $this->conn->lastInsertId()], 201);
        } else {
            $this->sendError("Error al crear sede.", 500);
        }
    }

    public function update($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        $data = json_decode(file_get_contents("php://input"));
        // Enforce casing
        if (isset($data->name))
            $data->name = mb_strtoupper($data->name, 'UTF-8');
        if (isset($data->manager_name))
            $data->manager_name = mb_strtoupper($data->manager_name, 'UTF-8');


        // Verify ownership
        $check = $this->conn->prepare("SELECT id FROM school_branches WHERE id = :id AND pae_id = :pae_id");
        $check->execute(['id' => $id, 'pae_id' => $pae_id]);
        if ($check->rowCount() == 0) {
            return $this->sendError("Sede no encontrada.", 404);
        }

        $query = "UPDATE " . $this->table_name . " 
                  SET dane_code = :dane_code, name = :name, address = :address, phone = :phone, 
                      manager_name = :manager_name, area_type = :area_type, total_beneficiaries = :total_beneficiaries
                  WHERE id = :id AND pae_id = :pae_id";

        $stmt = $this->conn->prepare($query);
        $params = [
            ":dane_code" => $data->dane_code ?? null,
            ":name" => $data->name,
            ":address" => $data->address ?? null,
            ":phone" => $data->phone ?? null,
            ":manager_name" => $data->manager_name ?? null,
            ":area_type" => $data->area_type ?? null,
            ":total_beneficiaries" => $data->total_beneficiaries ?? 0,
            ":id" => $id,
            ":pae_id" => $pae_id
        ];

        if ($stmt->execute($params)) {
            $this->sendResponse(["message" => "Sede actualizada exitosamente."]);
        } else {
            $this->sendError("Error al actualizar sede.", 500);
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
            $this->sendResponse(["message" => "Sede eliminada exitosamente."]);
        } else {
            $this->sendError("Error al eliminar sede.", 500);
        }
    }
}

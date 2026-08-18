<?php

namespace Controllers;

use Config\Database;
use Config\Config;
use Utils\JWT;
use PDO;
use Exception;

class BeneficiaryController extends BaseController
{
    private $table_name = "beneficiaries";

    /**
     * List all beneficiaries for the current PAE program
     */
    public function index()
    {
        $pae_id = $this->getPaeIdFromToken();

        if (is_null($pae_id)) {
            $this->sendError("Debe seleccionar un programa PAE");
            return;
        }

        $query = "SELECT b.*, br.name as branch_name, s.name as school_name, br.school_id as school_id, 
                         dt.name as document_type_name, eg.name as ethnic_group_name,
                         rt.name as ration_type_name,
                         pm.name as modality_name,
                         png.name as nutritional_group_name,
                         (SELECT GROUP_CONCAT(prt.name SEPARATOR ', ') 
                          FROM beneficiary_ration_rights brr 
                          JOIN pae_ration_types prt ON brr.ration_type_id = prt.id 
                          WHERE brr.beneficiary_id = b.id) as ration_rights_names,
                         (SELECT GROUP_CONCAT(brr.ration_type_id) 
                          FROM beneficiary_ration_rights brr 
                          WHERE brr.beneficiary_id = b.id) as ration_rights_ids,
                         (SELECT GROUP_CONCAT(bs.service_id) 
                          FROM beneficiary_services bs 
                          WHERE bs.beneficiary_id = b.id) as service_ids
                  FROM " . $this->table_name . " b
                  LEFT JOIN school_branches br ON b.branch_id = br.id
                  LEFT JOIN schools s ON br.school_id = s.id
                  LEFT JOIN document_types dt ON b.document_type_id = dt.id
                  LEFT JOIN ethnic_groups eg ON b.ethnic_group_id = eg.id
                  LEFT JOIN pae_ration_types rt ON b.ration_type_id = rt.id
                  LEFT JOIN pae_modalities pm ON b.modality_id = pm.id
                  LEFT JOIN pae_nutritional_groups png ON b.nutritional_group_id = png.id
                  WHERE b.pae_id = :pae_id 
                  ORDER BY b.last_name1 ASC, b.first_name ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->execute();

        $beneficiaries = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Convert comma separated IDs to array
        foreach ($beneficiaries as &$b) {
            $b['ration_rights_ids'] = $b['ration_rights_ids'] ? array_map('intval', explode(',', $b['ration_rights_ids'])) : [];
            $b['service_ids'] = $b['service_ids'] ? array_map('intval', explode(',', $b['service_ids'])) : [];
        }

        $this->sendResponse($beneficiaries);
    }

    /**
     * Create a new beneficiary
     */
    public function create()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['document_number']) || empty($data['first_name']) || empty($data['last_name1']) || empty($data['branch_id'])) {
            return $this->sendError("Campos obligatorios faltantes (Documento, Nombres, Apellidos, Sede).");
        }

        // Check for duplicates within the same PAE program
        $check_query = "SELECT id FROM " . $this->table_name . " WHERE document_number = :doc AND pae_id = :pae";
        $check_stmt = $this->conn->prepare($check_query);
        $check_stmt->bindParam(":doc", $data['document_number']);
        $check_stmt->bindParam(":pae", $pae_id);
        $check_stmt->execute();
        if ($check_stmt->rowCount() > 0) {
            return $this->sendError("Ya existe un beneficiario registrado con este número de documento en su programa.");
        }

        // Process data (Standard Casing)
        $data['first_name'] = mb_strtoupper($data['first_name'], 'UTF-8');
        $data['second_name'] = mb_strtoupper($data['second_name'] ?? '', 'UTF-8');
        $data['last_name1'] = mb_strtoupper($data['last_name1'], 'UTF-8');
        $data['last_name2'] = mb_strtoupper($data['last_name2'] ?? '', 'UTF-8');
        $data['email'] = strtolower($data['email'] ?? '');
        $data['guardian_name'] = mb_strtoupper($data['guardian_name'] ?? '', 'UTF-8');

        $query = "INSERT INTO " . $this->table_name . " 
                  (pae_id, branch_id, beneficiary_type, population_name, document_type_id, document_number,
                   first_name, second_name, last_name1, last_name2, 
                   birth_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, 
                   address, phone, email, guardian_name, guardian_phone, guardian_relationship, 
                   simat_id, shift, grade, group_name, status, enrollment_date, modality, ration_type, ration_type_id, 
                   medical_restrictions, observations, data_authorization, is_overage,
                   talla_zapato, talla_camisa, talla_pantalon) 
                  VALUES 
                  (:pae_id, :branch_id, :btype, :popname, :document_type_id, :document_number,
                   :first_name, :second_name, :last_name1, :last_name2, 
                   :birth_date, :gender, :ethnic_group_id, :sisben_category, :disability_type, :is_victim, :is_migrant, 
                   :address, :phone, :email, :guardian_name, :guardian_phone, :guardian_relationship, 
                   :simat_id, :shift, :grade, :group_name, :status, :enrollment_date, :modality, :ration_type, :ration_type_id, 
                   :medical_restrictions, :observations, :data_authorization, :is_overage,
                   :talla_zapato, :talla_camisa, :talla_pantalon)";

        $stmt = $this->conn->prepare($query);

        // Bind params
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->bindParam(":branch_id", $data['branch_id']);
        $stmt->bindParam(":btype", $data['beneficiary_type']);
        $stmt->bindParam(":popname", $data['population_name']);
        $stmt->bindParam(":document_type_id", $data['document_type_id']);
        $stmt->bindParam(":document_number", $data['document_number']);
        $stmt->bindParam(":first_name", $data['first_name']);
        $stmt->bindParam(":second_name", $data['second_name']);
        $stmt->bindParam(":last_name1", $data['last_name1']);
        $stmt->bindParam(":last_name2", $data['last_name2']);
        $stmt->bindParam(":birth_date", $data['birth_date']);
        $stmt->bindParam(":gender", $data['gender']);
        $stmt->bindParam(":ethnic_group_id", $data['ethnic_group_id']);
        $stmt->bindParam(":sisben_category", $data['sisben_category']);
        $stmt->bindParam(":disability_type", $data['disability_type']);
        $stmt->bindParam(":is_victim", $data['is_victim'], PDO::PARAM_BOOL);
        $stmt->bindParam(":is_migrant", $data['is_migrant'], PDO::PARAM_BOOL);
        $stmt->bindParam(":address", $data['address']);
        $stmt->bindParam(":phone", $data['phone']);
        $stmt->bindParam(":email", $data['email']);
        $stmt->bindParam(":guardian_name", $data['guardian_name']);
        $stmt->bindParam(":guardian_phone", $data['guardian_phone']);
        $stmt->bindParam(":guardian_relationship", $data['guardian_relationship']);
        $stmt->bindParam(":simat_id", $data['simat_id']);
        $stmt->bindParam(":shift", $data['shift']);
        $stmt->bindParam(":grade", $data['grade']);
        $stmt->bindParam(":group_name", $data['group_name']);
        $stmt->bindParam(":status", $data['status']);
        // Logic to sync main ration_type_id from rights array
        if (isset($data['ration_rights']) && is_array($data['ration_rights']) && count($data['ration_rights']) > 0) {
            $data['ration_type_id'] = $data['ration_rights'][0];
        }

        $stmt->bindParam(":enrollment_date", $data['enrollment_date']);
        $stmt->bindParam(":modality", $data['modality']);
        $stmt->bindParam(":ration_type", $data['ration_type']);
        $stmt->bindParam(":ration_type_id", $data['ration_type_id']);
        $stmt->bindParam(":medical_restrictions", $data['medical_restrictions']);
        $stmt->bindParam(":observations", $data['observations']);
        $stmt->bindParam(":data_authorization", $data['data_authorization'], PDO::PARAM_BOOL);
        $stmt->bindParam(":is_overage", $data['is_overage'], PDO::PARAM_INT);
        $stmt->bindParam(":talla_zapato", $data['talla_zapato']);
        $stmt->bindParam(":talla_camisa", $data['talla_camisa']);
        $stmt->bindParam(":talla_pantalon", $data['talla_pantalon']);

        try {
            $this->conn->beginTransaction();

            if ($stmt->execute()) {
                $beneficiary_id = $this->conn->lastInsertId();

                // Save Ration Rights
                if (isset($data['ration_rights']) && is_array($data['ration_rights'])) {
                    $stmtRights = $this->conn->prepare("INSERT INTO beneficiary_ration_rights (pae_id, beneficiary_id, ration_type_id) VALUES (?, ?, ?)");
                    foreach ($data['ration_rights'] as $rationId) {
                        $stmtRights->execute([$pae_id, $beneficiary_id, $rationId]);
                    }
                }

                // Save Services
                if (isset($data['service_ids']) && is_array($data['service_ids'])) {
                    $stmtServices = $this->conn->prepare("INSERT INTO beneficiary_services (pae_id, beneficiary_id, service_id) VALUES (?, ?, ?)");
                    foreach ($data['service_ids'] as $serviceId) {
                        $stmtServices->execute([$pae_id, $beneficiary_id, $serviceId]);
                    }
                }

                $this->conn->commit();
                $this->sendResponse(["message" => "Beneficiario registrado exitosamente.", "id" => $beneficiary_id]);
            } else {
                $this->conn->rollBack();
                $this->sendError("Error al registrar beneficiario.", 500);
            }
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->sendError("Error del sistema: " . $e->getMessage(), 500);
        }
    }

    /**
     * Update an existing beneficiary
     */
    public function update($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        $data = json_decode(file_get_contents("php://input"), true);

        // Security check: ensure beneficiary belongs to the current PAE program
        $security_query = "SELECT id FROM " . $this->table_name . " WHERE id = :id AND pae_id = :pae_id";
        $security_stmt = $this->conn->prepare($security_query);
        $security_stmt->bindParam(":id", $id);
        $security_stmt->bindParam(":pae_id", $pae_id);
        $security_stmt->execute();
        if ($security_stmt->rowCount() == 0) {
            return $this->sendError("Beneficiario no encontrado o acceso denegado.", 404);
        }

        // Process data
        if (isset($data['first_name']))
            $data['first_name'] = mb_strtoupper($data['first_name'], 'UTF-8');
        if (isset($data['second_name']))
            $data['second_name'] = mb_strtoupper($data['second_name'], 'UTF-8');
        if (isset($data['last_name1']))
            $data['last_name1'] = mb_strtoupper($data['last_name1'], 'UTF-8');
        if (isset($data['last_name2']))
            $data['last_name2'] = mb_strtoupper($data['last_name2'], 'UTF-8');
        if (isset($data['email']))
            $data['email'] = strtolower($data['email']);
        if (isset($data['guardian_name']))
            $data['guardian_name'] = mb_strtoupper($data['guardian_name'], 'UTF-8');

        $query = "UPDATE " . $this->table_name . " SET 
                  branch_id = :branch_id, 
                  beneficiary_type = :btype,
                  population_name = :popname,
                  document_type_id = :document_type_id, 
                  document_number = :document_number, 
                  first_name = :first_name, 
                  second_name = :second_name, 
                  last_name1 = :last_name1, 
                  last_name2 = :last_name2, 
                  birth_date = :birth_date, 
                  gender = :gender, 
                  ethnic_group_id = :ethnic_group_id, 
                  sisben_category = :sisben_category, 
                  disability_type = :disability_type, 
                  is_victim = :is_victim, 
                  is_migrant = :is_migrant, 
                  address = :address, 
                  phone = :phone, 
                  email = :email, 
                  guardian_name = :guardian_name, 
                  guardian_phone = :guardian_phone, 
                  guardian_relationship = :guardian_relationship, 
                  simat_id = :simat_id, 
                  shift = :shift, 
                  grade = :grade, 
                  group_name = :group_name, 
                  status = :status, 
                  enrollment_date = :enrollment_date, 
                  modality = :modality, 
                  ration_type = :ration_type, 
                  ration_type_id = :ration_type_id, 
                  medical_restrictions = :medical_restrictions, 
                  observations = :observations, 
                  data_authorization = :data_authorization,
                  is_overage = :is_overage,
                  talla_zapato = :talla_zapato,
                  talla_camisa = :talla_camisa,
                  talla_pantalon = :talla_pantalon
                  WHERE id = :id AND pae_id = :pae_id";

        $stmt = $this->conn->prepare($query);

        // Bind params...
        $stmt->bindParam(":pae_id", $pae_id);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":branch_id", $data['branch_id']);
        $stmt->bindParam(":btype", $data['beneficiary_type']);
        $stmt->bindParam(":popname", $data['population_name']);
        $stmt->bindParam(":document_type_id", $data['document_type_id']);
        $stmt->bindParam(":document_number", $data['document_number']);
        $stmt->bindParam(":first_name", $data['first_name']);
        $stmt->bindParam(":second_name", $data['second_name']);
        $stmt->bindParam(":last_name1", $data['last_name1']);
        $stmt->bindParam(":last_name2", $data['last_name2']);
        $stmt->bindParam(":birth_date", $data['birth_date']);
        $stmt->bindParam(":gender", $data['gender']);
        $stmt->bindParam(":ethnic_group_id", $data['ethnic_group_id']);
        $stmt->bindParam(":sisben_category", $data['sisben_category']);
        $stmt->bindParam(":disability_type", $data['disability_type']);
        $stmt->bindParam(":is_victim", $data['is_victim'], PDO::PARAM_BOOL);
        $stmt->bindParam(":is_migrant", $data['is_migrant'], PDO::PARAM_BOOL);
        $stmt->bindParam(":address", $data['address']);
        $stmt->bindParam(":phone", $data['phone']);
        $stmt->bindParam(":email", $data['email']);
        $stmt->bindParam(":guardian_name", $data['guardian_name']);
        $stmt->bindParam(":guardian_phone", $data['guardian_phone']);
        $stmt->bindParam(":guardian_relationship", $data['guardian_relationship']);
        $stmt->bindParam(":simat_id", $data['simat_id']);
        $stmt->bindParam(":shift", $data['shift']);
        $stmt->bindParam(":grade", $data['grade']);
        $stmt->bindParam(":group_name", $data['group_name']);
        $stmt->bindParam(":status", $data['status']);
        // Logic to sync main ration_type_id from rights array
        if (isset($data['ration_rights']) && is_array($data['ration_rights']) && count($data['ration_rights']) > 0) {
            $data['ration_type_id'] = $data['ration_rights'][0];
        }

        $ration_type_val = $data['ration_type'] ?? null;
        $stmt->bindParam(":enrollment_date", $data['enrollment_date']);
        $stmt->bindParam(":modality", $data['modality']);
        $stmt->bindParam(":ration_type", $ration_type_val);
        $stmt->bindParam(":ration_type_id", $data['ration_type_id']);
        $stmt->bindParam(":medical_restrictions", $data['medical_restrictions']);
        $stmt->bindParam(":observations", $data['observations']);
        $stmt->bindParam(":data_authorization", $data['data_authorization'], PDO::PARAM_BOOL);
        $stmt->bindParam(":is_overage", $data['is_overage'], PDO::PARAM_INT);
        $stmt->bindParam(":talla_zapato", $data['talla_zapato']);
        $stmt->bindParam(":talla_camisa", $data['talla_camisa']);
        $stmt->bindParam(":talla_pantalon", $data['talla_pantalon']);

        try {
            $this->conn->beginTransaction();

            if ($stmt->execute()) {
                // Sync Ration Rights
                if (isset($data['ration_rights']) && is_array($data['ration_rights'])) {
                    // Delete existing rights
                    $stmtDel = $this->conn->prepare("DELETE FROM beneficiary_ration_rights WHERE beneficiary_id = ?");
                    $stmtDel->execute([$id]);

                    // Insert new rights
                    $stmtRights = $this->conn->prepare("INSERT INTO beneficiary_ration_rights (pae_id, beneficiary_id, ration_type_id) VALUES (?, ?, ?)");
                    foreach ($data['ration_rights'] as $rationId) {
                        $stmtRights->execute([$pae_id, $id, $rationId]);
                    }
                }

                // Sync Services
                if (isset($data['service_ids']) && is_array($data['service_ids'])) {
                    // Delete existing services
                    $stmtDelS = $this->conn->prepare("DELETE FROM beneficiary_services WHERE beneficiary_id = ?");
                    $stmtDelS->execute([$id]);

                    // Insert new services
                    $stmtServices = $this->conn->prepare("INSERT INTO beneficiary_services (pae_id, beneficiary_id, service_id) VALUES (?, ?, ?)");
                    foreach ($data['service_ids'] as $serviceId) {
                        $stmtServices->execute([$pae_id, $id, $serviceId]);
                    }
                }

                $this->conn->commit();
                $this->sendResponse(["message" => "Beneficiario actualizado exitosamente."]);
            } else {
                $this->conn->rollBack();
                $this->sendError("Error al actualizar beneficiario.", 500);
            }
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->sendError("Error del sistema: " . $e->getMessage(), 500);
        }
    }

    /**
     * Delete a beneficiary
     */
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
            $this->sendResponse(["message" => "Beneficiario eliminado exitosamente."]);
        } else {
            $this->sendError("Error al eliminar beneficiario.", 500);
        }
    }

    /**
     * Get document types
     */
    public function getDocumentTypes()
    {
        $query = "SELECT * FROM document_types ORDER BY name ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $this->sendResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Get ethnic groups
     */
    public function getEthnicGroups()
    {
        $query = "SELECT * FROM ethnic_groups ORDER BY code ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $this->sendResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Fetch list for printing (Filtered by Branch/Grade)
     */
    public function printList()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        $branch_id = $_GET['branch_id'] ?? null;
        $grade = $_GET['grade'] ?? null;
        $group_name = $_GET['group_name'] ?? null;

        if (!$branch_id) {
            return $this->sendError("La sede es requerida.", 400);
        }

        $query = "SELECT b.document_number, b.first_name, b.second_name, b.last_name1, b.last_name2, 
                         b.grade, b.group_name
                  FROM " . $this->table_name . " b
                  WHERE b.pae_id = :pae_id AND b.branch_id = :branch_id";

        $params = [
            ":pae_id" => $pae_id,
            ":branch_id" => $branch_id
        ];

        if ($grade) {
            $query .= " AND b.grade = :grade";
            $params[":grade"] = $grade;
        }

        if ($group_name) {
            $query .= " AND b.group_name = :group_name";
            $params[":group_name"] = $group_name;
        }

        $query .= " ORDER BY b.group_name ASC, b.last_name1 ASC, b.first_name ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);

        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch branch info for header
        $stmtBranch = $this->conn->prepare("SELECT b.name as branch_name, s.name as school_name 
                                            FROM school_branches b
                                            JOIN schools s ON b.school_id = s.id 
                                            WHERE b.id = ?");
        $stmtBranch->execute([$branch_id]);
        $branchInfo = $stmtBranch->fetch(PDO::FETCH_ASSOC);

        $this->sendResponse([
            "success" => true,
            "branch" => $branchInfo,
            "data" => $list
        ]);
    }

    /**
     * Upload documents for a beneficiary
     */
    public function uploadDocuments($id)
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        // Security check: ensure beneficiary belongs to the current PAE program
        $security_query = "SELECT id FROM " . $this->table_name . " WHERE id = :id AND pae_id = :pae_id";
        $security_stmt = $this->conn->prepare($security_query);
        $security_stmt->bindParam(":id", $id);
        $security_stmt->bindParam(":pae_id", $pae_id);
        $security_stmt->execute();
        if ($security_stmt->rowCount() == 0) {
            file_put_contents(__DIR__ . '/../../api_debug.log', "Beneficiario {$id} o pae {$pae_id} no encontrado\n", FILE_APPEND);
            return $this->sendError("Beneficiario no encontrado o acceso denegado.", 404);
        }

        $uploadDir = __DIR__ . '/../../uploads/beneficiarios/' . $pae_id . '/' . $id . '/';
        file_put_contents(__DIR__ . '/../../api_debug.log', "Upload Dir: $uploadDir\n", FILE_APPEND);
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
        $maxFileSize = 5 * 1024 * 1024; // 5MB

        $updates = [];
        $params = [':id' => $id];

        $filesToProcess = ['doc_identidad', 'doc_sisben', 'historia_clinica', 'fotografia'];
        $uploadedKeys = [];

        file_put_contents(__DIR__ . '/../../api_debug.log', "Files array: " . json_encode($_FILES) . "\n", FILE_APPEND);

        foreach ($filesToProcess as $fileKey) {
            if (isset($_FILES[$fileKey]) && $_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
                $fileTmpPath = $_FILES[$fileKey]['tmp_name'];
                $fileName = $_FILES[$fileKey]['name'];
                $fileSize = $_FILES[$fileKey]['size'];
                $fileNameCmps = explode(".", $fileName);
                $fileExtension = strtolower(end($fileNameCmps));

                if (!in_array($fileExtension, $allowedExtensions)) {
                    return $this->sendError("Tipo de archivo no permitido para $fileKey. Use PDF, JPG o PNG.", 400);
                }

                if ($fileSize > $maxFileSize) {
                    return $this->sendError("El archivo $fileKey es demasiado grande. Máximo 5MB.", 400);
                }

                // Generate new file name
                $newFileName = $fileKey . '_' . time() . '.' . $fileExtension;
                $destPath = $uploadDir . $newFileName;

                if (move_uploaded_file($fileTmpPath, $destPath)) {
                    $dbPath = 'uploads/beneficiarios/' . $pae_id . '/' . $id . '/' . $newFileName;
                    $updates[] = "{$fileKey}_path = :{$fileKey}";
                    $params[":{$fileKey}"] = $dbPath;
                    $uploadedKeys[] = $fileKey;
                } else {
                    return $this->sendError("Error al guardar el archivo $fileKey.", 500);
                }
            }
        }

        if (count($updates) > 0) {
            $query = "UPDATE " . $this->table_name . " SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $this->conn->prepare($query);

            file_put_contents(__DIR__ . '/../../api_debug.log', "Executing: $query with params: " . json_encode($params) . "\n", FILE_APPEND);

            if ($stmt->execute($params)) {
                $this->sendResponse([
                    "message" => "Documentos subidos exitosamente.",
                    "uploaded" => $uploadedKeys
                ]);
            } else {
                file_put_contents(__DIR__ . '/../../api_debug.log', "Execute failed: " . json_encode($stmt->errorInfo()) . "\n", FILE_APPEND);
                $this->sendError("Error al actualizar la base de datos con los documentos.", 500);
            }
        } else {
            file_put_contents(__DIR__ . '/../../api_debug.log', "No updates to perform\n", FILE_APPEND);
            $this->sendResponse(["message" => "No se recibieron archivos válidos para subir.", "uploaded" => []]);
        }
    }
}

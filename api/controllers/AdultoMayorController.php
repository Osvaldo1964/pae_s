<?php
namespace Controllers;

use Config\Database;
use PDO;

class AdultoMayorController
{
    private $conn;
    private $table_name = "adulto_mayor_registrations";

    public function __construct()
    {
        $database = Database::getInstance();
        $this->conn = $database->getConnection();
    }

    public function register()
    {
        // Allowed origins for public registration (could be more restrictive)
        header("Access-Control-Allow-Origin: *");
        
        try {
            $data = $_POST;

            // Basic validation
            $required_fields = ['document_type', 'document_number', 'first_name', 'last_name', 'birth_date', 'gender', 'ethnicity', 'sisben_group'];
            foreach ($required_fields as $field) {
                if (empty($data[$field])) {
                    return $this->sendError("El campo {$field} es requerido.", 400);
                }
            }

            // Age validation (>= 60 years)
            $birthDate = new \DateTime($data['birth_date']);
            $today = new \DateTime('today');
            $age = $birthDate->diff($today)->y;
            if ($age < 60) {
                return $this->sendError("Debe tener al menos 60 años para inscribirse en este programa.", 400);
            }

            // SISBEN validation
            $valid_sisben = ['A', 'B', 'C'];
            $sisben_letter = substr(strtoupper(trim($data['sisben_group'])), 0, 1);
            if (!in_array($sisben_letter, $valid_sisben)) {
                return $this->sendError("Solo se permite inscripción a personas en los grupos A, B o C del SISBEN IV.", 400);
            }

            // Nationality / Residency validation
            $isResident = isset($data['is_colombian_or_resident']) && $data['is_colombian_or_resident'] == '1' ? 1 : 0;
            if (!$isResident) {
                return $this->sendError("Debe ser ciudadano colombiano o haber residido en el país por lo menos 10 años.", 400);
            }

            // Prepare insertion
            $query = "INSERT INTO " . $this->table_name . " 
                (pae_id, document_type, document_number, external_id, first_name, second_name, last_name, second_last_name, 
                 birth_date, gender, ethnicity, sisben_group, habeas_data, is_colombian_or_resident, school_id, branch_id, 
                 address, phone, email, guardian_name, guardian_phone, guardian_relationship, disability, pathology, observation,
                 talla_zapato, talla_camisa, talla_pantalon) 
                VALUES 
                (:pae_id, :document_type, :document_number, :external_id, :first_name, :second_name, :last_name, :second_last_name, 
                 :birth_date, :gender, :ethnicity, :sisben_group, :habeas_data, :is_colombian_or_resident, :school_id, :branch_id, 
                 :address, :phone, :email, :guardian_name, :guardian_phone, :guardian_relationship, :disability, :pathology, :observation,
                 :talla_zapato, :talla_camisa, :talla_pantalon)";

            $stmt = $this->conn->prepare($query);

            $stmt->bindValue(':pae_id', $data['pae_id'] ?? 1);
            $stmt->bindValue(':document_type', $data['document_type']);
            $stmt->bindValue(':document_number', $data['document_number']);
            $stmt->bindValue(':external_id', $data['external_id'] ?? null);
            $stmt->bindValue(':first_name', $data['first_name']);
            $stmt->bindValue(':second_name', $data['second_name'] ?? null);
            $stmt->bindValue(':last_name', $data['last_name']);
            $stmt->bindValue(':second_last_name', $data['second_last_name'] ?? null);
            $stmt->bindValue(':birth_date', $data['birth_date']);
            $stmt->bindValue(':gender', $data['gender']);
            $stmt->bindValue(':ethnicity', $data['ethnicity']);
            $stmt->bindValue(':sisben_group', $data['sisben_group']);
            $stmt->bindValue(':habeas_data', isset($data['habeas_data']) && $data['habeas_data'] == '1' ? 1 : 0);
            $stmt->bindValue(':is_colombian_or_resident', $isResident);
            
            $stmt->bindValue(':school_id', !empty($data['school_id']) ? $data['school_id'] : null);
            $stmt->bindValue(':branch_id', !empty($data['branch_id']) ? $data['branch_id'] : null);
            
            $stmt->bindValue(':address', $data['address'] ?? null);
            $stmt->bindValue(':phone', $data['phone'] ?? null);
            $stmt->bindValue(':email', $data['email'] ?? null);
            $stmt->bindValue(':guardian_name', $data['guardian_name'] ?? null);
            $stmt->bindValue(':guardian_phone', $data['guardian_phone'] ?? null);
            $stmt->bindValue(':guardian_relationship', $data['guardian_relationship'] ?? null);
            
            $stmt->bindValue(':disability', $data['disability'] ?? null);
            $stmt->bindValue(':pathology', $data['pathology'] ?? null);
            $stmt->bindValue(':observation', $data['observation'] ?? null);
            
            $stmt->bindValue(':talla_zapato', $data['talla_zapato'] ?? null);
            $stmt->bindValue(':talla_camisa', $data['talla_camisa'] ?? null);
            $stmt->bindValue(':talla_pantalon', $data['talla_pantalon'] ?? null);

            if ($stmt->execute()) {
                $registration_id = $this->conn->lastInsertId();
                $pae_id = $data['pae_id'] ?? 1;

                // Handle file uploads
                $uploadDir = __DIR__ . '/../../uploads/adulto_mayor/' . $pae_id . '/' . $registration_id . '/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
                $maxFileSize = 5 * 1024 * 1024; // 5MB
                $filesToProcess = ['doc_identidad', 'doc_sisben', 'historia_clinica', 'fotografia'];
                $updates = [];
                $paramsUpload = [':id' => $registration_id];

                foreach ($filesToProcess as $fileKey) {
                    if (isset($_FILES[$fileKey]) && $_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
                        $fileTmpPath = $_FILES[$fileKey]['tmp_name'];
                        $fileName = $_FILES[$fileKey]['name'];
                        $fileSize = $_FILES[$fileKey]['size'];
                        $fileNameCmps = explode(".", $fileName);
                        $fileExtension = strtolower(end($fileNameCmps));

                        if (in_array($fileExtension, $allowedExtensions) && $fileSize <= $maxFileSize) {
                            $newFileName = $fileKey . '_' . time() . '.' . $fileExtension;
                            $destPath = $uploadDir . $newFileName;

                            if (move_uploaded_file($fileTmpPath, $destPath)) {
                                $dbPath = 'uploads/adulto_mayor/' . $pae_id . '/' . $registration_id . '/' . $newFileName;
                                $updates[] = "{$fileKey}_path = :{$fileKey}";
                                $paramsUpload[":{$fileKey}"] = $dbPath;
                            }
                        }
                    }
                }

                if (count($updates) > 0) {
                    $updateQuery = "UPDATE " . $this->table_name . " SET " . implode(', ', $updates) . " WHERE id = :id";
                    $updateStmt = $this->conn->prepare($updateQuery);
                    $updateStmt->execute($paramsUpload);
                }

                $this->sendResponse([
                    "message" => "Inscripción registrada exitosamente.",
                    "id" => $registration_id
                ]);
            } else {
                $this->sendError("Error al registrar la inscripción.", 500);
            }
        } catch (\PDOException $exception) {
            $this->sendError("Error en base de datos: " . $exception->getMessage(), 500);
        } catch (\Exception $exception) {
            $this->sendError("Error en la solicitud: " . $exception->getMessage(), 500);
        }
    }

    public function getSchools()
    {
        try {
            // Eliminar restricción de pae_id ya que la landing no lo conoce con certeza
            $query = "SELECT id, name FROM schools ORDER BY name ASC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $this->sendResponse(["data" => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\PDOException $e) {
            $this->sendError("Error: " . $e->getMessage(), 500);
        }
    }

    public function getBranches($school_id)
    {
        try {
            if (!$school_id) {
                return $this->sendResponse(["data" => []]);
            }
            $query = "SELECT id, name FROM school_branches WHERE school_id = :school_id ORDER BY name ASC";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            $this->sendResponse(["data" => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\PDOException $e) {
            $this->sendError("Error: " . $e->getMessage(), 500);
        }
    }

    private function sendResponse($data, $statusCode = 200)
    {
        http_response_code($statusCode);
        echo json_encode(array_merge(["success" => true], $data));
        exit;
    }

    private function sendError($message, $statusCode = 400)
    {
        http_response_code($statusCode);
        echo json_encode(["success" => false, "message" => $message]);
        exit;
    }
}

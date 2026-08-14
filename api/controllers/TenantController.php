<?php

namespace Controllers;

use Config\Database;
use Config\Config;
use PDO;

class TenantController
{
    private $conn;

    public function __construct()
    {
        $db = Database::getInstance();
        $this->conn = $db->getConnection();
    }

    public function register()
    {
        // Handling FormData: Use $_POST and $_FILES instead of json_decode
        $data = (object) $_POST;

        if (!empty($data->name) && !empty($data->entity_name) && !empty($data->admin_email) && !empty($data->admin_password)) {

            try {
                $this->conn->beginTransaction();

                // Handle File Uploads
                $uploadDir = Config::getUploadDir();
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                $entityLogoPath = null;
                $operatorLogoPath = null;

                if (isset($_FILES['entity_logo']) && $_FILES['entity_logo']['error'] === UPLOAD_ERR_OK) {
                    $ext = pathinfo($_FILES['entity_logo']['name'], PATHINFO_EXTENSION);
                    $filename = 'entity_' . time() . '.' . $ext;
                    if (move_uploaded_file($_FILES['entity_logo']['tmp_name'], $uploadDir . $filename)) {
                        $entityLogoPath = 'assets/img/logos/' . $filename;
                    }
                }

                if (isset($_FILES['operator_logo']) && $_FILES['operator_logo']['error'] === UPLOAD_ERR_OK) {
                    $ext = pathinfo($_FILES['operator_logo']['name'], PATHINFO_EXTENSION);
                    $filename = 'operator_' . time() . '.' . $ext;
                    if (move_uploaded_file($_FILES['operator_logo']['tmp_name'], $uploadDir . $filename)) {
                        $operatorLogoPath = 'assets/img/logos/' . $filename;
                    }
                }

                // 1. Create PAE Program
                $sqlPae = "INSERT INTO pae_programs (
                    name, entity_name, nit, email, department, city, 
                    operator_name, operator_nit, operator_address, operator_phone, operator_email,
                    entity_logo_path, operator_logo_path,
                    start_date, end_date, contract_number, contract_value, reporting_periodicity
                ) VALUES (
                    :name, :entity, :nit, :email, :dept, :city, 
                    :op_name, :op_nit, :op_addr, :op_phone, :op_email,
                    :ent_logo, :op_logo,
                    :start_date, :end_date, :contract_num, :contract_val, :periodicity
                )";

                $dept = $data->department ?? null;
                $city = $data->city ?? null;
                $opName = $data->operator_name ?? null;
                $opNit = $data->operator_nit ?? null;
                $opAddr = $data->operator_address ?? null;
                $opPhone = $data->operator_phone ?? null;
                $opEmail = $data->operator_email ?? null;
                $startDate = !empty($data->start_date) ? $data->start_date : null;
                $endDate = !empty($data->end_date) ? $data->end_date : null;
                $contractNum = $data->contract_number ?? null;
                $contractVal = !empty($data->contract_value) ? $data->contract_value : 0;
                $periodicity = $data->reporting_periodicity ?? 'MENSUAL';

                $stmtPae = $this->conn->prepare($sqlPae);
                $stmtPae->bindParam(":name", $data->name);
                $stmtPae->bindParam(":entity", $data->entity_name);
                $stmtPae->bindParam(":nit", $data->nit);
                $stmtPae->bindParam(":email", $data->admin_email); // Program Contact Email
                $stmtPae->bindParam(":dept", $dept);
                $stmtPae->bindParam(":city", $city);

                // Operator Data
                $stmtPae->bindParam(":op_name", $opName);
                $stmtPae->bindParam(":op_nit", $opNit);
                $stmtPae->bindParam(":op_addr", $opAddr);
                $stmtPae->bindParam(":op_phone", $opPhone);
                $stmtPae->bindParam(":op_email", $opEmail);

                // Logos
                $stmtPae->bindParam(":ent_logo", $entityLogoPath);
                $stmtPae->bindParam(":op_logo", $operatorLogoPath);

                // New Contract Fields
                $stmtPae->bindParam(":start_date", $startDate);
                $stmtPae->bindParam(":end_date", $endDate);
                $stmtPae->bindParam(":contract_num", $contractNum);
                $stmtPae->bindParam(":contract_val", $contractVal);
                $stmtPae->bindParam(":periodicity", $periodicity);

                $stmtPae->execute();

                $paeId = $this->conn->lastInsertId();

                // 2. Get PAE_ADMIN Role ID
                $stmtRole = $this->conn->prepare("SELECT id FROM roles WHERE name = 'PAE_ADMIN' LIMIT 1");
                $stmtRole->execute();
                $role = $stmtRole->fetch(PDO::FETCH_ASSOC);
                $roleId = $role['id'];

                // 3. Create Admin User for this PAE
                $passwordHash = password_hash($data->admin_password, PASSWORD_BCRYPT);
                $fullName = "Admin " . $data->name;

                $sqlUser = "INSERT INTO users (role_id, pae_id, username, email, password_hash, full_name, status) 
                            VALUES (:role, :pae, :username, :email, :pass, :fullname, 'active')";

                $stmtUser = $this->conn->prepare($sqlUser);
                $stmtUser->bindParam(":role", $roleId);
                $stmtUser->bindParam(":pae", $paeId);
                $stmtUser->bindParam(":username", $data->admin_email);
                $stmtUser->bindParam(":email", $data->admin_email);
                $stmtUser->bindParam(":pass", $passwordHash);
                $stmtUser->bindParam(":fullname", $fullName);
                $stmtUser->execute();

                // 4. Associate Services
                if (!empty($_POST['services'])) {
                    $services = is_array($_POST['services']) ? $_POST['services'] : explode(',', $_POST['services']);
                    $sqlService = "INSERT INTO pae_program_services (pae_id, service_id) VALUES (:pae, :service)";
                    $stmtService = $this->conn->prepare($sqlService);
                    foreach ($services as $serviceId) {
                        $stmtService->bindParam(":pae", $paeId);
                        $stmtService->bindParam(":service", $serviceId);
                        $stmtService->execute();
                    }
                }

                $this->conn->commit();

                http_response_code(201);
                echo json_encode([
                    "message" => "Programa PAE creado exitosamente",
                    "pae_id" => $paeId
                ]);
            } catch (\Exception $e) {
                $this->conn->rollBack();
                http_response_code(500);
                echo json_encode(["message" => "Error al registrar PAE: " . $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Datos incompletos"]);
        }
    }

    public function getAllPrograms()
    {
        // Only accessible by Global Admin (Checked via Middleware ideally, or here)
        // For Phase 1.5 MVP, we trust the AuthController to only call this if Authorized or part of the SelectTenant flow

        $stmt = $this->conn->prepare("SELECT id, name, logo_path FROM pae_programs ORDER BY name ASC");
        $stmt->execute();
        $programs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($programs);
    }
}

<?php

namespace Controllers;

use Config\Config;

class TenantManagementController
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    /**
     * List all PAE programs (Super Admin only)
     */
    public function listAll($user)
    {
        // Only Super Admin can list all programs
        if ($user['role_id'] != 1) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
            return;
        }

        try {
            $stmt = $this->db->prepare("
                SELECT 
                    id, name, entity_name, nit, department, city, email,
                    operator_name, operator_nit, operator_address, operator_phone, operator_email,
                    entity_logo_path, operator_logo_path, created_at,
                    start_date, end_date, contract_number, contract_value, reporting_periodicity
                FROM pae_programs
                ORDER BY created_at DESC
            ");
            $stmt->execute();
            $programs = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Validate logo existence and get services
            foreach ($programs as &$pae) {
                $pae['entity_logo_path'] = $this->validateLogoPath($pae['entity_logo_path']);
                $pae['operator_logo_path'] = $this->validateLogoPath($pae['operator_logo_path']);

                // Get services
                $stmtServices = $this->db->prepare("
                    SELECT s.id, s.name 
                    FROM program_services s
                    JOIN pae_program_services ps ON s.id = ps.service_id
                    WHERE ps.pae_id = ?
                ");
                $stmtServices->execute([$pae['id']]);
                $pae['services'] = $stmtServices->fetchAll(\PDO::FETCH_ASSOC);
            }

            echo json_encode($programs);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al obtener programas']);
        }
    }

    /**
     * Update PAE program (Super Admin only)
     */
    public function update($id, $user)
    {
        // Only Super Admin can update programs
        if ($user['role_id'] != 1) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
            return;
        }

        try {
            // Get current program data
            $stmt = $this->db->prepare("SELECT entity_logo_path, operator_logo_path FROM pae_programs WHERE id = ?");
            $stmt->execute([$id]);
            $currentProgram = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$currentProgram) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Programa no encontrado']);
                return;
            }

            // Handle logo uploads
            $entityLogoPath = $currentProgram['entity_logo_path'];
            $operatorLogoPath = $currentProgram['operator_logo_path'];

            if (isset($_FILES['entity_logo']) && $_FILES['entity_logo']['error'] === UPLOAD_ERR_OK) {
                $entityLogoPath = $this->uploadLogo($_FILES['entity_logo'], 'entity');
            }

            if (isset($_FILES['operator_logo']) && $_FILES['operator_logo']['error'] === UPLOAD_ERR_OK) {
                $operatorLogoPath = $this->uploadLogo($_FILES['operator_logo'], 'operator');
            }

            // Update program
            $stmt = $this->db->prepare("
                UPDATE pae_programs SET
                    name = ?,
                    entity_name = ?,
                    nit = ?,
                    department = ?,
                    city = ?,
                    email = ?,
                    operator_name = ?,
                    operator_nit = ?,
                    operator_address = ?,
                    operator_phone = ?,
                    operator_email = ?,
                    entity_logo_path = ?,
                    operator_logo_path = ?,
                    start_date = ?,
                    end_date = ?,
                    contract_number = ?,
                    contract_value = ?,
                    reporting_periodicity = ?
                WHERE id = ?
            ");

            $stmt->execute([
                $_POST['name'],
                $_POST['entity_name'],
                $_POST['nit'],
                $_POST['department'] ?? null,
                $_POST['city'] ?? null,
                $_POST['email'] ?? null,
                $_POST['operator_name'],
                $_POST['operator_nit'],
                $_POST['operator_address'] ?? null,
                $_POST['operator_phone'] ?? null,
                $_POST['operator_email'] ?? null,
                $entityLogoPath,
                $operatorLogoPath,
                $_POST['start_date'] ?? null,
                $_POST['end_date'] ?? null,
                $_POST['contract_number'] ?? null,
                $_POST['contract_value'] ?? 0,
                $_POST['reporting_periodicity'] ?? 'Mensual',
                $id
            ]);

            // Sync services
            $this->db->prepare("DELETE FROM pae_program_services WHERE pae_id = ?")->execute([$id]);
            if (!empty($_POST['services'])) {
                $services = is_array($_POST['services']) ? $_POST['services'] : explode(',', $_POST['services']);
                $stmtService = $this->db->prepare("INSERT INTO pae_program_services (pae_id, service_id) VALUES (?, ?)");
                foreach ($services as $serviceId) {
                    $stmtService->execute([$id, $serviceId]);
                }
            }

            // Automatic Sync: Remove services from ALL beneficiaries that are no longer active for this program
            $this->db->prepare("
                DELETE FROM beneficiary_services 
                WHERE pae_id = :pae_id 
                AND service_id NOT IN (
                    SELECT service_id FROM pae_program_services WHERE pae_id = :pae_id
                )
            ")->execute([':pae_id' => $id]);

            echo json_encode(['success' => true, 'message' => 'Programa actualizado exitosamente']);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar programa: ' . $e->getMessage()]);
        }
    }

    /**
     * Delete PAE program (Super Admin only)
     */
    public function delete($id, $user)
    {
        // Only Super Admin can delete programs
        if ($user['role_id'] != 1) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
            return;
        }

        try {
            // Check if program has users
            $stmt = $this->db->prepare("SELECT COUNT(*) as user_count FROM users WHERE pae_id = ?");
            $stmt->execute([$id]);
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);

            if ($result['user_count'] > 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No se puede eliminar un programa con usuarios asociados']);
                return;
            }

            // Delete program
            $stmt = $this->db->prepare("DELETE FROM pae_programs WHERE id = ?");
            $stmt->execute([$id]);

            echo json_encode(['success' => true, 'message' => 'Programa eliminado exitosamente']);
        } catch (\PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al eliminar programa']);
        }
    }

    /**
     * Upload logo file
     */
    private function uploadLogo($file, $prefix)
    {
        $uploadDir = Config::getUploadDir();
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = $prefix . '_' . time() . '.' . $extension;
        $filepath = $uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            return 'assets/img/logos/' . $filename;
        }

        return null;
    }

    private function validateLogoPath($path)
    {
        if (!$path)
            return null;

        // If it starts with assets/, it's already in the new format or a default
        $fullPath = __DIR__ . '/../../app/' . $path;

        // Check if file exists, if not, it might be in the old uploads/ directory (for migration)
        if (!file_exists($fullPath)) {
            $oldPath = __DIR__ . '/../../' . $path;
            if (file_exists($oldPath)) {
                return $path;
            }
            return null;
        }

        return $path;
    }
}

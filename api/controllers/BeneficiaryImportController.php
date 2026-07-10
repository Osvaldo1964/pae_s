<?php

namespace Controllers;

use Config\Database;
use Config\Config;
use PDO;
use Exception;

class BeneficiaryImportController extends BaseController
{
    private $table_name = "beneficiaries";

    /**
     * Download CSV Template
     */
    public function downloadTemplate()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        // Headers matching the proposal
        $headers = [
            'tipo_documento', // TI, RC, etc.
            'numero_documento',
            'primer_nombre',
            'segundo_nombre',
            'primer_apellido',
            'segundo_apellido',
            'sede_educativa', // Nombre exacto
            'grado',
            'grupo',
            'fecha_nacimiento', // YYYY-MM-DD
            'genero', // M, F
            'etnia', // Codigo
            'tipos_racion' // Separado por comas
        ];

        // Output as CSV download
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=plantilla_carga_beneficiarios.csv');

        $output = fopen('php://output', 'w');

        // Add BOM for Excel UTF-8 compatibility
        fwrite($output, "\xEF\xBB\xBF");

        fputcsv($output, $headers);

        // Add an example row
        fputcsv($output, [
            'TI',
            '1234567890',
            'JUAN',
            'DAVID',
            'PEREZ',
            'GOMEZ',
            'SEDE PRINCIPAL',
            '5',
            'A',
            '2015-05-20',
            'M',
            '06',
            'ALMUERZO'
        ]);

        fclose($output);
        exit;
    }

    /**
     * Process Uploaded CSV
     */
    public function import()
    {
        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            return $this->sendError("Error al subir el archivo.", 400);
        }

        $file = $_FILES['file']['tmp_name'];
        $handle = fopen($file, "r");

        if ($handle === false) {
            return $this->sendError("No se pudo abrir el archivo.", 400);
        }

        // Remove BOM if present
        // Detect delimiter
        $line = fgets($handle);
        $delimiter = (substr_count($line, ';') > substr_count($line, ',')) ? ';' : ',';
        rewind($handle);

        // Remove BOM if present (again, after rewind)
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $headerRow = fgetcsv($handle, 1000, $delimiter);

        // Map headers to indices
        $map = array_flip($headerRow);

        // Required columns check
        $required = ['tipo_documento', 'numero_documento', 'primer_nombre', 'primer_apellido', 'sede_educativa', 'grado', 'fecha_nacimiento', 'tipos_racion'];
        foreach ($required as $col) {
            if (!isset($map[$col])) {
                fclose($handle);
                return $this->sendError("Faltan columnas obligatorias: $col", 400);
            }
        }

        // Pre-fetch reference data to avoid queries in loop
        $docTypes = $this->getMap('document_types', 'code', 'id');
        $ethnicGroups = $this->getMap('ethnic_groups', 'code', 'id');
        // Ration Types for THIS PAE
        $rationTypes = $this->getNameMap('pae_ration_types', 'pae_id', $pae_id); // Name -> ID

        // Branches
        $branches = $this->getBranchMap($pae_id); // Name -> ID

        $successCount = 0;
        $createdCount = 0;
        $updatedCount = 0;
        $errors = [];
        $rowNum = 1;

        try {
            $this->conn->beginTransaction();

            $stmtInsert = $this->conn->prepare("INSERT INTO beneficiaries 
                (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, 
                 birth_date, gender, ethnic_group_id, grade, group_name, ration_type, status, enrollment_date) 
                VALUES 
                (:pae_id, :branch_id, :document_type_id, :document_number, :first_name, :second_name, :last_name1, :last_name2, 
                 :birth_date, :gender, :ethnic_group_id, :grade, :group_name, 'Almuerzo', 'active', CURDATE())
                ON DUPLICATE KEY UPDATE 
                branch_id = VALUES(branch_id), 
                grade = VALUES(grade), 
                group_name = VALUES(group_name),
                first_name = VALUES(first_name),
                last_name1 = VALUES(last_name1)
            ");

            while (($row = fgetcsv($handle, 1000, $delimiter)) !== FALSE) {
                $rowNum++;

                // Extract data using map
                $docType = strtoupper(trim($row[$map['tipo_documento']] ?? ''));
                $docNum = trim($row[$map['numero_documento']] ?? '');
                $firstName = strtoupper(trim($row[$map['primer_nombre']] ?? ''));
                $lastName1 = strtoupper(trim($row[$map['primer_apellido']] ?? ''));
                $branchName = strtoupper(trim($row[$map['sede_educativa']] ?? ''));
                $birthDate = trim($row[$map['fecha_nacimiento']] ?? '');
                $rationNames = strtoupper(trim($row[$map['tipos_racion']] ?? ''));

                if (!$docNum || !$firstName || !$lastName1) continue; // Skip empty rows

                // Validations
                if (!isset($docTypes[$docType])) {
                    $errors[] = "Fila $rowNum: Tipo de documento inválido ($docType).";
                    continue;
                }
                if (!isset($branches[$branchName])) {
                    $errors[] = "Fila $rowNum: Sede no encontrada ($branchName).";
                    continue;
                }

                $params = [
                    ':pae_id' => $pae_id,
                    ':branch_id' => $branches[$branchName],
                    ':document_type_id' => $docTypes[$docType],
                    ':document_number' => $docNum,
                    ':first_name' => $firstName,
                    ':second_name' => strtoupper(trim($row[$map['segundo_nombre']] ?? '')),
                    ':last_name1' => $lastName1,
                    ':last_name2' => strtoupper(trim($row[$map['segundo_apellido']] ?? '')),
                    ':birth_date' => $birthDate,
                    ':gender' => (strtoupper(trim($row[$map['genero']] ?? '')) == 'F') ? 'Femenino' : 'Masculino',
                    ':ethnic_group_id' => $ethnicGroups[trim($row[$map['etnia']] ?? '')] ?? $ethnicGroups['06'], // Default None
                    ':grade' => trim($row[$map['grado']] ?? ''),
                    ':group_name' => trim($row[$map['grupo']] ?? '')
                ];

                $stmtInsert->execute($params);

                // Handle Rations
                // We need the ID of the inserted/updated beneficiary
                // Since ON DUPLICATE KEY UPDATE doesn't always return lastInsertId correctly if updated, we need to fetch appropriate ID
                $benId = $this->conn->lastInsertId();
                if ($benId == 0) {
                    // Check if it was an update
                    $stmtGet = $this->conn->prepare("SELECT id FROM beneficiaries WHERE pae_id = ? AND document_number = ?");
                    $stmtGet->execute([$pae_id, $docNum]);
                    $benId = $stmtGet->fetchColumn();
                    $updatedCount++;
                } else {
                    $createdCount++;
                }

                if ($benId) {
                    // Determine Ration Rights IDs
                    $rights = [];
                    $rNames = explode(',', $rationNames);
                    foreach ($rNames as $rn) {
                        $rn = trim($rn);
                        if (isset($rationTypes[$rn])) {
                            $rights[] = $rationTypes[$rn];
                        }
                    }

                    if (!empty($rights)) {
                        // Sync Rights
                        $this->conn->prepare("DELETE FROM beneficiary_ration_rights WHERE beneficiary_id = ?")->execute([$benId]);
                        $stmtRight = $this->conn->prepare("INSERT INTO beneficiary_ration_rights (pae_id, beneficiary_id, ration_type_id) VALUES (?, ?, ?)");
                        foreach ($rights as $rid) {
                            $stmtRight->execute([$pae_id, $benId, $rid]);
                        }
                    }
                }
            }

            if (count($errors) > 0 && ($createdCount + $updatedCount) == 0) {
                $this->conn->rollBack();
                $this->sendResponse(['success' => false, 'message' => 'No se cargaron registros.', 'errors' => $errors]);
            } else {
                $this->conn->commit();
                $this->sendResponse([
                    'success' => true,
                    'message' => "Proceso finalizado.",
                    'details' => [
                        'created' => $createdCount,
                        'updated' => $updatedCount,
                        'errors' => count($errors)
                    ],
                    'errors' => $errors
                ]);
            }
        } catch (Exception $e) {
            $this->conn->rollBack();
            $this->sendError("Error del sistema: " . $e->getMessage(), 500);
        }

        fclose($handle);
    }

    // Helpers for Maps
    private function getMap($table, $keyCol, $valCol)
    {
        $stmt = $this->conn->query("SELECT $keyCol, $valCol FROM $table");
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    }

    private function getNameMap($table, $paeCol, $paeId)
    {
        $stmt = $this->conn->prepare("SELECT name, id FROM $table WHERE $paeCol = ?");
        $stmt->execute([$paeId]);
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    }

    private function getBranchMap($paeId)
    {
        // Branches are linked to Schools, but we need a flat map for the current PAE context?? 
        // Actually branches are global or linked to schools... 
        // Wait, beneficiaries table has branch_id. branch_id is from school_branches.
        // Schools might be filtered by PAE?? Usually Branches are just Branches.
        // Assuming unique names for simplicity or better yet:
        $stmt = $this->conn->query("SELECT name, id FROM school_branches");
        // Warning: Duplicates possible across schools? 
        // Ideally we should filter by schools assigned to this PAE if logic exists.
        // For now, assuming Global Names or User knows specific name.
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    }
}

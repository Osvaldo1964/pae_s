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
            'fecha_nacimiento (DD/MM/YYYY)', // YYYY-MM-DD
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
        // Increase limits for large file processing
        set_time_limit(300);
        ini_set('memory_limit', '256M');
        @ini_set('auto_detect_line_endings', true); // Supress PHP 8.1+ deprecation warning

        $pae_id = $this->getPaeIdFromToken();
        if (!$pae_id) {
            return $this->sendError("Acceso denegado.", 403);
        }

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            $uploadErr = $_FILES['file']['error'] ?? 'sin archivo';
            return $this->sendError("Error al subir el archivo. Código: $uploadErr", 400);
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

        $headerRow = fgetcsv($handle, 0, $delimiter);

        // Normalize headers to ignore parenthesized instructions
        $headerRow = array_map(function($h) {
            $h = preg_replace('/\s*\(.*?\)\s*/', '', $h);
            return trim(strtolower($h));
        }, $headerRow);

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

        $createdCount = 0;
        $updatedCount = 0;
        $errors = [];
        $rowNum = 1;
        $batchSize = 100; // Commit every 100 rows to avoid long locks
        $batchCount = 0;

        try {
            $this->conn->beginTransaction();

            $stmtInsert = $this->conn->prepare("INSERT INTO beneficiaries 
                (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, 
                 birth_date, gender, ethnic_group_id, grade, group_name, ration_type, status, enrollment_date, data_authorization) 
                VALUES 
                (:pae_id, :branch_id, :document_type_id, :document_number, :first_name, :second_name, :last_name1, :last_name2, 
                 :birth_date, :gender, :ethnic_group_id, :grade, :group_name, 'Almuerzo', 'ACTIVO', CURDATE(), 1)
                ON DUPLICATE KEY UPDATE 
                branch_id = VALUES(branch_id), 
                grade = VALUES(grade), 
                group_name = VALUES(group_name),
                first_name = VALUES(first_name),
                last_name1 = VALUES(last_name1),
                data_authorization = 1,
                status = 'ACTIVO'
            ");

            // Prepare statements outside the loop
            $stmtGet = $this->conn->prepare("SELECT id FROM beneficiaries WHERE pae_id = ? AND document_number = ?");
            $stmtDelRights = $this->conn->prepare("DELETE FROM beneficiary_ration_rights WHERE beneficiary_id = ?");
            $stmtInsertRight = $this->conn->prepare("INSERT INTO beneficiary_ration_rights (pae_id, beneficiary_id, ration_type_id) VALUES (?, ?, ?)");
            $stmtCheckService = $this->conn->prepare("SELECT 1 FROM beneficiary_services WHERE pae_id = ? AND beneficiary_id = ? AND service_id = 1");
            $stmtInsertService = $this->conn->prepare("INSERT INTO beneficiary_services (pae_id, beneficiary_id, service_id) VALUES (?, ?, 1)");


            while (($row = fgetcsv($handle, 0, $delimiter)) !== FALSE) {
                $rowNum++;

                // Ensure UTF-8 encoding for all elements in the row
                $row = array_map(function($val) {
                    // Convert from ISO-8859-1/Windows-1252 to UTF-8 if it's not already valid UTF-8
                    return mb_check_encoding($val, 'UTF-8') ? $val : mb_convert_encoding($val, 'UTF-8', 'ISO-8859-1');
                }, $row);

                // Extract data using map
                $docType = strtoupper(trim($row[$map['tipo_documento']] ?? ''));
                $docNum = trim($row[$map['numero_documento']] ?? '');
                $firstName = strtoupper(trim($row[$map['primer_nombre']] ?? ''));
                $lastName1 = strtoupper(trim($row[$map['primer_apellido']] ?? ''));
                $branchName = $this->normalizeString($row[$map['sede_educativa']] ?? '');
                $birthDate = trim($row[$map['fecha_nacimiento']] ?? '');
                $rationNames = $this->normalizeString($row[$map['tipos_racion']] ?? '');

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
                    ':birth_date' => $this->parseDate($birthDate),
                    ':gender' => $this->parseGender($row[$map['genero']] ?? ''),
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
                    $stmtGet->execute([$pae_id, $docNum]);
                    $benId = $stmtGet->fetchColumn();
                    $stmtGet->closeCursor(); // Close cursor to free connection
                    $updatedCount++;
                } else {
                    $createdCount++;
                }

                if ($benId) {
                    // Determine Ration Rights IDs
                    $rights = [];
                    $rNames = explode(',', $rationNames);
                    foreach ($rNames as $rn) {
                        $rn = $this->normalizeString($rn);
                        if (isset($rationTypes[$rn])) {
                            $rights[] = $rationTypes[$rn];
                        }
                    }

                    if (!empty($rights)) {
                        // Sync Rights
                        $stmtDelRights->execute([$benId]);
                        foreach ($rights as $rid) {
                            $stmtInsertRight->execute([$pae_id, $benId, $rid]);
                        }
                        
                        // Force Assign ALIMENTACIÓN service (ID 1) if not exists
                        $stmtCheckService->execute([$pae_id, $benId]);
                        if ($stmtCheckService->rowCount() == 0) {
                            $stmtInsertService->execute([$pae_id, $benId]);
                        }
                    }
                }

                // Batch commit to avoid long-running transactions and memory issues
                $batchCount++;
                if ($batchCount >= $batchSize) {
                    $this->conn->commit();
                    $this->conn->beginTransaction();
                    $batchCount = 0;
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
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            fclose($handle);
            $this->sendError("Error del sistema: " . $e->getMessage(), 500);
            return;
        }

        fclose($handle);
    }

    // Helpers for Maps
    private function normalizeString($string)
    {
        $string = trim($string);
        $unwanted = [
            'Á'=>'A', 'É'=>'E', 'Í'=>'I', 'Ó'=>'O', 'Ú'=>'U', 'Ñ'=>'N',
            'á'=>'A', 'é'=>'E', 'í'=>'I', 'ó'=>'O', 'ú'=>'U', 'ñ'=>'N'
        ];
        $string = strtr($string, $unwanted);
        $string = preg_replace('/\s+/', ' ', $string);
        return strtoupper($string);
    }

    private function getMap($table, $keyCol, $valCol)
    {
        $stmt = $this->conn->query("SELECT $keyCol, $valCol FROM $table");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $map = [];
        foreach($rows as $r) {
            $map[$this->normalizeString($r[$keyCol])] = $r[$valCol];
        }
        return $map;
    }

    private function getNameMap($table, $paeCol, $paeId)
    {
        $stmt = $this->conn->prepare("SELECT name, id FROM $table WHERE $paeCol = ?");
        $stmt->execute([$paeId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $map = [];
        foreach($rows as $r) {
            $map[$this->normalizeString($r['name'])] = $r['id'];
        }
        return $map;
    }

    private function getBranchMap($paeId)
    {
        $stmt = $this->conn->prepare("SELECT b.name, b.id 
                                       FROM school_branches b
                                       JOIN schools s ON b.school_id = s.id 
                                       WHERE (b.pae_id = :pae_id OR s.pae_id = :pae_id)");
        $stmt->execute([':pae_id' => $paeId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $map = [];
        foreach($rows as $r) {
            $map[$this->normalizeString($r['name'])] = $r['id'];
        }
        return $map;
    }

    private function parseGender($rawGender)
    {
        $g = strtoupper(trim($rawGender));
        if (strpos($g, 'F') === 0) return 'FEMENINO';
        if (strpos($g, 'O') === 0) return 'OTRO';
        return 'MASCULINO';
    }

    private function parseDate($rawDate)
    {
        $d = trim($rawDate);
        if (empty($d)) return '1970-01-01';

        // Check if it's already YYYY-MM-DD
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
            return $d;
        }

        // Check if it's DD/MM/YYYY or DD-MM-YYYY
        if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/', $d, $matches)) {
            // matches: 1=DD, 2=MM, 3=YYYY
            $day = str_pad($matches[1], 2, '0', STR_PAD_LEFT);
            $month = str_pad($matches[2], 2, '0', STR_PAD_LEFT);
            $year = $matches[3];
            return "$year-$month-$day";
        }

        // Check if it's an Excel serial date (e.g. 45000)
        if (is_numeric($d)) {
            // Excel dates start at 1900-01-01 (or 1899-12-30 due to 1900 leap year bug)
            $unixDate = ($d - 25569) * 86400;
            return gmdate("Y-m-d", $unixDate);
        }

        // Fallback
        return '1970-01-01';
    }
}

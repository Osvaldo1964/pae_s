<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class NeedsReportController
{
    private $conn;

    public function __construct()
    {
        $this->conn = Database::getInstance()->getConnection();
    }

    public function generate($cycleId)
    {
        try {
            $pae_id = $this->getPaeIdFromToken(); // Obtener del token por seguridad

            // 1. Get Cycle Details
            $stmt = $this->conn->prepare("SELECT * FROM menu_cycles WHERE id = ? AND pae_id = ?");
            $stmt->execute([$cycleId, $pae_id]);
            $cycle = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$cycle)
                throw new Exception("Ciclo no encontrado o no autorizado");

            // 2. Get Active Beneficiaries and Classify them by Branch, Ration Type and AGE GROUP (by GRADE)
            // Obtener sedes específicas del ciclo para filtrar
            $checkBranches = $this->conn->prepare("SELECT branch_id FROM menu_cycle_branches WHERE cycle_id = ?");
            $checkBranches->execute([$cycleId]);
            $cycleBranches = $checkBranches->fetchAll(PDO::FETCH_COLUMN);

            $branchFilter = "";
            if (!empty($cycleBranches)) {
                $branchList = implode(",", array_map('intval', $cycleBranches));
                $branchFilter = " AND b.branch_id IN ($branchList) ";
            }

            // SINCRONIZADO: Se usa el Grado escolar igual que en el calculador central
            // MODIFICAMOS para usar beneficiary_ration_rights
            $sqlBen = "SELECT b.id, b.branch_id, brr.ration_type_id, b.grade, b.birth_date, b.beneficiary_type 
                       FROM beneficiaries b
                       JOIN beneficiary_ration_rights brr ON b.id = brr.beneficiary_id
                       WHERE b.status = 'ACTIVO' AND b.pae_id = :pae_id AND brr.pae_id = :pae_id_rights {$branchFilter}";

            $stmtBen = $this->conn->prepare($sqlBen);
            $stmtBen->execute([':pae_id' => $pae_id, ':pae_id_rights' => $pae_id]);
            $beneficiaries = $stmtBen->fetchAll(PDO::FETCH_ASSOC);

            // Structure: $census[branch_id][ration_type_id][age_group] = count
            $census = [];

            foreach ($beneficiaries as $b) {
                // CLASIFICACIÓN POLIMÓRFICA (Misma lógica que MenuCycleController)
                $b['beneficiary_type'] = $b['beneficiary_type'] ?? 'student';
                $group = $this->getAgeGroupForGrade($b['grade'], $b['birth_date'], $b['beneficiary_type']);

                if ($group) {
                    $branchId = $b['branch_id'];
                    $rtid = $b['ration_type_id'];

                    if (!isset($census[$branchId]))
                        $census[$branchId] = [];
                    if (!isset($census[$branchId][$rtid])) {
                        $census[$branchId][$rtid] = [
                            'PREESCOLAR' => 0,
                            'PRIMARIA_A' => 0,
                            'PRIMARIA_B' => 0,
                            'SECUNDARIA' => 0,
                            'GENERAL' => 0
                        ];
                    }
                    $census[$branchId][$rtid][$group]++;
                }
            }

            // 3. Get Menus and Recipes with Quantities per Age Group
            $sqlMenus = "SELECT 
                            m.day_number,
                            mr.recipe_id,
                            mr.ration_type_id,
                            ri.item_id,
                            i.name as item_name,
                            mu.name as unit,
                            ri.age_group,
                            ri.quantity,
                            mu.conversion_factor,
                            mu.abbreviation as unit_abbr,
                            i.unit_cost
                         FROM menus m
                         JOIN menu_recipes mr ON m.id = mr.menu_id
                         JOIN recipe_items ri ON mr.recipe_id = ri.recipe_id
                         JOIN items i ON ri.item_id = i.id
                         JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                         WHERE m.cycle_id = ? AND m.pae_id = ?";

            $stmt = $this->conn->prepare($sqlMenus);
            $stmt->execute([$cycleId, $pae_id]);
            $recipeDetails = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 4. Calculate Demand
            $demand = [];
            $branches = $this->getBranches($pae_id, $cycleBranches); // PASAR pae_id y cycleBranches para filtrar sedes

            foreach ($recipeDetails as $row) {
                $itemId = $row['item_id'];
                $ageGroup = $this->normalizeAgeGroup($row['age_group']);
                $qtyPerPerson = floatval($row['quantity']);

                if (!isset($demand[$itemId])) {
                    $demand[$itemId] = [
                        'name' => $row['item_name'],
                        'unit' => $row['unit_abbr'],
                        'unit_cost' => $row['unit_cost'] ?? 0,
                        'branches' => [],
                        'grand_total' => 0
                    ];
                    // Initialize ONLY branches of CURRENT PAE
                    foreach ($branches as $bid => $bname) {
                        $demand[$itemId]['branches'][$bid] = 0;
                    }
                }

                $factor = (isset($row['conversion_factor']) && $row['conversion_factor'] > 0) ? floatval($row['conversion_factor']) : 1;

                foreach ($census as $branchId => $rations) {
                    $targetRtId = $row['ration_type_id'];
                    if (isset($rations[$targetRtId])) {
                        $groups = $rations[$targetRtId];
                        if (isset($groups[$ageGroup]) && $groups[$ageGroup] > 0) {
                            $totalForBranch = ($groups[$ageGroup] * $qtyPerPerson) / $factor;
                            $demand[$itemId]['branches'][$branchId] += $totalForBranch;
                            $demand[$itemId]['grand_total'] += $totalForBranch;
                        }
                    }
                }
            }

            // 5. Format for Response
            $finalReport = array_values($demand);
            usort($finalReport, function ($a, $b) {
                return strcmp($a['name'], $b['name']);
            });

            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'cycle' => $cycle,
                'branches' => $branches,
                'data' => $finalReport
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function getPaeIdFromToken()
    {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
            try {
                $decoded = \Utils\JWT::decode($matches[1]);
                if (is_object($decoded))
                    return $decoded->data->pae_id ?? null;
                if (is_array($decoded))
                    return $decoded['data']['pae_id'] ?? null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    private function getAgeGroupForGrade($grade, $birth_date = null, $beneficiary_type = 'student')
    {
        // 0. Clasificación Explícita (Prioridad Absoluta)
        if ($beneficiary_type === 'other') {
            return 'GENERAL';
        }

        $grade = trim(strtoupper($grade ?? ''));

        // 1. Clasificación por Grado (Prioridad PAE)
        if (in_array($grade, ['TRANSICIÓN', 'TRANSICION', 'JARDIN', 'JARDÍN', 'PRE-JARDIN', '0', '0°']))
            return 'PREESCOLAR';
        if (in_array($grade, ['1', '1°', '2', '2°', '3', '3°']))
            return 'PRIMARIA_A';
        if (in_array($grade, ['4', '4°', '5', '5°']))
            return 'PRIMARIA_B';
        if (in_array($grade, ['6', '6°', '7', '7°', '8', '8°', '9', '9°', '10', '10°', '11', '11°']))
            return 'SECUNDARIA';

        // 2. Clasificación por Edad (Fallback para programas no escolares como Adulto Mayor)
        if ($birth_date) {
            $birth = new \DateTime($birth_date);
            $now = new \DateTime();
            $age = $now->diff($birth)->y;

            if ($age <= 5)
                return 'PREESCOLAR';
            if ($age >= 6 && $age <= 8)
                return 'PRIMARIA_A';
            if ($age >= 9 && $age <= 11)
                return 'PRIMARIA_B';
            if ($age >= 12 && $age <= 17)
                return 'SECUNDARIA';

            // Si es mayor de edad o no encaja en PAE -> GENERAL
            return 'GENERAL';
        }

        // 3. Fallback final
        if (strpos($grade, 'ADULTO') !== false || strpos($grade, 'GENERAL') !== false) {
            return 'GENERAL';
        }

        return ($grade) ? 'SECUNDARIA' : 'GENERAL';
    }

    private function normalizeAgeGroup($dbString)
    {
        $clean = preg_replace('/[^a-zA-Z0-9_]/', '', $dbString);
        return strtoupper(trim($clean));
    }

    private function getBranches($pae_id, $cycleBranches = [])
    {
        $sql = "SELECT sb.id, CONCAT(s.name, ' - ', sb.name) as full_name 
                FROM school_branches sb
                JOIN schools s ON sb.school_id = s.id
                WHERE sb.pae_id = ? AND sb.status IN ('ACTIVO', 'active')";
        
        if (!empty($cycleBranches)) {
            $branchList = implode(",", array_map('intval', $cycleBranches));
            $sql .= " AND sb.id IN ($branchList)";
        }
        
        $sql .= " ORDER BY s.name, sb.name";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$pae_id]);
        return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    }
}

<?php

namespace Controllers;

use PDO;
use Exception;

class KardexReportController extends BaseController
{

    /**
     * GET /api/reports/kardex-productos
     * Parámetros GET: cycle_id (requerido), school_id (opcional), branch_id (opcional o 'all')
     */
    public function generate()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) {
                // Fallback a query param si se pasa explícitamente
                $pae_id = $_GET['pae_id'] ?? null;
            }

            if (!$pae_id) {
                throw new Exception("Programa PAE no autorizado o no identificado en la sesión.");
            }

            $cycleId = isset($_GET['cycle_id']) ? intval($_GET['cycle_id']) : 0;
            if ($cycleId <= 0) {
                throw new Exception("Debe especificar un ciclo de menú válido (cycle_id).");
            }

            $schoolId = isset($_GET['school_id']) && $_GET['school_id'] !== '' && $_GET['school_id'] !== 'all' ? intval($_GET['school_id']) : null;
            $branchId = isset($_GET['branch_id']) && $_GET['branch_id'] !== '' && $_GET['branch_id'] !== 'all' ? intval($_GET['branch_id']) : null;

            // 1. Obtener detalles del Programa PAE
            $stmtProg = $this->conn->prepare("SELECT * FROM pae_programs WHERE id = ?");
            $stmtProg->execute([$pae_id]);
            $program = $stmtProg->fetch(PDO::FETCH_ASSOC);

            // 2. Obtener detalles del Ciclo
            $stmtCycle = $this->conn->prepare("SELECT c.*, t.name as template_name 
                                               FROM menu_cycles c 
                                               LEFT JOIN cycle_templates t ON c.template_id = t.id 
                                               WHERE c.id = ? AND c.pae_id = ?");
            $stmtCycle->execute([$cycleId, $pae_id]);
            $cycle = $stmtCycle->fetch(PDO::FETCH_ASSOC);

            if (!$cycle) {
                throw new Exception("Ciclo de menú no encontrado.");
            }

            // 3. Obtener los menús diarios del ciclo
            $stmtMenus = $this->conn->prepare("SELECT id, day_number, name 
                                               FROM menus 
                                               WHERE cycle_id = ? AND pae_id = ? 
                                               ORDER BY day_number ASC");
            $stmtMenus->execute([$cycleId, $pae_id]);
            $cycleMenus = $stmtMenus->fetchAll(PDO::FETCH_ASSOC);

            if (empty($cycleMenus)) {
                throw new Exception("El ciclo seleccionado no tiene menús diarios configurados.");
            }

            // Organizar días del ciclo
            $daysMap = [];
            foreach ($cycleMenus as $cm) {
                $dayNum = intval($cm['day_number']);
                $daysMap[$dayNum] = [
                    'day_number' => $dayNum,
                    'menu_id' => intval($cm['id']),
                    'name' => $cm['name']
                ];
            }

            // 4. Determinar las Sedes a procesar
            // Sedes configuradas explícitamente en el ciclo
            $stmtCycleBranches = $this->conn->prepare("SELECT branch_id FROM menu_cycle_branches WHERE cycle_id = ?");
            $stmtCycleBranches->execute([$cycleId]);
            $cycleBranchIds = $stmtCycleBranches->fetchAll(PDO::FETCH_COLUMN);

            $sqlBranches = "SELECT sb.id as branch_id, sb.name as branch_name, 
                                   s.id as school_id, s.name as school_name, 
                                   s.department, s.municipality as city
                            FROM school_branches sb
                            JOIN schools s ON sb.school_id = s.id
                            WHERE sb.pae_id = :pae_id AND sb.status IN ('ACTIVO', 'active')";

            $branchParams = [':pae_id' => $pae_id];

            if (!empty($cycleBranchIds)) {
                $idPlaceholders = implode(',', array_map('intval', $cycleBranchIds));
                $sqlBranches .= " AND sb.id IN ($idPlaceholders)";
            }

            if ($schoolId) {
                $sqlBranches .= " AND s.id = :school_id";
                $branchParams[':school_id'] = $schoolId;
            }

            if ($branchId) {
                $sqlBranches .= " AND sb.id = :branch_id";
                $branchParams[':branch_id'] = $branchId;
            }

            $sqlBranches .= " ORDER BY s.name ASC, sb.name ASC";
            $stmtBr = $this->conn->prepare($sqlBranches);
            $stmtBr->execute($branchParams);
            $branches = $stmtBr->fetchAll(PDO::FETCH_ASSOC);

            if (empty($branches)) {
                echo json_encode([
                    'success' => true,
                    'program' => $program,
                    'cycle' => $cycle,
                    'days' => array_values($daysMap),
                    'reports' => [],
                    'message' => 'No se encontraron sedes vinculadas con los filtros seleccionados.'
                ]);
                return;
            }

            $targetBranchIds = array_column($branches, 'branch_id');
            $targetBranchListStr = implode(',', array_map('intval', $targetBranchIds));

            // 5. Extraer beneficiarios de las sedes seleccionadas
            $sqlBen = "SELECT b.id, b.branch_id, brr.ration_type_id, rt.name as ration_type_name,
                              b.grade, b.birth_date, b.beneficiary_type 
                       FROM beneficiaries b
                       JOIN beneficiary_ration_rights brr ON b.id = brr.beneficiary_id
                       LEFT JOIN pae_ration_types rt ON brr.ration_type_id = rt.id
                       WHERE b.status = 'ACTIVO' 
                         AND b.pae_id = :pae_id 
                         AND brr.pae_id = :pae_id_rights 
                         AND b.branch_id IN ($targetBranchListStr)";

            $stmtBen = $this->conn->prepare($sqlBen);
            $stmtBen->execute([':pae_id' => $pae_id, ':pae_id_rights' => $pae_id]);
            $beneficiaries = $stmtBen->fetchAll(PDO::FETCH_ASSOC);

            // Censo por Sede
            $census = [];
            foreach ($targetBranchIds as $bid) {
                $census[$bid] = [
                    'levels' => [
                        'PREESCOLAR' => 0,
                        'PRIMARIA_A' => 0,
                        'PRIMARIA_B' => 0,
                        'SECUNDARIA' => 0,
                        'MEDIA' => 0,
                        'TOTAL' => 0
                    ],
                    'rations' => [],
                    'ration_names' => []
                ];
            }

            // Para contabilizar niños únicos por sede en el total general
            $uniqueStudentsPerBranch = [];

            foreach ($beneficiaries as $b) {
                $bid = intval($b['branch_id']);
                $rtid = intval($b['ration_type_id']);
                $rtName = $b['ration_type_name'] ?? 'General';
                $benId = intval($b['id']);

                $level = $this->classifyEducationalLevel($b['grade'], $b['birth_date'], $b['beneficiary_type'] ?? 'student');

                if (!isset($census[$bid])) continue;

                // Contar por ración
                if (!isset($census[$bid]['rations'][$rtid])) {
                    $census[$bid]['rations'][$rtid] = [
                        'PREESCOLAR' => 0,
                        'PRIMARIA_A' => 0,
                        'PRIMARIA_B' => 0,
                        'SECUNDARIA' => 0,
                        'MEDIA' => 0,
                        'TOTAL' => 0
                    ];
                }
                $census[$bid]['rations'][$rtid][$level]++;
                $census[$bid]['rations'][$rtid]['TOTAL']++;
                $census[$bid]['ration_names'][$rtName] = true;

                // Contar para la sede (evitando duplicar en el conteo del encabezado si el niño tiene múltiples raciones)
                if (!isset($uniqueStudentsPerBranch[$bid][$benId])) {
                    $uniqueStudentsPerBranch[$bid][$benId] = true;
                    $census[$bid]['levels'][$level]++;
                    $census[$bid]['levels']['TOTAL']++;
                }
            }

            // 6. Obtener la explosión de recetas por menú diario
            // Menú -> Recetas -> Insumos
            $sqlRecipes = "SELECT 
                                m.day_number,
                                mr.ration_type_id,
                                ri.item_id,
                                i.name as item_name,
                                i.code as item_code,
                                mu.name as unit_name,
                                mu.abbreviation as unit_abbr,
                                mu.conversion_factor,
                                ri.age_group,
                                ri.quantity as grammage
                           FROM menus m
                           JOIN menu_recipes mr ON m.id = mr.menu_id
                           JOIN recipe_items ri ON mr.recipe_id = ri.recipe_id
                           JOIN items i ON ri.item_id = i.id
                           JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                           WHERE m.cycle_id = ? AND m.pae_id = ?
                           ORDER BY i.name ASC";

            $stmtRec = $this->conn->prepare($sqlRecipes);
            $stmtRec->execute([$cycleId, $pae_id]);
            $recipeItems = $stmtRec->fetchAll(PDO::FETCH_ASSOC);

            // Insumos sueltos por menú
            $sqlLoose = "SELECT 
                            m.day_number,
                            m.ration_type_id,
                            mi.item_id,
                            i.name as item_name,
                            i.code as item_code,
                            mu.name as unit_name,
                            mu.abbreviation as unit_abbr,
                            mu.conversion_factor,
                            'ALL' as age_group,
                            mi.standard_quantity as grammage
                         FROM menu_items mi
                         JOIN menus m ON mi.menu_id = m.id
                         JOIN items i ON mi.item_id = i.id
                         JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                         WHERE m.cycle_id = ? AND m.pae_id = ?
                         ORDER BY i.name ASC";

            $stmtLoose = $this->conn->prepare($sqlLoose);
            $stmtLoose->execute([$cycleId, $pae_id]);
            $looseItems = $stmtLoose->fetchAll(PDO::FETCH_ASSOC);

            $allExplosions = array_merge($recipeItems, $looseItems);

            // 7. Calcular Requerimientos Diarios por Sede
            $reports = [];
            $allDaysNumbers = array_keys($daysMap);
            sort($allDaysNumbers);

            foreach ($branches as $br) {
                $bid = intval($br['branch_id']);
                $branchCensus = $census[$bid] ?? null;

                if (!$branchCensus || $branchCensus['levels']['TOTAL'] === 0) {
                    // Sede sin estudiantes activos
                    $reports[] = [
                        'school' => [
                            'id' => $br['school_id'],
                            'name' => $br['school_name']
                        ],
                        'branch' => [
                            'id' => $br['branch_id'],
                            'name' => $br['branch_name']
                        ],
                        'census' => [
                            'preescolar' => 0,
                            'primaria_a' => 0,
                            'primaria_b' => 0,
                            'secundaria' => 0,
                            'media' => 0,
                            'total' => 0
                        ],
                        'modalities' => 'SIN ESTUDIANTES ACTIVOS',
                        'items' => []
                    ];
                    continue;
                }

                $branchItems = [];

                foreach ($allExplosions as $row) {
                    $dayNum = intval($row['day_number']);
                    $itemId = intval($row['item_id']);
                    $targetRtId = intval($row['ration_type_id']);
                    $ageGroup = strtoupper(trim($row['age_group'] ?? ''));
                    $grammage = floatval($row['grammage']);
                    $factor = (isset($row['conversion_factor']) && floatval($row['conversion_factor']) > 0)
                        ? floatval($row['conversion_factor'])
                        : 1.0;

                    if (!isset($branchItems[$itemId])) {
                        $branchItems[$itemId] = [
                            'item_id' => $itemId,
                            'name' => strtoupper(trim($row['item_name'])),
                            'code' => $row['item_code'] ?? '',
                            'unit' => strtoupper(trim($row['unit_abbr'] ?: $row['unit_name'])),
                            'daily' => array_fill_keys($allDaysNumbers, 0.0),
                            'total' => 0.0
                        ];
                    }

                    $rations = $branchCensus['rations'];

                    // Si la ración está especificada en la receta
                    if ($targetRtId > 0 && isset($rations[$targetRtId])) {
                        $groupCounts = $rations[$targetRtId];
                        $countForGroup = $this->resolveBeneficiaryCount($groupCounts, $ageGroup);
                        $qtyRequired = ($countForGroup * $grammage) / $factor;
                        $branchItems[$itemId]['daily'][$dayNum] += $qtyRequired;
                    } elseif ($targetRtId === 0 || empty($targetRtId)) {
                        // Si no tiene ración específica, aplica a todas las raciones de la sede
                        foreach ($rations as $rtid => $groupCounts) {
                            $countForGroup = $this->resolveBeneficiaryCount($groupCounts, $ageGroup);
                            $qtyRequired = ($countForGroup * $grammage) / $factor;
                            $branchItems[$itemId]['daily'][$dayNum] += $qtyRequired;
                        }
                    }
                }

                // Consolidar totales y ordenar items
                $formattedItems = [];
                $itemIndex = 1;

                foreach ($branchItems as $itemId => $itemData) {
                    $totalQty = 0.0;
                    $formattedDaily = [];

                    foreach ($allDaysNumbers as $dn) {
                        $rawDaily = $itemData['daily'][$dn];
                        $totalQty += $rawDaily;
                        $formattedDaily[$dn] = round($rawDaily, 1);
                    }

                    $itemData['total'] = round($totalQty, 1);
                    $itemData['daily'] = $formattedDaily;

                    // Solo incluir si tiene requerimiento en algún día
                    if ($itemData['total'] > 0 || !empty(array_filter($formattedDaily))) {
                        $formattedItems[] = [
                            'item_no' => $itemIndex++,
                            'item_id' => $itemData['item_id'],
                            'name' => $itemData['name'],
                            'code' => $itemData['code'],
                            'unit' => $itemData['unit'],
                            'total_quantity' => $itemData['total'],
                            'daily_quantities' => $itemData['daily']
                        ];
                    }
                }

                // Ordenar alfabéticamente por nombre de alimento
                usort($formattedItems, function ($a, $b) {
                    return strcmp($a['name'], $b['name']);
                });

                // Re-enumerar 1, 2, 3...
                foreach ($formattedItems as $k => &$fi) {
                    $fi['item_no'] = $k + 1;
                }
                unset($fi);

                $modalityNames = !empty($branchCensus['ration_names'])
                    ? implode(', ', array_keys($branchCensus['ration_names']))
                    : 'Complemento Alimentario';

                $reports[] = [
                    'school' => [
                        'id' => $br['school_id'],
                        'name' => $br['school_name']
                    ],
                    'branch' => [
                        'id' => $br['branch_id'],
                        'name' => $br['branch_name']
                    ],
                    'census' => [
                        'preescolar' => $branchCensus['levels']['PREESCOLAR'],
                        'primaria_a' => $branchCensus['levels']['PRIMARIA_A'],
                        'primaria_b' => $branchCensus['levels']['PRIMARIA_B'],
                        'secundaria' => $branchCensus['levels']['SECUNDARIA'],
                        'media' => $branchCensus['levels']['MEDIA'],
                        'total' => $branchCensus['levels']['TOTAL']
                    ],
                    'modalities' => $modalityNames,
                    'items' => $formattedItems
                ];
            }

            echo json_encode([
                'success' => true,
                'program' => $program,
                'cycle' => $cycle,
                'days' => array_values($daysMap),
                'reports' => $reports
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }

    /**
     * Resuelve el conteo de niños para un grupo de edad en una receta
     */
    private function resolveBeneficiaryCount($groupCounts, $ageGroup)
    {
        if ($ageGroup === 'ALL' || $ageGroup === 'TODOS' || $ageGroup === 'GENERAL') {
            return $groupCounts['TOTAL'] ?? 0;
        }

        if (isset($groupCounts[$ageGroup])) {
            return $groupCounts[$ageGroup];
        }

        // Si la receta tiene 'SECUNDARIA', en PAE cubre tanto Secundaria (6°-9°) como Media (10°-11°)
        if ($ageGroup === 'SECUNDARIA') {
            return ($groupCounts['SECUNDARIA'] ?? 0) + ($groupCounts['MEDIA'] ?? 0);
        }

        return 0;
    }

    /**
     * Clasifica a un estudiante en los 5 niveles exactos del formato Kardex:
     * 1. Preescolar
     * 2. Primaria 1° - 2° - 3°
     * 3. Primaria 4° - 5°
     * 4. Secundaria 6° A 9°
     * 5. Media y Ciclo Comp. (10°, 11°, Ciclo Complementario, etc.)
     */
    private function classifyEducationalLevel($grade, $birth_date = null, $beneficiary_type = 'student')
    {
        if ($beneficiary_type === 'other') {
            return 'MEDIA';
        }

        $g = trim(strtoupper($grade ?? ''));

        // 1. Preescolar
        if (in_array($g, ['TRANSICIÓN', 'TRANSICION', 'JARDIN', 'JARDÍN', 'PRE-JARDIN', 'PREJARDIN', 'PARVULOS', '0', '0°', 'PREESCOLAR'])) {
            return 'PREESCOLAR';
        }

        // 2. Primaria 1° - 2° - 3°
        if (in_array($g, ['1', '1°', 'PRIMERO', '2', '2°', 'SEGUNDO', '3', '3°', 'TERCERO', 'PRIMARIA_A'])) {
            return 'PRIMARIA_A';
        }

        // 3. Primaria 4° - 5°
        if (in_array($g, ['4', '4°', 'CUARTO', '5', '5°', 'QUINTO', 'PRIMARIA_B'])) {
            return 'PRIMARIA_B';
        }

        // 4. Secundaria 6° A 9°
        if (in_array($g, ['6', '6°', 'SEXTO', '7', '7°', 'SEPTIMO', '8', '8°', 'OCTAVO', '9', '9°', 'NOVENO', 'SECUNDARIA'])) {
            return 'SECUNDARIA';
        }

        // 5. Media y Ciclo Comp.
        if (in_array($g, ['10', '10°', 'DECIMO', '11', '11°', 'ONCE', '12', '12°', '13', '13°', 'CLEI', 'CICLO COMPLEMENTARIO', 'ADULTO', 'GENERAL'])) {
            return 'MEDIA';
        }

        // Fallback por edad si no se reconoce el grado
        if ($birth_date) {
            $birth = new \DateTime($birth_date);
            $now = new \DateTime();
            $age = $now->diff($birth)->y;

            if ($age <= 5) return 'PREESCOLAR';
            if ($age >= 6 && $age <= 8) return 'PRIMARIA_A';
            if ($age >= 9 && $age <= 11) return 'PRIMARIA_B';
            if ($age >= 12 && $age <= 15) return 'SECUNDARIA';
            return 'MEDIA';
        }

        return 'SECUNDARIA';
    }
}

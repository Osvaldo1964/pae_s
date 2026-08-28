<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class MenuCycleController
{
    private $conn;

    public function __construct()
    {
        $this->conn = Database::getInstance()->getConnection();
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

    public function index()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            // Incluir conteo de proyecciones para saber si está congelado y las sedes asociadas
            $query = "SELECT c.*, t.name as template_name,
                      (SELECT COUNT(*) FROM cycle_projections WHERE cycle_id = c.id) as projection_count,
                      (SELECT GROUP_CONCAT(branch_id) FROM menu_cycle_branches WHERE cycle_id = c.id) as branch_ids
                      FROM menu_cycles c 
                      LEFT JOIN cycle_templates t ON c.template_id = t.id
                      WHERE c.pae_id = :pae_id 
                      ORDER BY c.start_date DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':pae_id', $pae_id);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function store()
    {
        // Redirigir a generate si se prefiere
        $this->generate();
    }

    /**
     * POST /api/menu-cycles/generate
     * Genera un ciclo basado en una plantilla y fechas específicas
     */
    public function generate()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);

            if (!isset($data['template_id'])) {
                // Determine if this was intended as an 'approve' action but routed incorrectly
                $uri = $_SERVER['REQUEST_URI'];
                if (strpos($uri, 'approve') !== false) {
                    throw new Exception("Error de enrutamiento: La acción 'approve' fue capturada por 'generate'. Verifique api/index.php.");
                }
                throw new Exception("Datos inválidos: Se requiere template_id para generar un ciclo.");
            }

            $template_id = $data['template_id'];
            $start_date = $data['start_date'];
            $end_date = $data['end_date'];
            $name = $data['name'];
            $specific_dates = $data['specific_dates'] ?? []; // Array de fechas 'Y-m-d'

            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) {
                $pae_id = $data['pae_id'] ?? null;
                if (!$pae_id)
                    throw new Exception("Debe especificar un programa PAE");
            }

            $this->conn->beginTransaction();

            // 1. Obtener la plantilla y sus días (Validando que la plantilla pertenezca al PAE)
            $stmtCheckTemp = $this->conn->prepare("SELECT id FROM cycle_templates WHERE id = ? AND pae_id = ?");
            $stmtCheckTemp->execute([$template_id, $pae_id]);
            if (!$stmtCheckTemp->fetch()) {
                throw new Exception("La plantilla seleccionada no existe o no pertenece a su programa.");
            }

            $stmtTemp = $this->conn->prepare("SELECT * FROM cycle_template_days WHERE template_id = ? ORDER BY day_number ASC");
            $stmtTemp->execute([$template_id]);
            $templateDays = $stmtTemp->fetchAll(PDO::FETCH_ASSOC);

            if (!$templateDays)
                throw new Exception("La plantilla seleccionada no tiene días configurados.");

            // 2. Definir las fechas a procesar
            // Si el frontend envía fechas específicas, usamos esas. Si no, calculamos días hábiles como fallback (legacy)
            $dates_mapping = [];

            if (!empty($specific_dates)) {
                // Ordenar fechas por seguridad
                sort($specific_dates);
                foreach ($specific_dates as $i => $date_str) {
                    $dates_mapping[$i + 1] = $date_str;
                }
                $total_days = count($dates_mapping);
            } else {
                // FALLBACK: Lógica anterior (Solo Lunes a Viernes)
                $start = new \DateTime($start_date);
                $end = new \DateTime($end_date);
                $business_days_count = 0;
                $interval = new \DateInterval('P1D');
                $period = new \DatePeriod($start, $interval, $end->modify('+1 day'));

                foreach ($period as $date) {
                    $day_of_week = $date->format('N'); // 1 (Mon) to 7 (Sun)
                    if ($day_of_week < 6) {
                        $business_days_count++;
                        $dates_mapping[$business_days_count] = $date->format('Y-m-d');
                    }
                }
                $total_days = $business_days_count;
            }

            if ($total_days === 0)
                throw new Exception("No hay días hábiles o seleccionados en el rango.");

            $stmtCycle = $this->conn->prepare("INSERT INTO menu_cycles (pae_id, name, start_date, end_date, total_days, status, template_id) VALUES (?, ?, ?, ?, ?, 'BORRADOR', ?)");
            $stmtCycle->execute([$pae_id, $name, $start_date, $end_date, $total_days, $template_id]);
            $cycle_id = $this->conn->lastInsertId();

            if (!empty($data['branch_ids']) && is_array($data['branch_ids'])) {
                $stmtBranch = $this->conn->prepare("INSERT INTO menu_cycle_branches (cycle_id, branch_id) VALUES (?, ?)");
                foreach ($data['branch_ids'] as $bid) {
                    if ($bid > 0) {
                        $stmtBranch->execute([$cycle_id, $bid]);
                    }
                }
            }

            // 3. Crear los menús diarios (menus) y vincular recetas usando mapeo circular (módulo)
            $days_data = [];
            foreach ($templateDays as $td) {
                $days_data[$td['day_number']][] = $td;
            }
            // Obtener el número máximo de día en la plantilla para el módulo
            $max_template_day = max(array_keys($days_data));

            foreach ($dates_mapping as $rel_day => $real_date) {
                // Mapeo circular: Si el ciclo es más largo que la plantilla, vuelve al día 1
                $template_day_to_use = (($rel_day - 1) % $max_template_day) + 1;

                if (!isset($days_data[$template_day_to_use])) {
                    // Si ese día específico no existe en la plantilla (ej: saltos manuales), buscamos el anterior más cercano
                    $found = false;
                    for ($d = $template_day_to_use; $d >= 1; $d--) {
                        if (isset($days_data[$d])) {
                            $template_day_to_use = $d;
                            $found = true;
                            break;
                        }
                    }
                    if (!$found)
                        continue;
                }

                $stmtMenu = $this->conn->prepare("INSERT INTO menus (pae_id, cycle_id, name, day_number) VALUES (?, ?, ?, ?)");
                // Formatear fecha bonita para el nombre del menú
                $dateObj = new \DateTime($real_date);
                // Array de días en español
                $dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                $diaSemana = $dias[$dateObj->format('w')];
                $menu_name = "Día " . $rel_day . " - " . $diaSemana . " " . $dateObj->format('d/m');

                $stmtMenu->execute([$pae_id, $cycle_id, $menu_name, $rel_day]);
                $menu_id = $this->conn->lastInsertId();

                foreach ($days_data[$template_day_to_use] as $recipe_info) {
                    $rid = $recipe_info['recipe_id'];
                    $rtid = $recipe_info['ration_type_id'];
                    $mtype = $recipe_info['meal_type'];

                    // Vinculamos la receta padre (Minuta o Subpreparacion)
                    $stmtMenuRec = $this->conn->prepare("INSERT INTO menu_recipes (menu_id, recipe_id, ration_type_id, meal_type) VALUES (?, ?, ?, ?)");
                    $stmtMenuRec->execute([$menu_id, $rid, $rtid, $mtype]);

                    // Revisar si es una MINUTA para vincular sus subpreparaciones
                    $stmtType = $this->conn->prepare("SELECT type FROM recipes WHERE id = ?");
                    $stmtType->execute([$rid]);
                    $rData = $stmtType->fetch(PDO::FETCH_ASSOC);

                    if ($rData && $rData['type'] === 'MINUTA') {
                        $stmtSub = $this->conn->prepare("SELECT child_recipe_id FROM recipe_subpreparations WHERE parent_recipe_id = ?");
                        $stmtSub->execute([$rid]);
                        while ($sub = $stmtSub->fetch(PDO::FETCH_ASSOC)) {
                            // Vinculamos la subpreparacion al mismo menú
                            $stmtMenuRec->execute([$menu_id, $sub['child_recipe_id'], $rtid, $mtype]);
                        }
                    }
                }
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Ciclo generado correctamente', 'id' => $cycle_id]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/menu-cycles/approve/{id}
     * Congela la demanda del ciclo calculando items por sede
     */
    public function approve($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) {
                $data = json_decode(file_get_contents("php://input"), true);
                $pae_id = $data['pae_id'] ?? null;
            }

            // 1. Verificar estado del ciclo
            $stmt = $this->conn->prepare("SELECT * FROM menu_cycles WHERE id = ? AND pae_id = ?");
            $stmt->execute([$id, $pae_id]);
            $cycle = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$cycle)
                throw new Exception("Ciclo no encontrado.");
            if ($cycle['status'] !== 'BORRADOR')
                throw new Exception("Solo se pueden aprobar ciclos en estado BORRADOR.");

            $this->conn->beginTransaction();

            // 2. Limpiar proyecciones previas si existen (por seguridad)
            $this->conn->prepare("DELETE FROM cycle_projections WHERE cycle_id = ?")->execute([$id]);

            // 3. Obtener población por Sede, Tipo de Ración, Grado y Fecha de Nacimiento
            $checkBranches = $this->conn->prepare("SELECT branch_id FROM menu_cycle_branches WHERE cycle_id = ?");
            $checkBranches->execute([$id]);
            $cycleBranches = $checkBranches->fetchAll(PDO::FETCH_COLUMN);

            $branchFilter = "";
            if (!empty($cycleBranches)) {
                $branchList = implode(",", array_map('intval', $cycleBranches));
                $branchFilter = " AND b.branch_id IN ($branchList) ";
            }

            // Se incluye birth_date para motor de clasificación por edad (fallback para programas no escolares)
            // UPDATED: Join with beneficiary_ration_rights to support multiple rations per beneficiary
            $stmtPop = $this->conn->prepare("SELECT 
                                                b.branch_id, 
                                                brr.ration_type_id, 
                                                b.grade, 
                                                b.birth_date, 
                                                b.beneficiary_type, 
                                                COUNT(*) as total 
                                            FROM beneficiaries b
                                            JOIN beneficiary_ration_rights brr ON b.id = brr.beneficiary_id
                                            WHERE b.pae_id = ? AND b.status = 'ACTIVO' AND brr.pae_id = ? {$branchFilter}
                                            GROUP BY b.branch_id, brr.ration_type_id, b.grade, b.birth_date, b.beneficiary_type");
            $stmtPop->execute([$pae_id, $pae_id]);
            $populations = $stmtPop->fetchAll(PDO::FETCH_ASSOC);

            if (!$populations)
                throw new Exception("No hay beneficiarios activos en el programa para calcular la demanda.");

            // 4. Obtener la explosión de recetas vinculadas al ciclo
            // Buscamos: Ciclo -> Menús -> Recetas -> ItemsReceta
            // IMPORTANTE: Filtrar por pae_id del ciclo para evitar fugas entre programas
            $queryExplosion = "SELECT 
                                mr.ration_type_id, 
                                ri.age_group, 
                                ri.item_id, 
                                ri.quantity,
                                mu.conversion_factor,
                                i.commercial_presentation
                               FROM menu_recipes mr
                               JOIN recipe_items ri ON mr.recipe_id = ri.recipe_id
                               JOIN items i ON ri.item_id = i.id
                               JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                               WHERE mr.menu_id IN (SELECT id FROM menus WHERE cycle_id = ? AND pae_id = ?)";
            $stmtExp = $this->conn->prepare($queryExplosion);
            $stmtExp->execute([$id, $pae_id]);
            $recipeDetails = $stmtExp->fetchAll(PDO::FETCH_ASSOC);

            // 4.5 Obtener explosión de insumos sueltos (menu_items)
            $queryLoose = "SELECT 
                            m.ration_type_id, 
                            'ALL' as age_group, 
                            mi.item_id, 
                            mi.standard_quantity as quantity,
                            mu.conversion_factor,
                            i.commercial_presentation
                           FROM menu_items mi
                           JOIN menus m ON mi.menu_id = m.id
                           JOIN items i ON mi.item_id = i.id
                           JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                           WHERE m.cycle_id = ? AND m.pae_id = ?";
            $stmtLoose = $this->conn->prepare($queryLoose);
            $stmtLoose->execute([$id, $pae_id]);
            $looseDetails = $stmtLoose->fetchAll(PDO::FETCH_ASSOC);

            $allExplosion = array_merge($recipeDetails, $looseDetails);

            if (!$allExplosion)
                throw new Exception("El ciclo no tiene recetas o insumos sueltos configurados.");

            // 5. Motor de Cálculo Optimizado (Cruce Matriz O(N+M))
            $projections = []; // [branch_id][item_id] => quantity
            $commercialPresentations = []; // [item_id] => commercial_presentation
            $totalBeneficiaries = 0;

            // 5.1 Pre-agrupar recetas por ración y edad para evitar el bucle N*M
            $groupedRecipes = [];
            foreach ($allExplosion as $recipe) {
                $key = $recipe['ration_type_id'] . '|' . $recipe['age_group'];
                $groupedRecipes[$key][] = $recipe;
                $commercialPresentations[$recipe['item_id']] = floatval($recipe['commercial_presentation']);
            }

            foreach ($populations as $pop) {
                $totalBeneficiaries += $pop['total'];
                $branch_id = $pop['branch_id'];
                $pop['grade'] = $pop['grade'] ?? '';
                $pop['beneficiary_type'] = $pop['beneficiary_type'] ?? 'student';
                $age_group = $this->getAgeGroup($pop['grade'], $pop['birth_date'], $pop['beneficiary_type']);
                $ration_type_id = $pop['ration_type_id'];

                $key = $ration_type_id . '|' . $age_group;

                // Check for exact age group match OR 'ALL' for loose items
                $keys_to_check = [
                    $ration_type_id . '|' . $age_group,
                    $ration_type_id . '|ALL'
                ];

                foreach ($keys_to_check as $key) {
                    if (isset($groupedRecipes[$key])) {
                        foreach ($groupedRecipes[$key] as $recipe) {
                            $item_id = $recipe['item_id'];
                            $conversion_factor = (isset($recipe['conversion_factor']) && $recipe['conversion_factor'] > 0)
                                ? $recipe['conversion_factor']
                                : 1;

                            $quantity = ($recipe['quantity'] * $pop['total']) / $conversion_factor;

                            if (!isset($projections[$branch_id]))
                                $projections[$branch_id] = [];
                            if (!isset($projections[$branch_id][$item_id]))
                                $projections[$branch_id][$item_id] = 0;

                            $projections[$branch_id][$item_id] += $quantity;
                        }
                    }
                }
            }

            // 6. Guardar Proyecciones Congeladas (Aplicando redondeo de presentación comercial)
            $stmtInsert = $this->conn->prepare("INSERT INTO cycle_projections (cycle_id, branch_id, item_id, total_quantity, beneficiary_count) VALUES (?, ?, ?, ?, ?)");
            foreach ($projections as $branch_id => $items) {
                foreach ($items as $item_id => $raw_qty) {
                    $presentation = $commercialPresentations[$item_id] ?? 1;
                    if ($presentation <= 0) $presentation = 1;
                    
                    // Redondear cantidad cruda hacia arriba según la presentación comercial
                    $packages = ceil($raw_qty / $presentation);
                    $rounded_qty = $packages * $presentation;

                    $stmtInsert->execute([$id, $branch_id, $item_id, $rounded_qty, $totalBeneficiaries]);
                }
            }

            // 7. Actualizar estado del ciclo
            $stmtUpdate = $this->conn->prepare("UPDATE menu_cycles SET status = 'ACTIVO', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmtUpdate->execute([$id]);

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Ciclo aprobado y demanda congelada correctamente.']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * Motor de clasificación híbrido: Grado (Escolar) -> Edad (Fallback) -> GENERAL
     */
    private function getAgeGroup($grade, $birth_date = null, $beneficiary_type = 'student')
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

    /**
     * DELETE /api/menu-cycles/{id}
     */
    public function delete($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            // Verificar estado antes de borrar
            $stmt = $this->conn->prepare("SELECT status FROM menu_cycles WHERE id = ? AND pae_id = ?");
            $stmt->execute([$id, $pae_id]);
            $cycle = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$cycle)
                throw new Exception("Ciclo no encontrado.");
            if ($cycle['status'] === 'ACTIVO')
                throw new Exception("No se puede eliminar un ciclo que ya está ACTIVO (congelado).");

            $this->conn->beginTransaction();

            // 1. Delete menu recipes
            $stmt1 = $this->conn->prepare("DELETE FROM menu_recipes WHERE menu_id IN (SELECT id FROM menus WHERE cycle_id = ?)");
            $stmt1->execute([$id]);

            // 2. Delete menus
            $stmt2 = $this->conn->prepare("DELETE FROM menus WHERE cycle_id = ?");
            $stmt2->execute([$id]);

            // 2.5 Eliminar ramas del ciclo vinculadas explícitamente
            $stmtBranchDel = $this->conn->prepare("DELETE FROM menu_cycle_branches WHERE cycle_id = ?");
            $stmtBranchDel->execute([$id]);

            // 3. Delete the cycle itself
            $stmtDel = $this->conn->prepare("DELETE FROM menu_cycles WHERE id = ?");
            $stmtDel->execute([$id]);

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Ciclo eliminado correctamente']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

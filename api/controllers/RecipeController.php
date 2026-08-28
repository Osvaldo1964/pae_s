<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class RecipeController
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

    /**
     * GET /api/recipes - Listar recetas
     */
    public function index()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $ration_type_id = $_GET['ration_type_id'] ?? null;
            $include_items = isset($_GET['include_items']) && $_GET['include_items'] == '1';

            // Auto-recalculación para recetas con valores en 0 (corrección de legacy)
            $stmtFixed = $this->conn->prepare("SELECT id FROM recipes WHERE pae_id = :pae AND total_calories = 0");
            $stmtFixed->execute([':pae' => $pae_id]);
            while ($row = $stmtFixed->fetch(PDO::FETCH_ASSOC)) {
                $this->recalculateNutrition($row['id']);
            }

            $query = "SELECT r.*, rt.name as ration_type_name 
                      FROM recipes r
                      LEFT JOIN pae_ration_types rt ON r.ration_type_id = rt.id
                      WHERE r.pae_id = :pae_id";

            if ($ration_type_id) {
                $query .= " AND r.ration_type_id = :rtid";
            }

            $query .= " ORDER BY r.name";

            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':pae_id', $pae_id);
            if ($ration_type_id) {
                $stmt->bindValue(':rtid', $ration_type_id);
            }

            $stmt->execute();
            $recipes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($include_items && count($recipes) > 0) {
                foreach ($recipes as &$recipe) {
                    $queryItems = "SELECT ri.*, i.name as item_name, i.code as item_code, i.unit_cost, mu.abbreviation as unit 
                                   FROM recipe_items ri 
                                   JOIN items i ON ri.item_id = i.id 
                                   JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                                   WHERE ri.recipe_id = :rid";
                    $stmtItems = $this->conn->prepare($queryItems);
                    $stmtItems->execute([':rid' => $recipe['id']]);
                    $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

                    $groupedItems = [];
                    foreach ($items as $it) {
                        $iid = $it['item_id'];
                        if (!isset($groupedItems[$iid])) {
                            $groupedItems[$iid] = [
                                'item_id' => $iid,
                                'item_name' => $it['item_name'],
                                'unit' => $it['unit'],
                                'unit_cost' => $it['unit_cost'],
                                'preparation' => $it['preparation_method'],
                                'quantities' => ['PREESCOLAR' => 0, 'PRIMARIA_A' => 0, 'PRIMARIA_B' => 0, 'SECUNDARIA' => 0, 'GENERAL' => 0]
                            ];
                        }
                        $groupedItems[$iid]['quantities'][$it['age_group']] = $it['quantity'];
                    }
                    $recipe['items'] = array_values($groupedItems);
                }
            }

            // Always fetch nutrition_groups for all recipes
            if (count($recipes) > 0) {
                foreach ($recipes as &$recipe) {
                    $queryNut = "SELECT age_group, total_calories as calories, total_proteins as proteins, total_carbohydrates as carbohydrates, total_fats as fats, total_calcium as calcium, total_iron as iron, total_sodium as sodium 
                                 FROM recipe_nutrition WHERE recipe_id = :rid";
                    $stmtNut = $this->conn->prepare($queryNut);
                    $stmtNut->execute([':rid' => $recipe['id']]);
                    
                    $nutritionData = ['PREESCOLAR' => [], 'PRIMARIA_A' => [], 'PRIMARIA_B' => [], 'SECUNDARIA' => [], 'GENERAL' => []];
                    $emptyGroup = ['calories'=>0, 'proteins'=>0, 'carbohydrates'=>0, 'fats'=>0, 'calcium'=>0, 'iron'=>0, 'sodium'=>0];
                    
                    while($n = $stmtNut->fetch(PDO::FETCH_ASSOC)){
                        $nutritionData[$n['age_group']] = $n;
                    }
                    
                    // Fill empty groups with 0 if missing
                    foreach($nutritionData as $g => $data) {
                        if(empty($data)) $nutritionData[$g] = $emptyGroup;
                    }
                    
                    $recipe['nutrition_groups'] = $nutritionData;
                }
            }

            echo json_encode(['success' => true, 'data' => $recipes]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/recipes/{id} - Detalle de receta
     */
    public function show($id)
    {
        try {
            // Asegurar que los datos estén frescos antes de mostrar
            $this->recalculateNutrition($id);

            $query = "SELECT r.*, rt.name as ration_type_name 
                      FROM recipes r
                      LEFT JOIN pae_ration_types rt ON r.ration_type_id = rt.id
                      WHERE r.id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $id);
            $stmt->execute();
            $recipe = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$recipe)
                throw new Exception("Receta no encontrada");

            // Ingredientes organizados por grupo
            $queryItems = "SELECT ri.*, i.name as item_name, i.code as item_code, i.unit_cost, mu.abbreviation as unit 
                           FROM recipe_items ri 
                           JOIN items i ON ri.item_id = i.id 
                           JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                           WHERE ri.recipe_id = :id
                           ORDER BY ri.age_group, i.name";
            $stmtItems = $this->conn->prepare($queryItems);
            $stmtItems->bindValue(':id', $id);
            $stmtItems->execute();
            $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

            // Organizar para el frontend: un registro por item_id con sus 4 gramajes
            $groupedItems = [];
            foreach ($items as $it) {
                $iid = $it['item_id'];
                if (!isset($groupedItems[$iid])) {
                    $groupedItems[$iid] = [
                        'item_id' => $iid,
                        'item_name' => $it['item_name'],
                        'item_code' => $it['item_code'],
                        'unit' => $it['unit'],
                        'unit_cost' => $it['unit_cost'],
                        'preparation' => $it['preparation_method'],
                        'quantities' => [
                            'PREESCOLAR' => 0,
                            'PRIMARIA_A' => 0,
                            'PRIMARIA_B' => 0,
                            'SECUNDARIA' => 0,
                            'GENERAL' => 0
                        ]
                    ];
                }
                $groupedItems[$iid]['quantities'][$it['age_group']] = $it['quantity'];
            }
            $recipe['items'] = array_values($groupedItems);

            // Nutrición por grupo estructurada
            $queryNut = "SELECT age_group, total_calories as calories, total_proteins as proteins, total_carbohydrates as carbohydrates, total_fats as fats, total_calcium as calcium, total_iron as iron, total_sodium as sodium 
                         FROM recipe_nutrition WHERE recipe_id = :rid";
            $stmtNut = $this->conn->prepare($queryNut);
            $stmtNut->execute([':rid' => $id]);
            
            $nutritionData = ['PREESCOLAR' => [], 'PRIMARIA_A' => [], 'PRIMARIA_B' => [], 'SECUNDARIA' => [], 'GENERAL' => []];
            $emptyGroup = ['calories'=>0, 'proteins'=>0, 'carbohydrates'=>0, 'fats'=>0, 'calcium'=>0, 'iron'=>0, 'sodium'=>0];
            
            while($n = $stmtNut->fetch(PDO::FETCH_ASSOC)){
                $nutritionData[$n['age_group']] = $n;
            }
            
            foreach($nutritionData as $g => $data) {
                if(empty($data)) $nutritionData[$g] = $emptyGroup;
            }
            
            $recipe['nutrition_groups'] = $nutritionData;

            if ($recipe['type'] === 'MINUTA') {
                $querySub = "SELECT r.id, r.name, r.meal_type 
                             FROM recipe_subpreparations rs
                             JOIN recipes r ON rs.child_recipe_id = r.id
                             WHERE rs.parent_recipe_id = :id";
                $stmtSub = $this->conn->prepare($querySub);
                $stmtSub->execute([':id' => $id]);
                $recipe['subpreparations'] = $stmtSub->fetchAll(PDO::FETCH_ASSOC);
            } else {
                $recipe['subpreparations'] = [];
            }

            echo json_encode(['success' => true, 'data' => $recipe]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/recipes - Crear receta
     */
    public function store()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();

            $this->conn->beginTransaction();

            $query = "INSERT INTO recipes (pae_id, name, meal_type, ration_type_id, description, type) VALUES (:pae_id, :name, :type, :rtid, :desc, :rtype)";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':name' => $data['name'],
                ':type' => $data['meal_type'] ?? 'SUBPREPARACION',
                ':rtid' => !empty($data['ration_type_id']) ? $data['ration_type_id'] : null,
                ':desc' => $data['description'] ?? '',
                ':rtype' => $data['type'] ?? 'SUBPREPARACION'
            ]);
            $recipe_id = $this->conn->lastInsertId();

            if (isset($data['subpreparations']) && is_array($data['subpreparations']) && ($data['type'] ?? '') === 'MINUTA') {
                $querySub = "INSERT INTO recipe_subpreparations (parent_recipe_id, child_recipe_id) VALUES (:pid, :cid)";
                $stmtSub = $this->conn->prepare($querySub);
                foreach ($data['subpreparations'] as $child_id) {
                    $stmtSub->execute([
                        ':pid' => $recipe_id,
                        ':cid' => $child_id
                    ]);
                }
            }

            if (isset($data['items']) && is_array($data['items'])) {
                $queryItem = "INSERT INTO recipe_items (recipe_id, item_id, age_group, quantity, preparation_method) VALUES (:rid, :iid, :group, :qty, :prep)";
                $stmtItem = $this->conn->prepare($queryItem);
                foreach ($data['items'] as $item) {
                    // El frontend enviará 'quantities' como un objeto {PREESCOLAR: X, ...}
                    foreach ($item['quantities'] as $group => $qty) {
                        $stmtItem->execute([
                            ':rid' => $recipe_id,
                            ':iid' => $item['item_id'],
                            ':group' => $group,
                            ':qty' => $qty,
                            ':prep' => $item['preparation'] ?? ''
                        ]);
                    }
                }
            }

            $this->conn->commit();

            // Recalcular DESPUÉS del commit para asegurar que recipe_items ya existan en la DB
            $this->recalculateNutrition($recipe_id);

            echo json_encode(['success' => true, 'message' => 'Receta creada exitosamente', 'id' => $recipe_id]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function recalculateNutrition($recipe_id)
    {
        $groups = ['PREESCOLAR', 'PRIMARIA_A', 'PRIMARIA_B', 'SECUNDARIA', 'GENERAL'];

        foreach ($groups as $group) {
            $query = "SELECT 
                        SUM((ri.quantity * (1 - COALESCE(i.waste_percentage, 0) / 100)) * i.calories / 100) as calories,
                        SUM((ri.quantity * (1 - COALESCE(i.waste_percentage, 0) / 100)) * i.proteins / 100) as proteins,
                        SUM((ri.quantity * (1 - COALESCE(i.waste_percentage, 0) / 100)) * i.carbohydrates / 100) as carbohydrates,
                        SUM((ri.quantity * (1 - COALESCE(i.waste_percentage, 0) / 100)) * i.fats / 100) as fats,
                        SUM((ri.quantity * (1 - COALESCE(i.waste_percentage, 0) / 100)) * i.calcium / 100) as calcium,
                        SUM((ri.quantity * (1 - COALESCE(i.waste_percentage, 0) / 100)) * i.iron / 100) as iron,
                        SUM((ri.quantity * (1 - COALESCE(i.waste_percentage, 0) / 100)) * i.sodium / 100) as sodium
                      FROM recipe_items ri
                      JOIN items i ON ri.item_id = i.id
                      WHERE ri.recipe_id = :id AND ri.age_group = :group";

            $stmtCalc = $this->conn->prepare($query);
            $stmtCalc->execute([':id' => $recipe_id, ':group' => $group]);
            $totals = $stmtCalc->fetch(PDO::FETCH_ASSOC);

            // Sumar nutrición de sub-preparaciones si es una MINUTA
            $querySub = "SELECT 
                            SUM(rn.total_calories) as calories,
                            SUM(rn.total_proteins) as proteins,
                            SUM(rn.total_carbohydrates) as carbohydrates,
                            SUM(rn.total_fats) as fats,
                            SUM(rn.total_calcium) as calcium,
                            SUM(rn.total_iron) as iron,
                            SUM(rn.total_sodium) as sodium
                         FROM recipe_subpreparations rs
                         JOIN recipe_nutrition rn ON rs.child_recipe_id = rn.recipe_id
                         WHERE rs.parent_recipe_id = :id AND rn.age_group = :group";
            $stmtSub = $this->conn->prepare($querySub);
            $stmtSub->execute([':id' => $recipe_id, ':group' => $group]);
            $subTotals = $stmtSub->fetch(PDO::FETCH_ASSOC);

            $cal = floatval($totals['calories'] ?? 0) + floatval($subTotals['calories'] ?? 0);
            $pro = floatval($totals['proteins'] ?? 0) + floatval($subTotals['proteins'] ?? 0);
            $car = floatval($totals['carbohydrates'] ?? 0) + floatval($subTotals['carbohydrates'] ?? 0);
            $fat = floatval($totals['fats'] ?? 0) + floatval($subTotals['fats'] ?? 0);
            $calcium = floatval($totals['calcium'] ?? 0) + floatval($subTotals['calcium'] ?? 0);
            $iron = floatval($totals['iron'] ?? 0) + floatval($subTotals['iron'] ?? 0);
            $sodium = floatval($totals['sodium'] ?? 0) + floatval($subTotals['sodium'] ?? 0);

            $queryUpd = "INSERT INTO recipe_nutrition (recipe_id, age_group, total_calories, total_proteins, total_carbohydrates, total_fats, total_calcium, total_iron, total_sodium)
                         VALUES (:id, :group, :cal, :pro, :car, :fat, :calcium, :iron, :sodium)
                         ON DUPLICATE KEY UPDATE 
                         total_calories = :cal2, total_proteins = :pro2, total_carbohydrates = :car2, total_fats = :fat2,
                         total_calcium = :calcium2, total_iron = :iron2, total_sodium = :sodium2";
            $stmtUpd = $this->conn->prepare($queryUpd);
            $stmtUpd->execute([
                ':id' => $recipe_id,
                ':group' => $group,
                ':cal' => $cal,
                ':pro' => $pro,
                ':car' => $car,
                ':fat' => $fat,
                ':calcium' => $calcium,
                ':iron' => $iron,
                ':sodium' => $sodium,
                ':cal2' => $cal,
                ':pro2' => $pro,
                ':car2' => $car,
                ':fat2' => $fat,
                ':calcium2' => $calcium,
                ':iron2' => $iron,
                ':sodium2' => $sodium
            ]);
        }

        // Mantener compatibilidad con tabla principal para visualización general (Promedio o Secundaria)
        $this->conn->prepare("UPDATE recipes r 
                             SET total_calories = (SELECT total_calories FROM recipe_nutrition WHERE recipe_id = r.id AND age_group = 'SECUNDARIA'),
                                 total_proteins = (SELECT total_proteins FROM recipe_nutrition WHERE recipe_id = r.id AND age_group = 'SECUNDARIA'),
                                 total_carbohydrates = (SELECT total_carbohydrates FROM recipe_nutrition WHERE recipe_id = r.id AND age_group = 'SECUNDARIA'),
                                 total_fats = (SELECT total_fats FROM recipe_nutrition WHERE recipe_id = r.id AND age_group = 'SECUNDARIA')
                             WHERE id = ?")->execute([$recipe_id]);
    }

    /**
     * PUT /api/recipes/{id} - Actualizar receta
     */
    public function update($id)
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $this->conn->beginTransaction();

            $query = "UPDATE recipes SET name = :name, meal_type = :type, ration_type_id = :rtid, description = :desc, type = :rtype WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':id' => $id,
                ':name' => $data['name'],
                ':type' => $data['meal_type'] ?? 'SUBPREPARACION',
                ':rtid' => !empty($data['ration_type_id']) ? $data['ration_type_id'] : null,
                ':desc' => $data['description'] ?? '',
                ':rtype' => $data['type'] ?? 'SUBPREPARACION'
            ]);

            // Actualizar sub-preparaciones
            $stmtDelSub = $this->conn->prepare("DELETE FROM recipe_subpreparations WHERE parent_recipe_id = :rid");
            $stmtDelSub->execute([':rid' => $id]);

            if (isset($data['subpreparations']) && is_array($data['subpreparations']) && ($data['type'] ?? '') === 'MINUTA') {
                $querySub = "INSERT INTO recipe_subpreparations (parent_recipe_id, child_recipe_id) VALUES (:pid, :cid)";
                $stmtSub = $this->conn->prepare($querySub);
                foreach ($data['subpreparations'] as $child_id) {
                    $stmtSub->execute([
                        ':pid' => $id,
                        ':cid' => $child_id
                    ]);
                }
            }

            // Actualizar ingredientes: Borrar y re-insertar
            $stmtDel = $this->conn->prepare("DELETE FROM recipe_items WHERE recipe_id = :rid");
            $stmtDel->execute([':rid' => $id]);

            if (isset($data['items']) && is_array($data['items'])) {
                $queryItem = "INSERT INTO recipe_items (recipe_id, item_id, age_group, quantity, preparation_method) VALUES (:rid, :iid, :group, :qty, :prep)";
                $stmtItem = $this->conn->prepare($queryItem);
                foreach ($data['items'] as $item) {
                    foreach ($item['quantities'] as $group => $qty) {
                        $stmtItem->execute([
                            ':rid' => $id,
                            ':iid' => $item['item_id'],
                            ':group' => $group,
                            ':qty' => $qty,
                            ':prep' => $item['preparation'] ?? ''
                        ]);
                    }
                }
            }

            $this->conn->commit();

            // Forzar recalculación con los nuevos datos
            $this->recalculateNutrition($id);

            echo json_encode(['success' => true, 'message' => 'Receta actualizada exitosamente']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * DELETE /api/recipes/{id} - Eliminar receta
     */
    public function delete($id)
    {
        try {
            $query = "DELETE FROM recipes WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':id' => $id]);
            echo json_encode(['success' => true, 'message' => 'Receta eliminada']);
        } catch (Exception $e) {
            $msg = $e->getMessage();
            if (strpos($msg, '1451') !== false || strpos($msg, '23000') !== false) {
                http_response_code(400);
                $msg = 'No se puede eliminar la receta porque está siendo utilizada en ciclos de menú u otras partes del sistema.';
            } else {
                http_response_code(500);
            }
            echo json_encode(['success' => false, 'message' => $msg]);
        }
    }
}

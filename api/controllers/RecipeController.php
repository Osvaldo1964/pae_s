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

            // Nutrición por grupo
            $stmtNut = $this->conn->prepare("SELECT * FROM recipe_nutrition WHERE recipe_id = ?");
            $stmtNut->execute([$id]);
            $recipe['nutrition'] = $stmtNut->fetchAll(PDO::FETCH_ASSOC);

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

            $query = "INSERT INTO recipes (pae_id, name, meal_type, ration_type_id, description) VALUES (:pae_id, :name, :type, :rtid, :desc)";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':name' => $data['name'],
                ':type' => $data['meal_type'] ?? '',
                ':rtid' => $data['ration_type_id'] ?? null,
                ':desc' => $data['description'] ?? ''
            ]);
            $recipe_id = $this->conn->lastInsertId();

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
                        SUM(ri.quantity * i.calories / 100) as calories,
                        SUM(ri.quantity * i.proteins / 100) as proteins,
                        SUM(ri.quantity * i.carbohydrates / 100) as carbohydrates,
                        SUM(ri.quantity * i.fats / 100) as fats
                      FROM recipe_items ri
                      JOIN items i ON ri.item_id = i.id
                      WHERE ri.recipe_id = :id AND ri.age_group = :group";

            $stmtCalc = $this->conn->prepare($query);
            $stmtCalc->execute([':id' => $recipe_id, ':group' => $group]);
            $totals = $stmtCalc->fetch(PDO::FETCH_ASSOC);

            if ($totals) {
                $queryUpd = "INSERT INTO recipe_nutrition (recipe_id, age_group, total_calories, total_proteins, total_carbohydrates, total_fats)
                             VALUES (:id, :group, :cal, :pro, :car, :fat)
                             ON DUPLICATE KEY UPDATE 
                             total_calories = :cal2, total_proteins = :pro2, total_carbohydrates = :car2, total_fats = :fat2";
                $stmtUpd = $this->conn->prepare($queryUpd);
                $stmtUpd->execute([
                    ':id' => $recipe_id,
                    ':group' => $group,
                    ':cal' => $totals['calories'] ?? 0,
                    ':pro' => $totals['proteins'] ?? 0,
                    ':car' => $totals['carbohydrates'] ?? 0,
                    ':fat' => $totals['fats'] ?? 0,
                    ':cal2' => $totals['calories'] ?? 0,
                    ':pro2' => $totals['proteins'] ?? 0,
                    ':car2' => $totals['carbohydrates'] ?? 0,
                    ':fat2' => $totals['fats'] ?? 0
                ]);
            }
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

            $query = "UPDATE recipes SET name = :name, meal_type = :type, ration_type_id = :rtid, description = :desc WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':id' => $id,
                ':name' => $data['name'],
                ':type' => $data['meal_type'] ?? '',
                ':rtid' => $data['ration_type_id'] ?? null,
                ':desc' => $data['description'] ?? ''
            ]);

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

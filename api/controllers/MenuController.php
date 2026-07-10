<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class MenuController
{
    private $conn;

    public function __construct()
    {
        $this->conn = Database::getInstance()->getConnection();
    }

    /**
     * Obtener el ID del PAE desde el token JWT
     */
    private function getPaeIdFromToken()
    {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
            $token = $matches[1];
            try {
                $decoded = \Utils\JWT::decode($token);
                // Si el objeto decodificado tiene una propiedad 'data'
                if (is_object($decoded) && isset($decoded->data->pae_id)) {
                    return $decoded->data->pae_id;
                }
                // Si el objeto decodificado es un array (JWT::decode devuelve array en la versión actual)
                if (is_array($decoded) && isset($decoded['data']['pae_id'])) {
                    return $decoded['data']['pae_id'];
                }
                return null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * GET /api/menu-cycles - Listar ciclos de menús
     */
    public function getCycles()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            // Si es Super Admin (pae_id null), ve todos. Si es Admin PAE, solo los suyos.
            $query = "SELECT * FROM menu_cycles" . ($pae_id ? " WHERE pae_id = :pae_id" : "") . " ORDER BY start_date DESC";
            $stmt = $this->conn->prepare($query);
            if ($pae_id)
                $stmt->bindParam(':pae_id', $pae_id);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getCycleDays($cycle_id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            // Validar que el ciclo pertenezca al PAE
            $stmtCheck = $this->conn->prepare("SELECT id FROM menu_cycles WHERE id = ? AND pae_id = ?");
            $stmtCheck->execute([$cycle_id, $pae_id]);
            if (!$stmtCheck->fetch()) {
                throw new Exception("Ciclo no encontrado o no autorizado");
            }

            // Obtener todos los menus del ciclo con sus recetas y raciones
            $query = "SELECT m.id as menu_id, m.day_number, m.name as day_name,
                             mr.recipe_id, mr.meal_type, mr.ration_type_id,
                             r.name as recipe_name, r.description as recipe_description, rt.name as ration_type_name
                      FROM menus m
                      LEFT JOIN menu_recipes mr ON m.id = mr.menu_id
                      LEFT JOIN recipes r ON mr.recipe_id = r.id
                      LEFT JOIN pae_ration_types rt ON mr.ration_type_id = rt.id
                      WHERE m.cycle_id = :cycle_id AND m.pae_id = :pae_id
                      ORDER BY m.day_number, rt.id, mr.meal_type";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':cycle_id', $cycle_id);
            $stmt->bindParam(':pae_id', $pae_id);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Organizar por día para el frontend
            $days = [];
            foreach ($results as $row) {
                $dayNum = $row['day_number'];
                if (!isset($days[$dayNum])) {
                    $days[$dayNum] = [
                        'day' => $dayNum,
                        'name' => $row['day_name'],
                        'meals' => []
                    ];
                }
                if ($row['recipe_id']) {
                    $days[$dayNum]['meals'][] = [
                        'meal_type' => $row['ration_type_name'] ?: $row['meal_type'],
                        'name' => $row['recipe_name'],
                        'description' => $row['recipe_description'],
                        'ration_type_id' => $row['ration_type_id']
                    ];
                }
            }

            echo json_encode([
                'success' => true,
                'data' => array_values($days)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/menus/{id} - Detalle de un menú con sus ingredientes
     */
    public function getMenuDetail($menu_id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            // 1. Datos básicos del menú (Filtrando por PAE)
            $query = "SELECT * FROM menus WHERE id = :id AND pae_id = :pae_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $menu_id);
            $stmt->bindParam(':pae_id', $pae_id);
            $stmt->execute();
            $menu = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$menu) {
                throw new Exception("Menú no encontrado");
            }

            // 2. Ingredientes (Explosión de víveres)
            $query = "SELECT 
                        mi.*, 
                        i.name as item_name, 
                        i.code as item_code,
                        mu.abbreviation as unit,
                        fg.name as food_group
                      FROM menu_items mi
                      JOIN items i ON mi.item_id = i.id
                      JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                      JOIN food_groups fg ON i.food_group_id = fg.id
                      WHERE mi.menu_id = :menu_id
                      ORDER BY mi.display_order";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':menu_id', $menu_id);
            $stmt->execute();
            $menu['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $menu
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * PUT /api/menus/{id} - Actualizar datos básicos de una minuta
     */
    public function update($id)
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();

            $query = "UPDATE menus SET 
                        name = :name, 
                        ration_type_id = :ration_type_id,
                        meal_type = :meal_type,
                        day_number = :day_number,
                        age_group = :age_group
                      WHERE id = :id AND pae_id = :pae_id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':name', $data['name']);
            $stmt->bindParam(':ration_type_id', $data['ration_type_id']);
            $stmt->bindParam(':meal_type', $data['meal_type']);
            $stmt->bindParam(':day_number', $data['day_number']);
            $stmt->bindParam(':age_group', $data['age_group']);
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':pae_id', $pae_id);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => 'Minuta actualizada']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/menus/{id}/items - Gestionar ingredientes de la minuta
     */
    public function manageItems($menu_id)
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $items = $data['items'] ?? [];
            $pae_id = $this->getPaeIdFromToken();

            $this->conn->beginTransaction();

            // 1. Validar que todos los items existan en la tabla 'items' y pertenezcan al PAE
            // Esto evita la inconsistencia detectada donde se enviaban IDs de recetas
            if (!empty($items)) {
                $itemIds = array_column($items, 'item_id');
                $placeholders = implode(',', array_fill(0, count($itemIds), '?'));
                $stmtCheck = $this->conn->prepare("SELECT id FROM items WHERE id IN ($placeholders) AND pae_id = ?");
                $stmtCheck->execute(array_merge($itemIds, [$pae_id]));
                $validIds = $stmtCheck->fetchAll(PDO::FETCH_COLUMN);

                foreach ($items as $it) {
                    if (!in_array($it['item_id'], $validIds)) {
                        throw new Exception("El ID de ingrediente " . $it['item_id'] . " no es válido o no pertenece a este programa. Asegúrese de no estar enviando IDs de recetas.");
                    }
                }
            }

            // 2. Limpiar ingredientes actuales
            $query = "DELETE FROM menu_items WHERE menu_id = :menu_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':menu_id', $menu_id, PDO::PARAM_INT);
            $stmt->execute();

            // 3. Agrupar ingredientes duplicados antes de insertar
            $groupedItems = [];
            foreach ($items as $item) {
                $id = $item['item_id'];
                if (isset($groupedItems[$id])) {
                    $groupedItems[$id]['quantity'] += floatval($item['quantity']);
                    // Concatenar preparaciones si son diferentes
                    if ($item['preparation'] && strpos($groupedItems[$id]['preparation'], $item['preparation']) === false) {
                        $groupedItems[$id]['preparation'] .= ", " . $item['preparation'];
                    }
                } else {
                    $groupedItems[$id] = [
                        'item_id' => $id,
                        'quantity' => floatval($item['quantity']),
                        'preparation' => $item['preparation']
                    ];
                }
            }

            // 4. Insertar nuevos ingredientes
            $query = "INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) 
                      VALUES (:menu_id, :item_id, :quantity, :preparation)";
            $stmt = $this->conn->prepare($query);

            foreach ($groupedItems as $item) {
                $stmt->bindValue(':menu_id', $menu_id, PDO::PARAM_INT);
                $stmt->bindValue(':item_id', $item['item_id'], PDO::PARAM_INT);
                $stmt->bindValue(':quantity', $item['quantity']);
                $stmt->bindValue(':preparation', $item['preparation']);
                $stmt->execute();
            }

            // 5. Recalcular Totales Nutricionales
            $queryTotal = "UPDATE menus m 
                           SET 
                            total_calories = (SELECT IFNULL(SUM(mi.standard_quantity * i.calories / 100), 0) FROM menu_items mi JOIN items i ON mi.item_id = i.id WHERE mi.menu_id = :m1),
                            total_proteins = (SELECT IFNULL(SUM(mi.standard_quantity * i.proteins / 100) , 0) FROM menu_items mi JOIN items i ON mi.item_id = i.id WHERE mi.menu_id = :m2),
                            total_carbohydrates = (SELECT IFNULL(SUM(mi.standard_quantity * i.carbohydrates / 100), 0) FROM menu_items mi JOIN items i ON mi.item_id = i.id WHERE mi.menu_id = :m3),
                            total_fats = (SELECT IFNULL(SUM(mi.standard_quantity * i.fats / 100), 0) FROM menu_items mi JOIN items i ON mi.item_id = i.id WHERE mi.menu_id = :m4)
                           WHERE id = :id";

            $stmtTotal = $this->conn->prepare($queryTotal);
            $stmtTotal->bindValue(':m1', $menu_id, PDO::PARAM_INT);
            $stmtTotal->bindValue(':m2', $menu_id, PDO::PARAM_INT);
            $stmtTotal->bindValue(':m3', $menu_id, PDO::PARAM_INT);
            $stmtTotal->bindValue(':m4', $menu_id, PDO::PARAM_INT);
            $stmtTotal->bindValue(':id', $menu_id, PDO::PARAM_INT);
            $stmtTotal->execute();

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Ingredientes actualizados y nutrición recalculada']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/menu-cycles - Crear un nuevo ciclo y generar sus 20 días
     */
    public function storeCycle()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();

            if (!$pae_id) {
                // Si es SuperAdmin y no envió pae_id, error
                $pae_id = $data['pae_id'] ?? null;
                if (!$pae_id)
                    throw new Exception("Debe especificar un programa PAE");
            }

            $this->conn->beginTransaction();

            // 1. Crear el Ciclo
            $query = "INSERT INTO menu_cycles (pae_id, name, description, start_date, end_date, status) 
                      VALUES (:pae_id, :name, :description, :start_date, :end_date, 'ACTIVO')";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':name' => $data['name'],
                ':description' => $data['description'] ?? '',
                ':start_date' => $data['start_date'],
                ':end_date' => $data['end_date']
            ]);
            $cycle_id = $this->conn->lastInsertId();

            // 2. Generar 20 días automáticos con raciones dinámicas
            $rationTypes = $this->conn->query("SELECT * FROM pae_ration_types WHERE pae_id = " . intval($pae_id))->fetchAll(PDO::FETCH_ASSOC);

            $queryMenu = "INSERT INTO menus (pae_id, cycle_id, day_number, ration_type_id, meal_type, name) 
                          VALUES (:pae_id, :cycle_id, :day, :rt_id, :type, :name)";
            $stmtMenu = $this->conn->prepare($queryMenu);

            for ($i = 1; $i <= 20; $i++) {
                foreach ($rationTypes as $rt) {
                    $stmtMenu->execute([
                        ':pae_id' => $pae_id,
                        ':cycle_id' => $cycle_id,
                        ':day' => $i,
                        ':rt_id' => $rt['id'],
                        ':type' => $rt['name'],
                        ':name' => $rt['name'] . " Día $i"
                    ]);
                }
            }


            $this->conn->commit();
            echo json_encode([
                'success' => true,
                'message' => 'Ciclo creado correctamente con sus 20 días de planeación',
                'data' => ['id' => $cycle_id]
            ]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/menu-cycles/print/{id}
     */
    public function printCycle($id)
    {
        try {
            // 1. Datos del ciclo
            $stmt = $this->conn->prepare("SELECT * FROM menu_cycles WHERE id = ?");
            $stmt->execute([$id]);
            $cycle = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$cycle)
                throw new Exception("Ciclo no encontrado");

            // 2. Menús y recetas
            $query = "SELECT m.day_number, m.name as menu_name, 
                             mr.meal_type, r.name as recipe_name, rt.name as ration_name
                      FROM menus m
                      LEFT JOIN menu_recipes mr ON m.id = mr.menu_id
                      LEFT JOIN recipes r ON mr.recipe_id = r.id
                      LEFT JOIN pae_ration_types rt ON mr.ration_type_id = rt.id
                      WHERE m.cycle_id = ?
                      ORDER BY m.day_number, rt.id, mr.meal_type";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$id]);
            $menus = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Vista simple de impresión
            header("Content-Type: text/html; charset=UTF-8");
            echo "<html><head><title>Plan de Alimentación - {$cycle['name']}</title>";
            echo "<style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #f4f4f4; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                @media print { .btn-print { display: none; } }
            </style></head><body>";

            echo "<div class='header'>";
            echo "<h2>PLAN DE ALIMENTACIÓN MENSUAL</h2>";
            echo "<h3>Ciclo: {$cycle['name']}</h3>";
            echo "<p>Periodo: {$cycle['start_date']} al {$cycle['end_date']} | Días hábiles: {$cycle['total_days']}</p>";
            echo "<button class='btn-print' onclick='window.print()'>Imprimir Reporte</button>";
            echo "</div>";

            echo "<table><thead><tr><th>Día</th><th>Tipo</th><th>Menú</th><th>Receta</th></tr></thead><tbody>";
            foreach ($menus as $m) {
                echo "<tr>
                    <td>Día {$m['day_number']}</td>
                    <td><b>" . ($m['ration_name'] ?: $m['meal_type']) . "</b></td>
                    <td>{$m['menu_name']}</td>
                    <td>" . ($m['recipe_name'] ?? '<i>No asignada</i>') . "</td>
                </tr>";
            }
            echo "</tbody></table></body></html>";
        } catch (Exception $e) {
            echo "Error al generar reporte: " . $e->getMessage();
        }
    }

    /**
     * POST /api/menus/{id}/explode
     * Toma una receta maestra y "explota" sus ingredientes en el detalle del menú
     */
    public function explodeRecipe($menu_id)
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $recipe_id = $data['recipe_id'] ?? null;

            if (!$recipe_id)
                throw new Exception("Se requiere recipe_id para la explosión.");

            $this->conn->beginTransaction();

            // 1. Obtener grupo etario del menú para saber qué gramaje usar
            $stmtMenu = $this->conn->prepare("SELECT age_group FROM menus WHERE id = ?");
            $stmtMenu->execute([$menu_id]);
            $age_group = $stmtMenu->fetchColumn() ?: 'SECUNDARIA';

            // 2. Obtener ingredientes de la receta para ese grupo etario
            $stmtRecipe = $this->conn->prepare("
                SELECT item_id, quantity, preparation_method 
                FROM recipe_items 
                WHERE recipe_id = ? AND age_group = ?
            ");
            $stmtRecipe->execute([$recipe_id, $age_group]);
            $ingredients = $stmtRecipe->fetchAll(PDO::FETCH_ASSOC);

            if (!$ingredients) {
                // Si no hay para ese grupo, intentar con SECUNDARIA como fallback
                $stmtRecipe->execute([$recipe_id, 'SECUNDARIA']);
                $ingredients = $stmtRecipe->fetchAll(PDO::FETCH_ASSOC);
            }

            if (!$ingredients)
                throw new Exception("La receta seleccionada no tiene ingredientes configurados para el grupo $age_group.");

            // 3. Limpiar ingredientes actuales del menú
            $this->conn->prepare("DELETE FROM menu_items WHERE menu_id = ?")->execute([$menu_id]);

            // 4. Insertar ingredientes explotados
            $stmtInsert = $this->conn->prepare("
                INSERT INTO menu_items (menu_id, item_id, standard_quantity, preparation_method) 
                VALUES (?, ?, ?, ?)
            ");

            foreach ($ingredients as $ing) {
                $stmtInsert->execute([
                    $menu_id,
                    $ing['item_id'],
                    $ing['quantity'],
                    $ing['preparation_method']
                ]);
            }

            // 5. Vincular la receta al menú en menu_recipes si no existe
            $stmtCheck = $this->conn->prepare("SELECT id FROM menu_recipes WHERE menu_id = ? AND recipe_id = ?");
            $stmtCheck->execute([$menu_id, $recipe_id]);
            if (!$stmtCheck->fetch()) {
                // Obtener meal_type y ration_type de la receta
                $stmtR = $this->conn->prepare("SELECT meal_type, ration_type_id FROM recipes WHERE id = ?");
                $stmtR->execute([$recipe_id]);
                $recipeInfo = $stmtR->fetch(PDO::FETCH_ASSOC);

                $stmtMR = $this->conn->prepare("INSERT INTO menu_recipes (menu_id, recipe_id, meal_type, ration_type_id) VALUES (?, ?, ?, ?)");
                $stmtMR->execute([
                    $menu_id,
                    $recipe_id,
                    $recipeInfo['meal_type'] ?? 'ALMUERZO',
                    $recipeInfo['ration_type_id']
                ]);
            }

            // 6. Recalcular nutrición
            $this->recalculateMenuNutrition($menu_id);

            $this->conn->commit();

            echo json_encode(['success' => true, 'message' => 'Receta explotada exitosamente en el menú diario']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function recalculateMenuNutrition($menu_id)
    {
        $queryTotal = "UPDATE menus m 
                       SET 
                        total_calories = (SELECT IFNULL(SUM(mi.standard_quantity * i.calories / 100), 0) FROM menu_items mi JOIN items i ON mi.item_id = i.id WHERE mi.menu_id = :m1),
                        total_proteins = (SELECT IFNULL(SUM(mi.standard_quantity * i.proteins / 100) , 0) FROM menu_items mi JOIN items i ON mi.item_id = i.id WHERE mi.menu_id = :m2),
                        total_carbohydrates = (SELECT IFNULL(SUM(mi.standard_quantity * i.carbohydrates / 100), 0) FROM menu_items mi JOIN items i ON mi.item_id = i.id WHERE mi.menu_id = :m3),
                        total_fats = (SELECT IFNULL(SUM(mi.standard_quantity * i.fats / 100), 0) FROM menu_items mi JOIN items i ON mi.item_id = i.id WHERE mi.menu_id = :m4)
                       WHERE id = :id";

        $stmtTotal = $this->conn->prepare($queryTotal);
        $stmtTotal->execute([':m1' => $menu_id, ':m2' => $menu_id, ':m3' => $menu_id, ':m4' => $menu_id, ':id' => $menu_id]);
    }
}

<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use PDO;
use PDOException;
use Exception;

class ItemController
{
    private $conn;

    public function __construct()
    {
        $database = Database::getInstance();
        $this->conn = $database->getConnection();
    }

    /**
     * Extrae el pae_id del token JWT
     */
    private function getPaeIdFromToken()
    {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
            try {
                $decoded = JWT::decode($matches[1]);
                if (is_object($decoded)) return $decoded->data->pae_id ?? null;
                if (is_array($decoded)) return $decoded['data']['pae_id'] ?? null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * GET /api/items - Listar todos los ítems del PAE
     */
    public function index()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            // Super Admin (sin pae_id) puede ver todos los ítems
            // PAE Admin solo ve sus propios ítems
            if ($pae_id) {
                $query = "SELECT 
                            i.*,
                            fg.name as food_group_name,
                            fg.color as food_group_color,
                            mu.name as measurement_unit_name,
                            mu.abbreviation as unit_abbr
                          FROM items i
                          LEFT JOIN food_groups fg ON i.food_group_id = fg.id
                          LEFT JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                          WHERE i.pae_id = :pae_id
                          ORDER BY fg.name, i.name";

                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(':pae_id', $pae_id, PDO::PARAM_INT);
            } else {
                // Super Admin: ver todos los ítems
                $query = "SELECT 
                            i.*,
                            fg.name as food_group_name,
                            fg.color as food_group_color,
                            mu.name as measurement_unit_name,
                            mu.abbreviation as unit_abbr
                          FROM items i
                          LEFT JOIN food_groups fg ON i.food_group_id = fg.id
                          LEFT JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                          ORDER BY fg.name, i.name";

                $stmt = $this->conn->prepare($query);
            }

            $stmt->execute();
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $items
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener ítems: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/items/{id} - Obtener un ítem específico
     */
    public function show($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            // Super Admin puede ver cualquier ítem
            // PAE Admin solo ve sus propios ítems
            if ($pae_id) {
                $query = "SELECT 
                            i.*,
                            fg.name as food_group_name,
                            mu.name as measurement_unit_name,
                            mu.abbreviation as unit_abbr
                          FROM items i
                          LEFT JOIN food_groups fg ON i.food_group_id = fg.id
                          LEFT JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                          WHERE i.id = :id AND i.pae_id = :pae_id";

                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->bindParam(':pae_id', $pae_id, PDO::PARAM_INT);
            } else {
                // Super Admin: ver cualquier ítem
                $query = "SELECT 
                            i.*,
                            fg.name as food_group_name,
                            mu.name as measurement_unit_name,
                            mu.abbreviation as unit_abbr
                          FROM items i
                          LEFT JOIN food_groups fg ON i.food_group_id = fg.id
                          LEFT JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                          WHERE i.id = :id";

                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            }

            $stmt->execute();
            $item = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($item) {
                echo json_encode([
                    'success' => true,
                    'data' => $item
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Ítem no encontrado'
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener ítem: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * POST /api/items - Crear nuevo ítem
     */
    public function store()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            // Super Admin puede crear ítems globales (pae_id = NULL)
            // PAE Admin crea ítems para su PAE

            $data = json_decode(file_get_contents("php://input"), true);

            // Validaciones básicas
            if (empty($data['name']) || empty($data['food_group_id']) || empty($data['measurement_unit_id'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Nombre, grupo de alimento y unidad de medida son obligatorios'
                ]);
                return;
            }

            // Normalizar nombre a MAYÚSCULAS
            $data['name'] = strtoupper(trim($data['name']));
            $data['code'] = (!empty($data['code'])) ? strtoupper(trim($data['code'])) : strtoupper(substr(preg_replace('/[^A-Z0-9]/', '', $data['name']), 0, 20));

            // Calcular porcentaje de desperdicio si no viene
            if (!isset($data['waste_percentage']) && isset($data['gross_weight']) && isset($data['net_weight'])) {
                $data['waste_percentage'] = (($data['gross_weight'] - $data['net_weight']) / $data['gross_weight']) * 100;
            }

            $query = "INSERT INTO items (
                        pae_id, code, name, description, food_group_id, measurement_unit_id,
                        gross_weight, net_weight, waste_percentage,
                        calories, proteins, carbohydrates, fats, fiber, iron, calcium, sodium,
                        vitamin_a, vitamin_c,
                        contains_gluten, contains_lactose, contains_peanuts, contains_seafood,
                        contains_eggs, contains_soy,
                        is_local_purchase, local_producer, sanitary_registry,
                        requires_refrigeration, is_perishable, shelf_life_days, unit_cost, status
                      ) VALUES (
                        :pae_id, :code, :name, :description, :food_group_id, :measurement_unit_id,
                        :gross_weight, :net_weight, :waste_percentage,
                        :calories, :proteins, :carbohydrates, :fats, :fiber, :iron, :calcium, :sodium,
                        :vitamin_a, :vitamin_c,
                        :contains_gluten, :contains_lactose, :contains_peanuts, :contains_seafood,
                        :contains_eggs, :contains_soy,
                        :is_local_purchase, :local_producer, :sanitary_registry,
                        :requires_refrigeration, :is_perishable, :shelf_life_days, :unit_cost, :status
                      )";

            $stmt = $this->conn->prepare($query);

            // Bind parameters
            $stmt->bindParam(':pae_id', $pae_id);
            $stmt->bindParam(':code', $data['code']);
            $stmt->bindParam(':name', $data['name']);
            $stmt->bindParam(':description', $data['description']);
            $stmt->bindParam(':food_group_id', $data['food_group_id']);
            $stmt->bindParam(':measurement_unit_id', $data['measurement_unit_id']);

            $gross_weight = $data['gross_weight'] ?? 100.00;
            $net_weight = $data['net_weight'] ?? 100.00;
            $waste_percentage = $data['waste_percentage'] ?? 0.00;
            $stmt->bindParam(':gross_weight', $gross_weight);
            $stmt->bindParam(':net_weight', $net_weight);
            $stmt->bindParam(':waste_percentage', $waste_percentage);

            $calories = $data['calories'] ?? 0.00;
            $proteins = $data['proteins'] ?? 0.00;
            $carbohydrates = $data['carbohydrates'] ?? 0.00;
            $fats = $data['fats'] ?? 0.00;
            $fiber = $data['fiber'] ?? 0.00;
            $iron = $data['iron'] ?? 0.00;
            $calcium = $data['calcium'] ?? 0.00;
            $sodium = $data['sodium'] ?? 0.00;
            $vitamin_a = $data['vitamin_a'] ?? 0.00;
            $vitamin_c = $data['vitamin_c'] ?? 0.00;

            $stmt->bindParam(':calories', $calories);
            $stmt->bindParam(':proteins', $proteins);
            $stmt->bindParam(':carbohydrates', $carbohydrates);
            $stmt->bindParam(':fats', $fats);
            $stmt->bindParam(':fiber', $fiber);
            $stmt->bindParam(':iron', $iron);
            $stmt->bindParam(':calcium', $calcium);
            $stmt->bindParam(':sodium', $sodium);
            $stmt->bindParam(':vitamin_a', $vitamin_a);
            $stmt->bindParam(':vitamin_c', $vitamin_c);

            $contains_gluten = $data['contains_gluten'] ?? false;
            $contains_lactose = $data['contains_lactose'] ?? false;
            $contains_peanuts = $data['contains_peanuts'] ?? false;
            $contains_seafood = $data['contains_seafood'] ?? false;
            $contains_eggs = $data['contains_eggs'] ?? false;
            $contains_soy = $data['contains_soy'] ?? false;

            $stmt->bindParam(':contains_gluten', $contains_gluten, PDO::PARAM_BOOL);
            $stmt->bindParam(':contains_lactose', $contains_lactose, PDO::PARAM_BOOL);
            $stmt->bindParam(':contains_peanuts', $contains_peanuts, PDO::PARAM_BOOL);
            $stmt->bindParam(':contains_seafood', $contains_seafood, PDO::PARAM_BOOL);
            $stmt->bindParam(':contains_eggs', $contains_eggs, PDO::PARAM_BOOL);
            $stmt->bindParam(':contains_soy', $contains_soy, PDO::PARAM_BOOL);

            $is_local_purchase = $data['is_local_purchase'] ?? false;
            $local_producer = $data['local_producer'] ?? null;
            $sanitary_registry = $data['sanitary_registry'] ?? null;
            $requires_refrigeration = $data['requires_refrigeration'] ?? false;
            $is_perishable = $data['is_perishable'] ?? false;
            $shelf_life_days = $data['shelf_life_days'] ?? null;
            $unit_cost = $data['unit_cost'] ?? 0.00;
            $status = $data['status'] ?? 'ACTIVO';

            $stmt->bindParam(':is_local_purchase', $is_local_purchase, PDO::PARAM_BOOL);
            $stmt->bindParam(':local_producer', $local_producer);
            $stmt->bindParam(':sanitary_registry', $sanitary_registry);
            $stmt->bindParam(':requires_refrigeration', $requires_refrigeration, PDO::PARAM_BOOL);
            $stmt->bindParam(':is_perishable', $is_perishable, PDO::PARAM_BOOL);
            $stmt->bindParam(':shelf_life_days', $shelf_life_days);
            $stmt->bindParam(':unit_cost', $unit_cost);
            $stmt->bindParam(':status', $status);

            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Ítem creado exitosamente',
                'id' => $this->conn->lastInsertId()
            ]);
        } catch (PDOException $e) {
            if ($e->errorInfo[1] == 1062) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Ya existe un ítem con ese código'
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error de base de datos (' . $e->errorInfo[1] . '): ' . $e->getMessage()
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al crear ítem: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * PUT /api/items/{id} - Actualizar ítem
     */
    public function update($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            // Super Admin puede editar cualquier ítem
            // PAE Admin solo edita sus propios ítems

            $data = json_decode(file_get_contents("php://input"), true);

            // Normalizar nombre
            if (isset($data['name'])) {
                $data['name'] = strtoupper(trim($data['name']));
            }

            // Calcular porcentaje de desperdicio
            if (isset($data['gross_weight']) && isset($data['net_weight'])) {
                $data['waste_percentage'] = (($data['gross_weight'] - $data['net_weight']) / $data['gross_weight']) * 100;
            }

            $query = "UPDATE items SET
                        name = :name,
                        description = :description,
                        food_group_id = :food_group_id,
                        measurement_unit_id = :measurement_unit_id,
                        gross_weight = :gross_weight,
                        net_weight = :net_weight,
                        waste_percentage = :waste_percentage,
                        calories = :calories,
                        proteins = :proteins,
                        carbohydrates = :carbohydrates,
                        fats = :fats,
                        fiber = :fiber,
                        iron = :iron,
                        calcium = :calcium,
                        sodium = :sodium,
                        vitamin_a = :vitamin_a,
                        vitamin_c = :vitamin_c,
                        contains_gluten = :contains_gluten,
                        contains_lactose = :contains_lactose,
                        contains_peanuts = :contains_peanuts,
                        contains_seafood = :contains_seafood,
                        contains_eggs = :contains_eggs,
                        contains_soy = :contains_soy,
                        is_local_purchase = :is_local_purchase,
                        local_producer = :local_producer,
                        sanitary_registry = :sanitary_registry,
                        requires_refrigeration = :requires_refrigeration,
                        is_perishable = :is_perishable,
                        shelf_life_days = :shelf_life_days,
                        unit_cost = :unit_cost,
                        status = :status
                      WHERE id = :id" . ($pae_id ? " AND pae_id = :pae_id" : "");

            $stmt = $this->conn->prepare($query);

            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            if ($pae_id) {
                $stmt->bindParam(':pae_id', $pae_id, PDO::PARAM_INT);
            }
            $stmt->bindParam(':name', $data['name']);
            $stmt->bindParam(':description', $data['description']);
            $stmt->bindParam(':food_group_id', $data['food_group_id']);
            $stmt->bindParam(':measurement_unit_id', $data['measurement_unit_id']);
            $stmt->bindParam(':gross_weight', $data['gross_weight']);
            $stmt->bindParam(':net_weight', $data['net_weight']);
            $stmt->bindParam(':waste_percentage', $data['waste_percentage']);
            $stmt->bindParam(':calories', $data['calories']);
            $stmt->bindParam(':proteins', $data['proteins']);
            $stmt->bindParam(':carbohydrates', $data['carbohydrates']);
            $stmt->bindParam(':fats', $data['fats']);
            $stmt->bindParam(':fiber', $data['fiber']);
            $stmt->bindParam(':iron', $data['iron']);
            $stmt->bindParam(':calcium', $data['calcium']);
            $stmt->bindParam(':sodium', $data['sodium']);
            $stmt->bindParam(':vitamin_a', $data['vitamin_a']);
            $stmt->bindParam(':vitamin_c', $data['vitamin_c']);
            $stmt->bindParam(':contains_gluten', $data['contains_gluten'], PDO::PARAM_BOOL);
            $stmt->bindParam(':contains_lactose', $data['contains_lactose'], PDO::PARAM_BOOL);
            $stmt->bindParam(':contains_peanuts', $data['contains_peanuts'], PDO::PARAM_BOOL);
            $stmt->bindParam(':contains_seafood', $data['contains_seafood'], PDO::PARAM_BOOL);
            $stmt->bindParam(':contains_eggs', $data['contains_eggs'], PDO::PARAM_BOOL);
            $stmt->bindParam(':contains_soy', $data['contains_soy'], PDO::PARAM_BOOL);
            $stmt->bindParam(':is_local_purchase', $data['is_local_purchase'], PDO::PARAM_BOOL);
            $stmt->bindParam(':local_producer', $data['local_producer']);
            $stmt->bindParam(':sanitary_registry', $data['sanitary_registry']);
            $stmt->bindParam(':requires_refrigeration', $data['requires_refrigeration'], PDO::PARAM_BOOL);
            $stmt->bindParam(':is_perishable', $data['is_perishable'], PDO::PARAM_BOOL);
            $stmt->bindParam(':shelf_life_days', $data['shelf_life_days']);
            $stmt->bindParam(':unit_cost', $data['unit_cost']);
            $stmt->bindParam(':status', $data['status']);

            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Ítem actualizado exitosamente'
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Ítem no encontrado o sin cambios'
                ]);
            }
        } catch (PDOException $e) {
            if ($e->errorInfo[1] == 1062) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Ya existe un ítem con ese código'
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error de base de datos (' . $e->errorInfo[1] . '): ' . $e->getMessage()
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al actualizar ítem: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * DELETE /api/items/{id} - Eliminar ítem
     */
    public function destroy($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            // Super Admin puede eliminar cualquier ítem
            // PAE Admin solo elimina sus propios ítems

            $query = "DELETE FROM items WHERE id = :id" . ($pae_id ? " AND pae_id = :pae_id" : "");
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            if ($pae_id) {
                $stmt->bindParam(':pae_id', $pae_id, PDO::PARAM_INT);
            }
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Ítem eliminado exitosamente'
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Ítem no encontrado'
                ]);
            }
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'No se puede eliminar el ítem porque está siendo usado en minutas'
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al eliminar ítem: ' . $e->getMessage()
                ]);
            }
        }
    }

    /**
     * GET /api/items/food-groups - Obtener grupos de alimentos
     */
    public function getFoodGroups()
    {
        try {
            $query = "SELECT * FROM food_groups ORDER BY name";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();

            $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $groups
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener grupos de alimentos: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/items/measurement-units - Obtener unidades de medida
     */
    public function getMeasurementUnits()
    {
        try {
            $query = "SELECT * FROM measurement_units ORDER BY type, name";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();

            $units = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $units
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener unidades de medida: ' . $e->getMessage()
            ]);
        }
    }
}

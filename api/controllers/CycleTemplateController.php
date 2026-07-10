<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class CycleTemplateController
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
                if (is_object($decoded)) return $decoded->data->pae_id ?? null;
                if (is_array($decoded)) return $decoded['data']['pae_id'] ?? null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * GET /api/cycle-templates - Listar plantillas
     */
    public function index()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $query = "SELECT * FROM cycle_templates WHERE pae_id = :pae_id ORDER BY created_at DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':pae_id', $pae_id);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/cycle-templates/{id} - Detalle de plantilla con sus días
     */
    public function show($id)
    {
        try {
            $query = "SELECT * FROM cycle_templates WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $id);
            $stmt->execute();
            $template = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$template) throw new Exception("Plantilla no encontrada");

            // Obtener los días y sus recetas relacionadas
            $queryDays = "SELECT ctd.*, r.name as recipe_name, r.meal_type as recipe_type 
                          FROM cycle_template_days ctd
                          JOIN recipes r ON ctd.recipe_id = r.id
                          WHERE ctd.template_id = :id
                          ORDER BY ctd.day_number ASC, ctd.meal_type DESC";
            $stmtDays = $this->conn->prepare($queryDays);
            $stmtDays->bindValue(':id', $id);
            $stmtDays->execute();
            $template['days'] = $stmtDays->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $template]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/cycle-templates - Crear plantilla
     */
    public function store()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();

            $this->conn->beginTransaction();

            $query = "INSERT INTO cycle_templates (pae_id, name) VALUES (:pae_id, :name)";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':name' => $data['name']
            ]);
            $template_id = $this->conn->lastInsertId();

            if (isset($data['days']) && is_array($data['days'])) {
                $queryDay = "INSERT INTO cycle_template_days (template_id, day_number, ration_type_id, meal_type, recipe_id) 
                             VALUES (:tid, :day, :rtid, :type, :rid)";
                $stmtDay = $this->conn->prepare($queryDay);
                foreach ($data['days'] as $day) {
                    $stmtDay->execute([
                        ':tid' => $template_id,
                        ':day' => $day['day_number'],
                        ':rtid' => $day['ration_type_id'] ?? null,
                        ':type' => $day['meal_type'] ?? '',
                        ':rid' => $day['recipe_id']
                    ]);
                }
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Plantilla creada exitosamente', 'id' => $template_id]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * PUT /api/cycle-templates/{id} - Actualizar plantilla
     */
    public function update($id)
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $this->conn->beginTransaction();

            // Actualizar nombre
            $query = "UPDATE cycle_templates SET name = :name WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':id' => $id, ':name' => $data['name']]);

            // Reemplazar días
            $this->conn->prepare("DELETE FROM cycle_template_days WHERE template_id = ?")->execute([$id]);

            if (isset($data['days']) && is_array($data['days'])) {
                $queryDay = "INSERT INTO cycle_template_days (template_id, day_number, ration_type_id, meal_type, recipe_id) 
                             VALUES (:tid, :day, :rtid, :type, :rid)";
                $stmtDay = $this->conn->prepare($queryDay);
                foreach ($data['days'] as $day) {
                    $stmtDay->execute([
                        ':tid' => $id,
                        ':day' => $day['day_number'],
                        ':rtid' => $day['ration_type_id'] ?? null,
                        ':type' => $day['meal_type'] ?? '',
                        ':rid' => $day['recipe_id']
                    ]);
                }
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Plantilla actualizada']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * DELETE /api/cycle-templates/{id} - Eliminar
     */
    public function delete($id)
    {
        try {
            $stmt = $this->conn->prepare("DELETE FROM cycle_templates WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Plantilla eliminada']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

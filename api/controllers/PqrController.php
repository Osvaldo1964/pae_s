<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class PqrController
{
    /**
     * GET /api/pqrs
     * Lista todas las PQRs del programa del usuario autenticado.
     */
    public function index()
    {
        $decoded = $this->requireAuth();
        if (!$decoded) return;

        $pae_id = (int) $decoded['data']['pae_id'];

        try {
            $db = Database::getInstance()->getConnection();

            $query = "SELECT p.id, p.type, p.email, p.message, p.status, p.created_at
                      FROM pqrs p
                      WHERE p.pae_id = :pae_id
                      ORDER BY p.created_at DESC";

            $stmt = $db->prepare($query);
            $stmt->bindParam(':pae_id', $pae_id, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            http_response_code(200);
            echo json_encode($rows);
        } catch (Exception $e) {
            error_log('PQR index error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Error interno del servidor']);
        }
    }

    /**
     * PUT /api/pqrs/{id}
     * Actualiza el estado de una PQR (ej. Respondida) y guarda la respuesta.
     */
    public function update($id)
    {
        $decoded = $this->requireAuth();
        if (!$decoded) return;

        $pae_id = (int) $decoded['data']['pae_id'];
        $data = json_decode(file_get_contents("php://input"));

        if (empty($data->status)) {
            http_response_code(400);
            echo json_encode(['message' => 'El campo status es requerido']);
            return;
        }

        $allowedStatuses = ['Pendiente', 'En Revisión', 'Respondida', 'Cerrada'];
        if (!in_array($data->status, $allowedStatuses)) {
            http_response_code(400);
            echo json_encode(['message' => 'Estado no permitido']);
            return;
        }

        try {
            $db = Database::getInstance()->getConnection();

            // Verificar que la PQR pertenezca al programa del usuario
            $check = $db->prepare("SELECT id FROM pqrs WHERE id = :id AND pae_id = :pae_id");
            $check->bindParam(':id', $id, PDO::PARAM_INT);
            $check->bindParam(':pae_id', $pae_id, PDO::PARAM_INT);
            $check->execute();

            if (!$check->fetch()) {
                http_response_code(403);
                echo json_encode(['message' => 'PQR no encontrada o no autorizada']);
                return;
            }

            $status = htmlspecialchars(strip_tags($data->status));
            $response = !empty($data->response) ? htmlspecialchars(strip_tags($data->response)) : null;

            // Agregar columna response si existe
            if ($response !== null) {
                $stmt = $db->prepare("UPDATE pqrs SET status = :status, response = :response WHERE id = :id");
                $stmt->bindParam(':response', $response);
            } else {
                $stmt = $db->prepare("UPDATE pqrs SET status = :status WHERE id = :id");
            }

            $stmt->bindParam(':status', $status);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            http_response_code(200);
            echo json_encode(['message' => 'PQR actualizada correctamente']);
        } catch (Exception $e) {
            error_log('PQR update error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Error al actualizar la PQR']);
        }
    }

    /**
     * Valida el JWT del header Authorization y retorna el payload decodificado.
     */
    private function requireAuth()
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';

        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            http_response_code(401);
            echo json_encode(['message' => 'Token requerido']);
            return null;
        }

        require_once __DIR__ . '/../utils/JWT.php';
        $decoded = \Utils\JWT::decode($matches[1]);

        if (!$decoded || empty($decoded['data']['pae_id'])) {
            http_response_code(401);
            echo json_encode(['message' => 'Token inválido']);
            return null;
        }

        return $decoded;
    }
}

<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class PublicController
{

    public function submitPQR()
    {
        $data = json_decode(file_get_contents("php://input"));

        if (!empty($data->pae_id) && !empty($data->email) && !empty($data->message) && !empty($data->type)) {
            try {
                $db = Database::getInstance()->getConnection();
                
                $query = "INSERT INTO pqrs (pae_id, type, email, message) VALUES (:pae_id, :type, :email, :message)";
                $stmt = $db->prepare($query);
                
                // Sanitización básica
                $pae_id = htmlspecialchars(strip_tags($data->pae_id));
                $type = htmlspecialchars(strip_tags($data->type));
                $email = filter_var($data->email, FILTER_SANITIZE_EMAIL);
                $message = htmlspecialchars(strip_tags($data->message));

                $stmt->bindParam(":pae_id", $pae_id);
                $stmt->bindParam(":type", $type);
                $stmt->bindParam(":email", $email);
                $stmt->bindParam(":message", $message);

                if ($stmt->execute()) {
                    $radicadoId = $db->lastInsertId();
                    $radicadoStr = str_pad($radicadoId, 6, "0", STR_PAD_LEFT);
                    
                    // Aquí se puede integrar PHPMailer en el futuro para enviar notificación
                    // al administrador del programa correspondiente.

                    http_response_code(200);
                    echo json_encode(["message" => "PQR enviada correctamente. Su número de radicado es #" . $radicadoStr]);
                } else {
                    http_response_code(503);
                    echo json_encode(["message" => "No se pudo guardar la PQR. Intente nuevamente."]);
                }
            } catch (Exception $e) {
                error_log("PQR DB Error: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(["message" => "Error interno del servidor al procesar la PQR."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Datos incompletos"]);
        }
    }

    public function getPqrCount()
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            http_response_code(401);
            echo json_encode(['count' => 0]);
            return;
        }

        require_once __DIR__ . '/../utils/JWT.php';
        $decoded = \Utils\JWT::decode($matches[1]);

        if (!$decoded || empty($decoded['data']['pae_id'])) {
            http_response_code(401);
            echo json_encode(['count' => 0]);
            return;
        }

        $pae_id = (int) $decoded['data']['pae_id'];

        try {
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("SELECT COUNT(*) as total FROM pqrs WHERE pae_id = :pae_id AND status = 'Pendiente'");
            $stmt->bindParam(':pae_id', $pae_id, PDO::PARAM_INT);
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            http_response_code(200);
            echo json_encode(['count' => (int) $row['total']]);
        } catch (Exception $e) {
            error_log('PQR Count Error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['count' => 0]);
        }
    }
}

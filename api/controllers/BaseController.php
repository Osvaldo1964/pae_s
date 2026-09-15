<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use Exception;

class BaseController
{
    protected $conn;
    protected $tokenData = null;
    protected $tokenParsed = false;

    public function __construct()
    {
        $this->conn = Database::getInstance()->getConnection();
    }

    /**
     * Obtener el Bearer Token desde cualquier cabecera soportada por el servidor
     * Compatible con Apache, Nginx, LiteSpeed, FastCGI y Hostinger
     */
    protected function getBearerToken()
    {
        $authHeader = null;

        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = trim($_SERVER['HTTP_AUTHORIZATION']);
        } elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
        } elseif (!empty($_SERVER['Authorization'])) {
            $authHeader = trim($_SERVER['Authorization']);
        } elseif (function_exists('getallheaders')) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
        } elseif (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $headers = array_combine(array_map('ucwords', array_keys($headers)), array_values($headers));
            $authHeader = $headers['Authorization'] ?? null;
        }

        if (!$authHeader) {
            return null;
        }

        if (preg_match('/Bearer\s(\S+)/i', $authHeader, $matches)) {
            return $matches[1];
        }

        $parts = explode(" ", $authHeader);
        return isset($parts[1]) ? trim($parts[1]) : null;
    }

    /**
     * Decodificar y cachear los datos del token en la instancia actual
     */
    protected function getTokenData()
    {
        if ($this->tokenParsed) {
            return $this->tokenData;
        }

        $this->tokenParsed = true;
        $jwt = $this->getBearerToken();

        if ($jwt) {
            try {
                $decoded = JWT::decode($jwt);
                if (is_object($decoded)) {
                    $decoded = json_decode(json_encode($decoded), true);
                }
                if (is_array($decoded) && isset($decoded['data'])) {
                    $this->tokenData = $decoded['data'];
                }
            } catch (Exception $e) {
                $this->tokenData = null;
            }
        }

        return $this->tokenData;
    }

    /**
     * Obtener el ID del programa PAE desde el token
     * @return int|null
     */
    protected function getPaeIdFromToken()
    {
        $data = $this->getTokenData();
        return isset($data['pae_id']) && $data['pae_id'] !== '' ? intval($data['pae_id']) : null;
    }

    /**
     * Obtener el ID del usuario autenticado desde el token
     * @return int|null
     */
    protected function getUserIdFromToken()
    {
        $data = $this->getTokenData();
        return isset($data['id']) && $data['id'] !== '' ? intval($data['id']) : null;
    }

    /**
     * Obtener el Role ID del usuario autenticado desde el token
     * @return int|null
     */
    protected function getUserRoleIdFromToken()
    {
        $data = $this->getTokenData();
        return isset($data['role_id']) && $data['role_id'] !== '' ? intval($data['role_id']) : null;
    }

    /**
     * Obtener el cuerpo de la petición como JSON decodificado
     * @return array
     */
    protected function getJsonInput()
    {
        $raw = file_get_contents("php://input");
        if (empty($raw)) {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Respuesta JSON exitosa estandarizada
     */
    protected function sendResponse($data, $code = 200)
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data);
    }

    /**
     * Respuesta JSON de error estandarizada
     */
    protected function sendError($message, $code = 400, $extra = [])
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=UTF-8');
        $payload = array_merge(["success" => false, "message" => $message], $extra);
        echo json_encode($payload);
    }

    /**
     * Respuesta JSON de éxito con mensaje estandarizada
     */
    protected function sendSuccess($message, $data = null, $code = 200)
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=UTF-8');
        $payload = ["success" => true, "message" => $message];
        if (!is_null($data)) {
            $payload["data"] = $data;
        }
        echo json_encode($payload);
    }
}

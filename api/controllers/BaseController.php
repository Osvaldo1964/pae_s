<?php

namespace Controllers;

use Config\Database;
use Utils\JWT;
use Exception;

class BaseController
{
    protected $conn;

    public function __construct()
    {
        $this->conn = Database::getInstance()->getConnection();
    }

    /**
     * Get PAE ID from JWT Token
     * @return int|null
     */
    protected function getPaeIdFromToken()
    {
        $headers = null;
        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        } else if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } elseif (function_exists('apache_request_headers')) {
            $requestHeaders = apache_request_headers();
            $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
            if (isset($requestHeaders['Authorization'])) {
                $headers = trim($requestHeaders['Authorization']);
            }
        }

        if (!$headers)
            return null;

        $arr = explode(" ", $headers);
        $jwt = isset($arr[1]) ? $arr[1] : "";

        if ($jwt) {
            try {
                $decoded = JWT::decode($jwt);
                return $decoded['data']['pae_id'] ?? null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Standardized JSON success response
     */
    protected function sendResponse($data, $code = 200)
    {
        http_response_code($code);
        echo json_encode($data);
    }

    /**
     * Standardized JSON error response
     */
    protected function sendError($message, $code = 400)
    {
        http_response_code($code);
        echo json_encode(["message" => $message]);
    }
}

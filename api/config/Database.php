<?php
namespace Config;

use PDO;
use PDOException;

use Utils\Env;

class Database
{
    private $host;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    // Singleton instance
    private static $instance = null;

    private function __construct()
    {
        Env::load(__DIR__ . '/../.env');
        $this->host = Env::get('DB_HOST', 'localhost');
        $this->db_name = Env::get('DB_NAME', 'db-pae');
        $this->username = Env::get('DB_USER', 'root');
        $this->password = Env::get('DB_PASS', '');
    }

    public static function getInstance()
    {
        if (!self::$instance) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection()
    {
        $this->conn = null;

        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->exec("set names utf8mb4");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $exception) {
            // Emitting JSON error directly in case of connect failure
            header("Content-Type: application/json");
            http_response_code(500);
            echo json_encode(["error" => "Connection error: " . $exception->getMessage()]);
            exit;
        }

        return $this->conn;
    }
}

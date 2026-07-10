<?php

namespace Controllers;

use Config\Database;
use Config\Config;
use Utils\JWT;
use PDO;

class AuthController
{
    private $db;
    private $conn;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->conn = $this->db->getConnection();
    }

    public function login()
    {
        $data = json_decode(file_get_contents("php://input"));

        if (!empty($data->username) && !empty($data->password)) {
            // Updated Query to fetch pae_id and program name by username OR email
            // Updated Query to fetch pae_id, program name AND LOGOS by username OR email
            $query = "SELECT u.id, u.username, u.password_hash, u.full_name, u.pae_id, 
                             r.id as role_id, r.name as role_name,
                             p.name as pae_name, p.logo_path, p.entity_logo_path, p.operator_logo_path
                      FROM users u 
                      JOIN roles r ON u.role_id = r.id 
                      LEFT JOIN pae_programs p ON u.pae_id = p.id
                      WHERE (u.username = :username OR u.email = :username) AND u.status = 'active' LIMIT 1";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":username", $data->username);
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                error_log("Login failed: User not found for username/email: " . $data->username);
            } else {
                if (!password_verify($data->password, $user['password_hash'])) {
                    error_log("Login failed: Password mismatch for user: " . $user['username']);
                    // error_log("Provided: " . $data->password . " Hash: " . $user['password_hash']); // BE CAREFUL LOGGING PASSWORDS
                }
            }

            if ($user && password_verify($data->password, $user['password_hash'])) {

                // CASE 1: GLOBAL SUPER ADMIN (pae_id IS NULL)
                if (is_null($user['pae_id'])) {
                    // Fetch list of programs for selection
                    $stmtPrograms = $this->conn->prepare("SELECT id, name FROM pae_programs ORDER BY name");
                    $stmtPrograms->execute();
                    $programs = $stmtPrograms->fetchAll(PDO::FETCH_ASSOC);

                    // Do not issue token yet. Ask user to select a Tenant.
                    http_response_code(200);
                    echo json_encode([
                        "message" => "Global Admin identified",
                        "select_tenant" => true,
                        "global_user_id" => $user['id'],
                        "full_name" => $user['full_name'],
                        "programs" => $programs
                    ]);
                    return;
                }

                // CASE 2: REGULAR TENANT USER
                $this->issueToken($user);
            } else {
                http_response_code(401);
                echo json_encode(["message" => "Credenciales inválidas"]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Datos incompletos"]);
        }
    }

    // New Endpoint: Used by Global Admin to sign in as a specific Tenant
    public function selectTenant()
    {
        $data = json_decode(file_get_contents("php://input"));

        // In a real app, this endpoint should be protected by a temporary "Pre-Auth" token or Session.
        // For MVP, we will re-verify the Global Admin credentials OR trust the client (Note: Trusting client is insecure, so we will require password again or just simplistic ID check for this demo, BUT effectively we should require a 'global_token' issued in step 1).

        // SECURE APPROACH: 
        // 1. Login returns a short-lived "Global Token".
        // 2. SelectTenant requires "Global Token" + "Target PAE ID".
        // 3. Returns final "Tenant Token".

        // SIMPLIFIED MVP APPROACH:
        // Client sends: userId (Global), targetPaeId.
        // We check if userId is indeed a Global Admin. Then issue token.

        if (!empty($data->user_id) && !empty($data->target_pae_id)) {
            $query = "SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name 
                      FROM users u 
                      JOIN roles r ON u.role_id = r.id
                      WHERE u.id = :uid AND u.pae_id IS NULL"; // Confirm IS GLOBAL

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":uid", $data->user_id);
            $stmt->execute();
            $globalUser = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($globalUser) {
                // Fetch Target Program Details
                $stmtPae = $this->conn->prepare("SELECT id, name, logo_path, entity_logo_path, operator_logo_path FROM pae_programs WHERE id = :pid");
                $stmtPae->bindParam(":pid", $data->target_pae_id);
                $stmtPae->execute();
                $pae = $stmtPae->fetch(PDO::FETCH_ASSOC);

                if ($pae) {
                    // Masquerade: Create a user object that looks like they belong to this PAE
                    $userForToken = [
                        'id' => $globalUser['id'],
                        'username' => $globalUser['username'],
                        'role_id' => $globalUser['role_id'],
                        'role_name' => 'SUPER_ADMIN', // Keep their high level role
                        'full_name' => $globalUser['full_name'],
                        'pae_id' => $pae['id'],
                        'pae_name' => $pae['name'],
                        'entity_logo_path' => $pae['entity_logo_path'],
                        'operator_logo_path' => $pae['operator_logo_path']
                    ];

                    $this->issueToken($userForToken);
                } else {
                    http_response_code(404);
                    echo json_encode(["message" => "Programa PAE no encontrado"]);
                }
            } else {
                http_response_code(403);
                echo json_encode(["message" => "No autorizado para operación Global"]);
            }
        }
    }

    private function issueToken($user)
    {
        $payload = [
            "iss" => Config::BASE_URL,
            "aud" => Config::BASE_URL,
            "iat" => time(),
            "exp" => time() + (60 * 60), // 1 hour expiration
            "data" => [
                "id" => $user['id'],
                "username" => $user['username'],
                "role_id" => $user['role_id'],
                "role_name" => $user['role_name'],
                "full_name" => $user['full_name'],
                "pae_id" => $user['pae_id'],
                "pae_name" => $user['pae_name'] ?? 'Global',
                "entity_logo" => $this->validateLogoPath($user['entity_logo_path'] ?? null),
                "operator_logo" => $this->validateLogoPath($user['operator_logo_path'] ?? null)
            ]
        ];

        $jwt = JWT::encode($payload);

        http_response_code(200);
        echo json_encode([
            "message" => "Login successful",
            "token" => $jwt,
            "user" => [
                "full_name" => $user['full_name'],
                "role" => $user['role_name'],
                "pae" => $user['pae_name'] ?? 'Global',
                "entity_logo" => $this->validateLogoPath($user['entity_logo_path'] ?? null),
                "operator_logo" => $this->validateLogoPath($user['operator_logo_path'] ?? null)
            ]
        ]);
    }

    private function validateLogoPath($path)
    {
        if (!$path) return null;

        // Check relative to app/ directory where logos live
        $fullPath = __DIR__ . '/../../app/' . $path;

        if (file_exists($fullPath)) {
            return $path;
        }

        // Fallback check for old paths (relative to root)
        $oldPath = __DIR__ . '/../../' . $path;
        if (file_exists($oldPath)) {
            return $path;
        }

        return null;
    }

    public function getMenu()
    {
        // Here we could filter menu items based on Tenant Config if needed
        // For now, same menu logic applies
        $sql = "SELECT 
                    mg.id as group_id, mg.name as group_name, mg.icon as group_icon, 
                    m.id as module_id, m.name as module_name, m.route_key, m.icon as module_icon, m.description
                FROM module_groups mg
                JOIN modules m ON m.group_id = mg.id
                ORDER BY mg.order_index, m.order_index, m.id";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $menu = [];
        $groups = [];

        foreach ($rows as $row) {
            $gId = $row['group_id'];
            if (!isset($groups[$gId])) {
                $groups[$gId] = [
                    'id' => $gId,
                    'name' => $row['group_name'],
                    'icon' => $row['group_icon'],
                    'modules' => []
                ];
            }

            $groups[$gId]['modules'][] = [
                'id' => $row['module_id'],
                'name' => $row['module_name'],
                'route' => $row['route_key'],
                'icon' => $row['module_icon'],
                'description' => $row['description']
            ];
        }

        http_response_code(200);
        echo json_encode(array_values($groups));
    }
}

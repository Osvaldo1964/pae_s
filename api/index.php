<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

spl_autoload_register(function ($class_name) {
    $base_dir = __DIR__ . '/';
    $prefix_map = [
        'Config\\' => 'config/',
        'Controllers\\' => 'controllers/',
        'Models\\' => 'models/',
        'Utils\\' => 'utils/',
        'Middleware\\' => 'middleware/'
    ];

    foreach ($prefix_map as $prefix => $dir) {
        $len = strlen($prefix);
        if (strncmp($prefix, $class_name, $len) === 0) {
            $relative_class = substr($class_name, $len);
            $file = $base_dir . $dir . str_replace('\\', '/', $relative_class) . '.php';
            if (file_exists($file)) {
                require $file;
                return;
            }
        }
    }
});

$full_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$script_name = dirname($_SERVER['SCRIPT_NAME']);
// Normalize script name to ensure it ends with / for relative calculation
$base_path = rtrim($script_name, '/') . '/';

// Remove the base path from the full URI to get the relative route
if (stripos($full_uri, $base_path) === 0) {
    $relative_path = substr($full_uri, strlen($base_path));
} else {
    $relative_path = $full_uri;
}

$uri_segments = explode('/', trim($relative_path, '/'));

$resource = isset($uri_segments[0]) ? $uri_segments[0] : null;
$action = isset($uri_segments[1]) ? trim($uri_segments[1]) : null;
$id_param = isset($uri_segments[2]) ? trim($uri_segments[2]) : null; // For cases like /api/resource/action/ID

$resource = trim($resource);
// CLEAN IDIOTS FROM URL (Null bytes, vertical tabs, etc)
$resource = preg_replace('/[\x00-\x1F\x7F]/u', '', $resource);

if ($resource === 'auth') {
    $controller = new \Controllers\AuthController();
    if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->login();
    } elseif ($action === 'select_tenant' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->selectTenant(); // New Endpoint
    } elseif ($action === 'menu' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->getMenu();
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Auth Action Not Found"]);
    }
} elseif ($resource === 'adulto_mayor') {
    $controller = new \Controllers\AdultoMayorController();
    if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->register();
    } elseif ($action === 'schools' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->getSchools();
    } elseif ($action === 'branches' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $school_id = $_GET['school_id'] ?? null;
        $controller->getBranches($school_id);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Adulto Mayor Action Not Found"]);
    }
} elseif ($resource === 'tenant') {
    $controller = new \Controllers\TenantController();
    if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->register();
    } elseif ($action === 'list' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        // Require JWT for list endpoint
        require_once __DIR__ . '/utils/JWT.php';
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';

        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Token no proporcionado']);
            exit;
        }

        $token = $matches[1];
        $decoded = \Utils\JWT::decode($token);

        if (!$decoded) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Token inválido']);
            exit;
        }

        require_once __DIR__ . '/controllers/TenantManagementController.php';
        $db = \Config\Database::getInstance()->getConnection();
        $mgmtController = new \Controllers\TenantManagementController($db);
        $mgmtController->listAll($decoded['data']);
    } elseif ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        // Update PAE program (Changed from PUT to POST to support multipart/form-data in PHP)
        require_once __DIR__ . '/utils/JWT.php';
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';

        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Token no proporcionado']);
            exit;
        }

        $token = $matches[1];
        $decoded = \Utils\JWT::decode($token);

        if (!$decoded) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Token inválido']);
            exit;
        }

        $paeId = $id_param;
        if (!$paeId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID de programa requerido']);
            exit;
        }

        require_once __DIR__ . '/controllers/TenantManagementController.php';
        $db = \Config\Database::getInstance()->getConnection();
        $mgmtController = new \Controllers\TenantManagementController($db);
        $mgmtController->update($paeId, $decoded['data']);
    } elseif ($action === 'delete' && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Delete PAE program
        require_once __DIR__ . '/utils/JWT.php';
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';

        if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Token no proporcionado']);
            exit;
        }

        $token = $matches[1];
        $decoded = \Utils\JWT::decode($token);

        if (!$decoded) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Token inválido']);
            exit;
        }

        $paeId = $id_param;
        if (!$paeId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID de programa requerido']);
            exit;
        }

        require_once __DIR__ . '/controllers/TenantManagementController.php';
        $db = \Config\Database::getInstance()->getConnection();
        $mgmtController = new \Controllers\TenantManagementController($db);
        $mgmtController->delete($paeId, $decoded['data']);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Tenant Action Not Found"]);
    }
} elseif ($resource === 'users') {
    require_once __DIR__ . '/utils/JWT.php';
    $controller = new \Controllers\UserController();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->create();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} elseif ($resource === 'team') {
    require_once __DIR__ . '/utils/JWT.php';
    $controller = new \Controllers\TeamController();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->create();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} elseif ($resource === 'roles') {
    $controller = new \Controllers\RoleController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} elseif ($resource === 'permissions') {
    require_once __DIR__ . '/controllers/PermissionController.php';
    require_once __DIR__ . '/utils/JWT.php';

    // Validate JWT for all permission endpoints
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';

    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token no proporcionado']);
        exit;
    }

    $token = $matches[1];
    $decoded = \Utils\JWT::decode($token);

    if (!$decoded) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token inválido']);
        exit;
    }

    $db = \Config\Database::getInstance()->getConnection();
    $controller = new PermissionController($db);

    // GET /api/permissions/roles - List all roles
    if ($action === 'roles' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $result = $controller->getRoles($decoded['data']);
        echo json_encode($result);
    }
    // GET /api/permissions/modules - Get all modules
    elseif ($action === 'modules' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $result = $controller->getModules();
        echo json_encode($result);
    }
    // GET /api/permissions/matrix/{role_id} - Get permission matrix
    elseif ($action === 'matrix' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $roleId = $id_param;
        if (!$roleId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'role_id requerido']);
            exit;
        }
        $result = $controller->getPermissionMatrix($roleId, $decoded['data']);
        echo json_encode($result);
    }
    // PUT /api/permissions/update - Update permissions
    elseif ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'PUT') {
        $data = json_decode(file_get_contents("php://input"), true);
        $result = $controller->updatePermissions($data, $decoded['data']);
        echo json_encode($result);
    }
    // POST /api/permissions/roles - Create role (Super Admin only)
    elseif ($action === 'roles' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $result = $controller->createRole($data, $decoded['data']);
        echo json_encode($result);
    }
    // DELETE /api/permissions/roles/{id} - Delete role (Super Admin only)
    elseif ($action === 'roles' && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $roleId = $id_param;
        if (!$roleId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'role_id requerido']);
            exit;
        }
        $result = $controller->deleteRole($roleId, $decoded['data']);
        echo json_encode($result);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Permission Action Not Found"]);
    }
} elseif ($resource === 'schools') {
    $controller = new \Controllers\SchoolController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && (!$action || $action === '')) {
        $controller->create();
    } elseif ($action === 'update' || $_SERVER['REQUEST_METHOD'] === 'PUT' || ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['_method'] === 'PUT')) {
        $id = ($action === 'update') ? $id_param : ($action ?: ($_POST['id'] ?? null));
        $controller->update($id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} elseif ($resource === 'branches') {
    $controller = new \Controllers\BranchController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $school_id = $action ?: ($_GET['school_id'] ?? null);
        $controller->index($school_id);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->create();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} elseif ($resource === 'proveedores') {
    $controller = new \Controllers\SupplierController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->create();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} elseif ($resource === 'beneficiarios') {
    $controller = new \Controllers\BeneficiaryController();
    $importController = new \Controllers\BeneficiaryImportController();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'document_types') {
            $controller->getDocumentTypes();
        } elseif ($action === 'ethnic_groups') {
            $controller->getEthnicGroups();
        } elseif ($action === 'print-list') {
            $controller->printList();
        } elseif ($action === 'template') {
            $importController->downloadTemplate();
        } else {
            $controller->index();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($action === 'import') {
            $importController->import();
        } elseif ($action === 'upload' && $id_param) {
            $controller->uploadDocuments($id_param);
        } else {
            $controller->create();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} elseif ($resource === 'items') {
    $controller = new \Controllers\ItemController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'food-groups') {
            $controller->getFoodGroups();
        } elseif ($action === 'measurement-units') {
            $controller->getMeasurementUnits();
        } elseif ($action && is_numeric($action)) {
            $controller->show($action);
        } else {
            $controller->index();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->store();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->destroy($action);
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} elseif ($resource === 'menu-cycles') {
    $controller = new \Controllers\MenuCycleController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'print' && $id_param) {
            $menuCtrl = new \Controllers\MenuController();
            $menuCtrl->printCycle($id_param);
        } elseif ($action && is_numeric($action)) {
            $menuCtrl = new \Controllers\MenuController();
            $menuCtrl->getCycleDays($action);
        } else {
            $controller->index();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($action === 'generate') {
            $controller->generate();
        } elseif ($action === 'approve') {
            $controller->approve($id_param);
        } else {
            $controller->generate();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if ($action && is_numeric($action)) {
            $controller->delete($action);
        }
    }
} elseif ($resource === 'menus') {
    $controller = new \Controllers\MenuController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action && is_numeric($action)) {
        $controller->getMenuDetail($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action && is_numeric($action)) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $action && is_numeric($action)) {
        if (strpos($_SERVER['REQUEST_URI'], '/items') !== false) {
            $controller->manageItems($action);
        } elseif (strpos($_SERVER['REQUEST_URI'], '/explode') !== false) {
            $controller->explodeRecipe($action);
        }
    }
} elseif ($resource === 'inventory') {
    $controller = new \Controllers\InventoryController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'branch-projections' && $id_param && isset($uri_segments[3])) {
            $controller->getBranchCycleProjections($id_param, $uri_segments[3]);
        } elseif ($action === 'cycle-projections' && $id_param) {
            $controller->getCycleProjections($id_param);
        } elseif ($action === 'kardex' && $id_param) {
            $controller->getKardex($id_param);
        } elseif ($action === 'cycle-cost-report' && $id_param) {
            $controller->getCycleCostReport($id_param);
        } else {
            $controller->getStock();
        }
    }
} elseif ($resource === 'movements') {
    $controller = new \Controllers\InventoryController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->getMovements();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->registerMovement();
    }
} elseif ($resource === 'quotes') {
    $controller = new \Controllers\InventoryController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action && strpos($_SERVER['REQUEST_URI'], '/details') !== false) {
            $controller->getQuoteDetails($action);
        } else {
            $controller->getQuotes();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
        $controller->saveQuote();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->deleteQuote($action);
    }
} elseif ($resource === 'purchase-orders') {
    $controller = new \Controllers\InventoryController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action && strpos($_SERVER['REQUEST_URI'], '/details') !== false) {
            $controller->getPurchaseOrderDetails($action);
        } else {
            $controller->getPurchaseOrders();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
        $controller->savePurchaseOrder();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->deletePurchaseOrder($action);
    }
} elseif ($resource === 'remissions') {
    $controller = new \Controllers\InventoryController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action && strpos($_SERVER['REQUEST_URI'], '/details') !== false) {
            $controller->getRemissionDetails($action);
        } else {
            $controller->getRemissions();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
        $controller->saveRemission();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->deleteRemission($action);
    }
} elseif ($resource === 'recipes') {
    $controller = new \Controllers\RecipeController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action && is_numeric($action)) {
            $controller->show($action);
        } else {
            $controller->index();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->store();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        if ($action && is_numeric($action)) {
            $controller->update($action);
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if ($action && is_numeric($action)) {
            $controller->delete($action);
        }
    }
} elseif ($resource === 'cycle-templates') {
    $controller = new \Controllers\CycleTemplateController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action && is_numeric($action)) {
            $controller->show($action);
        } else {
            $controller->index();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->store();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        if ($action && is_numeric($action)) {
            $controller->update($action);
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if ($action && is_numeric($action)) {
            $controller->delete($action);
        }
    }
} elseif ($resource === 'consumptions') {
    $controller = new \Controllers\ConsumptionController();
    if ($action === 'stats') {
        $controller->stats();
    } elseif ($action === 'report') {
        $controller->report();
    } else {
        if ($_SERVER['REQUEST_METHOD'] === 'POST')
            $controller->store();
    }
    exit;
} elseif ($resource === 'ration-types') {
    $controller = new \Controllers\RationTypeController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->store();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    }
} elseif ($resource === 'hr-positions') {

    $controller = new \Controllers\HRPositionController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->store();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    }
} elseif ($resource === 'hr-employees') {
    $controller = new \Controllers\HREmployeeController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->store();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    }
} elseif ($resource === 'reports') {

    if ($action === 'needs' && $id_param) {
        $controller = new \Controllers\NeedsReportController();
        $controller->generate($id_param);
    }
} elseif ($resource === 'terceros') {
    $controller = new \Controllers\TerceroController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->create();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} elseif ($resource === 'presupuesto') {
    $controller = new \Controllers\PresupuestoController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'branches') {
            $controller->getBranches();
        } elseif ($action === 'asignaciones') {
            $controller->getAsignaciones();
        } elseif ($action === 'active-program') {
            $controller->getActiveProgram();
        } elseif ($action && is_numeric($action)) {
            $controller->show($action);
        } else {
            $controller->index();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($action && is_numeric($action)) {
            $controller->update($action);
        } else {
            $controller->store();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    }
} elseif ($resource === 'movimientos') {
    $controller = new \Controllers\MovimientoController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'budget') {
            $controller->getActiveBudget();
        } elseif ($action && is_numeric($action)) {
            $controller->show($action);
        } else {
            $controller->index();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($action && is_numeric($action)) {
            $controller->update($action);
        } else {
            $controller->store();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    }
} elseif ($resource === 'traslados') {
    $controller = new \Controllers\TrasladoController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action && is_numeric($action)) {
            $controller->show($action);
        } else {
            $controller->index();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($action && is_numeric($action)) {
            $controller->update($action);
        } else {
            $controller->store();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    }
} elseif ($resource === 'ajustes') {
    $controller = new \Controllers\AjusteController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'allocations') {
            $controller->getAllocations();
        } elseif ($action && is_numeric($action)) {
            $controller->show($action);
        } else {
            $controller->index();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($action && is_numeric($action)) {
            $controller->update($action);
        } else {
            $controller->store();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    }
} elseif ($resource === 'movimientos-tipos') {
    $controller = new \Controllers\MovimientoTipoController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action && is_numeric($action)) {
            $controller->show($action);
        } else {
            $controller->index();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($action && is_numeric($action)) {
            $controller->update($action);
        } else {
            $controller->store();
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    }
} elseif ($resource === 'deliveries') {
    $controller = new \Controllers\DeliveryController();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->register();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    }
} elseif ($resource === 'hr-payroll') {
    $controller = new \Controllers\HRPayrollController();
    if ($action === 'config') {
        if ($_SERVER['REQUEST_METHOD'] === 'GET')
            $controller->getConfig();
        elseif ($_SERVER['REQUEST_METHOD'] === 'POST')
            $controller->saveConfig();
    } elseif ($action === 'periods') {
        if ($_SERVER['REQUEST_METHOD'] === 'GET')
            $controller->getPeriods();
        elseif ($_SERVER['REQUEST_METHOD'] === 'POST')
            $controller->storePeriod();
    } elseif ($action === 'calculate' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->calculatePayroll($id_param);
    } elseif ($action === 'results' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->getPayrollResults($id_param);
    } elseif ($action === 'novelties') {
        if ($_SERVER['REQUEST_METHOD'] === 'GET')
            $controller->getNovelties($id_param);
        elseif ($_SERVER['REQUEST_METHOD'] === 'POST')
            $controller->saveNovelty();
        elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE')
            $controller->deleteNovelty($id_param);
    } elseif ($action === 'concepts') {
        if ($_SERVER['REQUEST_METHOD'] === 'GET')
            $controller->getConcepts();
        elseif ($_SERVER['REQUEST_METHOD'] === 'POST')
            $controller->saveConcept();
        elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE')
            $controller->deleteConcept($id_param);
    } elseif ($action === 'report' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->getPayrollReport($id_param);
    }
} elseif ($resource === 'population-types') {
    $controller = new \Controllers\PopulationTypeController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->store();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        $controller->delete($action);
    }
} elseif ($resource === 'dashboard') {
    $controller = new \Controllers\DashboardController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->getIndex();
    }
} elseif ($resource === 'services') {
    $controller = new \Controllers\ServiceController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} elseif ($resource === 'public') {
    $controller = new \Controllers\PublicController();
    if ($action === 'pqr' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $controller->submitPQR();
    } elseif ($action === 'notifications' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->getPqrCount();
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Public Action Not Found"]);
    }
} elseif ($resource === 'pqrs') {
    $controller = new \Controllers\PqrController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $controller->index();
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action) {
        $controller->update($action);
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} elseif ($resource === 'deliverables') {
    $controller = new \Controllers\DeliverableController();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'categories') {
            $controller->getCategories();
        } elseif ($action === 'folders') {
            $controller->getFolders();
        } elseif ($action === 'search') {
            $controller->searchDocuments();
        } elseif ($action === 'download' && $id_param) {
            $controller->downloadDocument($id_param);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Deliverable GET Action Not Found"]);
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if ($action === 'categories') {
            $controller->createCategory();
        } elseif ($action === 'folders') {
            $controller->createFolder();
        } elseif ($action === 'upload') {
            $controller->uploadDocument();
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Deliverable POST Action Not Found"]);
        }
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action) {
        if ($action === 'folders' && $id_param) {
            $controller->deleteFolder($id_param);
        } else {
            $controller->deleteDocument($action);
        }
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method Not Allowed"]);
    }
} else {
    http_response_code(404);
    echo json_encode(["message" => "Resource Not Found", "resource" => $resource]);
}

<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class DeliverableController
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
                if (is_object($decoded))
                    return $decoded->data->pae_id ?? null;
                if (is_array($decoded))
                    return $decoded['data']['pae_id'] ?? null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * GET /api/deliverables/categories
     */
    public function getCategories()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) throw new Exception("No autorizado");

            $stmt = $this->conn->prepare("SELECT * FROM deliverable_categories WHERE pae_id = :pae_id AND status = 'ACTIVO' ORDER BY name");
            $stmt->execute([':pae_id' => $pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/deliverables/categories
     */
    public function createCategory()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) throw new Exception("No autorizado");

            $data = json_decode(file_get_contents("php://input"), true);
            if (empty($data['name'])) throw new Exception("El nombre es requerido");

            $stmt = $this->conn->prepare("INSERT INTO deliverable_categories (pae_id, name) VALUES (:pae_id, :name)");
            $stmt->execute([':pae_id' => $pae_id, ':name' => $data['name']]);
            
            echo json_encode(['success' => true, 'message' => 'Categoría creada', 'id' => $this->conn->lastInsertId()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/deliverables/folders
     */
    public function getFolders()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) throw new Exception("No autorizado");

            $stmt = $this->conn->prepare("SELECT * FROM deliverable_folders WHERE pae_id = :pae_id ORDER BY name");
            $stmt->execute([':pae_id' => $pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/deliverables/folders
     */
    public function createFolder()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) throw new Exception("No autorizado");

            $data = json_decode(file_get_contents("php://input"), true);
            if (empty($data['name'])) throw new Exception("El nombre es requerido");

            $stmt = $this->conn->prepare("INSERT INTO deliverable_folders (pae_id, name, parent_id) VALUES (:pae_id, :name, :parent_id)");
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':name' => $data['name'],
                ':parent_id' => !empty($data['parent_id']) ? $data['parent_id'] : null
            ]);
            
            echo json_encode(['success' => true, 'message' => 'Carpeta creada', 'id' => $this->conn->lastInsertId()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * DELETE /api/deliverables/folders/{id}
     */
    public function deleteFolder($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) throw new Exception("No autorizado");

            // Check if folder contains documents
            $stmtCheck = $this->conn->prepare("SELECT COUNT(*) FROM deliverable_documents WHERE folder_id = :id AND pae_id = :pae_id");
            $stmtCheck->execute([':id' => $id, ':pae_id' => $pae_id]);
            $countDocs = $stmtCheck->fetchColumn();

            if ($countDocs > 0) {
                throw new Exception("No se puede eliminar la carpeta porque contiene " . $countDocs . " documento(s).");
            }

            // Check if folder contains subfolders
            $stmtCheckSub = $this->conn->prepare("SELECT COUNT(*) FROM deliverable_folders WHERE parent_id = :id AND pae_id = :pae_id");
            $stmtCheckSub->execute([':id' => $id, ':pae_id' => $pae_id]);
            $countSub = $stmtCheckSub->fetchColumn();

            if ($countSub > 0) {
                throw new Exception("No se puede eliminar porque contiene subcarpetas.");
            }

            $stmtDel = $this->conn->prepare("DELETE FROM deliverable_folders WHERE id = :id AND pae_id = :pae_id");
            $stmtDel->execute([':id' => $id, ':pae_id' => $pae_id]);

            if ($stmtDel->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Carpeta eliminada']);
            } else {
                throw new Exception("Carpeta no encontrada o sin permisos");
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/deliverables/upload
     */
    public function uploadDocument()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) throw new Exception("No autorizado");

            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception("Error al subir el archivo");
            }

            $folder_id = $_POST['folder_id'] ?? null;
            $category_id = $_POST['deliverable_category_id'] ?? null;
            $title = $_POST['title'] ?? $_FILES['file']['name'];
            
            if (!$folder_id || !$category_id) {
                throw new Exception("Faltan datos requeridos (Carpeta o Categoría)");
            }

            $uploadDir = __DIR__ . '/../../uploads/entregables/tenant_' . $pae_id . '/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            // Secure filename
            $filename = preg_replace("/[^a-zA-Z0-9.-]/", "_", basename($_FILES['file']['name']));
            $filename = time() . '_' . $filename;
            $filePath = $uploadDir . $filename;

            if (!move_uploaded_file($_FILES['file']['tmp_name'], $filePath)) {
                throw new Exception("No se pudo mover el archivo subido");
            }

            // Insert into DB
            $stmt = $this->conn->prepare("
                INSERT INTO deliverable_documents 
                (pae_id, folder_id, deliverable_category_id, title, description, school_id, school_branch_id, status, keywords, file_path, file_type, file_size) 
                VALUES 
                (:pae_id, :folder_id, :cat_id, :title, :desc, :school_id, :branch_id, :status, :keywords, :file_path, :file_type, :file_size)
            ");

            $stmt->execute([
                ':pae_id' => $pae_id,
                ':folder_id' => $folder_id,
                ':cat_id' => $category_id,
                ':title' => $title,
                ':desc' => $_POST['description'] ?? null,
                ':school_id' => !empty($_POST['school_id']) ? $_POST['school_id'] : null,
                ':branch_id' => !empty($_POST['school_branch_id']) ? $_POST['school_branch_id'] : null,
                ':status' => $_POST['status'] ?? 'Borrador',
                ':keywords' => $_POST['keywords'] ?? null,
                ':file_path' => 'uploads/entregables/tenant_' . $pae_id . '/' . $filename,
                ':file_type' => $_FILES['file']['type'],
                ':file_size' => $_FILES['file']['size']
            ]);

            echo json_encode(['success' => true, 'message' => 'Documento subido con éxito', 'id' => $this->conn->lastInsertId()]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/deliverables/search
     */
    public function searchDocuments()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) throw new Exception("No autorizado");

            $query = "
                SELECT d.*, c.name as category_name, f.name as folder_name, s.name as school_name, sb.name as branch_name 
                FROM deliverable_documents d
                JOIN deliverable_categories c ON d.deliverable_category_id = c.id
                JOIN deliverable_folders f ON d.folder_id = f.id
                LEFT JOIN schools s ON d.school_id = s.id
                LEFT JOIN school_branches sb ON d.school_branch_id = sb.id
                WHERE d.pae_id = :pae_id
            ";
            $params = [':pae_id' => $pae_id];

            if (!empty($_GET['folder_id'])) {
                $query .= " AND d.folder_id = :folder_id";
                $params[':folder_id'] = $_GET['folder_id'];
            }
            if (!empty($_GET['category_id'])) {
                $query .= " AND d.deliverable_category_id = :cat_id";
                $params[':cat_id'] = $_GET['category_id'];
            }
            if (!empty($_GET['school_id'])) {
                $query .= " AND d.school_id = :school_id";
                $params[':school_id'] = $_GET['school_id'];
            }
            if (!empty($_GET['keyword'])) {
                $query .= " AND (d.title LIKE :kw OR d.description LIKE :kw OR d.keywords LIKE :kw)";
                $params[':kw'] = '%' . $_GET['keyword'] . '%';
            }

            $query .= " ORDER BY d.created_at DESC";

            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);

            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * DELETE /api/deliverables/{id}
     */
    public function deleteDocument($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) throw new Exception("No autorizado");

            $stmt = $this->conn->prepare("SELECT file_path FROM deliverable_documents WHERE id = :id AND pae_id = :pae_id");
            $stmt->execute([':id' => $id, ':pae_id' => $pae_id]);
            $doc = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$doc) throw new Exception("Documento no encontrado o sin permisos");

            $fullPath = __DIR__ . '/../../' . $doc['file_path'];
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }

            $stmtDel = $this->conn->prepare("DELETE FROM deliverable_documents WHERE id = :id AND pae_id = :pae_id");
            $stmtDel->execute([':id' => $id, ':pae_id' => $pae_id]);

            echo json_encode(['success' => true, 'message' => 'Documento eliminado']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/deliverables/download/{id}
     */
    public function downloadDocument($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) {
                // If accessed directly via browser, token might be passed as query param
                if (!empty($_GET['token'])) {
                    $decoded = \Utils\JWT::decode($_GET['token']);
                    $pae_id = $decoded->data->pae_id ?? ($decoded['data']['pae_id'] ?? null);
                }
                if (!$pae_id) throw new Exception("No autorizado");
            }

            $stmt = $this->conn->prepare("SELECT * FROM deliverable_documents WHERE id = :id AND pae_id = :pae_id");
            $stmt->execute([':id' => $id, ':pae_id' => $pae_id]);
            $doc = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$doc) throw new Exception("Documento no encontrado");

            $fullPath = __DIR__ . '/../../' . $doc['file_path'];
            if (!file_exists($fullPath)) throw new Exception("Archivo físico no encontrado");

            header('Content-Description: File Transfer');
            header('Content-Type: ' . $doc['file_type']);
            header('Content-Disposition: attachment; filename="' . basename($doc['file_path']) . '"');
            header('Expires: 0');
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            header('Content-Length: ' . filesize($fullPath));
            readfile($fullPath);
            exit;

        } catch (Exception $e) {
            http_response_code(500);
            echo $e->getMessage();
        }
    }
}

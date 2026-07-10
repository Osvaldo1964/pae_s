<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class WarehouseController
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
                return null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    private function getUserIdFromToken()
    {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
            try {
                $decoded = \Utils\JWT::decode($matches[1]);
                if (is_object($decoded)) return $decoded->data->id ?? null;
                if (is_array($decoded)) return $decoded['data']['id'] ?? null;
                return null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * GET /api/inventory - Obtener existencias actuales
     */
    public function getStock()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            $query = "SELECT 
                        i.id as item_id,
                        i.code,
                        i.name,
                        fg.name as food_group,
                        mu.abbreviation as unit,
                        COALESCE(inv.current_stock, 0) as stock,
                        inv.minimum_stock,
                        inv.last_entry_date,
                        inv.last_exit_date
                      FROM items i
                      JOIN food_groups fg ON i.food_group_id = fg.id
                      JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                      LEFT JOIN inventory inv ON i.id = inv.item_id AND inv.pae_id = :pae_id
                      WHERE i.pae_id = :pae_id_items OR i.pae_id IS NULL
                      ORDER BY fg.name, i.name";

            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':pae_id', $pae_id);
            $stmt->bindValue(':pae_id_items', $pae_id);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/movements - Historial de movimientos
     */
    public function getMovements()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            $query = "SELECT 
                        m.*,
                        u.name as user_name,
                        s.name as supplier_name
                      FROM inventory_movements m
                      JOIN users u ON m.user_id = u.id
                      LEFT JOIN suppliers s ON m.supplier_id = s.id
                      WHERE m.pae_id = :pae_id
                      ORDER BY m.created_at DESC";

            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':pae_id', $pae_id);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * POST /api/movements - Registrar Entrada/Salida
     */
    public function registerMovement()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();
            $user_id = $this->getUserIdFromToken();

            $this->conn->beginTransaction();

            // 1. Cabecera
            $query = "INSERT INTO inventory_movements (pae_id, user_id, supplier_id, movement_type, reference_number, movement_date, notes) 
                      VALUES (:pae_id, :user_id, :supplier_id, :type, :ref, :date, :notes)";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':user_id' => $user_id,
                ':supplier_id' => $data['supplier_id'] ?? null,
                ':type' => $data['type'],
                ':ref' => $data['reference'] ?? null,
                ':date' => $data['date'] ?? date('Y-m-d'),
                ':notes' => $data['notes'] ?? ''
            ]);
            $movement_id = $this->conn->lastInsertId();

            // 2. Detalles
            $queryDet = "INSERT INTO inventory_movement_details (movement_id, item_id, quantity, unit_price, batch_number, expiry_date) 
                         VALUES (:mov_id, :item_id, :qty, :price, :batch, :expiry)";
            $stmtDet = $this->conn->prepare($queryDet);

            foreach ($data['items'] as $item) {
                $stmtDet->execute([
                    ':mov_id' => $movement_id,
                    ':item_id' => $item['item_id'],
                    ':qty' => $item['quantity'],
                    ':price' => $item['price'] ?? 0,
                    ':batch' => $item['batch'] ?? null,
                    ':expiry' => $item['expiry'] ?? null
                ]);
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Movimiento registrado exitosamente']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * GET /api/suppliers
     */
    public function getSuppliers()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $query = "SELECT * FROM suppliers WHERE pae_id = :pae_id ORDER BY name";
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
     * POST /api/suppliers
     */
    public function saveSupplier()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();

            if (isset($data['id'])) {
                $query = "UPDATE suppliers SET name = :name, nit = :nit, contact_person = :contact, phone = :phone, email = :email, address = :address WHERE id = :id AND pae_id = :pae_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':id', $data['id']);
            } else {
                $query = "INSERT INTO suppliers (pae_id, name, nit, contact_person, phone, email, address) VALUES (:pae_id, :name, :nit, :contact, :phone, :email, :address)";
                $stmt = $this->conn->prepare($query);
            }

            $stmt->bindValue(':pae_id', $pae_id);
            $stmt->bindValue(':name', $data['name']);
            $stmt->bindValue(':nit', $data['nit'] ?? null);
            $stmt->bindValue(':contact', $data['contact_person'] ?? null);
            $stmt->bindValue(':phone', $data['phone'] ?? null);
            $stmt->bindValue(':email', $data['email'] ?? null);
            $stmt->bindValue(':address', $data['address'] ?? null);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => 'Proveedor guardado correctamente']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

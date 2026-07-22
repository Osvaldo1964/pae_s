<?php

namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class InventoryController
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

    private function getUserIdFromToken()
    {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
            try {
                $decoded = \Utils\JWT::decode($matches[1]);
                if (is_object($decoded))
                    return $decoded->data->id ?? null;
                if (is_array($decoded))
                    return $decoded['data']['id'] ?? null;
            } catch (Exception $e) {
                return null;
            }
        }
        return null;
    }

    // =====================================================
    // 1. GESTIÓN DE STOCK Y MOVIMIENTOS
    // =====================================================

    public function getStock()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $query = "SELECT 
                        i.id as item_id, i.code, i.name, 
                        fg.name as food_group, mu.abbreviation as unit,
                        i.unit_cost,
                        COALESCE(inv.current_stock, 0) as stock,
                        inv.minimum_stock, inv.last_entry_date, inv.last_exit_date
                      FROM items i
                      JOIN food_groups fg ON i.food_group_id = fg.id
                      JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                      LEFT JOIN inventory inv ON i.id = inv.item_id AND inv.pae_id = :pae_id
                      WHERE i.pae_id = :pae_id_items
                      ORDER BY fg.name, i.name";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':pae_id' => $pae_id, ':pae_id_items' => $pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getMovements()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $query = "SELECT m.*, u.full_name as user_name, s.name as supplier_name
                      FROM inventory_movements m
                      JOIN users u ON m.user_id = u.id
                      LEFT JOIN suppliers s ON m.supplier_id = s.id
                      WHERE m.pae_id = :pae_id
                      ORDER BY m.movement_date DESC, m.created_at DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':pae_id' => $pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getKardex($item_id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            // Get detailed movements for specific item
            $query = "SELECT 
                        m.movement_date, 
                        m.movement_type, 
                        m.reference_number, 
                        m.notes, 
                        d.quantity, 
                        d.unit_price, 
                        s.name as supplier_name, 
                        u.full_name as user_name 
                      FROM inventory_movements m 
                      JOIN inventory_movement_details d ON m.id = d.movement_id 
                      LEFT JOIN suppliers s ON m.supplier_id = s.id 
                      JOIN users u ON m.user_id = u.id 
                      WHERE m.pae_id = ? AND d.item_id = ? 
                      ORDER BY m.movement_date ASC, m.created_at ASC";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([$pae_id, $item_id]);
            $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Also get Remission details (Outflows/Inflows from Remissions)
            $queryRem = "SELECT 
                            r.remission_date as movement_date,
                            CASE 
                                WHEN r.type = 'ENTRADA_OC' THEN 'ENTRADA'
                                ELSE 'SALIDA'
                            END as movement_type,
                            r.remission_number as reference_number,
                            r.notes,
                            d.quantity_sent as quantity,
                            0 as unit_price, -- Remissions usually transfer at cost or 0 in this context
                            s.name as supplier_name,
                            u.full_name as user_name,
                            b.name as branch_name
                         FROM inventory_remissions r
                         JOIN inventory_remission_details d ON r.id = d.remission_id
                         LEFT JOIN suppliers s ON r.supplier_id = s.id
                         LEFT JOIN school_branches b ON r.branch_id = b.id
                         JOIN users u ON r.user_id = u.id
                         WHERE r.pae_id = ? AND d.item_id = ?
                         ORDER BY r.remission_date ASC, r.created_at ASC";

            $stmtRem = $this->conn->prepare($queryRem);
            $stmtRem->execute([$pae_id, $item_id]);
            $remissions = $stmtRem->fetchAll(PDO::FETCH_ASSOC);

            // Merge and Sort
            // Note: In PHP 8 we could use array_merge(...), but standard array_merge works
            foreach ($remissions as &$rem) {
                if ($rem['branch_name']) {
                    $rem['notes'] = ($rem['notes'] ? $rem['notes'] . ' - ' : '') . 'Destino: ' . $rem['branch_name'];
                }
            }
            $all_movements = array_merge($movements, $remissions);

            usort($all_movements, function ($a, $b) {
                $t1 = strtotime($a['movement_date']);
                $t2 = strtotime($b['movement_date']);
                return $t1 - $t2;
            });

            echo json_encode(['success' => true, 'data' => array_map('array_change_key_case', $all_movements)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function registerMovement()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();
            $user_id = $this->getUserIdFromToken();

            $this->conn->beginTransaction();

            // 1. Cabecera
            $stmt = $this->conn->prepare("INSERT INTO inventory_movements (pae_id, user_id, supplier_id, movement_type, reference_number, movement_date, cycle_id, notes) 
                                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $pae_id,
                $user_id,
                $data['supplier_id'] ?? null,
                $data['movement_type'],
                $data['reference'] ?? null,
                $data['date'] ?? date('Y-m-d'),
                $data['cycle_id'] ?? null,
                $data['notes'] ?? ''
            ]);
            $movement_id = $this->conn->lastInsertId();

            // 2. Detalles y Actualización de Stock
            $stmtDet = $this->conn->prepare("INSERT INTO inventory_movement_details (movement_id, item_id, quantity, unit_price, batch_number, expiry_date) 
                                            VALUES (?, ?, ?, ?, ?, ?)");

            foreach ($data['items'] as $item) {
                $stmtDet->execute([
                    $movement_id,
                    $item['item_id'],
                    $item['quantity'],
                    $item['unit_price'] ?? 0,
                    $item['batch'] ?? null,
                    $item['expiry'] ?? null
                ]);


                // Actualizar unit_cost con PROMEDIO PONDERADO si es una ENTRADA con precio
                if (($data['movement_type'] === 'ENTRADA' || $data['movement_type'] === 'ENTRADA_OC') && isset($item['unit_price']) && $item['unit_price'] > 0) {
                    // Obtener stock y costo actual
                    $stmtCurrent = $this->conn->prepare("
                        SELECT COALESCE(inv.current_stock, 0) as stock, COALESCE(i.unit_cost, 0) as cost
                        FROM items i
                        LEFT JOIN inventory inv ON i.id = inv.item_id AND inv.pae_id = ?
                        WHERE i.id = ? AND i.pae_id = ?
                    ");
                    $stmtCurrent->execute([$pae_id, $item['item_id'], $pae_id]);
                    $current = $stmtCurrent->fetch(PDO::FETCH_ASSOC);

                    $current_stock = floatval($current['stock'] ?? 0);
                    $current_cost = floatval($current['cost'] ?? 0);

                    // Calcular promedio ponderado
                    $current_value = $current_stock * $current_cost;
                    $new_value = floatval($item['quantity']) * floatval($item['unit_price']);
                    $total_stock = $current_stock + floatval($item['quantity']);

                    $weighted_avg_cost = $total_stock > 0 ? ($current_value + $new_value) / $total_stock : floatval($item['unit_price']);

                    // Actualizar items.unit_cost con promedio ponderado
                    $stmtCost = $this->conn->prepare("UPDATE items SET unit_cost = ? WHERE id = ? AND pae_id = ?");
                    $stmtCost->execute([$weighted_avg_cost, $item['item_id'], $pae_id]);

                    // Actualizar costo por ciclo si hay cycle_id
                    if (isset($data['cycle_id']) && $data['cycle_id']) {
                        $this->updateCycleCost(
                            $pae_id,
                            $item['item_id'],
                            $data['cycle_id'],
                            floatval($item['quantity']),
                            floatval($item['unit_price'])
                        );
                    }
                }


                // Actualizar Stock
                $qty = ($data['movement_type'] === 'ENTRADA' || $data['movement_type'] === 'AJUSTE' && $item['quantity'] > 0)
                    ? $item['quantity'] : -$item['quantity'];

                $stmtInv = $this->conn->prepare("INSERT INTO inventory (pae_id, item_id, current_stock, last_entry_date, last_exit_date) 
                                                VALUES (?, ?, ?, ?, ?) 
                                                ON DUPLICATE KEY UPDATE 
                                                current_stock = current_stock + ?, 
                                                last_entry_date = IF(? > 0, CURRENT_DATE, last_entry_date),
                                                last_exit_date = IF(? < 0, CURRENT_DATE, last_exit_date)");

                $entry_date = ($qty > 0) ? date('Y-m-d') : null;
                $exit_date = ($qty < 0) ? date('Y-m-d') : null;
                $stmtInv->execute([$pae_id, $item['item_id'], $qty, $entry_date, $exit_date, $qty, $qty, $qty]);
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Movimiento registrado y stock actualizado']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    /**
     * Update cycle-specific cost tracking
     * Calculates weighted average cost per item per cycle
     */
    private function updateCycleCost($pae_id, $item_id, $cycle_id, $quantity, $unit_price)
    {
        try {
            // Check if record exists
            $stmt = $this->conn->prepare("
                SELECT average_cost, total_quantity, total_value, purchase_count 
                FROM item_cycle_costs 
                WHERE pae_id = ? AND item_id = ? AND cycle_id = ?
            ");
            $stmt->execute([$pae_id, $item_id, $cycle_id]);
            $current = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($current) {
                // Update existing record with weighted average
                $new_total_qty = floatval($current['total_quantity']) + $quantity;
                $new_total_value = floatval($current['total_value']) + ($quantity * $unit_price);
                $new_avg = $new_total_qty > 0 ? $new_total_value / $new_total_qty : $unit_price;

                $stmt = $this->conn->prepare("
                    UPDATE item_cycle_costs 
                    SET average_cost = ?, total_quantity = ?, total_value = ?, purchase_count = purchase_count + 1
                    WHERE pae_id = ? AND item_id = ? AND cycle_id = ?
                ");
                $stmt->execute([$new_avg, $new_total_qty, $new_total_value, $pae_id, $item_id, $cycle_id]);
            } else {
                // Insert new record
                $stmt = $this->conn->prepare("
                    INSERT INTO item_cycle_costs (pae_id, item_id, cycle_id, average_cost, total_quantity, total_value, purchase_count)
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                ");
                $stmt->execute([$pae_id, $item_id, $cycle_id, $unit_price, $quantity, $quantity * $unit_price]);
            }
        } catch (Exception $e) {
            // Log error but don't fail the transaction
            error_log("Error updating cycle cost: " . $e->getMessage());
        }
    }

    /**
     * Get cost report for a specific cycle
     * Returns average costs and purchase statistics per item
     */
    public function getCycleCostReport($cycle_id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            $query = "
                SELECT 
                    i.code, 
                    i.name, 
                    fg.name as food_group,
                    mu.abbreviation as unit,
                    COALESCE(c.average_cost, 0) as cycle_avg_cost,
                    COALESCE(c.total_quantity, 0) as cycle_total_qty,
                    COALESCE(c.total_value, 0) as cycle_total_value,
                    COALESCE(c.purchase_count, 0) as purchase_count,
                    COALESCE(i.unit_cost, 0) as global_avg_cost,
                    COALESCE(inv.current_stock, 0) as current_stock
                FROM (
                    SELECT DISTINCT item_id 
                    FROM cycle_projections 
                    WHERE cycle_id = ?
                ) cp
                JOIN items i ON cp.item_id = i.id
                JOIN food_groups fg ON i.food_group_id = fg.id
                JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                LEFT JOIN item_cycle_costs c ON cp.item_id = c.item_id AND c.cycle_id = ? AND c.pae_id = ?
                LEFT JOIN inventory inv ON i.id = inv.item_id AND inv.pae_id = ?
                ORDER BY fg.name, i.name
            ";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([$cycle_id, $cycle_id, $pae_id, $pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // =====================================================
    // 2. COTIZACIONES
    // =====================================================

    public function getQuotes()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $stmt = $this->conn->prepare("SELECT q.*, s.name as supplier_name FROM inventory_quotes q JOIN suppliers s ON q.supplier_id = s.id WHERE q.pae_id = ? ORDER BY q.created_at DESC");
            $stmt->execute([$pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getQuoteDetails($id)
    {
        try {
            $stmt = $this->conn->prepare("SELECT d.*, i.name as item_name FROM inventory_quote_details d JOIN items i ON d.item_id = i.id WHERE d.quote_id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function saveQuote()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();
            $user_id = $this->getUserIdFromToken();

            // Validate unique Quote Number
            $quoteId = isset($data['id']) ? $data['id'] : 0;
            $stmtCheck = $this->conn->prepare("SELECT id FROM inventory_quotes WHERE pae_id = ? AND quote_number = ? AND id != ?");
            $stmtCheck->execute([$pae_id, $data['quote_number'], $quoteId]);
            if ($stmtCheck->fetch()) {
                http_response_code(409); // Conflict
                echo json_encode(['success' => false, 'message' => "El número de cotización '{$data['quote_number']}' ya existe."]);
                return;
            }

            $this->conn->beginTransaction();

            if (isset($data['id'])) {
                // UPDATE logic
                $stmt = $this->conn->prepare("UPDATE inventory_quotes SET supplier_id = ?, quote_number = ?, quote_date = ?, valid_until = ?, total_amount = ?, notes = ? WHERE id = ? AND pae_id = ?");
                $stmt->execute([$data['supplier_id'], $data['quote_number'], $data['quote_date'], $data['valid_until'], $data['total_amount'], $data['notes'] ?? '', $data['id'], $pae_id]);
                $quote_id = $data['id'];

                // Remove old details
                $this->conn->prepare("DELETE FROM inventory_quote_details WHERE quote_id = ?")->execute([$quote_id]);
            } else {
                // INSERT logic
                $stmt = $this->conn->prepare("INSERT INTO inventory_quotes (pae_id, user_id, supplier_id, quote_number, quote_date, valid_until, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$pae_id, $user_id, $data['supplier_id'], $data['quote_number'], $data['quote_date'], $data['valid_until'], $data['total_amount'], $data['notes'] ?? '']);
                $quote_id = $this->conn->lastInsertId();
            }

            // Insert details
            $stmtDet = $this->conn->prepare("INSERT INTO inventory_quote_details (quote_id, item_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['items'] as $item) {
                $stmtDet->execute([$quote_id, $item['item_id'], $item['quantity'], $item['unit_price'], $item['subtotal']]);
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Cotización guardada exitosamente']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function deleteQuote($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            // Verify ownership
            $check = $this->conn->prepare("SELECT id FROM inventory_quotes WHERE id = ? AND pae_id = ?");
            $check->execute([$id, $pae_id]);
            if (!$check->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cotización no encontrada']);
                return;
            }

            $this->conn->beginTransaction();

            $this->conn->prepare("DELETE FROM inventory_quote_details WHERE quote_id = ?")->execute([$id]);

            $stmt = $this->conn->prepare("DELETE FROM inventory_quotes WHERE id = ? AND pae_id = ?");
            $stmt->execute([$id, $pae_id]);

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Cotización eliminada']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // =====================================================
    // 3. ÓRDENES DE COMPRA
    // =====================================================

    public function getPurchaseOrders()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $stmt = $this->conn->prepare("SELECT po.*, s.name as supplier_name, c.name as cycle_name 
                                         FROM purchase_orders po 
                                         JOIN suppliers s ON po.supplier_id = s.id 
                                         LEFT JOIN menu_cycles c ON po.cycle_id = c.id
                                         WHERE po.pae_id = ? 
                                         ORDER BY po.created_at DESC");
            $stmt->execute([$pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getBranchCycleProjections($cycle_id, $branch_id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $query = "SELECT 
                        cp.item_id, i.name as item_name, mu.abbreviation as unit,
                        cp.total_quantity as projected_qty,
                        COALESCE((
                            SELECT SUM(ird.quantity_sent) 
                            FROM inventory_remission_details ird
                            JOIN inventory_remissions ir ON ird.remission_id = ir.id
                            WHERE ir.cycle_id = cp.cycle_id 
                              AND ir.branch_id = cp.branch_id
                              AND ird.item_id = cp.item_id 
                              AND ir.type = 'SALIDA_SEDE'
                              AND ir.status != 'CANCELADA'
                        ), 0) as delivered_qty
                      FROM cycle_projections cp
                      JOIN items i ON cp.item_id = i.id
                      JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                      WHERE cp.cycle_id = ? AND cp.branch_id = ?";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([$cycle_id, $branch_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getCycleProjections($cycle_id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            // Obtener proyectado vs ordenado para un ciclo
            $query = "SELECT 
                        cp.item_id, i.name as item_name, mu.abbreviation as unit,
                        SUM(cp.total_quantity) as projected_qty,
                        COALESCE((
                            SELECT SUM(pod.quantity_ordered) 
                            FROM purchase_order_details pod
                            JOIN purchase_orders po ON pod.po_id = po.id
                            WHERE po.cycle_id = cp.cycle_id AND pod.item_id = cp.item_id AND po.status != 'CANCELADA'
                        ), 0) as ordered_qty
                      FROM cycle_projections cp
                      JOIN items i ON cp.item_id = i.id
                      JOIN measurement_units mu ON i.measurement_unit_id = mu.id
                      WHERE cp.cycle_id = ?
                      GROUP BY cp.item_id";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([$cycle_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getPurchaseOrderDetails($id)
    {
        try {
            $query = "SELECT d.*, i.name as item_name,
                             COALESCE((
                                SELECT SUM(ird.quantity_sent)
                                FROM inventory_remission_details ird
                                JOIN inventory_remissions ir ON ird.remission_id = ir.id
                                WHERE ir.po_id = d.po_id 
                                  AND ird.item_id = d.item_id 
                                  AND ir.status != 'CANCELADA'
                             ), 0) as quantity_received
                      FROM purchase_order_details d 
                      JOIN items i ON d.item_id = i.id 
                      WHERE d.po_id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }


    public function savePurchaseOrder()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();
            $user_id = $this->getUserIdFromToken();

            // Validate unique PO Number
            $poId = isset($data['id']) ? $data['id'] : 0;
            $stmtCheck = $this->conn->prepare("SELECT id FROM purchase_orders WHERE pae_id = ? AND po_number = ? AND id != ?");
            $stmtCheck->execute([$pae_id, $data['po_number'], $poId]);
            if ($stmtCheck->fetch()) {
                http_response_code(409); // Conflict
                echo json_encode(['success' => false, 'message' => "El número de orden '{$data['po_number']}' ya existe."]);
                return;
            }

            $this->conn->beginTransaction();

            if (isset($data['id'])) {
                $stmt = $this->conn->prepare("UPDATE purchase_orders SET supplier_id = ?, cycle_id = ?, po_number = ?, po_date = ?, expected_delivery = ?, total_amount = ?, notes = ?, status = ? WHERE id = ? AND pae_id = ?");
                $stmt->execute([
                    $data['supplier_id'],
                    $data['cycle_id'] ?? null,
                    $data['po_number'],
                    $data['po_date'],
                    $data['expected_delivery'] ?? null,
                    $data['total_amount'],
                    $data['notes'] ?? '',
                    $data['status'],
                    $data['id'],
                    $pae_id
                ]);
                $po_id = $data['id'];
                $this->conn->prepare("DELETE FROM purchase_order_details WHERE po_id = ?")->execute([$po_id]);
            } else {
                $stmt = $this->conn->prepare("INSERT INTO purchase_orders (pae_id, user_id, supplier_id, cycle_id, po_number, po_date, expected_delivery, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $pae_id,
                    $user_id,
                    $data['supplier_id'],
                    $data['cycle_id'] ?? null,
                    $data['po_number'],
                    $data['po_date'],
                    $data['expected_delivery'] ?? null,
                    $data['total_amount'],
                    $data['notes'] ?? ''
                ]);
                $po_id = $this->conn->lastInsertId();
            }

            $stmtDet = $this->conn->prepare("INSERT INTO purchase_order_details (po_id, item_id, quantity_ordered, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['items'] as $item) {
                if (floatval($item['quantity']) > 0 && floatval($item['unit_price']) > 0) {
                    $stmtDet->execute([$po_id, $item['item_id'], $item['quantity'], $item['unit_price'], $item['subtotal']]);
                }
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Orden de Compra guardada']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function deletePurchaseOrder($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            // Verify ownership
            $check = $this->conn->prepare("SELECT id FROM purchase_orders WHERE id = ? AND pae_id = ?");
            $check->execute([$id, $pae_id]);
            if (!$check->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Orden de compra no encontrada']);
                return;
            }

            $this->conn->beginTransaction();

            $this->conn->prepare("DELETE FROM purchase_order_details WHERE po_id = ?")->execute([$id]);

            $stmt = $this->conn->prepare("DELETE FROM purchase_orders WHERE id = ? AND pae_id = ?");
            $stmt->execute([$id, $pae_id]);

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Orden de compra eliminada']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // =====================================================
    // 4. REMISIONES
    // =====================================================

    public function getRemissions()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $query = "SELECT r.*, 
                             b.name as branch_name, 
                             s.name as supplier_name, 
                             c.name as cycle_name,
                             po.po_number
                      FROM inventory_remissions r 
                      LEFT JOIN school_branches b ON r.branch_id = b.id 
                      LEFT JOIN suppliers s ON r.supplier_id = s.id
                      LEFT JOIN menu_cycles c ON r.cycle_id = c.id
                      LEFT JOIN purchase_orders po ON r.po_id = po.id
                      WHERE r.pae_id = ? 
                      ORDER BY r.created_at DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getRemissionDetails($id)
    {
        try {
            $stmt = $this->conn->prepare("SELECT d.*, i.name as item_name FROM inventory_remission_details d JOIN items i ON d.item_id = i.id WHERE d.remission_id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function saveRemission()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();
            $user_id = $this->getUserIdFromToken();

            $this->conn->beginTransaction();

            $type = $data['type'] ?? 'SALIDA_SEDE';
            
            $cycle_id = $data['cycle_id'] ?? null;
            if (!$cycle_id && !empty($data['po_id'])) {
                $stmtCycle = $this->conn->prepare("SELECT cycle_id FROM purchase_orders WHERE id = ?");
                $stmtCycle->execute([$data['po_id']]);
                $po_cycle_id = $stmtCycle->fetchColumn();
                if ($po_cycle_id) $cycle_id = $po_cycle_id;
            }

            if (isset($data['id'])) {
                $stmt = $this->conn->prepare("UPDATE inventory_remissions SET 
                    type = ?, cycle_id = ?, po_id = ?, supplier_id = ?, branch_id = ?, 
                    remission_number = ?, remission_date = ?, carrier_name = ?, 
                    vehicle_plate = ?, notes = ?, status = ? 
                    WHERE id = ? AND pae_id = ?");
                $stmt->execute([
                    $type,
                    $cycle_id,
                    $data['po_id'] ?? null,
                    $data['supplier_id'] ?? null,
                    $data['branch_id'] ?? null,
                    $data['remission_number'],
                    $data['remission_date'],
                    $data['carrier_name'] ?? '',
                    $data['vehicle_plate'] ?? '',
                    $data['notes'] ?? '',
                    $data['status'] ?? 'PENDIENTE',
                    $data['id'],
                    $pae_id
                ]);
                $rem_id = $data['id'];
                $this->conn->prepare("DELETE FROM inventory_remission_details WHERE remission_id = ?")->execute([$rem_id]);
            } else {
                $stmt = $this->conn->prepare("INSERT INTO inventory_remissions 
                    (pae_id, user_id, type, cycle_id, po_id, supplier_id, branch_id, remission_number, remission_date, carrier_name, vehicle_plate, notes) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $pae_id,
                    $user_id,
                    $type,
                    $cycle_id,
                    $data['po_id'] ?? null,
                    $data['supplier_id'] ?? null,
                    $data['branch_id'] ?? null,
                    $data['remission_number'],
                    $data['remission_date'],
                    $data['carrier_name'] ?? '',
                    $data['vehicle_plate'] ?? '',
                    $data['notes'] ?? ''
                ]);
                $rem_id = $this->conn->lastInsertId();
            }

            $stmtDet = $this->conn->prepare("INSERT INTO inventory_remission_details (remission_id, item_id, quantity_sent) VALUES (?, ?, ?)");
            foreach ($data['items'] as $item) {
                if (floatval($item['quantity']) <= 0) continue;
                
                $stmtDet->execute([$rem_id, $item['item_id'], $item['quantity']]);

                // AFECTACIÓN DE STOCK (Solo si la remisión está en estado ENVIADA o similar, o siempre si es simplificado)
                // Por ahora afectamos stock directamente como en registerMovement
                $qty = ($type === 'ENTRADA_OC') ? $item['quantity'] : -$item['quantity'];

                // ACTUALIZAR COSTO (Promedio Ponderado) si es una ENTRADA de OC
                if ($type === 'ENTRADA_OC' && isset($data['po_id'])) {
                    // Obtener el precio unitario de la Orden de Compra
                    $stmtPrice = $this->conn->prepare("SELECT unit_price FROM purchase_order_details WHERE po_id = ? AND item_id = ?");
                    $stmtPrice->execute([$data['po_id'], $item['item_id']]);
                    $poDetail = $stmtPrice->fetch(PDO::FETCH_ASSOC);
                    $unit_price = $poDetail ? floatval($poDetail['unit_price']) : 0;

                    if ($unit_price > 0) {
                        // Obtener stock y costo actual
                        $stmtCurrent = $this->conn->prepare("
                            SELECT COALESCE(inv.current_stock, 0) as stock, COALESCE(i.unit_cost, 0) as cost
                            FROM items i
                            LEFT JOIN inventory inv ON i.id = inv.item_id AND inv.pae_id = ?
                            WHERE i.id = ? AND i.pae_id = ?
                        ");
                        $stmtCurrent->execute([$pae_id, $item['item_id'], $pae_id]);
                        $current = $stmtCurrent->fetch(PDO::FETCH_ASSOC);

                        $current_stock = floatval($current['stock'] ?? 0);
                        $current_cost = floatval($current['cost'] ?? 0);

                        // Calcular promedio ponderado
                        $current_value = $current_stock * $current_cost;
                        $new_value = floatval($item['quantity']) * $unit_price;
                        $total_stock = $current_stock + floatval($item['quantity']);

                        $weighted_avg_cost = $total_stock > 0 ? ($current_value + $new_value) / $total_stock : $unit_price;

                        // Actualizar items.unit_cost
                        $stmtCost = $this->conn->prepare("UPDATE items SET unit_cost = ? WHERE id = ? AND pae_id = ?");
                        $stmtCost->execute([$weighted_avg_cost, $item['item_id'], $pae_id]);

                        // Actualizar costo por ciclo si hay cycle_id
                        if ($cycle_id) {
                            $this->updateCycleCost(
                                $pae_id,
                                $item['item_id'],
                                $cycle_id,
                                floatval($item['quantity']),
                                $unit_price
                            );
                        }
                    }
                }

                $stmtInv = $this->conn->prepare("INSERT INTO inventory (pae_id, item_id, current_stock, last_entry_date, last_exit_date) 
                                                VALUES (?, ?, ?, ?, ?) 
                                                ON DUPLICATE KEY UPDATE 
                                                current_stock = current_stock + ?, 
                                                last_entry_date = IF(? > 0, CURRENT_DATE, last_entry_date),
                                                last_exit_date = IF(? < 0, CURRENT_DATE, last_exit_date)");

                $entry_date = ($qty > 0) ? date('Y-m-d') : null;
                $exit_date = ($qty < 0) ? date('Y-m-d') : null;
                $stmtInv->execute([$pae_id, $item['item_id'], $qty, $entry_date, $exit_date, $qty, $qty, $qty]);
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Remisión guardada y stock actualizado']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function deleteRemission($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            // Verify ownership and get type
            $stmt = $this->conn->prepare("SELECT id, type FROM inventory_remissions WHERE id = ? AND pae_id = ?");
            $stmt->execute([$id, $pae_id]);
            $remission = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$remission) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Remisión no encontrada']);
                return;
            }

            // Get details to reverse stock
            $stmtDet = $this->conn->prepare("SELECT item_id, quantity_sent FROM inventory_remission_details WHERE remission_id = ?");
            $stmtDet->execute([$id]);
            $details = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

            $this->conn->beginTransaction();

            foreach ($details as $item) {
                // Reverse stock impact: if it was ENTRADA (positive), we subtract. If it was SALIDA (negative), we add.
                $reverseQty = ($remission['type'] === 'ENTRADA_OC') ? -$item['quantity_sent'] : $item['quantity_sent'];

                $stmtInv = $this->conn->prepare("UPDATE inventory SET current_stock = current_stock + ? WHERE item_id = ? AND pae_id = ?");
                $stmtInv->execute([$reverseQty, $item['item_id'], $pae_id]);
            }

            $this->conn->prepare("DELETE FROM inventory_remission_details WHERE remission_id = ?")->execute([$id]);
            $this->conn->prepare("DELETE FROM inventory_remissions WHERE id = ?")->execute([$id]);

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Remisión eliminada y stock actualizado']);
        } catch (Exception $e) {
            if ($this->conn->inTransaction())
                $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

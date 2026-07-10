<?php

namespace Controllers;

use Config\Database;
use Config\Config;
use Utils\JWT;
use PDO;
use Exception;

class DashboardController
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

    public function getIndex()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            if (!$pae_id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Token inválido o PAE ID faltante']);
                return;
            }

            $currentYear = date('Y');

            // 1. KPIs
            // Beneficiarios
            $stmt = $this->conn->prepare("SELECT COUNT(*) FROM beneficiaries WHERE pae_id = ? AND status IN ('ACTIVO', 'active')");
            $stmt->execute([$pae_id]);
            $totalBeneficiaries = $stmt->fetchColumn();

            // Sedes
            $stmt = $this->conn->prepare("SELECT COUNT(*) FROM school_branches WHERE pae_id = ? AND status IN ('ACTIVA', 'active')");
            $stmt->execute([$pae_id]);
            $totalBranches = $stmt->fetchColumn();

            // Raciones Entregadas Hoy
            $today = date('Y-m-d');
            $stmt = $this->conn->prepare("SELECT COUNT(*) FROM daily_consumptions WHERE pae_id = ? AND DATE(created_at) = ?");
            $stmt->execute([$pae_id, $today]);
            $rationsToday = $stmt->fetchColumn();

            // Finanzas: Presupuesto Total y Ejecutado (Filtrado por rubros activos)
            $stmt = $this->conn->prepare("
                SELECT SUM(a.valor_inicial + a.valor_adiciones - a.valor_reducciones) as total, 
                       SUM(a.valor_ejecutado) as ejecutado 
                FROM presupuesto_asignacion a
                JOIN presupuesto_items i ON a.item_id = i.id_item
                WHERE a.pae_id = ? AND i.estado = 1
            ");
            $stmt->execute([$pae_id]);
            $budgetData = $stmt->fetch(PDO::FETCH_ASSOC);
            $budgetTotal = $budgetData['total'] ?: 0;
            $budgetUsed = $budgetData['ejecutado'] ?: 0;
            $budgetRemaining = $budgetTotal - $budgetUsed;

            // 2. Gráficas
            // Distribución de poblacion o colegios
            $stmt = $this->conn->prepare("
                SELECT s.name as label, COUNT(b.id) as total 
                FROM beneficiaries b
                JOIN school_branches sb ON b.branch_id = sb.id
                JOIN schools s ON sb.school_id = s.id
                WHERE b.pae_id = ? AND b.status IN ('ACTIVO', 'active')
                GROUP BY s.id
                ORDER BY total DESC
                LIMIT 5
            ");
            $stmt->execute([$pae_id]);
            $distributionChart = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Consumos ultimos 7 dias
            $stmt = $this->conn->prepare("
                SELECT DATE(created_at) as date, COUNT(*) as total
                FROM daily_consumptions
                WHERE pae_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            ");
            $stmt->execute([$pae_id]);
            $consumptionsChart = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Rellenar vacíos de 7 dias
            $last7Days = [];
            for ($i = 6; $i >= 0; $i--) {
                $last7Days[date('Y-m-d', strtotime("-$i days"))] = 0;
            }
            foreach ($consumptionsChart as $row) {
                $last7Days[$row['date']] = (int) $row['total'];
            }
            $finalConsChart = [];
            foreach ($last7Days as $date => $total) {
                $finalConsChart[] = ['date' => $date, 'total' => $total];
            }

            // 3. Alertas
            // Inventario bajo (comparando con stock minimo si existe, o un umbral fijo)
            $stmt = $this->conn->prepare("
                SELECT i.name, i.code, inv.current_stock as stock_quantity, u.abbreviation as unit 
                FROM inventory inv
                JOIN items i ON inv.item_id = i.id
                JOIN measurement_units u ON i.measurement_unit_id = u.id
                WHERE inv.pae_id = ? AND inv.current_stock <= COALESCE(inv.minimum_stock, 5)
                ORDER BY inv.current_stock ASC
                LIMIT 5
            ");
            $stmt->execute([$pae_id]);
            $lowStockAlerts = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Cycle actual (modificado para incluir recetas del día)
            $stmt = $this->conn->prepare("
                SELECT c.name, m.name as menu_name, m.day_number,
                       r.name as recipe_name, r.description as recipe_description
                FROM menu_cycles c
                JOIN menus m ON c.id = m.cycle_id
                LEFT JOIN menu_recipes mr ON m.id = mr.menu_id
                LEFT JOIN recipes r ON mr.recipe_id = r.id
                WHERE c.pae_id = ? 
                AND c.status IN ('ACTIVO', 'active') 
                AND CURRENT_DATE BETWEEN c.start_date AND c.end_date
                ORDER BY m.day_number ASC
                LIMIT 20
            ");
            $stmt->execute([$pae_id]);
            $cyclesData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Agrupar recetas por ciclo
            $activeCycles = [];
            foreach ($cyclesData as $row) {
                $cycleKey = $row['name'] . '|' . $row['menu_name'];
                if (!isset($activeCycles[$cycleKey])) {
                    $activeCycles[$cycleKey] = [
                        'name' => $row['name'],
                        'menu_name' => $row['menu_name'],
                        'day_number' => $row['day_number'],
                        'recipes' => []
                    ];
                }
                if ($row['recipe_name']) {
                    $activeCycles[$cycleKey]['recipes'][] = [
                        'name' => $row['recipe_name'],
                        'description' => $row['recipe_description']
                    ];
                }
            }
            $activeCycles = array_values($activeCycles);

            echo json_encode([
                'success' => true,
                'data' => [
                    'kpis' => [
                        'beneficiaries' => (int) $totalBeneficiaries,
                        'branches' => (int) $totalBranches,
                        'rations_today' => (int) $rationsToday,
                        'budget_total' => (float) $budgetTotal,
                        'budget_used' => (float) $budgetUsed,
                        'budget_remaining' => (float) $budgetRemaining,
                    ],
                    'charts' => [
                        'distribution' => $distributionChart,
                        'consumptions' => $finalConsChart
                    ],
                    'alerts' => [
                        'low_stock' => $lowStockAlerts,
                        'cycles' => $activeCycles
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

<?php
namespace Controllers;

use Config\Database;
use PDO;
use Exception;

class HRPayrollController
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

    // --- CONFIGURACION / PARAMETROS ---

    public function getConfig()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $stmt = $this->conn->prepare("SELECT * FROM hr_payroll_config WHERE pae_id = :pae_id ORDER BY year DESC");
            $stmt->execute([':pae_id' => $pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function saveConfig()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();

            $stmt = $this->conn->prepare("INSERT INTO hr_payroll_config (pae_id, year, smlv, aux_transporte, is_exonerated, status) 
                                          VALUES (:pae_id, :year, :smlv, :aux_transporte, :is_exonerated, 'ACTIVO')
                                          ON DUPLICATE KEY UPDATE smlv = :smlv2, aux_transporte = :aux_transporte2, is_exonerated = :is_exonerated2");
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':year' => $data['year'],
                ':smlv' => $data['smlv'],
                ':aux_transporte' => $data['aux_transporte'],
                ':is_exonerated' => $data['is_exonerated'] ?? 0,
                ':smlv2' => $data['smlv'],
                ':aux_transporte2' => $data['aux_transporte'],
                ':is_exonerated2' => $data['is_exonerated'] ?? 0
            ]);

            echo json_encode(['success' => true, 'message' => 'Configuración guardada correctamente']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // --- PERIODOS ---

    public function getPeriods()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $stmt = $this->conn->prepare("SELECT * FROM hr_payroll_periods WHERE pae_id = :pae_id ORDER BY start_date DESC");
            $stmt->execute([':pae_id' => $pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function storePeriod()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();

            $stmt = $this->conn->prepare("INSERT INTO hr_payroll_periods (pae_id, name, start_date, end_date, type, status) 
                                          VALUES (:pae_id, :name, :start_date, :end_date, :type, 'ABIERTO')");
            $stmt->execute([
                ':pae_id' => $pae_id,
                ':name' => $data['name'],
                ':start_date' => $data['start_date'],
                ':end_date' => $data['end_date'],
                ':type' => $data['type'] ?? 'MENSUAL'
            ]);

            echo json_encode(['success' => true, 'message' => 'Periodo creado correctamente']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // --- CONCEPTOS ---

    public function getConcepts()
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $stmt = $this->conn->prepare("SELECT * FROM hr_payroll_concepts WHERE pae_id = :pae_id ORDER BY name ASC");
            $stmt->execute([':pae_id' => $pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function saveConcept()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();

            if (isset($data['id'])) {
                $stmt = $this->conn->prepare("UPDATE hr_payroll_concepts SET name = ?, type = ?, status = ? WHERE id = ? AND pae_id = ?");
                $stmt->execute([$data['name'], $data['type'], $data['status'], $data['id'], $pae_id]);
            } else {
                $stmt = $this->conn->prepare("INSERT INTO hr_payroll_concepts (pae_id, name, type, status) VALUES (?, ?, ?, 'ACTIVO')");
                $stmt->execute([$pae_id, $data['name'], $data['type']]);
            }
            echo json_encode(['success' => true, 'message' => 'Concepto guardado']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function deleteConcept($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            // Verificar si tiene novedades asociadas
            $stmtCheck = $this->conn->prepare("SELECT COUNT(*) FROM hr_payroll_novelties WHERE concept_id = ? AND pae_id = ?");
            $stmtCheck->execute([$id, $pae_id]);
            if ($stmtCheck->fetchColumn() > 0) {
                throw new Exception("No se puede eliminar el concepto porque tiene novedades registradas.");
            }

            $stmt = $this->conn->prepare("DELETE FROM hr_payroll_concepts WHERE id = ? AND pae_id = ?");
            $stmt->execute([$id, $pae_id]);
            echo json_encode(['success' => true, 'message' => 'Concepto eliminado']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // --- LIQUIDACION ---

    public function calculatePayroll($period_id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $this->conn->beginTransaction();

            // 1. Obtener datos del periodo y VALIDAR PAE
            $stmtP = $this->conn->prepare("SELECT * FROM hr_payroll_periods WHERE id = ? AND pae_id = ?");
            $stmtP->execute([$period_id, $pae_id]);
            $period = $stmtP->fetch();

            if (!$period || $period['status'] === 'CERRADO') {
                throw new Exception("Periodo no válido, cerrado o acceso denegado");
            }

            // 2. Obtener configuración vigente (por año del periodo)
            $year = date('Y', strtotime($period['start_date']));
            $stmtC = $this->conn->prepare("SELECT * FROM hr_payroll_config WHERE pae_id = ? AND year = ?");
            $stmtC->execute([$pae_id, $year]);
            $config = $stmtC->fetch();

            if (!$config) {
                throw new Exception("No existe configuración de parámetros para el año $year");
            }

            // 3. Obtener empleados activos
            $stmtE = $this->conn->prepare("SELECT * FROM hr_employees WHERE pae_id = ? AND status = 'ACTIVO'");
            $stmtE->execute([$pae_id]);
            $employees = $stmtE->fetchAll();

            // 4. Limpiar liquidaciones previas del mismo periodo si existen
            $this->conn->prepare("DELETE FROM hr_payrolls WHERE period_id = ? AND pae_id = ?")->execute([$period_id, $pae_id]);

            foreach ($employees as $emp) {
                $salary = (float) $emp['salary'];
                $total_devengado = 0;
                $total_deduccion = 0;
                $details = [];

                // A. Sueldo Básico
                $details[] = ['desc' => 'Sueldo Básico', 'amount' => $salary, 'type' => 'DEVENGADO'];
                $total_devengado += $salary;

                // B. Auxilio de Transporte (Si aplica < 2 SMLV)
                if ($salary <= ($config['smlv'] * 2)) {
                    $aux = (float) $config['aux_transporte'];
                    $details[] = ['desc' => 'Auxilio Transporte', 'amount' => $aux, 'type' => 'DEVENGADO'];
                    $total_devengado += $aux;
                }

                // C. Salud y Pension (4% cada uno por ley COL) - Sobre el sueldo base
                $salud = round($salary * 0.04, 0);
                $pension = round($salary * 0.04, 0);

                $details[] = ['desc' => 'Aporte Salud (4%)', 'amount' => -$salud, 'type' => 'DEDUCCION'];
                $details[] = ['desc' => 'Aporte Pensión (4%)', 'amount' => -$pension, 'type' => 'DEDUCCION'];
                $total_deduccion += ($salud + $pension);

                // D. Novedades (Extras, Bonos, Préstamos, etc.) - VALIDAR PAE
                $stmtNov = $this->conn->prepare("SELECT n.*, c.name as concept_name, c.type as concept_type 
                                                 FROM hr_payroll_novelties n
                                                 JOIN hr_payroll_concepts c ON n.concept_id = c.id
                                                 WHERE n.period_id = ? AND n.employee_id = ? AND n.pae_id = ?");
                $stmtNov->execute([$period_id, $emp['id'], $pae_id]);
                $novelties = $stmtNov->fetchAll();

                foreach ($novelties as $nov) {
                    $amount = (float) $nov['amount'];
                    if ($nov['concept_type'] === 'DEVENGADO') {
                        $details[] = ['desc' => $nov['concept_name'], 'amount' => $amount, 'type' => 'DEVENGADO'];
                        $total_devengado += $amount;
                    } else {
                        $details[] = ['desc' => $nov['concept_name'], 'amount' => -$amount, 'type' => 'DEDUCCION'];
                        $total_deduccion += $amount;
                    }
                }

                // E. Insertar Cabecera
                $stmtIns = $this->conn->prepare("INSERT INTO hr_payrolls (pae_id, period_id, employee_id, total_devengado, total_deduccion, total_neto) 
                                                 VALUES (?, ?, ?, ?, ?, ?)");
                $stmtIns->execute([$pae_id, $period_id, $emp['id'], $total_devengado, $total_deduccion, ($total_devengado - $total_deduccion)]);
                $payroll_id = $this->conn->lastInsertId();

                // F. Insertar Detalles
                $stmtDet = $this->conn->prepare("INSERT INTO hr_payroll_details (payroll_id, description, amount) VALUES (?, ?, ?)");
                foreach ($details as $d) {
                    $stmtDet->execute([$payroll_id, $d['desc'], $d['amount']]);
                }
            }

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Nómina liquidada para ' . count($employees) . ' empleados']);
        } catch (Exception $e) {
            $this->conn->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getPayrollResults($period_id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $query = "SELECT r.*, e.first_name, e.last_name1, e.document_number, p.description as position_name
                      FROM hr_payrolls r
                      JOIN hr_employees e ON r.employee_id = e.id
                      LEFT JOIN hr_positions p ON e.position_id = p.id
                      WHERE r.period_id = :period_id AND r.pae_id = :pae_id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':period_id' => $period_id, ':pae_id' => $pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // --- NOVEDADES ---

    public function getNovelties($period_id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $query = "SELECT n.*, e.first_name, e.last_name1, c.name as concept_name, c.type as concept_type
                      FROM hr_payroll_novelties n
                      JOIN hr_employees e ON n.employee_id = e.id
                      JOIN hr_payroll_concepts c ON n.concept_id = c.id
                      WHERE n.period_id = :period_id AND n.pae_id = :pae_id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':period_id' => $period_id, ':pae_id' => $pae_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function saveNovelty()
    {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $pae_id = $this->getPaeIdFromToken();

            if (isset($data['id'])) {
                $stmt = $this->conn->prepare("UPDATE hr_payroll_novelties 
                                              SET employee_id = ?, concept_id = ?, amount = ?, description = ?
                                              WHERE id = ? AND pae_id = ?");
                $stmt->execute([$data['employee_id'], $data['concept_id'], $data['amount'], $data['description'], $data['id'], $pae_id]);
            } else {
                $stmt = $this->conn->prepare("INSERT INTO hr_payroll_novelties (pae_id, employee_id, period_id, concept_id, amount, description) 
                                              VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$pae_id, $data['employee_id'], $data['period_id'], $data['concept_id'], $data['amount'], $data['description']]);
            }

            echo json_encode(['success' => true, 'message' => 'Novedad guardada correctamente']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function deleteNovelty($id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();
            $stmt = $this->conn->prepare("DELETE FROM hr_payroll_novelties WHERE id = ? AND pae_id = ?");
            $stmt->execute([$id, $pae_id]);
            echo json_encode(['success' => true, 'message' => 'Novedad eliminada']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getPayrollReport($period_id)
    {
        try {
            $pae_id = $this->getPaeIdFromToken();

            // Obtener el año del periodo para buscar la configuracion
            $stmtP = $this->conn->prepare("SELECT year(start_date) as year FROM hr_payroll_periods WHERE id = ?");
            $stmtP->execute([$period_id]);
            $year = $stmtP->fetchColumn();

            $stmtC = $this->conn->prepare("SELECT is_exonerated FROM hr_payroll_config WHERE pae_id = ? AND year = ?");
            $stmtC->execute([$pae_id, $year]);
            $is_exonerated = $stmtC->fetchColumn() ?: 0;

            // 1. Cabeceras con datos de empleado y cargo, ahora incluyendo el porcentaje arl asociado
            $query = "SELECT r.*, e.first_name, e.last_name1, e.document_number, 
                             p.description as position_name, IFNULL(p.arl_risk_percent, 0.522) as arl_risk_percent
                      FROM hr_payrolls r
                      JOIN hr_employees e ON r.employee_id = e.id
                      LEFT JOIN hr_positions p ON e.position_id = p.id
                      WHERE r.period_id = :period_id AND r.pae_id = :pae_id";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([':period_id' => $period_id, ':pae_id' => $pae_id]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 2. Obtener detalles para cada registro
            foreach ($results as &$res) {
                $stmtDet = $this->conn->prepare("SELECT * FROM hr_payroll_details WHERE payroll_id = ?");
                $stmtDet->execute([$res['id']]);
                $res['details'] = $stmtDet->fetchAll(PDO::FETCH_ASSOC);
            }

            echo json_encode(['success' => true, 'is_exonerated' => $is_exonerated, 'data' => $results]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

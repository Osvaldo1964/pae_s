<?php
// Versión sin transacciones dado que CREATE TABLE produce commits implícitos en MySQL
$env = [];
$lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0)
        continue;
    list($name, $value) = explode('=', $line, 2);
    $env[trim($name)] = trim($value);
}

$host = $env['DB_HOST'] ?? 'localhost';
$dbname = $env['DB_NAME'] ?? 'db-pae';
$user = $env['DB_USER'] ?? 'root';
$pass = $env['DB_PASS'] ?? '';

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Creating Payroll System tables...\n";

    // 1. Configuracion global de nomina
    $conn->exec("CREATE TABLE IF NOT EXISTS hr_payroll_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        year INT NOT NULL,
        smlv DECIMAL(12,2) NOT NULL,
        aux_transporte DECIMAL(12,2) NOT NULL,
        status ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY (pae_id, year),
        INDEX (pae_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 2. Periodos de nomina
    $conn->exec("CREATE TABLE IF NOT EXISTS hr_payroll_periods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        type ENUM('MENSUAL', 'QUINCENAL') DEFAULT 'MENSUAL',
        status ENUM('ABIERTO', 'CERRADO') DEFAULT 'ABIERTO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (pae_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 3. Conceptos de nomina
    $conn->exec("CREATE TABLE IF NOT EXISTS hr_payroll_concepts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        type ENUM('DEVENGADO', 'DEDUCCION') NOT NULL,
        formula_type ENUM('VALOR_FIJO', 'PORCENTAJE', 'SMLV_DEPENDIENTE') DEFAULT 'VALOR_FIJO',
        value DECIMAL(12,4) DEFAULT 0.00,
        is_legal TINYINT(1) DEFAULT 0,
        status ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (pae_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 4. Cabecera de nomina procesada
    $conn->exec("CREATE TABLE IF NOT EXISTS hr_payrolls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        period_id INT NOT NULL,
        employee_id INT NOT NULL,
        total_devengado DECIMAL(12,2) DEFAULT 0.00,
        total_deduccion DECIMAL(12,2) DEFAULT 0.00,
        total_neto DECIMAL(12,2) DEFAULT 0.00,
        status ENUM('PROCESADO', 'PAGADO', 'ANULADO') DEFAULT 'PROCESADO',
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (pae_id),
        INDEX (period_id),
        INDEX (employee_id),
        FOREIGN KEY (period_id) REFERENCES hr_payroll_periods(id),
        FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 5. Detalle de nomina
    $conn->exec("CREATE TABLE IF NOT EXISTS hr_payroll_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payroll_id INT NOT NULL,
        concept_id INT DEFAULT NULL,
        description VARCHAR(150) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        INDEX (payroll_id),
        FOREIGN KEY (payroll_id) REFERENCES hr_payrolls(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // 6. Novedades de nomina
    $conn->exec("CREATE TABLE IF NOT EXISTS hr_payroll_novelties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        employee_id INT NOT NULL,
        period_id INT NOT NULL,
        concept_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (pae_id),
        INDEX (employee_id),
        INDEX (period_id),
        FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
        FOREIGN KEY (period_id) REFERENCES hr_payroll_periods(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    echo "Adding Payroll Modules to Menu...\n";

    // 7. Buscar ID del grupo "Recurso Humano"
    $stmt = $conn->prepare("SELECT id FROM module_groups WHERE name = 'Recurso Humano'");
    $stmt->execute();
    $groupId = $stmt->fetchColumn();

    if ($groupId) {
        $stmtOrder = $conn->prepare("SELECT MAX(order_index) FROM modules WHERE group_id = ?");
        $stmtOrder->execute([$groupId]);
        $lastOrder = (int) $stmtOrder->fetchColumn();

        $stmtMod = $conn->prepare("INSERT INTO modules (group_id, name, description, route_key, icon, order_index) VALUES (?, ?, ?, ?, ?, ?)");

        // Evitar duplicados si se corre varias veces
        $stmtCheck = $conn->prepare("SELECT COUNT(*) FROM modules WHERE route_key = ?");

        $stmtCheck->execute(['hr-payroll-config']);
        if ($stmtCheck->fetchColumn() == 0) {
            $stmtMod->execute([$groupId, 'Parámetros Nomina', 'Configuración de SMLV y Subsidio', 'hr-payroll-config', 'fas fa-cogs', $lastOrder + 1]);
        }

        $stmtCheck->execute(['hr-payrolls']);
        if ($stmtCheck->fetchColumn() == 0) {
            $stmtMod->execute([$groupId, 'Nómina', 'Liquidación de nómina y periodos', 'hr-payrolls', 'fas fa-file-invoice-dollar', $lastOrder + 2]);
        }
    }

    echo "Migration completed successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}

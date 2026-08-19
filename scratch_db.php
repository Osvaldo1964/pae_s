<?php
require 'api/utils/Env.php';
require 'api/config/Database.php';

$db = Config\Database::getInstance()->getConnection();

try {
    $db->beginTransaction();

    // 1. Insert missing Module Groups
    $groups = [
        ['id' => 99, 'name' => 'Financiero', 'icon' => 'fas fa-money-bill-wave', 'order_index' => 8],
        ['id' => 98, 'name' => 'Repositorio', 'icon' => 'fas fa-folder-open', 'order_index' => 9]
    ];

    $stmtGroup = $db->prepare("INSERT IGNORE INTO module_groups (id, name, icon, order_index) VALUES (:id, :name, :icon, :order_index)");
    foreach ($groups as $g) {
        $stmtGroup->execute($g);
    }

    // 2. Insert missing Modules
    $modules = [
        // Financiero
        ['group_id' => 99, 'name' => 'Terceros', 'description' => 'Gestión de terceros', 'route_key' => 'fin-terceros', 'icon' => 'fas fa-users'],
        ['group_id' => 99, 'name' => 'Presupuestos', 'description' => 'Creación y gestión de presupuesto', 'route_key' => 'fin-presupuesto', 'icon' => 'fas fa-chart-pie'],
        ['group_id' => 99, 'name' => 'Costos y Gastos', 'description' => 'Registro Costos y Gastos', 'route_key' => 'fin-movimientos', 'icon' => 'fas fa-money-check-alt'],
        ['group_id' => 99, 'name' => 'Traslados', 'description' => 'Modificaciones Contractuales', 'route_key' => 'fin-traslados', 'icon' => 'fas fa-exchange-alt'],
        ['group_id' => 99, 'name' => 'Ajustes', 'description' => 'Ajustes Contractuales', 'route_key' => 'fin-ajustes', 'icon' => 'fas fa-sliders-h'],
        ['group_id' => 99, 'name' => 'Modificaciones', 'description' => 'Otras Modificaciones', 'route_key' => 'fin-modificaciones', 'icon' => 'fas fa-edit'],
        ['group_id' => 99, 'name' => 'Definición de Movimientos', 'description' => 'Definición Costos y Gastos', 'route_key' => 'fin-movimiento-tipos', 'icon' => 'fas fa-tags'],

        // Repositorio
        ['group_id' => 98, 'name' => 'Documentos', 'description' => 'Repositorio de documentos', 'route_key' => 'repositorio', 'icon' => 'fas fa-file-alt'],

        // Reportes (group_id = 5)
        ['group_id' => 5, 'name' => 'Reporte Insumos', 'description' => 'Reportes de Alimentación', 'route_key' => 'reports-insumos', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Recetas', 'description' => 'Reportes de Alimentación', 'route_key' => 'reports-recetas', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Minutas', 'description' => 'Reportes de Alimentación', 'route_key' => 'reports-minutas', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Análisis de Ciclos', 'description' => 'Reportes de Alimentación', 'route_key' => 'reports-ciclos-analisis', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Presupuesto', 'description' => 'Reportes Financieros', 'route_key' => 'reports-presupuesto', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Costos', 'description' => 'Reportes Financieros', 'route_key' => 'reports-costs', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Ejecución', 'description' => 'Reportes Financieros', 'route_key' => 'reports-ejecucion', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Movimientos Aux', 'description' => 'Reportes Financieros', 'route_key' => 'reports-movimientos-aux', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Asistencia', 'description' => 'Reportes Administrativos', 'route_key' => 'reports-attendance', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Carnets', 'description' => 'Reportes Administrativos', 'route_key' => 'reports-carnets', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Cursos QR', 'description' => 'Reportes Administrativos', 'route_key' => 'reports-qr-courses', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Beneficiarios', 'description' => 'Reportes Administrativos', 'route_key' => 'reports-beneficiarios', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Pagos', 'description' => 'Reportes Talento Humano', 'route_key' => 'reports-pay', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Empleados', 'description' => 'Reportes Talento Humano', 'route_key' => 'reports-hr-employees', 'icon' => 'fas fa-chart-bar'],
        ['group_id' => 5, 'name' => 'Reporte Cargos', 'description' => 'Reportes Talento Humano', 'route_key' => 'reports-hr-positions', 'icon' => 'fas fa-chart-bar']
    ];

    // Find the next available order_index per group
    $stmtModule = $db->prepare("INSERT INTO modules (group_id, name, description, route_key, icon, order_index) 
                                SELECT :group_id, :name, :description, :route_key, :icon, COALESCE(MAX(order_index) + 1, 0) 
                                FROM modules WHERE group_id = :group_id_sub");

    foreach ($modules as $m) {
        // Check if route_key already exists
        $check = $db->prepare("SELECT id FROM modules WHERE route_key = ?");
        $check->execute([$m['route_key']]);
        if (!$check->fetch()) {
            $m['group_id_sub'] = $m['group_id'];
            $stmtModule->execute($m);
        }
    }

    $db->commit();
    echo "Groups and Modules successfully updated.\n";

} catch (Exception $e) {
    $db->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}

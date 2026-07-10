<?php
/**
 * Migración: Ajustes Normatividad 2026 (Resolución 0003)
 * Implementa Grupos Nutricionales por Grado y Modalidades de Atención
 */

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../utils/Env.php';

use Config\Database;

try {
    $db = Database::getInstance()->getConnection();
    echo "Iniciando migración de normatividad 2026...\n";

    // 1. Grupos Nutricionales (Preescolar, Primaria, Secundaria)
    $db->exec("CREATE TABLE IF NOT EXISTS pae_nutritional_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        min_age INT,
        max_age INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Insertar grupos base si no existen
    $stmt = $db->query("SELECT COUNT(*) FROM pae_nutritional_groups");
    if ($stmt->fetchColumn() == 0) {
        $db->exec("INSERT INTO pae_nutritional_groups (name, description, min_age, max_age) VALUES 
            ('PREESCOLAR', 'Grados Transición, Jardín y Pre-jardín. Prioridad de cobertura.', 3, 6),
            ('PRIMARIA', 'Grados 1° a 5°. Prioridad grados 1° y 2°.', 6, 11),
            ('SECUNDARIA Y MEDIA', 'Grados 6° a 11°.', 11, 18)");
        echo "Grupos nutricionales creados.\n";
    }

    // 2. Mapeo de Grados a Grupos Nutricionales
    $db->exec("CREATE TABLE IF NOT EXISTS pae_grade_mappings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        grade_name VARCHAR(100) NOT NULL,
        nutritional_group_id INT NOT NULL,
        FOREIGN KEY (nutritional_group_id) REFERENCES pae_nutritional_groups(id),
        UNIQUE KEY (pae_id, grade_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 3. Modalidades de Atención (Conjunto de raciones)
    $db->exec("CREATE TABLE IF NOT EXISTS pae_modalities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pae_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        status ENUM('ACTIVO', 'INACTIVO') DEFAULT 'ACTIVO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 4. Relación Modalidad - Tipos de Ración
    $db->exec("CREATE TABLE IF NOT EXISTS pae_modality_rations (
        modality_id INT NOT NULL,
        ration_type_id INT NOT NULL,
        PRIMARY KEY (modality_id, ration_type_id),
        FOREIGN KEY (modality_id) REFERENCES pae_modalities(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 5. Actualizar Tabla de Beneficiarios
    // Agregar modality_id y nutritional_group_id para caché operativa
    $db->exec("ALTER TABLE beneficiaries 
        ADD COLUMN modality_id INT NULL AFTER ration_type_id,
        ADD COLUMN nutritional_group_id INT NULL AFTER modality_id;");

    echo "Migración completada exitosamente.\n";

} catch (Exception $e) {
    die("Error en la migración: " . $e->getMessage() . "\n");
}

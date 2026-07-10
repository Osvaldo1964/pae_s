-- Tabla de entregas diarias (Control operativo Resolución 003)
CREATE TABLE daily_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    branch_id INT NOT NULL,
    beneficiary_id INT NOT NULL,
    user_id INT NOT NULL COMMENT 'Usuario que registró la entrega',
    
    delivery_date DATE NOT NULL,
    delivery_time TIME NOT NULL,
    meal_type ENUM('AM', 'PM', 'ALMUERZO') NOT NULL COMMENT 'Tipo de complemento entregado',
    
    sync_status ENUM('PENDING', 'SYNCED') DEFAULT 'SYNCED' COMMENT 'Para soporte offline (futuro)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (pae_id) REFERENCES pae_programs(id),
    FOREIGN KEY (branch_id) REFERENCES school_branches(id),
    FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    
    -- Evitar duplicados: Un niño solo puede recibir un complemento del mismo tipo por día
    UNIQUE KEY unique_daily_delivery (beneficiary_id, delivery_date, meal_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para reportes rápidos
CREATE INDEX idx_deliveries_date_branch ON daily_deliveries(delivery_date, branch_id);

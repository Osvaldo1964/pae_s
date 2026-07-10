-- Tablas para el Módulo de Presupuesto con Soporte Multi-Tenant (pae_id)

CREATE TABLE IF NOT EXISTS `presupuesto_items` (
  `id_item` int(11) NOT NULL AUTO_INCREMENT,
  `pae_id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL COMMENT 'Ej: 1.1, 2.3.1',
  `nombre` text NOT NULL,
  `descripcion` text DEFAULT NULL,
  `padre_id` int(11) DEFAULT NULL COMMENT 'ID del ítem padre (para jerarquía)',
  `unidad_medida` varchar(50) DEFAULT NULL COMMENT 'Ej: Meses, Global, Unidades',
  `cantidad_global` decimal(12,3) DEFAULT 0.000,
  `tiempo_global` decimal(12,3) NOT NULL DEFAULT 0.000,
  `valor_unitario_oficial` decimal(15,2) DEFAULT 0.00,
  `valor_total_oficial` decimal(15,2) DEFAULT 0.00 COMMENT 'Valor total del proyecto por este ítem',
  `estado` int(11) DEFAULT 1,
  PRIMARY KEY (`id_item`),
  KEY `pae_id` (`pae_id`),
  KEY `padre_id` (`padre_id`),
  CONSTRAINT `fk_bud_item_pae` FOREIGN KEY (`pae_id`) REFERENCES `pae_programs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `presupuesto_asignacion` (
  `id_asignacion` int(11) NOT NULL AUTO_INCREMENT,
  `pae_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL COMMENT 'FK a tabla school_branches',
  `cantidad` decimal(12,3) DEFAULT 0.000,
  `meses` decimal(12,3) DEFAULT 0.000,
  `valor_unitario` decimal(15,2) DEFAULT 0.00,
  `valor_inicial` decimal(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Lo asignado al cargar el presupuesto',
  `valor_adiciones` decimal(15,2) DEFAULT 0.00 COMMENT 'Aumentos por traslados',
  `valor_reducciones` decimal(15,2) DEFAULT 0.00 COMMENT 'Disminuciones por traslados',
  `valor_ejecutado` decimal(15,2) DEFAULT 0.00 COMMENT 'Total gastado hasta la fecha',
  `valor_traslados_credito` decimal(15,2) DEFAULT 0.00,
  `valor_traslados_contracredito` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id_asignacion`),
  UNIQUE KEY `unique_item_branch` (`item_id`,`branch_id`),
  KEY `pae_id` (`pae_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `fk_asignacion_item` FOREIGN KEY (`item_id`) REFERENCES `presupuesto_items` (`id_item`) ON DELETE CASCADE,
  CONSTRAINT `fk_asignacion_pae` FOREIGN KEY (`pae_id`) REFERENCES `pae_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asignacion_branch` FOREIGN KEY (`branch_id`) REFERENCES `school_branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

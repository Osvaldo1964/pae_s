-- Tabla de Traslados Presupuestales con Soporte Multi-Tenant (pae_id)

CREATE TABLE IF NOT EXISTS `presupuesto_traslados` (
  `id_traslado` int(11) NOT NULL AUTO_INCREMENT,
  `pae_id` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `origen_id` int(11) NOT NULL COMMENT 'FK a presupuesto_asignacion (se debita)',
  `destino_id` int(11) NOT NULL COMMENT 'FK a presupuesto_asignacion (se acredita)',
  `valor` decimal(15,2) NOT NULL,
  `justificacion` text NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_traslado`),
  KEY `pae_id` (`pae_id`),
  KEY `origen_id` (`origen_id`),
  KEY `destino_id` (`destino_id`),
  CONSTRAINT `fk_tras_pae` FOREIGN KEY (`pae_id`) REFERENCES `pae_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tras_origen` FOREIGN KEY (`origen_id`) REFERENCES `presupuesto_asignacion` (`id_asignacion`),
  CONSTRAINT `fk_tras_destino` FOREIGN KEY (`destino_id`) REFERENCES `presupuesto_asignacion` (`id_asignacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

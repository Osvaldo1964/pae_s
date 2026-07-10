-- Tabla de Movimientos Presupuestales con Soporte Multi-Tenant (pae_id)

CREATE TABLE IF NOT EXISTS `presupuesto_movimientos` (
  `id_movimiento` int(11) NOT NULL AUTO_INCREMENT,
  `pae_id` int(11) NOT NULL,
  `asignacion_id` int(11) NOT NULL COMMENT 'De qué bolsa (Centro/Ítem) sale el dinero',
  `tercero_id` int(11) NOT NULL COMMENT 'A quién se le paga',
  `tipo_movimiento` enum('Pago','Compra','Nomina','Servicio','Otro') NOT NULL,
  `fecha` date NOT NULL,
  `numero_documento` varchar(50) DEFAULT NULL COMMENT 'Nro Factura, Cuenta de Cobro',
  `detalle` text NOT NULL COMMENT 'Observación detallada del gasto',
  `valor` decimal(15,2) NOT NULL,
  `soporte_url` varchar(255) DEFAULT NULL COMMENT 'Ruta al archivo PDF/Img',
  `usuario_id` int(11) NOT NULL COMMENT 'Quién registró',
  `datecreated` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_movimiento`),
  KEY `pae_id` (`pae_id`),
  KEY `asignacion_id` (`asignacion_id`),
  KEY `tercero_id` (`tercero_id`),
  CONSTRAINT `fk_mov_pae` FOREIGN KEY (`pae_id`) REFERENCES `pae_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mov_asignacion` FOREIGN KEY (`asignacion_id`) REFERENCES `presupuesto_asignacion` (`id_asignacion`),
  CONSTRAINT `fk_mov_tercero` FOREIGN KEY (`tercero_id`) REFERENCES `terceros` (`id_tercero`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

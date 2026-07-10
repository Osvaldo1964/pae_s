CREATE TABLE IF NOT EXISTS `terceros` (
  `id_tercero` int(11) NOT NULL AUTO_INCREMENT,
  `pae_id` int(11) NOT NULL,
  `identificacion` varchar(50) NOT NULL COMMENT 'NIT o Cédula',
  `nombres` varchar(255) NOT NULL COMMENT 'Razón Social o Nombre Completo',
  `direccion` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `tipo_tercero` enum('Proveedor','Empleado','Contratista','Otro') DEFAULT 'Proveedor',
  `estado` int(11) DEFAULT 1,
  `datecreated` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_tercero`),
  KEY `pae_id` (`pae_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

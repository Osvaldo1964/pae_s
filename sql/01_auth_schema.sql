-- Database Schema for PAE Control WebApp - Phase 1
-- Created: 2026-01-31

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------

-- Table: roles
CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed: roles
INSERT INTO `roles` (`name`, `description`) VALUES
('SUPER_ADMIN', 'Acceso total al sistema'),
('ADMIN_CENTRAL', 'Administrador central del PAE'),
('OPERADOR_LOGISTICO', 'Encargado de inventario y logística'),
('RECTOR_SEDE', 'Validación en instituciones educativas'),
('MANIPULADORA', 'Registro de consumo y preparación');

-- --------------------------------------------------------

-- Table: module_groups (Categorías del Sidebar)
CREATE TABLE `module_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `icon` varchar(50) DEFAULT 'fas fa-folder',
  `order_index` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed: module_groups
INSERT INTO `module_groups` (`name`, `icon`, `order_index`) VALUES
('Configuración', 'fas fa-cogs', 1),
('Entorno', 'fas fa-map-marked-alt', 2),
('Beneficiarios', 'fas fa-users', 3),
('Cocina', 'fas fa-utensils', 4),
('Reportes', 'fas fa-chart-line', 5);

-- --------------------------------------------------------

-- Table: modules (Tarjetas/Sub-módulos)
CREATE TABLE `modules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `route_key` varchar(50) NOT NULL COMMENT 'Identificador para el router JS',
  `icon` varchar(50) DEFAULT 'fas fa-circle',
  PRIMARY KEY (`id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `fk_module_group` FOREIGN KEY (`group_id`) REFERENCES `module_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed: modules
INSERT INTO `modules` (`group_id`, `name`, `description`, `route_key`, `icon`) VALUES
-- Configuración
(1, 'Usuarios', 'Gestión de usuarios y accesos', 'users', 'fas fa-user-cog'),
(1, 'Roles y Permisos', 'Configuración de perfiles de acceso', 'roles', 'fas fa-shield-alt'),
-- Entorno
(2, 'Sedes Educativas', 'Gestión de instituciones y sedes', 'sedes', 'fas fa-school'),
(2, 'Proveedores', 'Directorio de proveedores', 'proveedores', 'fas fa-truck'),
-- Beneficiarios
(3, 'Estudiantes', 'Base de datos de titulares de derecho', 'beneficiarios', 'fas fa-child'),
(3, 'Novedades', 'Reporte de ausentismos y retiros', 'novedades', 'fas fa-exclamation-circle'),
-- Cocina
(4, 'Minutas', 'Planeación de menús y ciclos', 'minutas', 'fas fa-book-open'),
(4, 'Almacén', 'Entradas, salidas e inventario', 'almacen', 'fas fa-warehouse'),
-- Reportes
(5, 'Dashboards', 'Tableros de control gerencial', 'dashboard_kpi', 'fas fa-tachometer-alt');

-- --------------------------------------------------------

-- Table: module_permissions
CREATE TABLE `module_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) NOT NULL,
  `module_id` int(11) NOT NULL,
  `can_create` tinyint(1) DEFAULT 0,
  `can_read` tinyint(1) DEFAULT 0,
  `can_update` tinyint(1) DEFAULT 0,
  `can_delete` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `role_id` (`role_id`),
  KEY `module_id` (`module_id`),
  CONSTRAINT `fk_perm_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_perm_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

-- Table: users
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `fk_user_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed: users (Super Admin / Password: admin)
-- Using BCRYPT hash for 'admin'
INSERT INTO `users` (`role_id`, `username`, `email`, `password_hash`, `full_name`) VALUES
(1, 'admin', 'admin@pae.gov.co', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super Administrador');

COMMIT;

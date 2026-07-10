-- Tabla de categorías dinámicas de entregables
CREATE TABLE IF NOT EXISTS `deliverable_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pae_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` enum('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de jerarquía de carpetas
CREATE TABLE IF NOT EXISTS `deliverable_folders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pae_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_deliverable_folders_parent` (`parent_id`),
  CONSTRAINT `fk_deliverable_folders_parent` FOREIGN KEY (`parent_id`) REFERENCES `deliverable_folders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla principal de documentos entregables
CREATE TABLE IF NOT EXISTS `deliverable_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pae_id` int(11) NOT NULL,
  `folder_id` int(11) NOT NULL,
  `deliverable_category_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `school_id` int(11) DEFAULT NULL,
  `school_branch_id` int(11) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Borrador',
  `keywords` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_type` varchar(100) NOT NULL,
  `file_size` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_deliverable_documents_folder` (`folder_id`),
  KEY `fk_deliverable_documents_category` (`deliverable_category_id`),
  CONSTRAINT `fk_deliverable_documents_folder` FOREIGN KEY (`folder_id`) REFERENCES `deliverable_folders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_deliverable_documents_category` FOREIGN KEY (`deliverable_category_id`) REFERENCES `deliverable_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

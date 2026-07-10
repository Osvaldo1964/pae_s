CREATE TABLE IF NOT EXISTS `pqrs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pae_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `status` varchar(20) DEFAULT 'Pendiente',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`pae_id`) REFERENCES `pae_programs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

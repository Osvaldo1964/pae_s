-- Environment Module Schema (Schools and Branches)

-- Table for Educational Institutions (Schools)
CREATE TABLE IF NOT EXISTS schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    dane_code VARCHAR(50), 
    name VARCHAR(255) NOT NULL,
    rector VARCHAR(255),
    address VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    logo_path VARCHAR(255),
    department VARCHAR(100),
    municipality VARCHAR(100),
    school_type ENUM('PUBLICO', 'PRIVADO', 'MIXTO', 'INDIGENA') DEFAULT 'PUBLICO',
    area_type ENUM('URBANA', 'RURAL') DEFAULT 'URBANA',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for School Branches (Sedes)
CREATE TABLE IF NOT EXISTS school_branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NOT NULL,
    pae_id INT NOT NULL,
    dane_code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(50),
    manager_name VARCHAR(255), -- Encargado
    area_type ENUM('URBANA', 'RURAL') DEFAULT 'URBANA',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance
CREATE INDEX idx_schools_pae ON schools(pae_id);
CREATE INDEX idx_branches_school ON school_branches(school_id);
CREATE INDEX idx_branches_pae ON school_branches(pae_id);

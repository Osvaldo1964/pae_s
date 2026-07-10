-- Master Tables and Beneficiaries Schema (Resolution 0003 of 2026)

-- Table for Document Types
CREATE TABLE IF NOT EXISTS document_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL, -- RC, TI, CC, NES, PEP, PPT
    name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO document_types (code, name) VALUES 
('RC', 'REGISTRO CIVIL'),
('TI', 'TARJETA DE IDENTIDAD'),
('CC', 'CÉDULA DE CIUDADANÍA'),
('NES', 'NÚMERO ESTABLECIDO POR LA SED'),
('PEP', 'PERMISO ESPECIAL DE PERMANENCIA'),
('PPT', 'PERMISO POR PROTECCIÓN TEMPORAL');

-- Table for Ethnic Groups
CREATE TABLE IF NOT EXISTS ethnic_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL, -- 01, 02, etc.
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO ethnic_groups (code, name, description) VALUES 
('01', 'INDÍGENA', 'Propia / Concertada'),
('02', 'NEGRO / AFROCOLOMBIANO', 'Estándar con enfoque cultural'),
('03', 'RAIZAL', 'Regional Caribe Insular'),
('04', 'PALENQUERO', 'Estándar con enfoque cultural'),
('05', 'RROM (GITANO)', 'Estándar'),
('06', 'SIN PERTENENCIA ÉTNICA', 'Estándar (Resolución 0003)');

-- Main Beneficiaries Table
CREATE TABLE IF NOT EXISTS beneficiaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pae_id INT NOT NULL,
    branch_id INT NOT NULL,
    
    -- Identification
    document_type_id INT NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    gender ENUM('Masculino', 'Femenino', 'No binario') DEFAULT 'Masculino',
    
    -- Hierarchy & Enrollment
    shift ENUM('Mañana', 'Tarde', 'Única', 'Nocturna', 'Completa') DEFAULT 'Única',
    grade VARCHAR(50), -- Ej: 3°, Transición, etc.
    group_letter VARCHAR(10), -- Ej: A, B, 01
    
    -- Socio-economic & Prioritization
    ethnic_group_id INT NOT NULL,
    sisben_category VARCHAR(10), -- A1, B2, etc.
    is_disabled BOOLEAN DEFAULT FALSE,
    is_conflict_victim BOOLEAN DEFAULT FALSE,
    is_migrant BOOLEAN DEFAULT FALSE,
    
    -- Contact Information
    address VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(100),
    
    -- Guardian Information
    guardian_name VARCHAR(255),
    guardian_phone VARCHAR(50),
    guardian_address VARCHAR(255),
    guardian_email VARCHAR(100),
    
    -- PAE Specific Control
    status ENUM('active', 'retired', 'suspended') DEFAULT 'active',
    attention_modality ENUM('Preparada en sitio', 'Industrializada', 'Transportada') DEFAULT 'Preparada en sitio',
    ration_type ENUM('Complemento AM', 'Complemento PM', 'Almuerzo') DEFAULT 'Almuerzo',
    data_authorization BOOLEAN DEFAULT FALSE,
    medical_restrictions TEXT,
    
    -- Traceability
    simat_id VARCHAR(100),
    qr_uuid VARCHAR(100) UNIQUE,
    biometric_hash VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES school_branches(id) ON DELETE CASCADE,
    FOREIGN KEY (document_type_id) REFERENCES document_types(id),
    FOREIGN KEY (ethnic_group_id) REFERENCES ethnic_groups(id),
    UNIQUE KEY (pae_id, document_number) -- Unique document per program
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Performance Indexes
CREATE INDEX idx_beneficiaries_pae ON beneficiaries(pae_id);
CREATE INDEX idx_beneficiaries_branch ON beneficiaries(branch_id);
CREATE INDEX idx_beneficiaries_document ON beneficiaries(document_number);
CREATE INDEX idx_beneficiaries_status ON beneficiaries(status);

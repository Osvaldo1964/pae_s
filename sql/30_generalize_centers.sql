-- Migration to generalize 'schools' to 'centers'
-- Expands the school_type ENUM to include new institution types

ALTER TABLE schools 
MODIFY COLUMN school_type ENUM(
    'PUBLICO', 
    'PRIVADO', 
    'MIXTO', 
    'INDIGENA',
    'CDI',                    -- Centro de Desarrollo Infantil
    'HI',                     -- Hogar Infantil
    'ANCIANATO',             -- Centro de Adulto Mayor
    'COMEDOR_COMUNITARIO',   -- Comedor Comunitario
    'PUNTO_ENTREGA'          -- Punto de Entrega Genérico
) DEFAULT 'PUBLICO';

-- Update comments (metadata) if supported/possible, otherwise just the schema change is enough.

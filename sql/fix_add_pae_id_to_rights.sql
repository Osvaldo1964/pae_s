-- Agregar columna pae_id a beneficiary_ration_rights
ALTER TABLE beneficiary_ration_rights ADD COLUMN pae_id INT NULL AFTER id;

-- Actualizar pae_id basado en el beneficiario
UPDATE beneficiary_ration_rights br
JOIN beneficiaries b ON br.beneficiary_id = b.id
SET br.pae_id = b.pae_id;

-- Hacer la columna NOT NULL y agregar FK
ALTER TABLE beneficiary_ration_rights MODIFY COLUMN pae_id INT NOT NULL;
ALTER TABLE beneficiary_ration_rights ADD CONSTRAINT fk_rights_pae FOREIGN KEY (pae_id) REFERENCES pae_programs(id) ON DELETE CASCADE;

-- =====================================================
-- SCRIPT DE DATOS DE PRUEBA PARA PAE SANTA MARTA
-- Genera: 2 Colegios + Sedes + 30 Estudiantes
-- Fecha: 01 de Febrero 2026
-- =====================================================

-- Variables de contexto (ajustar según el PAE actual)
SET @pae_id = 3; -- PAE SANTA MARTA

-- =====================================================
-- COLEGIO 1: INSTITUCIÓN EDUCATIVA SIMÓN BOLÍVAR
-- =====================================================

INSERT INTO schools (pae_id, dane_code, name, rector, address, phone, email, department, municipality, school_type, area_type)
VALUES (
    @pae_id,
    '470010001234',
    'INSTITUCIÓN EDUCATIVA SIMÓN BOLÍVAR',
    'MARÍA FERNANDA LÓPEZ GARCÍA',
    'CALLE 22 # 15-30 BARRIO CENTRO',
    '3001234567',
    'rectoria.bolivar@educacion.gov.co',
    'MAGDALENA',
    'SANTA MARTA',
    'PUBLICO',
    'URBANA'
);

SET @school_bolivar_id = LAST_INSERT_ID();

-- Sede Principal: Simón Bolívar
INSERT INTO school_branches (school_id, pae_id, dane_code, name, address, phone, manager_name, area_type)
VALUES (
    @school_bolivar_id,
    @pae_id,
    '470010001234', -- Mismo código DANE que el colegio (sede principal)
    'PRINCIPAL',
    'CALLE 22 # 15-30 BARRIO CENTRO',
    '3001234567',
    'MARÍA FERNANDA LÓPEZ GARCÍA',
    'URBANA'
);

SET @branch_bolivar_principal = LAST_INSERT_ID();

-- Sede Adicional: Simón Bolívar - Sede Gaira
INSERT INTO school_branches (school_id, pae_id, dane_code, name, address, phone, manager_name, area_type)
VALUES (
    @school_bolivar_id,
    @pae_id,
    '470010005678', -- Código DANE diferente para la sede
    'SEDE GAIRA',
    'CARRERA 10 # 8-45 GAIRA',
    '3009876543',
    'CARLOS ANDRÉS MARTÍNEZ RUIZ',
    'RURAL'
);

SET @branch_bolivar_gaira = LAST_INSERT_ID();

-- =====================================================
-- COLEGIO 2: INSTITUCIÓN EDUCATIVA JOSÉ PRUDENCIO PADILLA
-- =====================================================

INSERT INTO schools (pae_id, dane_code, name, rector, address, phone, email, department, municipality, school_type, area_type)
VALUES (
    @pae_id,
    '470010009012',
    'INSTITUCIÓN EDUCATIVA JOSÉ PRUDENCIO PADILLA',
    'LUIS ALBERTO RAMÍREZ CASTRO',
    'AVENIDA DEL RÍO # 45-12 BARRIO MAMATOCO',
    '3112345678',
    'rectoria.padilla@educacion.gov.co',
    'MAGDALENA',
    'SANTA MARTA',
    'PUBLICO',
    'URBANA'
);

SET @school_padilla_id = LAST_INSERT_ID();

-- Sede Principal: José Prudencio Padilla
INSERT INTO school_branches (school_id, pae_id, dane_code, name, address, phone, manager_name, area_type)
VALUES (
    @school_padilla_id,
    @pae_id,
    '470010009012', -- Mismo código DANE que el colegio (sede principal)
    'PRINCIPAL',
    'AVENIDA DEL RÍO # 45-12 BARRIO MAMATOCO',
    '3112345678',
    'LUIS ALBERTO RAMÍREZ CASTRO',
    'URBANA'
);

SET @branch_padilla_principal = LAST_INSERT_ID();

-- =====================================================
-- ESTUDIANTES - SIMÓN BOLÍVAR PRINCIPAL (15 estudiantes)
-- =====================================================

-- Obtener IDs de tipos de documento y grupos étnicos
SET @doc_ti = (SELECT id FROM document_types WHERE code = 'TI' LIMIT 1);
SET @doc_rc = (SELECT id FROM document_types WHERE code = 'RC' LIMIT 1);
SET @ethnic_sin = (SELECT id FROM ethnic_groups WHERE code = '06' LIMIT 1); -- Sin pertenencia étnica
SET @ethnic_afro = (SELECT id FROM ethnic_groups WHERE code = '02' LIMIT 1); -- Afrocolombiano

-- Estudiante 1
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_ti, '1098765432', 'JUAN', 'CARLOS', 'PÉREZ', 'GONZÁLEZ', '2012-03-15', '2024-01-15', 'MASCULINO', @ethnic_sin, 'A1', 'NINGUNA', 0, 0, 'MAÑANA', '6', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'ALMUERZO', 1);

-- Estudiante 2
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_ti, '1098765433', 'MARÍA', 'FERNANDA', 'RODRÍGUEZ', 'LÓPEZ', '2012-07-22', '2024-01-15', 'FEMENINO', @ethnic_sin, 'B2', 'NINGUNA', 0, 0, 'MAÑANA', '6', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'ALMUERZO', 1);

-- Estudiante 3
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_ti, '1098765434', 'CARLOS', 'ANDRÉS', 'MARTÍNEZ', 'RUIZ', '2011-11-08', '2024-01-15', 'MASCULINO', @ethnic_afro, 'A2', 'NINGUNA', 0, 0, 'MAÑANA', '7', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'ALMUERZO', 1);

-- Estudiante 4
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_rc, '1234567890', 'ANA', 'SOFÍA', 'GARCÍA', 'HERNÁNDEZ', '2014-05-12', '2024-01-15', 'FEMENINO', @ethnic_sin, 'A1', 'NINGUNA', 0, 0, 'MAÑANA', '4', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO MAÑANA', 1);

-- Estudiante 5
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_rc, '1234567891', 'LUIS', 'FERNANDO', 'TORRES', 'SÁNCHEZ', '2015-09-30', '2024-01-15', 'MASCULINO', @ethnic_sin, 'B1', 'NINGUNA', 0, 0, 'MAÑANA', '3', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO MAÑANA', 1);

-- Estudiante 6
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_ti, '1098765435', 'CAMILA', 'ANDREA', 'DÍAZ', 'MORENO', '2013-02-18', '2024-01-15', 'FEMENINO', @ethnic_sin, 'A1', 'NINGUNA', 0, 0, 'MAÑANA', '5', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'ALMUERZO', 1);

-- Estudiante 7
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_ti, '1098765436', 'DIEGO', 'ALEJANDRO', 'RAMÍREZ', 'CASTRO', '2012-12-05', '2024-01-15', 'MASCULINO', @ethnic_sin, 'B2', 'NINGUNA', 1, 0, 'MAÑANA', '6', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'ALMUERZO', 1);

-- Estudiante 8
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_rc, '1234567892', 'VALENTINA', NULL, 'GÓMEZ', 'VARGAS', '2016-04-20', '2024-01-15', 'FEMENINO', @ethnic_afro, 'A2', 'NINGUNA', 0, 0, 'MAÑANA', '2', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO MAÑANA', 1);

-- Estudiante 9
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_ti, '1098765437', 'SANTIAGO', 'JOSÉ', 'MENDOZA', 'ORTIZ', '2011-06-14', '2024-01-15', 'MASCULINO', @ethnic_sin, 'A1', 'NINGUNA', 0, 0, 'MAÑANA', '7', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'ALMUERZO', 1);

-- Estudiante 10
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_rc, '1234567893', 'ISABELLA', 'MARÍA', 'JIMÉNEZ', 'REYES', '2015-01-25', '2024-01-15', 'FEMENINO', @ethnic_sin, 'B1', 'NINGUNA', 0, 0, 'MAÑANA', '3', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO MAÑANA', 1);

-- Estudiante 11
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_ti, '1098765438', 'ANDRÉS', 'FELIPE', 'CRUZ', 'NAVARRO', '2013-08-09', '2024-01-15', 'MASCULINO', @ethnic_sin, 'A1', 'NINGUNA', 0, 0, 'MAÑANA', '5', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'ALMUERZO', 1);

-- Estudiante 12
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_rc, '1234567894', 'SOFÍA', 'ALEJANDRA', 'PARRA', 'SILVA', '2016-10-03', '2024-01-15', 'FEMENINO', @ethnic_sin, 'B2', 'NINGUNA', 0, 0, 'MAÑANA', '2', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO MAÑANA', 1);

-- Estudiante 13
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_ti, '1098765439', 'MATEO', 'DAVID', 'ROJAS', 'GUTIÉRREZ', '2012-04-28', '2024-01-15', 'MASCULINO', @ethnic_afro, 'A2', 'NINGUNA', 0, 0, 'MAÑANA', '6', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'ALMUERZO', 1);

-- Estudiante 14
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_rc, '1234567895', 'LUCÍA', 'VALENTINA', 'MORALES', 'PEÑA', '2017-02-14', '2024-01-15', 'FEMENINO', @ethnic_sin, 'A1', 'NINGUNA', 0, 0, 'MAÑANA', '1', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO MAÑANA', 1);

-- Estudiante 15
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_bolivar_principal, @doc_ti, '1098765440', 'NICOLÁS', 'EDUARDO', 'VEGA', 'RÍOS', '2011-09-19', '2024-01-15', 'MASCULINO', @ethnic_sin, 'B1', 'NINGUNA', 0, 0, 'MAÑANA', '7', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'ALMUERZO', 1);

-- =====================================================
-- ESTUDIANTES - JOSÉ PRUDENCIO PADILLA PRINCIPAL (15 estudiantes)
-- =====================================================

-- Estudiante 16
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_ti, '1098765441', 'GABRIELA', 'ANDREA', 'CASTRO', 'MUÑOZ', '2012-01-10', '2024-01-15', 'FEMENINO', @ethnic_sin, 'A1', 'NINGUNA', 0, 0, 'TARDE', '6', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 17
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_ti, '1098765442', 'DANIEL', 'ESTEBAN', 'HERRERA', 'LEÓN', '2011-05-22', '2024-01-15', 'MASCULINO', @ethnic_afro, 'B2', 'NINGUNA', 0, 0, 'TARDE', '7', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 18
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_rc, '1234567896', 'PAULA', 'CRISTINA', 'SALAZAR', 'CORTÉS', '2014-11-08', '2024-01-15', 'FEMENINO', @ethnic_sin, 'A2', 'NINGUNA', 0, 0, 'TARDE', '4', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 19
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_ti, '1098765443', 'SEBASTIÁN', 'CAMILO', 'AGUILAR', 'RAMOS', '2013-03-16', '2024-01-15', 'MASCULINO', @ethnic_sin, 'A1', 'NINGUNA', 0, 0, 'TARDE', '5', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 20
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_rc, '1234567897', 'MARIANA', 'ISABEL', 'OSPINA', 'MEJÍA', '2015-07-29', '2024-01-15', 'FEMENINO', @ethnic_sin, 'B1', 'NINGUNA', 0, 0, 'TARDE', '3', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 21
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_ti, '1098765444', 'EMILIO', 'ANTONIO', 'SUÁREZ', 'BLANCO', '2012-09-11', '2024-01-15', 'MASCULINO', @ethnic_afro, 'A1', 'NINGUNA', 0, 0, 'TARDE', '6', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 22
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_rc, '1234567898', 'CAROLINA', 'SOFÍA', 'MEDINA', 'ROJAS', '2016-12-04', '2024-01-15', 'FEMENINO', @ethnic_sin, 'B2', 'NINGUNA', 0, 0, 'TARDE', '2', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 23
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_ti, '1098765445', 'MIGUEL', 'ÁNGEL', 'VARGAS', 'SANTOS', '2011-02-27', '2024-01-15', 'MASCULINO', @ethnic_sin, 'A2', 'NINGUNA', 1, 0, 'TARDE', '7', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 24
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_rc, '1234567899', 'VALERIA', 'NICOLE', 'RÍOS', 'FERNÁNDEZ', '2017-06-18', '2024-01-15', 'FEMENINO', @ethnic_sin, 'A1', 'NINGUNA', 0, 0, 'TARDE', '1', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 25
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_ti, '1098765446', 'RICARDO', 'JAVIER', 'NÚÑEZ', 'CÁRDENAS', '2013-10-05', '2024-01-15', 'MASCULINO', @ethnic_sin, 'B1', 'NINGUNA', 0, 0, 'TARDE', '5', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 26
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_rc, '1234567900', 'NATALIA', 'PAOLA', 'MOLINA', 'ARANGO', '2015-04-13', '2024-01-15', 'FEMENINO', @ethnic_afro, 'A1', 'NINGUNA', 0, 0, 'TARDE', '3', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 27
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_ti, '1098765447', 'ALEJANDRO', 'MANUEL', 'QUINTERO', 'PALACIOS', '2012-08-21', '2024-01-15', 'MASCULINO', @ethnic_sin, 'B2', 'NINGUNA', 0, 0, 'TARDE', '6', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 28
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_rc, '1234567901', 'DANIELA', 'MARCELA', 'ESCOBAR', 'GÓMEZ', '2016-01-30', '2024-01-15', 'FEMENINO', @ethnic_sin, 'A2', 'NINGUNA', 0, 0, 'TARDE', '2', 'B', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 29
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_ti, '1098765448', 'FELIPE', 'IGNACIO', 'LARA', 'MENDOZA', '2011-12-17', '2024-01-15', 'MASCULINO', @ethnic_sin, 'A1', 'NINGUNA', 0, 0, 'TARDE', '7', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- Estudiante 30
INSERT INTO beneficiaries (pae_id, branch_id, document_type_id, document_number, first_name, second_name, last_name1, last_name2, birth_date, enrollment_date, gender, ethnic_group_id, sisben_category, disability_type, is_victim, is_migrant, shift, grade, group_name, status, modality, ration_type, data_authorization)
VALUES (@pae_id, @branch_padilla_principal, @doc_rc, '1234567902', 'JULIANA', 'BEATRIZ', 'CANO', 'VALENCIA', '2017-05-09', '2024-01-15', 'FEMENINO', @ethnic_sin, 'B1', 'NINGUNA', 0, 0, 'TARDE', '1', 'A', 'ACTIVO', 'RACION PREPARADA EN SITIO', 'COMPLEMENTO TARDE', 1);

-- =====================================================
-- RESUMEN DE DATOS INSERTADOS
-- =====================================================

SELECT 'DATOS DE PRUEBA INSERTADOS EXITOSAMENTE' AS RESULTADO;
SELECT COUNT(*) AS 'Total Colegios' FROM schools WHERE pae_id = @pae_id;
SELECT COUNT(*) AS 'Total Sedes' FROM school_branches WHERE pae_id = @pae_id;
SELECT COUNT(*) AS 'Total Estudiantes' FROM beneficiaries WHERE pae_id = @pae_id;
SELECT grade, COUNT(*) AS 'Estudiantes por Grado' FROM beneficiaries WHERE pae_id = @pae_id GROUP BY grade ORDER BY grade;

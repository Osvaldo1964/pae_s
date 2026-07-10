-- Actualización para el Módulo de Nómina Integral (Costo Empleador)
-- Ejecutar este script en Hostinger vía phpMyAdmin o consola MySQL

-- 1. Añadir el porcentaje de riesgo ARL a los cargos (Por defecto 0.522%)
ALTER TABLE `hr_positions` 
ADD COLUMN `arl_risk_percent` DECIMAL(5,3) NOT NULL DEFAULT 0.522 AFTER `status`;

-- 2. Añadir la bandera de exoneración de aportes (Ley 1819) a los parámetros de nómina
-- 1 significa Exonerado (Verdadero), 0 significa No Exonerado (Falso)
ALTER TABLE `hr_payroll_config` 
ADD COLUMN `is_exonerated` TINYINT(1) NOT NULL DEFAULT 0 AFTER `aux_transporte`;

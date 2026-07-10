-- ====================================================================
-- SCRIPT DE ACTUALIZACIÓN DE BASE DE DATOS - HOSTINGER
-- Módulo Financiero: Jerarquización de Costos y Gastos (3 Niveles)
-- ====================================================================

-- 1. Agregar columna de relación jerárquica a la tabla de tipos de movimientos
ALTER TABLE `presupuesto_movimiento_tipos` 
ADD COLUMN `padre_id` INT NULL DEFAULT NULL;

-- 2. Agregar clave foránea para la jerarquía autoreferencial
ALTER TABLE `presupuesto_movimiento_tipos` 
ADD CONSTRAINT `fk_tipo_movimiento_padre` 
FOREIGN KEY (`padre_id`) REFERENCES `presupuesto_movimiento_tipos` (`id_tipo_movimiento`) 
ON DELETE SET NULL;

-- 3. Agregar columna para enlazar los movimientos con el ID jerárquico correspondiente
ALTER TABLE `presupuesto_movimientos` 
ADD COLUMN `tipo_movimiento_id` INT NULL DEFAULT NULL;

-- 4. Agregar clave foránea a la tabla de movimientos
ALTER TABLE `presupuesto_movimientos` 
ADD CONSTRAINT `fk_movimiento_tipo` 
FOREIGN KEY (`tipo_movimiento_id`) REFERENCES `presupuesto_movimiento_tipos` (`id_tipo_movimiento`) 
ON DELETE SET NULL;

-- 5. Mapear los registros existentes basados en texto a sus respectivos IDs
--    Se utiliza COLLATE para prevenir conflictos de colación entre columnas
UPDATE `presupuesto_movimientos` m
JOIN `presupuesto_movimiento_tipos` t 
  ON m.`pae_id` = t.`pae_id` 
  AND UPPER(TRIM(m.`tipo_movimiento`)) = UPPER(TRIM(t.`nombre`)) COLLATE utf8mb4_unicode_ci
SET m.`tipo_movimiento_id` = t.`id_tipo_movimiento`
WHERE m.`tipo_movimiento_id` IS NULL;

-- ====================================================================
-- BLOQUE 2: Modificaciones Contractuales (Ajustes + Traslados Unificados)
-- ====================================================================

-- 6. Crear tabla maestra de modificaciones contractuales
CREATE TABLE IF NOT EXISTS `presupuesto_modificaciones` (
    `id_modificacion` INT AUTO_INCREMENT PRIMARY KEY,
    `pae_id` INT NOT NULL,
    `fecha` DATE NOT NULL,
    `tipo_modificacion` ENUM('ADICION', 'REDUCCION', 'TRASLADO') NOT NULL,
    `justificacion` TEXT NOT NULL,
    `usuario_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Crear tabla de detalles (rubros afectados por cada modificación)
CREATE TABLE IF NOT EXISTS `presupuesto_modificaciones_detalles` (
    `id_detalle` INT AUTO_INCREMENT PRIMARY KEY,
    `modificacion_id` INT NOT NULL,
    `asignacion_id` INT NOT NULL,
    `tipo_afectacion` ENUM('ADICION', 'REDUCCION') NOT NULL,
    `valor` DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (`modificacion_id`) REFERENCES `presupuesto_modificaciones`(`id_modificacion`) ON DELETE CASCADE,
    FOREIGN KEY (`asignacion_id`) REFERENCES `presupuesto_asignacion`(`id_asignacion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Migrar registros históricos de presupuesto_ajustes (si la tabla existe)
--    Ejecutar SOLO si presupuesto_ajustes existe en producción:
-- INSERT INTO `presupuesto_modificaciones` (pae_id, fecha, tipo_modificacion, justificacion, usuario_id, created_at)
-- SELECT pae_id, fecha, tipo_ajuste, justificacion, usuario_id, created_at FROM `presupuesto_ajustes`;
--
-- INSERT INTO `presupuesto_modificaciones_detalles` (modificacion_id, asignacion_id, tipo_afectacion, valor)
-- SELECT pm.id_modificacion, a.asignacion_id, a.tipo_ajuste, a.valor
-- FROM `presupuesto_ajustes` a
-- JOIN `presupuesto_modificaciones` pm ON pm.pae_id = a.pae_id AND pm.created_at = a.created_at AND pm.fecha = a.fecha;

-- 9. Migrar registros históricos de presupuesto_traslados (si la tabla existe):
-- INSERT INTO `presupuesto_modificaciones` (pae_id, fecha, tipo_modificacion, justificacion, usuario_id, created_at)
-- SELECT pae_id, fecha, 'TRASLADO', justificacion, usuario_id, created_at FROM `presupuesto_traslados`;
-- (Luego insertar detalles de origen=REDUCCION y destino=ADICION de forma análoga)

-- 10. Renombrar tablas antiguas a backup (recomendado antes de eliminarlas)
-- RENAME TABLE `presupuesto_ajustes` TO `backup_presupuesto_ajustes`;
-- RENAME TABLE `presupuesto_traslados` TO `backup_presupuesto_traslados`;


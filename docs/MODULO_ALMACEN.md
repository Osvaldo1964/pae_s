# Módulo de Almacén - Documentación Técnica

**Versión:** 1.9.21  
**Última actualización:** 22 de Julio 2026

---

## 📋 Descripción General

El módulo de Almacén es un sistema profesional de gestión de inventarios que implementa:
- **Valoración por Promedio Ponderado** (método contable estándar)
- **Trazabilidad de Costos por Ciclo** (análisis de variación de precios)
- **Kardex Digital** (historial completo de movimientos)
- **Herramientas de Auditoría** (conteo físico y ajustes)
- **Reportes Gerenciales:** Análisis de ciclos cruzando Proyecciones, Compras, Entradas y Salidas.
- **Herramientas de Mantenimiento:** Limpieza de registros y reversión de remisiones.

---

## 🗄️ Estructura de Base de Datos

### Tabla: `items`
Catálogo maestro de ítems de inventario.

```sql
CREATE TABLE items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pae_id INT NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    food_group VARCHAR(100),
    measurement_unit VARCHAR(50),
    unit_cost DECIMAL(10,2) DEFAULT 0.00,  -- Costo promedio ponderado global
    -- ... otros campos nutricionales y logísticos
);
```

### Tabla: `inventory`
Stock actual por ítem.

```sql
CREATE TABLE inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pae_id INT NOT NULL,
    item_id INT NOT NULL,
    current_stock DECIMAL(10,3) DEFAULT 0.000,
    min_stock DECIMAL(10,3),
    max_stock DECIMAL(10,3),
    last_updated TIMESTAMP
);
```

### Tabla: `inventory_movements`
Cabecera de movimientos (entradas/salidas).

```sql
CREATE TABLE inventory_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pae_id INT NOT NULL,
    user_id INT NOT NULL,
    supplier_id INT,
    movement_type ENUM('ENTRADA', 'SALIDA', 'AJUSTE', 'ENTRADA_OC'),
    reference_number VARCHAR(100),
    movement_date DATE,
    cycle_id INT,  -- Referencia a menu_cycles.id
    notes TEXT,
    created_at TIMESTAMP
);
```

### Tabla: `inventory_movement_details`
Detalle de ítems en cada movimiento.

```sql
CREATE TABLE inventory_movement_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    movement_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2),  -- Precio unitario de compra
    batch_number VARCHAR(100),
    expiry_date DATE
);
```

### Tabla: `item_cycle_costs` ⭐ NUEVO
Costos promedio por ítem por ciclo (para análisis).

```sql
CREATE TABLE item_cycle_costs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pae_id INT NOT NULL,
    item_id INT NOT NULL,
    cycle_id INT NOT NULL,  -- Referencia a menu_cycles.id
    average_cost DECIMAL(10,2) NOT NULL,
    total_quantity DECIMAL(10,3) NOT NULL,
    total_value DECIMAL(12,2) NOT NULL,
    purchase_count INT DEFAULT 0,
    last_updated TIMESTAMP,
    UNIQUE KEY (pae_id, item_id, cycle_id)
);
```

---

## 🔧 Backend - InventoryController.php

### Métodos Principales

#### `getStock()`
**Endpoint:** `GET /api/inventory`  
**Descripción:** Obtiene el stock actual de todos los ítems.

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "ARR001",
      "name": "ARROZ BLANCO",
      "stock": 150.500,
      "unit_cost": 2350.00,
      "food_group": "CEREALES",
      "measurement_unit": "KG"
    }
  ]
}
```

#### `getKardex($item_id)`
**Endpoint:** `GET /api/inventory/kardex/:id`  
**Descripción:** Obtiene el historial completo de movimientos de un ítem.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "item": {
      "id": 1,
      "name": "ARROZ BLANCO",
      "code": "ARR001"
    },
    "movements": [
      {
        "date": "2026-02-05",
        "type": "ENTRADA",
        "quantity": 50.000,
        "unit_price": 2400.00,
        "balance": 150.500,
        "supplier": "Proveedor XYZ",
        "reference": "FAC-12345"
      }
    ]
  }
}
```

#### `registerMovement()`
**Endpoint:** `POST /api/movements`  
**Descripción:** Registra un nuevo movimiento de inventario.

**Payload:**
```json
{
  "movement_type": "ENTRADA",
  "supplier_id": 5,
  "reference": "FAC-12345",
  "date": "2026-02-09",
  "cycle_id": 3,
  "notes": "Compra mensual",
  "items": [
    {
      "item_id": 1,
      "quantity": 50,
      "unit_price": 2400,
      "batch": "LOTE-2024-02",
      "expiry": "2026-08-09"
    }
  ]
}
```

**Lógica de Cálculo de Costo Promedio Ponderado:**
```php
// Stock actual y costo actual
$current_stock = 100; // kg
$current_cost = 2300; // $/kg
$current_value = $current_stock * $current_cost; // $230,000

// Nueva compra
$new_quantity = 50; // kg
$new_price = 2400; // $/kg
$new_value = $new_quantity * $new_price; // $120,000

// Cálculo del promedio ponderado
$total_stock = $current_stock + $new_quantity; // 150 kg
$total_value = $current_value + $new_value; // $350,000
$weighted_avg_cost = $total_value / $total_stock; // $2,333.33/kg

// Actualizar items.unit_cost
UPDATE items SET unit_cost = 2333.33 WHERE id = 1;
```

#### `updateCycleCost()` ⭐ NUEVO
**Descripción:** Actualiza el costo promedio de un ítem en un ciclo específico.

**Lógica:**
```php
// Obtener datos actuales del ciclo
$current_cycle_qty = 30; // kg comprados en este ciclo
$current_cycle_value = 69000; // $69,000 gastados
$current_purchases = 2; // 2 compras previas

// Nueva compra en el mismo ciclo
$new_qty = 50; // kg
$new_price = 2400; // $/kg
$new_value = 120000; // $120,000

// Calcular nuevo promedio del ciclo
$total_cycle_qty = $current_cycle_qty + $new_qty; // 80 kg
$total_cycle_value = $current_cycle_value + $new_value; // $189,000
$cycle_avg_cost = $total_cycle_value / $total_cycle_qty; // $2,362.50/kg

// Actualizar o insertar en item_cycle_costs
INSERT INTO item_cycle_costs (pae_id, item_id, cycle_id, average_cost, total_quantity, total_value, purchase_count)
VALUES (1, 1, 3, 2362.50, 80, 189000, 3)
ON DUPLICATE KEY UPDATE
    average_cost = 2362.50,
    total_quantity = 80,
    total_value = 189000,
    purchase_count = 3;
```

#### `getCycleCostReport($cycle_id)` ⭐ NUEVO
**Endpoint:** `GET /api/inventory/cycle-cost-report/:id`  
**Descripción:** Obtiene reporte de costos de todos los ítems en un ciclo.

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "item_id": 1,
      "item_name": "ARROZ BLANCO",
      "cycle_avg_cost": 2362.50,
      "global_avg_cost": 2333.33,
      "cycle_total_qty": 80,
      "purchase_count": 3,
      "variance": 29.17
    }
  ]
}
```

---

## 🎨 Frontend - almacen.js

### Funcionalidades Principales

#### 1. Vista de Stock Actual
- **Tabla con scroll interno** (max-height: 600px)
- **Header fijo** (sticky)
- **Búsqueda en tiempo real** por nombre, código o grupo
- **KPI de Valor Total:** `Σ(stock × unit_cost)`
- **Alertas de stock bajo** (badge rojo)

#### 2. Registro de Movimientos
**Formulario de Entrada:**
- Fecha
- Referencia (número de factura)
- Proveedor (dropdown)
- **Ciclo** (dropdown opcional) ⭐ NUEVO
- Tabla de ítems con:
  - Selector de ítem
  - Cantidad
  - **Precio unitario** ⭐ NUEVO
  - Lote
  - Fecha de vencimiento

**Formulario de Salida:**
- Fecha
- Motivo (consumo, merma, donación)
- Tabla de ítems con cantidades

#### 3. Kardex Digital
- **Modal con historial completo** de movimientos
- Filtrado por ítem
- Muestra: fecha, tipo, cantidad, precio, saldo, proveedor

#### 4. Herramientas de Auditoría

**Planilla de Conteo Ciego:**
```javascript
printBlindCount() {
    // Genera PDF con:
    // - Lista de ítems ordenados por grupo
    // - Columnas: Código, Nombre, Unidad, [ ] Cantidad Física
    // - SIN mostrar stock del sistema
}
```

**Ajuste Inteligente de Stock:**
```javascript
editItemStock(itemId) {
    // 1. Muestra modal con stock actual
    // 2. Usuario ingresa cantidad física contada
    // 3. Sistema calcula diferencia
    // 4. Genera movimiento de AJUSTE automáticamente
    // 5. Actualiza stock
}
```

#### 5. Búsqueda en Tiempo Real
```javascript
handleSearch(e) {
    this.searchTerm = e.target.value.toLowerCase();
    const filtered = this.inventory.filter(item => 
        item.name.toLowerCase().includes(this.searchTerm) || 
        item.code.toLowerCase().includes(this.searchTerm) ||
        item.food_group.toLowerCase().includes(this.searchTerm)
    );
    // Re-renderizar tabla
}
```

---

## 📊 Casos de Uso

### Caso 1: Registro de Compra con Ciclo

**Escenario:**  
Compra de 50 kg de arroz a $2,400/kg para el Ciclo "Primer Semestre 2024"

**Pasos:**
1. Click en botón "Entrada"
2. Seleccionar proveedor
3. Seleccionar ciclo "Primer Semestre 2024"
4. Agregar ítem: Arroz, 50 kg, $2,400/kg
5. Guardar

**Resultado:**
- Stock actualizado: +50 kg
- `items.unit_cost` actualizado con promedio ponderado global
- Registro en `item_cycle_costs` con costo promedio del ciclo
- Movimiento registrado en `inventory_movements` con `cycle_id = 3`

### Caso 2: Análisis de Variación de Precios

**Escenario:**  
Comparar costo del arroz entre Ciclo 5 y Ciclo 6

**Consulta:**
```javascript
const ciclo5 = await Helper.fetchAPI('/inventory/cycle-cost-report/5');
const ciclo6 = await Helper.fetchAPI('/inventory/cycle-cost-report/6');

// Ciclo 5: Arroz = $2,075/kg (3 compras, 80 kg)
// Ciclo 6: Arroz = $2,450/kg (2 compras, 60 kg)
// Variación: +18% (inflación detectada)
```

### Caso 3: Auditoría Física

**Escenario:**  
Realizar conteo físico mensual

**Pasos:**
1. Click en "Planilla de Conteo"
2. Imprimir PDF
3. Personal cuenta físicamente
4. Para cada ítem con diferencia:
   - Click en "Editar Stock"
   - Ingresar cantidad física
   - Sistema genera ajuste automático

---

## 🔐 Seguridad y Validaciones

### Backend
- ✅ Validación de `pae_id` en todas las consultas
- ✅ Transacciones para movimientos (atomicidad)
- ✅ Prepared statements (prevención SQL injection)
- ✅ Validación de stock disponible en salidas
- ✅ Prevención de stock negativo

### Frontend
- ✅ Validación de campos requeridos
- ✅ Confirmación de eliminación (SweetAlert)
- ✅ Feedback visual de operaciones (loading)
- ✅ Manejo de errores con mensajes claros

---

## 📈 Métricas y KPIs

### KPI: Valor Total del Inventario
```javascript
const totalValue = this.inventory.reduce((sum, item) => 
    sum + (parseFloat(item.stock) * parseFloat(item.unit_cost || 0)), 
    0
);
```

### Reporte: Ítems con Stock Bajo
```sql
SELECT * FROM inventory 
WHERE current_stock < min_stock 
AND pae_id = ?
ORDER BY (min_stock - current_stock) DESC;
```

### Reporte: Movimientos por Período
```sql
SELECT 
    DATE(movement_date) as fecha,
    movement_type,
    COUNT(*) as cantidad_movimientos,
    SUM(d.quantity * d.unit_price) as valor_total
FROM inventory_movements m
JOIN inventory_movement_details d ON m.id = d.movement_id
WHERE m.pae_id = ? 
AND m.movement_date BETWEEN ? AND ?
GROUP BY DATE(movement_date), movement_type;
```

---

## 🚀 Mejoras Futuras

- [ ] **Alertas Automáticas:** Notificaciones de stock bajo vía email
- [ ] **Proyección de Consumo:** Predicción de necesidades basada en histórico
- [ ] **Integración Contable:** Exportación a sistemas ERP
- [ ] **Códigos de Barras:** Escaneo para entradas/salidas rápidas
- [ ] **Reportes Avanzados:** Dashboard con gráficos de tendencias
- [ ] **Control de Lotes:** Trazabilidad FIFO/FEFO para perecederos
- [ ] **Múltiples Bodegas:** Gestión de stock por ubicación física

---

## 📚 Referencias

- **Resolución 0003 de 2026:** Lineamientos PAE
- **NIC 2:** Norma Internacional de Contabilidad para Inventarios
- **Promedio Ponderado:** Método de valoración contable estándar

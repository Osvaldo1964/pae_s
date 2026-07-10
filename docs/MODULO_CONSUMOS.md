# Módulo de Consumos - Sistema de Registro de Asistencia

**Versión:** 1.7.0  
**Última actualización:** 09 de Febrero 2026

---

## 📋 Descripción General

El módulo de Consumos es el sistema de registro de entrega de raciones alimentarias a beneficiarios. Incluye:
- **Registro vía QR** (app móvil)
- **Registro manual** (web)
- **Prevención de duplicados**
- **Reportes de asistencia**
- **Estadísticas en tiempo real**

---

## 🗄️ Estructura de Base de Datos

### Tabla: `daily_consumptions`
Registro de entregas diarias de raciones.

```sql
CREATE TABLE daily_consumptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pae_id INT NOT NULL,
    branch_id INT NOT NULL,
    beneficiary_id INT NOT NULL,
    date DATE NOT NULL,
    ration_type_id INT NOT NULL,
    meal_type ENUM('DESAYUNO', 'ALMUERZO', 'REFRIGERIO', ...),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pae_id) REFERENCES pae_programs(id),
    FOREIGN KEY (branch_id) REFERENCES school_branches(id),
    FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id),
    FOREIGN KEY (ration_type_id) REFERENCES pae_ration_types(id),
    INDEX idx_date (pae_id, date),
    INDEX idx_beneficiary_date (beneficiary_id, date)
);
```

**Campos clave:**
- `beneficiary_id`: Estudiante que recibió la ración
- `date`: Fecha de entrega (automática del servidor)
- `ration_type_id`: Tipo de ración (Desayuno, Almuerzo, etc.)
- `branch_id`: Sede donde se entregó
- `created_at`: **Hora exacta** de entrega (trazabilidad)

---

## 🔧 Backend - ConsumptionController.php

### Métodos Principales

#### `store()`
**Endpoint:** `POST /api/consumptions`  
**Descripción:** Registra una nueva entrega de ración.

**Payload:**
```json
{
  "beneficiary_id": 123,
  "branch_id": 5,
  "ration_type_id": 2,
  "meal_type": "ALMUERZO"
}
```

**Lógica:**
```php
// 1. Verificar que el beneficiario existe
$stmt = $conn->prepare("SELECT id, first_name, last_name1 
                        FROM beneficiaries 
                        WHERE id = ? AND pae_id = ?");
$stmt->execute([$beneficiary_id, $pae_id]);
$beneficiary = $stmt->fetch();

if (!$beneficiary) {
    return error("Beneficiario no encontrado");
}

// 2. Prevenir duplicados (mismo beneficiario + ración + día)
$stmt = $conn->prepare("SELECT id, created_at 
                        FROM daily_consumptions 
                        WHERE beneficiary_id = ? 
                        AND date = ? 
                        AND ration_type_id = ?");
$stmt->execute([$beneficiary_id, date('Y-m-d'), $ration_type_id]);
$existing = $stmt->fetch();

if ($existing) {
    $time = date('H:i', strtotime($existing['created_at']));
    return error("El beneficiario ya recibió esta ración hoy a las {$time}");
}

// 3. Registrar entrega
$stmt = $conn->prepare("INSERT INTO daily_consumptions 
                        (pae_id, branch_id, beneficiary_id, date, ration_type_id, meal_type, created_at) 
                        VALUES (?, ?, ?, ?, ?, ?, NOW())");
$stmt->execute([
    $pae_id,
    $branch_id,
    $beneficiary_id,
    date('Y-m-d'),
    $ration_type_id,
    $meal_type
]);

return success("Entrega registrada correctamente");
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Entrega registrada correctamente",
  "beneficiary_name": "JUAN PÉREZ"
}
```

**Respuesta duplicado:**
```json
{
  "message": "El beneficiario ya recibió esta ración hoy a las 08:45",
  "duplicate": true
}
```

#### `stats()`
**Endpoint:** `GET /api/consumptions/stats?branch_id=5`  
**Descripción:** Obtiene estadísticas de entregas del día.

**Respuesta:**
```json
{
  "success": true,
  "today_count": 120,
  "progress": 80
}
```

**Cálculo de progreso:**
```php
// Total de beneficiarios activos en la sede
$total_beneficiaries = 150;

// Total de entregas registradas hoy
$today_count = 120;

// Progreso = (entregas / beneficiarios) × 100
$progress = round(($today_count / $total_beneficiaries) * 100); // 80%
```

#### `report()`
**Endpoint:** `GET /api/consumptions/report?date=2026-02-09&branch_id=5`  
**Descripción:** Obtiene reporte detallado de entregas.

**Parámetros:**
- `date`: Fecha (default: hoy)
- `branch_id`: Filtrar por sede (opcional)
- `meal_type`: Filtrar por tipo de ración (opcional)

**Consulta SQL:**
```sql
SELECT 
    dc.id,
    dc.created_at as time,
    rt.name as meal_type,
    b.document_number,
    b.first_name,
    b.last_name1,
    b.grade,
    b.group_name,
    sb.name as branch_name
FROM daily_consumptions dc
JOIN beneficiaries b ON dc.beneficiary_id = b.id
JOIN school_branches sb ON dc.branch_id = sb.id
LEFT JOIN pae_ration_types rt ON dc.ration_type_id = rt.id
WHERE dc.pae_id = ? 
AND dc.date = ?
ORDER BY dc.created_at DESC;
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "time": "2026-02-09 08:45:23",
      "meal_type": "DESAYUNO",
      "document_number": "1234567890",
      "first_name": "JUAN",
      "last_name1": "PÉREZ",
      "grade": "5°",
      "group_name": "5A",
      "branch_name": "SEDE PRINCIPAL"
    }
  ]
}
```

---

## 🎨 Frontend - consumos.js

### Vista de Reporte

**Funcionalidades:**
- Filtros dinámicos (fecha, sede, tipo de ración)
- Tabla con registros en tiempo real
- Exportación a planilla oficial (PDF)
- Estadísticas de cobertura

**Estructura:**
```javascript
const ConsumosView = {
    data: [],
    
    async init() {
        await this.loadReport();
        this.render();
    },
    
    async loadReport() {
        const date = document.getElementById('filter-date').value;
        const branch = document.getElementById('filter-branch').value;
        
        const res = await Helper.fetchAPI(
            `/consumptions/report?date=${date}&branch_id=${branch}`
        );
        
        this.data = res.success ? res.data : [];
    },
    
    renderTable() {
        return this.data.map(record => `
            <tr>
                <td>${record.time}</td>
                <td>${record.document_number}</td>
                <td>${record.first_name} ${record.last_name1}</td>
                <td>${record.grade} - ${record.group_name}</td>
                <td>${record.meal_type}</td>
                <td>${record.branch_name}</td>
            </tr>
        `).join('');
    }
};
```

---

## 📱 App Móvil - Registro vía QR

### Ubicación
`/movil/` - PWA optimizada para tablets y celulares

### Flujo de Registro

**1. Login:**
```javascript
// POST /api/auth/login
{
  "email": "operador@pae.com",
  "password": "****"
}
```

**2. Escaneo de QR:**
```javascript
// Librería: html5-qrcode
const scanner = new Html5QrcodeScanner("reader", {
    fps: 10,
    qrbox: 250
});

scanner.render(onScanSuccess, onScanError);

function onScanSuccess(decodedText) {
    // decodedText = "PAE:123:1234567890"
    const [prefix, id, doc] = decodedText.split(':');
    
    if (prefix === 'PAE') {
        registerConsumption(id);
    }
}
```

**3. Registro de Entrega:**
```javascript
async function registerConsumption(beneficiaryId) {
    const payload = {
        beneficiary_id: beneficiaryId,
        branch_id: getCurrentBranch(),
        ration_type_id: getCurrentRationType(),
        meal_type: getCurrentMealType()
    };
    
    const res = await fetch('/api/consumptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (res.ok) {
        showSuccess("✅ Entrega registrada");
    } else {
        const error = await res.json();
        showError(error.message);
    }
}
```

**4. Feedback Visual:**
- ✅ **Éxito:** Sonido + vibración + mensaje verde
- ❌ **Duplicado:** Alerta roja con hora de entrega previa
- ⚠️ **Error:** Mensaje de error específico

---

## 📊 Casos de Uso

### Caso 1: Registro Manual

**Escenario:**  
Operador registra entrega de almuerzo sin QR

**Pasos:**
1. Ir a módulo "Consumos"
2. Buscar beneficiario por documento o nombre
3. Seleccionar tipo de ración
4. Click en "Registrar Entrega"

**Resultado:**
- Registro en `daily_consumptions`
- Aparece en reporte instantáneamente
- Estadísticas actualizadas

### Caso 2: Registro vía QR (App Móvil)

**Escenario:**  
Estudiante presenta carnet con QR en el comedor

**Pasos:**
1. Operador abre app móvil
2. Selecciona tipo de ración (Almuerzo)
3. Escanea QR del carnet
4. Sistema valida y registra

**Resultado:**
- Registro instantáneo
- Feedback visual y sonoro
- Prevención de doble entrega

### Caso 3: Reporte de Asistencia Diario

**Escenario:**  
Coordinador necesita planilla oficial del día

**Pasos:**
1. Ir a módulo "Consumos"
2. Seleccionar fecha y sede
3. Click en "Imprimir Planilla"

**Resultado:**
- PDF con formato oficial
- Logos del programa
- Listado de entregas con hora
- Espacios para firmas

### Caso 4: Detección de Fraude

**Escenario:**  
Estudiante intenta recibir almuerzo dos veces

**Pasos:**
1. Primera entrega: 12:00 PM ✅ Registrada
2. Segunda entrega: 12:30 PM ❌ Bloqueada

**Sistema responde:**
```
❌ El beneficiario ya recibió esta ración hoy a las 12:00
```

---

## 🔐 Seguridad y Validaciones

### Prevención de Duplicados
```sql
-- Índice único compuesto (opcional para forzar a nivel DB)
CREATE UNIQUE INDEX idx_unique_daily_consumption 
ON daily_consumptions (beneficiary_id, date, ration_type_id);
```

### Validación de Horarios
```php
// Opcional: Validar que el tipo de ración corresponda al horario
$hour = date('H');

if ($meal_type === 'DESAYUNO' && ($hour < 6 || $hour > 9)) {
    return warning("El desayuno se entrega entre 6:00 AM y 9:00 AM");
}

if ($meal_type === 'ALMUERZO' && ($hour < 11 || $hour > 14)) {
    return warning("El almuerzo se entrega entre 11:00 AM y 2:00 PM");
}
```

### Aislamiento por PAE
```php
// TODAS las consultas incluyen pae_id
WHERE dc.pae_id = ? AND dc.date = ?
```

---

## 📈 Reportes y Estadísticas

### Reporte 1: Cobertura Diaria
```sql
SELECT 
    sb.name as sede,
    COUNT(DISTINCT dc.beneficiary_id) as entregas,
    (SELECT COUNT(*) FROM beneficiaries WHERE branch_id = sb.id AND status = 'ACTIVO') as total,
    ROUND((COUNT(DISTINCT dc.beneficiary_id) / (SELECT COUNT(*) FROM beneficiaries WHERE branch_id = sb.id AND status = 'ACTIVO')) * 100, 2) as porcentaje
FROM daily_consumptions dc
JOIN school_branches sb ON dc.branch_id = sb.id
WHERE dc.pae_id = ? AND dc.date = ?
GROUP BY sb.id, sb.name;
```

### Reporte 2: Ausentismo
```sql
-- Beneficiarios activos que NO recibieron ración hoy
SELECT 
    b.document_number,
    b.first_name,
    b.last_name1,
    b.grade,
    sb.name as sede
FROM beneficiaries b
JOIN school_branches sb ON b.branch_id = sb.id
WHERE b.pae_id = ? 
AND b.status = 'ACTIVO'
AND NOT EXISTS (
    SELECT 1 FROM daily_consumptions dc 
    WHERE dc.beneficiary_id = b.id 
    AND dc.date = ?
);
```

### Reporte 3: Histórico de Asistencia
```sql
SELECT 
    DATE(dc.date) as fecha,
    COUNT(DISTINCT dc.beneficiary_id) as asistentes,
    COUNT(*) as total_raciones
FROM daily_consumptions dc
WHERE dc.pae_id = ? 
AND dc.date BETWEEN ? AND ?
GROUP BY DATE(dc.date)
ORDER BY fecha DESC;
```

---

## 🚀 Mejoras Futuras

- [ ] **Modo Offline:** Sincronización cuando recupere conexión
- [ ] **Reconocimiento Facial:** Alternativa al QR
- [ ] **Alertas de Ausentismo:** Notificar inasistencias prolongadas
- [ ] **Dashboard en Tiempo Real:** Mapa de calor de entregas
- [ ] **Integración con Biométricos:** Huella dactilar
- [ ] **Reportes Nutricionales:** Consumo calórico por beneficiario
- [ ] **Exportación Masiva:** Excel con filtros avanzados

---

## 📚 Referencias

- **Resolución 0003 de 2026:** Lineamientos de registro de asistencia
- **html5-qrcode:** Librería de escaneo QR
- **PWA:** Progressive Web App para funcionamiento móvil

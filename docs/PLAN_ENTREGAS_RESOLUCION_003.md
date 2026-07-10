# Plan de Implementación: Módulo de Entregas y Control Biométrico (Resolución 003 de 2026)

**Fecha de Creación:** 05 de Febrero de 2026  
**Contexto:** Modernización del sistema PAE según normativa vigente de la UApA.

---

## 1. Contexto Normativo
La Resolución 003 del 7 de enero de 2026 (Unidad Alimentos para Aprender - UApA) actualiza los lineamientos para la ejecución del PAE. El sistema debe evolucionar de un simple registro de inventario a una plataforma de **evidencia digital legal** para el cobro de raciones.

### Puntos Clave de la Norma:
1.  **Registro de Entrega (La Planilla):** Obligatorio diario. Debe identificar al niño, tipo de ración, fecha y contar con firmas de validación (Rector/CAE).
2.  **Evidencia Digital:** Se requiere registro fotográfico no solo de beneficiarios, sino del proceso (preparación, emplatado, almacenamiento) para certificar calidad (Minuta Patrón).
3.  **Modernización Tecnológica:** Se faculta y promueve el uso de biometría o sistemas QR para garantizar transparencia y evitar "falsos positivos" (cobro de raciones no entregadas).

---

## 2. Propuesta de Arquitectura: Módulo "Operación Diaria"

Se propone el desarrollo de un módulo operativo diseñado para Tablet/Móvil (Responsive), pensado para la Ecónoma o el Responsable de Sede en campo.

### A. Sub-módulo: Registro de Entrega (Planilla Digital)
**Objetivo:** Reemplazar la planilla física por una interfaz ágil.

*   **Interfaz:** Listado filtrable de beneficiarios activos en la sede actual.
*   **Métodos de Validación:**
    *   **Nivel 1 (Manual):** Checkbox o botón "Entregar" junto al nombre del estudiante.
    *   **Nivel 2 (Tecnológico - Recomendado):** Escaneo de código QR personal e intransferible.
*   **Funcionalidad Offline:** El sistema debe permitir registrar entregas sin internet (usando LocalStorage o IndexedDB) y sincronizar masivamente cuando se recupere la conexión.

### B. Sub-módulo: Bitácora Fotográfica (Calidad)
**Objetivo:** Evidencia para defensa ante glosas.

*   **Formulario Diario Obligatorio:** Antes de cerrar el día, el usuario debe cargar:
    1.  Foto de la Producción (Ollas llenas / Volumen).
    2.  Foto del Emplatado (Cumplimiento visual de la minuta).
    3.  Foto del Comedor (Higiene y orden).
*   **Seguridad:** Las fotos deben capturar metadatos (Fecha, Hora, Geo-localización) para evitar reutilización de imágenes antiguas.

### C. Sub-módulo: Generador de Soportes (Facturación)
**Objetivo:** Automatizar la creación de los entregables para cobro.

*   **Motor PDF:** Generación automática de la "Planilla Diaria de Entrega".
    *   Lista de estudiantes atendidos con hora exacta.
    *   Incustración de las fotos del día.
    *   Espacio para firma digital (táctil) del supervisor en la misma tablet.

---

## 3. Hoja de Ruta Técnica (Roadmap)

### Fase 1: Identificación Digital (QR) ✅ **COMPLETADO**
*   **Acción:** En el módulo `Beneficiarios`, agregar botón "Generar Carnet".
*   **Entregable:** PDF imprimible con Datos del estudiante y Código QR único.
*   **Refinamiento:** Ajuste de layout para evitar clipping en impresión y QR tokenizado (`PAE:ID:DOC`).

### Fase 2: Interfaz de Captura (PWA) 🟡 **EN DEBUG**
*   **Estado:** Pendiente resolución de error "Acceso denegado" en peticiones autenticadas.
*   **Acción:** Desarrollar vista móvil simplificada `/movil/index.html`.
*   **Tecnología:** Librería JS `html5-qrcode`.
*   **Lógica:** Al leer QR -> Registro de entrega masivo.
*   **Seguridad:** Implementación de encabezado `X-Auth-Token` p/ Apache.
*   **Gestión de Datos:** Selección de sede y cálculo automático de tipo de ración.

### Fase 3: Consolidación y Reportes ✅ **EN MARCHA**
*   **Acción:** Integrar `Dompdf` y lógica de consulta para transformar la data diaria en documentos oficiales.
*   **Entregable:** Nuevo módulo de **Reporte de Asistencia (QR)** con vista de impresión de planillas.
*   **Validación:** El sistema ya permite filtrar por Institución/Sede/Jornada y generar los soportes para archivo físico.

---

## 4. Integración con el Ecosistema Actual
Este módulo cierra el ciclo del software PAE:

1.  **Planeación:** Minutas y Ciclos (Ya existe).
2.  **Compras:** Explosión de Insumos (Ya existe).
3.  **Ejecución:** Registro de Entregas (Nuevo).
4.  **Auditoría:** Reportes y Planillas firmadas (Nuevo).

---

**Nota Técnica:** Este plan asume que la infraestructura actual (PHP/JS/MySQL) se mantiene, aprovechando la capacidad de PWA (Progressive Web App) para las funcionalidades móviles sin necesidad de una App nativa costosa.

# Módulo de Beneficiarios

**Fecha de Actualización:** 24 de Agosto de 2026
**Propósito:** Gestionar el ciclo de vida, matrícula, autorización de datos y carnetización de los estudiantes beneficiarios del Programa de Alimentación Escolar (PAE).

---

## 🚀 Arquitectura de Alto Rendimiento

### Server-Side Processing (Paginación Dinámica)
Debido a que un programa PAE puede albergar decenas de miles de beneficiarios (comprobado con volúmenes >25,000 registros), el módulo utiliza **Server-Side Processing** nativo con DataTables.
- **Frontend (`beneficiaries.js`):** Inicializa la tabla sin descargar la data completa. Envía parámetros `start`, `length` y `search` al servidor.
- **Backend (`BeneficiaryController::datatable`):** 
  - Recibe la petición paginada.
  - Ejecuta consultas SQL optimizadas con `LIMIT` y `OFFSET`.
  - Responde en milisegundos devolviendo únicamente los 10 registros que el usuario tiene en pantalla.

---

## 📇 Gestión Individual (CRUD)

El formulario abarca 4 pestañas obligatorias (según Resolución 003 de 2026):
1. **Identificación:** Documento, Nombres, SISBEN y Grupo Étnico.
2. **Matrícula:** Colegio, Sede Educativa, Grado y Jornada.
3. **Contacto:** Dirección, Teléfono, Nombre del Acudiente y **Autorización de Tratamiento de Datos (Hábeas Data)**.
4. **Salud y Otros:** Condición de discapacidad, población víctima o migrante.

### Obtención de Datos Quirúrgica
Al presionar el botón "Editar" o "Generar Carnet", el frontend no busca en la memoria cacheada (que solo tiene 10 registros). Hace un llamado al endpoint `GET /api/beneficiarios/{id}` para obtener el registro fresco y completo de la base de datos.

---

## 📥 Carga Masiva (Importación CSV/Excel)

El sistema soporta importación de archivos `.csv` delimitados por comas o punto y comas, a través del controlador `BeneficiaryImportController`.

### Características Inteligentes de la Carga:
- **Detección de Delimitador:** Identifica automáticamente si el archivo usa `,` o `;`.
- **Auto-Activación de Estados:** 
  - Al insertar estudiantes nuevos, se les asigna el estado `ACTIVO`.
  - Si un estudiante se encontraba en el sistema como `INACTIVO` o `DESERTADO`, al venir incluido en un nuevo archivo de carga masiva, **el sistema ejecuta un `ON DUPLICATE KEY UPDATE`** y lo re-activa automáticamente asignando `status = 'ACTIVO'`.
- **Integridad de Datos:** Realiza un cruce previo de Sedes y Tipos de Documentos, generando un array mapeado en memoria (sin consultas dentro del loop) para alta velocidad de inserción.
- **Hábeas Data Integrado:** Todos los registros importados masivamente adquieren por defecto el estado de Tratamiento de Datos autorizado (`data_authorization = 1`).

---

## 🪪 Carnetización Digital
Módulo de exportación gráfica de ID estudiantil para lectura de raciones mediante códigos de barras bidimensionales.
- **Token:** Se estructura como `PAE:[ID_Beneficiario]:[NumeroDocumento]`.
- **Lógica de renderizado:** Ventana emergente (modal_carnet) preparada con @media queries para impresión limpia, aislando la tarjeta en el documento a la hora de mandar a imprimir al dispositivo.

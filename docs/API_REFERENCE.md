# API Reference - PAE Control WebApp

**Versión:** 1.0  
**Base URL:** `http://localhost/pae/api`  
**Formato:** JSON  
**Autenticación:** JWT Bearer Token

---

## 📋 Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Usuarios](#usuarios)
3. [Roles](#roles)
4. [PAE (Entidades)](#pae-entidades)
5. [Beneficiarios](#beneficiarios-1)
6. [Cocina - Ítems](#cocina-ítems)
7. [Cocina - Recetas](#cocina-recetas)
8. [Minutas y Ciclos](#minutas-y-ciclos)
9. [Códigos de Estado](#códigos-de-estado)
10. [Manejo de Errores](#manejo-de-errores)

---

## 🔐 Autenticación

Todos los endpoints (excepto `/auth/login`) requieren un token JWT en el header:

```http
Authorization: Bearer {token}
```

### POST /auth/login

Autenticar usuario y obtener token JWT.

**Request:**
```json
{
  "username": "admin",
  "password": "admin"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
      "id": 1,
      "username": "admin",
      "full_name": "Administrador del Sistema",
      "email": "admin@pae.com",
      "role_id": 1,
      "role_name": "Super Admin",
      "pae_id": null,
      "pae_name": null
    }
  }
}
```

**Errores:**
- `401 Unauthorized` - Credenciales inválidas
- `400 Bad Request` - Datos faltantes

---

### POST /auth/logout

Cerrar sesión (invalidar token).

**Headers:**
```http
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

---

### GET /auth/me

Obtener información del usuario autenticado.

**Headers:**
```http
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "full_name": "Administrador del Sistema",
    "email": "admin@pae.com",
    "role_id": 1,
    "role_name": "Super Admin",
    "pae_id": null
  }
}
```

---

## 👥 Usuarios

### GET /users

Listar todos los usuarios.

**Headers:**
```http
Authorization: Bearer {token}
```

**Query Parameters:**
- `pae_id` (opcional) - Filtrar por PAE específico

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "full_name": "Administrador del Sistema",
      "email": "admin@pae.com",
      "address": "Calle 123 #45-67",
      "phone": "3001234567",
      "role_id": 1,
      "role_name": "Super Admin",
      "pae_id": null,
      "pae_name": null,
      "is_active": 1,
      "created_at": "2026-01-15 10:00:00"
    }
  ]
}
```

---

### GET /users/{id}

Obtener un usuario específico.

**Headers:**
```http
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "full_name": "Administrador del Sistema",
    "email": "admin@pae.com",
    "address": "Calle 123 #45-67",
    "phone": "3001234567",
    "role_id": 1,
    "role_name": "Super Admin",
    "pae_id": null,
    "pae_name": null,
    "is_active": 1,
    "created_at": "2026-01-15 10:00:00"
  }
}
```

**Errores:**
- `404 Not Found` - Usuario no encontrado

---

### POST /users

Crear un nuevo usuario.

**Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "username": "jperez",
  "password": "password123",
  "full_name": "Juan Pérez",
  "email": "jperez@example.com",
  "address": "Carrera 10 #20-30",
  "phone": "3009876543",
  "role_id": 2,
  "pae_id": 1,
  "is_active": 1
}
```

**Campos Requeridos:**
- `username` (string, único)
- `password` (string, mínimo 6 caracteres)
- `full_name` (string)
- `email` (string, formato email válido)
- `role_id` (integer)

**Campos Opcionales:**
- `address` (string)
- `phone` (string)
- `pae_id` (integer, null para Super Admin)
- `is_active` (boolean, default: 1)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "id": 5,
    "username": "jperez"
  }
}
```

**Errores:**
- `400 Bad Request` - Datos inválidos o faltantes
- `409 Conflict` - Username o email ya existe

---

### PUT /users/{id}

Actualizar un usuario existente.

**Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "full_name": "Juan Carlos Pérez",
  "email": "jcperez@example.com",
  "address": "Carrera 15 #25-35",
  "phone": "3009876543",
  "role_id": 2,
  "pae_id": 1,
  "is_active": 1,
  "password": "newpassword123"
}
```

**Notas:**
- Todos los campos son opcionales
- `password` solo se actualiza si se envía
- `username` no se puede modificar

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente"
}
```

**Errores:**
- `404 Not Found` - Usuario no encontrado
- `400 Bad Request` - Datos inválidos

---

### DELETE /users/{id}

Eliminar un usuario.

**Headers:**
```http
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}
```

**Errores:**
- `404 Not Found` - Usuario no encontrado
- `403 Forbidden` - No se puede eliminar el propio usuario

---

## 🎭 Roles

### GET /roles

Listar todos los roles disponibles.

**Headers:**
```http
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Super Admin",
      "description": "Acceso total al sistema"
    },
    {
      "id": 2,
      "name": "Admin",
      "description": "Administrador de PAE"
    }
  ]
}
```

---

## 🏢 PAE (Entidades)

### GET /tenants

Listar todos los programas PAE.

**Headers:**
```http
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "PAE Bogotá",
      "entity_name": "Secretaría de Educación Distrital",
      "operator_name": "Operador ABC S.A.S.",
      "is_active": 1
    }
  ]
}
```

---

## 👶 Beneficiarios

### POST /beneficiarios/datatable

Listar beneficiarios del programa actual de manera paginada (Server-Side Processing DataTables).

**Headers:**
```http
Authorization: Bearer {token}
```

**Body (JSON o Form-Data):**
```json
{
  "draw": 1,
  "start": 0,
  "length": 10,
  "search": { "value": "PEDRO" },
  "school_id": "",
  "grade": ""
}
```

**Response (200 OK):**
```json
{
  "draw": 1,
  "recordsTotal": 25000,
  "recordsFiltered": 1,
  "data": [
    {
      "id": 10,
      "full_name": "PEDRO PÉREZ",
      "document_number": "12345678",
      "school_name": "COLEGIO DISTRITAL",
      "grade": "5",
      "status": "ACTIVO"
    }
  ]
}
```

---

### GET /beneficiarios/{id}

Obtener el registro completo de un beneficiario específico.

**Headers:**
```http
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "first_name": "PEDRO",
    "last_name1": "PÉREZ",
    "document_number": "12345678",
    "status": "ACTIVO",
    "data_authorization": 1
  }
}
```

---

## 🍎 Cocina - Ítems

### GET /items

Listar todos los insumos/ingredientes disponibles.

**Query Parameters:**
- `food_group_id` (opcional) - Filtrar por categoría

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "ARROZ BLANCO",
      "food_group_name": "Cereales",
      "unit_abbreviation": "kg",
      "calories": 350.00
    }
  ]
}
```

---

## 🍲 Cocina - Recetas

### GET /recipes

Listar el recetario maestro.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "ARROZ CON POLLO TIPO A",
      "meal_type": "ALMUERZO",
      "total_calories": 450.50
    }
  ]
}
```

---

## 📅 Minutas y Ciclos

### GET /cycle-templates

Listar plantillas maestras de 20 días.

---

### POST /menu-cycles/generate

Generar un ciclo completo a partir de una plantilla.

**Request:**
```json
{
  "name": "Ciclo Marzo 2026",
  "start_date": "2026-03-02",
  "template_id": 1
}
```

---

---

## 💰 Finanzas

### GET /terceros
Listar proveedores, empleados y contratistas.

---

### GET /presupuesto
Obtener el plan de presupuesto por rubros y centros de costo.

---

### GET /presupuesto/active-program
Obtener la configuración contractual y logotipos del programa activo actual.

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "PAE SANTA MARTA 2026",
  "entity_name": "ALCALDÍA DE SANTA MARTA",
  "nit": "800.123.456-7",
  "contract_number": "LICITACION-002-2026",
  "entity_logo_path": "assets/uploads/logos/entity_1.png",
  "operator_logo_path": "assets/uploads/logos/operator_1.png"
}
```

---

### GET /movimientos-tipos
Listar las categorías y tipos de egresos habilitados para el programa actual.

---

### POST /movimientos-tipos
Crear un nuevo tipo de gasto personalizado.

**Request:**
```json
{
  "nombre": "TRANSPORTE LOGÍSTICO",
  "descripcion": "Gastos de transporte y distribución de víveres a comedores"
}
```

---

### PUT /movimientos-tipos/{id}
Actualizar el nombre o descripción de un tipo de movimiento.

---

### DELETE /movimientos-tipos/{id}
Eliminar un tipo de movimiento (valida si existen gastos asociados).

---

### GET /movimientos
Listar egresos y ejecución presupuestal.

---

### POST /movimientos
Registrar un nuevo gasto (soporta archivos vía `multipart/form-data`).

---

### GET /traslados
Listar traslados internos de recursos.

---

### GET /ajustes
Listar todas las modificaciones presupuestales (adiciones y reducciones).

---

### POST /ajustes
Registrar un ajuste al presupuesto (Adición o Reducción).

**Request:**
```json
{
  "fecha": "2026-07-09",
  "asignacion_id": 4,
  "tipo_ajuste": "ADICION",
  "valor": 15000000.00,
  "justificacion": "Adición presupuestal por ampliación de cobertura"
}
```

---

### DELETE /ajustes/{id}
Eliminar/revertir una adición o reducción (restaura el saldo previo).

---

20. [PQRs (Peticiones, Quejas y Reclamos)](#pqrs-peticiones-quejas-y-reclamos)
21. [Notificaciones](#notificaciones)
22. [Códigos de Estado](#códigos-de-estado)
23. [Manejo de Errores](#manejo-de-errores)

---

## 📩 PQRs (Peticiones, Quejas y Reclamos)

### POST /public/pqr
Radicar una nueva PQR desde el landing page (público).

**Request:**
```json
{
  "pae_id": 1,
  "type": "Petición",
  "email": "ciudadano@example.com",
  "message": "Descripción de la solicitud..."
}
```

**Response (200 OK):**
```json
{
  "message": "PQR enviada correctamente. Su número de radicado es #000001"
}
```

---

### GET /pqrs
Listar todas las PQRs del programa actual (Requiere Admin).

**Headers:**
```http
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "type": "Petición",
    "email": "ciudadano@example.com",
    "message": "...",
    "status": "Pendiente",
    "created_at": "2026-03-26 10:00:00"
  }
]
```

---

### PUT /pqrs/{id}
Actualizar el estado y respuesta de una PQR.

**Request:**
```json
{
  "status": "Respondida",
  "response": "Hemos procesado su solicitud..."
}
```

---

## 🔔 Notificaciones

### GET /public/notifications
Obtener el conteo de PQRs pendientes para el programa actual.

**Headers:**
```http
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "count": 5
}
```

---

---

## 📋 Reportes

### GET /reports/kardex-productos
Generar la matriz y planilla oficial de Kardex de Productos con requerimientos diarios de alimentos por sede educativa y grupos de edad/nivel educativo.

**Headers:**
```http
Authorization: Bearer {token}
```

**Parámetros Query:**
- `cycle_id` (integer, requerido): ID del ciclo de menú a consultar.
- `school_id` (integer, opcional): Filtrar por una institución educativa específica.
- `branch_id` (integer, opcional): Filtrar por una sede física específica.

**Response (200 OK):**
```json
{
  "success": true,
  "program": {
    "id": 1,
    "name": "PAE FACATATIVÁ 2026",
    "operator_name": "UT NUTRIFACA",
    "operator_nit": "900.000.000-0"
  },
  "cycle": {
    "id": 10,
    "name": "Ciclo 1",
    "start_date": "2026-08-24",
    "end_date": "2026-08-28"
  },
  "days": [
    { "day_number": 1, "menu_id": 15, "name": "Día 1 - Lunes 24/08" }
  ],
  "reports": [
    {
      "school": { "id": 5, "name": "I.E.M. JUAN XXIII" },
      "branch": { "id": 12, "name": "ESCUELA RURAL SERREZUELA" },
      "census": { "total": 44, "preescolar": 0, "primaria_a": 22, "primaria_b": 22, "secundaria": 0, "media": 0 },
      "items": [
        {
          "item_no": 1,
          "item_id": 4,
          "name": "ARROZ",
          "unit": "KG",
          "total_quantity": 82.0,
          "daily_quantities": { "1": 16.4, "2": 16.4, "3": 16.4, "4": 16.4, "5": 16.4 }
        }
      ]
    }
  ]
}
```

---

### GET /reports/needs/{cycle_id}
Calcular la explosión de víveres y necesidades consolidadas de insumos por ciclo de menú.

**Headers:**
```http
Authorization: Bearer {token}
```

---

## 📊 Códigos de Estado HTTP

| Código | Significado | Uso |
|--------|-------------|-----|
| `200` | OK | Operación exitosa |
| `201` | Created | Recurso creado exitosamente |
| `400` | Bad Request | Datos inválidos o faltantes |
| `401` | Unauthorized | Token inválido o expirado |
| `403` | Forbidden | Sin permisos para la operación |
| `404` | Not Found | Recurso no encontrado |
| `409` | Conflict | Conflicto (ej: username duplicado) |
| `500` | Internal Server Error | Error del servidor |

---

## ⚠️ Manejo de Errores

Todos los errores siguen el mismo formato:

```json
{
  "success": false,
  "message": "Descripción del error"
}
```

---

**Última Actualización:** 11 de Septiembre de 2026, 10:30 AM

# Arquitectura del Sistema - PAE Control WebApp

**Versión:** 1.0  
**Última Actualización:** 06 de Febrero de 2026

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura de Alto Nivel](#arquitectura-de-alto-nivel)
3. [Backend (API)](#backend-api)
4. [Frontend (SPA)](#frontend-spa)
5. [Base de Datos](#base-de-datos)
6. [Seguridad](#seguridad)
7. [Flujos de Datos](#flujos-de-datos)

---

## 🎯 Visión General

PAE Control WebApp es una aplicación web de arquitectura cliente-servidor que implementa:

- **Patrón:** MVC (Model-View-Controller)
- **Tipo:** Single Page Application (SPA)
- **API:** RESTful
- **Autenticación:** JWT (JSON Web Tokens)
- **Multitenancy:** Basado en datos (Data-based)

### Principios de Diseño

1. **Separación de Responsabilidades**
   - Backend: Lógica de negocio y datos
   - Frontend: Presentación e interacción

2. **Stateless API**
   - Cada petición es independiente
   - Estado manejado via JWT

3. **Seguridad por Capas**
   - Validación en frontend y backend
   - Autenticación y autorización
   - Sanitización de datos

4. **Escalabilidad**
   - Multitenancy para múltiples entidades
   - Diseño modular
   - Código reutilizable

---

## 🏗️ Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Navegador Web (Chrome, Firefox, etc)       │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │         Single Page Application (SPA)         │  │   │
│  │  │  ┌─────────────┐  ┌──────────────────────┐   │  │   │
│  │  │  │   Router    │  │   Views (Módulos)    │   │  │   │
│  │  │  └─────────────┘  └──────────────────────┘   │  │   │
│  │  │  ┌─────────────┐  ┌──────────────────────┐   │  │   │
│  │  │  │   Config    │  │   Helper Utilities   │   │  │   │
│  │  │  └─────────────┘  └──────────────────────┘   │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS / JSON
                            │ JWT Token
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVIDOR                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Apache Web Server                      │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │              RESTful API (PHP)                │  │   │
│  │  │  ┌─────────────────────────────────────────┐  │  │   │
│  │  │  │           Router (index.php)            │  │  │   │
│  │  │  └─────────────────────────────────────────┘  │  │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌───────────┐   │  │   │
│  │  │  │Controllers│  │  Models  │  │Middleware │   │  │   │
│  │  │  └──────────┘  └──────────┘  └───────────┘   │  │   │
│  │  │  ┌──────────┐  ┌──────────┐                  │  │   │
│  │  │  │  Config  │  │  Utils   │                  │  │   │
│  │  │  └──────────┘  └──────────┘                  │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ PDO / SQL
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MySQL / MariaDB                        │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │   │
│  │  │   users   │  │   roles   │  │ pae_programs  │   │   │
│  │  └───────────┘  └───────────┘  └───────────────┘   │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │   │
│  │  │beneficiaries│ │inventories│ │    minutas    │   │   │
│  │  └───────────┘  └───────────┘  └───────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Backend (API)

### Estructura de Carpetas

```
/api
├── /config
│   └── Database.php          # Singleton de conexión PDO
├── /controllers
│   ├── AuthController.php    # Autenticación
│   ├── UserController.php    # Gestión de usuarios
│   ├── RoleController.php    # Gestión de roles
│   ├── TenantController.php  # Gestión de PAE
│   ├── ConsumptionController.php # Reporte de Asistencia (QR)
│   └── [Otros controladores]
├── /models
│   └── [Modelos de datos]
├── /middleware
│   └── [Middleware de autenticación]
├── /utils
│   └── JWT.php               # Manejo de tokens
├── .htaccess                 # Reescritura de URLs
└── index.php                 # Enrutador principal
```

### Enrutador (api/index.php)

**Responsabilidades:**
- Recibir todas las peticiones HTTP
- Parsear la ruta y método
- Validar autenticación (JWT)
- Enrutar a controlador apropiado
- Manejar errores globales
- Enviar respuestas JSON

**Ejemplo de Flujo:**

```
1. Cliente: GET /api/users
2. Apache: Reescribe a /api/index.php
3. index.php:
   - Parsea ruta: resource='users', method='GET'
   - Valida JWT token
   - Carga UserController
   - Ejecuta UserController::index()
4. UserController:
   - Obtiene datos de BD
   - Retorna JSON
5. index.php:
   - Envía respuesta al cliente
```

### Controladores

**Patrón:** Cada controlador maneja un recurso específico

**Métodos Estándar:**
- `index()` - GET /resource (Listar todos)
- `show($id)` - GET /resource/{id} (Obtener uno)
- `store()` - POST /resource (Crear)
- `update($id)` - PUT /resource/{id} (Actualizar)
- `destroy($id)` - DELETE /resource/{id} (Eliminar)

**Ejemplo: UserController.php**

```php
class UserController {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    // GET /api/users
    public function index() {
        $stmt = $this->db->prepare("SELECT * FROM users");
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $users
        ];
    }
    
    // POST /api/users
    public function store($data) {
        // Validar datos
        // Insertar en BD
        // Retornar respuesta
    }
}
```

### Modelos (Futuro)

**Patrón Active Record (Planificado):**

```php
class User {
    private $db;
    
    public function find($id) { }
    public function all() { }
    public function create($data) { }
    public function update($id, $data) { }
    public function delete($id) { }
}
```

### Configuración (config/Database.php)

**Patrón Singleton:**

```php
class Database {
    private static $instance = null;
    private $conn;
    
    private function __construct() {
        // Crear conexión PDO
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->conn;
    }
}
```

### Utilidades (utils/JWT.php)

**Funciones:**
- `encode($payload)` - Generar token
- `decode($token)` - Validar y decodificar token

**Estructura del Token:**

```json
{
  "header": {
    "typ": "JWT",
    "alg": "HS256"
  },
  "payload": {
    "user_id": 1,
    "username": "admin",
    "role_id": 1,
    "pae_id": null,
    "exp": 1706745600
  },
  "signature": "..."
}
```

---

## 💻 Frontend (SPA)

### Estructura de Carpetas

```
/app
├── /assets
│   ├── /css
│   │   └── custom.css        # Estilos personalizados
│   ├── /img
│   │   └── logo.png          # Recursos gráficos
│   └── /js
│       ├── /core
│       │   ├── app.js        # Núcleo de la SPA
│       │   ├── config.js     # Configuración global
│       │   └── helper.js     # Utilidades
│       └── /views
│           ├── users.js      # Vista de usuarios
│           ├── tenants.js    # Vista de PAE
│           ├── consumos.js   # Reporte de Asistencia (QR)
│           └── [Otras vistas]
└── index.php                 # Shell HTML de la SPA
```

### Shell de la SPA (app/index.php)

**Responsabilidades:**
- Cargar librerías (Bootstrap, jQuery, etc)
- Definir estructura HTML base
- Inicializar la aplicación
- Manejar navegación

**Estructura HTML:**

```html
<!DOCTYPE html>
<html>
<head>
    <title>PAE Control</title>
    <!-- CSS -->
</head>
<body>
    <!-- Sidebar -->
    <aside id="sidebar">...</aside>
    
    <!-- Main Content -->
    <main id="main-content">
        <div id="app-container">
            <!-- Vistas se cargan aquí dinámicamente -->
        </div>
    </main>
    
    <!-- Scripts -->
    <script src="assets/js/core/config.js"></script>
    <script src="assets/js/core/helper.js"></script>
    <script src="assets/js/core/app.js"></script>
</body>
</html>
```

### Núcleo (app.js)

**Responsabilidades:**
- Enrutamiento cliente
- Gestión de sesión (JWT)
- Carga dinámica de vistas
- Manejo de navegación

**Componentes Principales:**

```javascript
const App = {
    // Inicialización
    init() {
        this.checkAuth();
        this.loadView(this.getCurrentRoute());
        this.setupEventListeners();
    },
    
    // Verificar autenticación
    checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/pae/app/';
        }
    },
    
    // Cargar vista
    loadView(viewName) {
        const script = document.createElement('script');
        script.src = `assets/js/views/${viewName}.js`;
        document.head.appendChild(script);
    },
    
    // Navegación
    navigate(route) {
        history.pushState(null, null, `#${route}`);
        this.loadView(route);
    }
};
```

### Configuración (config.js)

```javascript
const Config = {
    API_URL: 'http://localhost/pae/api',
    
    // Obtener token
    getToken() {
        return localStorage.getItem('token');
    },
    
    // Headers para peticiones
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
        };
    }
};
```

### Utilidades (helper.js)

**Funciones Disponibles:**
- `initDataTable()` - Inicializar tablas
- `formatCurrency()` - Formato de moneda
- `formatDate()` - Formato de fechas
- `sanitize()` - Sanitización XSS
- `showAlert()` - Mostrar alertas

### Vistas (views/*.js)

**Patrón:** Cada vista es un módulo independiente

**Estructura de una Vista:**

```javascript
const UsersView = {
    // Renderizar HTML
    render() {
        const html = `
            <div class="container">
                <h1>Gestión de Usuarios</h1>
                <table id="users-table">...</table>
            </div>
        `;
        document.getElementById('app-container').innerHTML = html;
        this.init();
    },
    
    // Inicializar componentes
    init() {
        this.loadUsers();
        this.setupEventListeners();
    },
    
    // Cargar datos
    async loadUsers() {
        const response = await fetch(`${Config.API_URL}/users`, {
            headers: Config.getHeaders()
        });
        const data = await response.json();
        this.renderTable(data.data);
    },
    
    // Renderizar tabla
    renderTable(users) {
        Helper.initDataTable('#users-table');
    },
    
    // Event listeners
    setupEventListeners() {
        document.getElementById('btn-new').addEventListener('click', () => {
            this.showModal();
        });
    }
};

// Auto-ejecutar al cargar
UsersView.render();
```

---

## 🗄️ Base de Datos

### Diseño Multitenancy

**Estrategia:** Data-based (Basado en datos)

- Todas las entidades comparten las mismas tablas
- Filtrado por `pae_id` en consultas
- Aislamiento lógico, no físico

**Ventajas:**
- Simplicidad de mantenimiento
- Escalabilidad horizontal
- Backups centralizados

**Desventajas:**
- Requiere cuidado en consultas
- Riesgo de filtrado incorrecto

### Esquema Principal

```sql
-- Autenticación y Usuarios
users (id, username, password, full_name, email, address, phone, 
       role_id, pae_id, is_active, created_at)

roles (id, name, description)

-- Multitenancy
pae_programs (id, name, entity_name, operator_name, operator_nit,
              operator_address, operator_phone, operator_email,
              entity_logo_path, operator_logo_path, is_active, created_at)

-- Relaciones
users.role_id -> roles.id
users.pae_id -> pae_programs.id (NULL para Super Admin)
```

### Índices

```sql
-- Usuarios
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_pae ON users(pae_id);
CREATE INDEX idx_users_role ON users(role_id);

-- PAE Programs
CREATE INDEX idx_pae_active ON pae_programs(is_active);
```

---

## 🔒 Seguridad

### Capas de Seguridad

```
1. Frontend Validation
   ↓
2. HTTPS (Producción)
   ↓
3. JWT Authentication
   ↓
4. Backend Validation
   ↓
5. SQL Injection Prevention (PDO)
   ↓
6. XSS Prevention (Sanitización)
   ↓
7. Database Permissions
```

### Autenticación JWT

**Flujo:**

```
1. Usuario: POST /auth/login {username, password}
2. Backend:
   - Validar credenciales
   - Generar JWT con payload
   - Retornar token
3. Cliente:
   - Guardar token en localStorage
   - Incluir en header de cada petición
4. Backend (cada petición):
   - Validar token
   - Decodificar payload
   - Verificar expiración
   - Procesar petición
```

### Multitenancy Security

**Filtrado Automático:**

```php
// En cada controlador
$pae_id = $jwt_payload['pae_id'];

if ($pae_id !== null) {
    // Usuario normal: filtrar por su PAE
    $sql = "SELECT * FROM beneficiaries WHERE pae_id = :pae_id";
} else {
    // Super Admin: ver todos
    $sql = "SELECT * FROM beneficiaries";
}
```

---

## 🔄 Flujos de Datos

### Flujo de Login

```
1. Usuario ingresa credenciales
2. Frontend: POST /api/auth/login
3. Backend:
   - Validar username existe
   - Verificar password (bcrypt)
   - Generar JWT
   - Retornar token + datos usuario
4. Frontend:
   - Guardar token en localStorage
   - Redirigir a dashboard
```

### Flujo de Creación de Recurso

```
1. Usuario llena formulario
2. Frontend:
   - Validar datos
   - POST /api/resource con JWT
3. Backend:
   - Validar JWT
   - Validar datos
   - Insertar en BD
   - Retornar confirmación
4. Frontend:
   - Mostrar mensaje de éxito
   - Recargar listado
```

### Flujo de Carga de Vista

```
1. Usuario hace clic en menú
2. App.navigate('users')
3. Cargar script views/users.js
4. UsersView.render()
5. UsersView.loadUsers()
6. Fetch GET /api/users con JWT
7. Renderizar tabla con datos
8. Inicializar DataTable
```

---

## 📊 Diagramas

### Diagrama de Componentes

```
┌─────────────────────────────────────────────┐
│              FRONTEND (SPA)                 │
├─────────────────────────────────────────────┤
│  Router  │  Views  │  Config  │  Helper    │
└────┬────────────────────────────────────────┘
     │ HTTP/JSON + JWT
     ▼
┌─────────────────────────────────────────────┐
│              BACKEND (API)                  │
├─────────────────────────────────────────────┤
│  Router  │  Controllers  │  Middleware      │
│  Models  │  Utils (JWT)  │  Config          │
└────┬────────────────────────────────────────┘
     │ PDO/SQL
     ▼
┌─────────────────────────────────────────────┐
│           DATABASE (MySQL)                  │
├─────────────────────────────────────────────┤
│  users  │  roles  │  pae_programs           │
│  beneficiaries  │  inventories  │  minutas  │
└─────────────────────────────────────────────┘
```

---

## 📝 Notas Técnicas

### Decisiones de Arquitectura

1. **¿Por qué PHP Nativo?**
   - Simplicidad de deployment
   - Menor curva de aprendizaje
   - Control total del código
   - No requiere composer/dependencias

2. **¿Por qué SPA sin Framework?**
   - Tamaño reducido
   - Carga rápida
   - Control total
   - Aprendizaje de fundamentos

3. **¿Por qué JWT?**
   - Stateless
   - Escalable
   - Estándar de la industria
   - Fácil de implementar

### Limitaciones Actuales

- ⚠️ No hay capa de abstracción de BD (ORM)
- ⚠️ No hay sistema de caché
- ⚠️ No hay rate limiting
- ⚠️ No hay tests automatizados

### Mejoras Futuras

- [ ] Implementar patrón Repository
- [ ] Agregar caché (Redis)
- [ ] Implementar WebSockets para tiempo real
- [ ] Agregar queue system para tareas pesadas
- [ ] Implementar CDN para assets

---

**Última Actualización:** 31 de Enero de 2026

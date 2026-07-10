# PAE Control WebApp v1.0

Sistema de Información para la Gestión del Programa de Alimentación Escolar (PAE).

## 🚀 Descripción
Aplicación web diseñada para administrar integralmente la operación del PAE, incluyendo:
- Control de Beneficiarios y Sedes.
- Gestión de Inventarios y Cocina (Minutas, Explosión de Insumos).
- Seguimiento a entregas y consumo diario.
- Dashboards de control y reportes.

## 🛠️ Tecnologías
- **Backend**: PHP 8.x (Nativo, Arquitectura MVC ligera).
- **Frontend**: SPA con JavaScript Vanilla (ES6+).
- **Estilos**: Bootstrap 5 (Local).
- **Base de Datos**: MySQL / MariaDB.
- **Autenticación**: JSON Web Tokens (JWT).

## 📂 Estructura del Proyecto
```
/pae
  ├── /api              # Backend (Controladores, Modelos, Config)
  ├── /app              # Frontend SPA (Vistas, JS Core)
  ├── /assets           # Librerías Locales (Bootstrap, SweetAlert)
  ├── /landing          # Página de Aterrizaje Pública
  ├── /sql              # Scripts de Base de Datos
  └── index.php         # Enrutador Principal
```

## ⚙️ Instalación (Local)
1.  **Clonar el repositorio** en `C:/xampp/htdocs/`.
2.  **Base de Datos**:
    - Crear una base de datos llamada `db-pae`.
    - Importar el script `sql/01_auth_schema.sql`.
3.  **Configuración**:
    - Verificar credenciales en `api/config/Database.php` (Por defecto: usuario `root`, sin contraseña).
4.  **Ejecutar**:
    - Abrir `http://localhost/pae/` para el Landing Page.
    - Abrir `http://localhost/pae/app/` para el Panel Administrativo.
    - **Credenciales Admin**: Usuario `admin` / Contraseña `admin`.

## 🔒 Seguridad
- El archivo `api/utils/JWT.php` contiene una clave secreta (`secret_key`). **CAMBIAR** esta clave en entornos de producción.

## 📝 Desarrollado por
**OVCSYSTEMS S.A.S.** - Innovación Digital • Web • Apps

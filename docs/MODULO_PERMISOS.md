# Módulo de Roles y Permisos (v1.2.1)

El módulo de Roles y Permisos ha sido rediseñado para ofrecer una gestión compacta y profesional de los niveles de acceso.

## 🛠️ Funcionamiento General

El sistema utiliza un modelo de **Matriz CRUD** (Create, Read, Update, Delete) aplicado a cada módulo del aplicativo.

### Componentes de la Interfaz

1.  **Listado de Roles:** Una tabla con búsqueda que muestra todos los perfiles de usuario creados.
2.  **Icono de Llave 🔑:** Al hacer clic en este icono amarillo, se abre la gestión de permisos para ese rol específico.
3.  **Modal de Matriz:** Una ventana emergente con:
    *   **Auto-scroll:** Permite navegar por decenas de módulos sin crecer infinitamente en pantalla.
    *   **Agrupación:** Módulos organizados por áreas (Configuración, Operación, Reportes).
    *   **Guardado Masivo:** Botón para confirmar todos los cambios realizados en la matriz de una sola vez.

## 🔐 Seguridad y Multitenancy

- **Permisos Globales:** Los permisos definidos por el Super Admin sirven de plantilla.
- **Permisos por PAE:** El administrador de cada programa puede ajustar qué ven sus usuarios dentro de los límites de su suscripción.
- **Aislamiento:** El archivo `PermissionController.php` garantiza que los cambios de permisos de un programa NO afecten a otros programas.

## 📝 Reglas de Negocio

- No se puede eliminar el rol **Super Admin (ID 1)**.
- Solo los usuarios con rol de Super Administrador (en el contexto global) pueden crear nuevos roles.
- Los cambios de permisos se aplican de forma inmediata tras el guardado para todos los usuarios conectados con ese rol.

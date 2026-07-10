# Guía de Instalación - PAE Control WebApp

**Versión:** 1.7.5  
**Última Actualización:** 12 de Febrero de 2026

---

## 📋 Requisitos del Sistema

### Software Requerido

| Software | Versión Mínima | Recomendada | Notas |
|----------|----------------|-------------|-------|
| **PHP** | 8.0 | 8.2+ | Con extensiones PDO, JSON |
| **MySQL/MariaDB** | 5.7 | 8.0+ | InnoDB requerido |
| **Apache** | 2.4 | 2.4+ | Con mod_rewrite |
| **Navegador** | Chrome 90+ | Última versión | Firefox, Edge también soportados |

### Extensiones PHP Requeridas

- ✅ `pdo_mysql` - Conexión a base de datos
- ✅ `json` - Manejo de JSON
- ✅ `mbstring` - Manejo de strings multibyte
- ✅ `openssl` - Encriptación y JWT
- ✅ `fileinfo` - Validación de archivos
- ✅ `gd` o `imagick` - Procesamiento de imágenes (opcional)

### Verificar Extensiones

```bash
php -m | grep -E "pdo_mysql|json|mbstring|openssl|fileinfo"
```

---

## 🚀 Instalación en Entorno Local (XAMPP)

### Paso 1: Instalar XAMPP

1. Descargar XAMPP desde [https://www.apachefriends.org](https://www.apachefriends.org)
2. Instalar en `C:\xampp` (Windows) o `/opt/lampp` (Linux)
3. Verificar que incluya:
   - Apache 2.4+
   - MySQL 8.0+
   - PHP 8.0+

### Paso 2: Clonar/Copiar el Proyecto

**Opción A: Con Git**
```bash
cd C:\xampp\htdocs
git clone [URL_DEL_REPOSITORIO] pae
```

**Opción B: Manual**
1. Descargar el proyecto como ZIP
2. Extraer en `C:\xampp\htdocs\pae`

### Paso 3: Configurar la Base de Datos

#### 3.1. Crear la Base de Datos

1. Abrir phpMyAdmin: `http://localhost/phpmyadmin`
2. Crear nueva base de datos:
   - Nombre: `db-pae`
   - Cotejamiento: `utf8mb4_unicode_ci`

**O desde línea de comandos:**
```bash
mysql -u root -p
CREATE DATABASE `db-pae` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### 3.2. Importar el Esquema

**Desde phpMyAdmin:**
1. Seleccionar base de datos `db-pae`
2. Ir a pestaña "Importar"
3. Importar archivos en orden:
   - `sql/01_auth_schema.sql`
   - `sql/02_multitenant.sql`
   - `sql/03_pae_details.sql`

**Desde línea de comandos:**
```bash
cd C:\xampp\htdocs\pae

# Windows
mysql -u root < sql\01_auth_schema.sql
mysql -u root < sql\02_multitenant.sql
mysql -u root < sql\03_pae_details.sql

# Linux/Mac
mysql -u root < sql/01_auth_schema.sql
mysql -u root < sql/02_multitenant.sql
mysql -u root < sql/03_pae_details.sql
```

### Paso 4: Configurar la Aplicación

#### 4.1. Configuración de Base de Datos

Editar: `api/config/Database.php`

```php
<?php
namespace Config;

class Database {
    private static $instance = null;
    private $conn;

    // Configuración de conexión
    private $host = 'localhost';
    private $db_name = 'db-pae';
    private $username = 'root';        // ⚠️ CAMBIAR en producción
    private $password = '';            // ⚠️ CAMBIAR en producción
    private $charset = 'utf8mb4';

    // ... resto del código
}
```

**⚠️ Importante:** Si tu MySQL tiene contraseña, actualiza el campo `$password`.

#### 4.2. Configuración de JWT

Editar: `api/utils/JWT.php`

```php
<?php
class JWT {
    private static $secret_key = 'tu_clave_secreta_super_segura_aqui'; // ⚠️ CAMBIAR
    private static $algorithm = 'HS256';
    private static $expiration = 86400; // 24 horas

    // ... resto del código
}
```

**⚠️ Crítico:** Cambiar `$secret_key` a una cadena aleatoria y segura en producción.

**Generar clave segura:**
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

#### 4.3. Configuración de Apache

**Habilitar mod_rewrite:**

1. Editar `C:\xampp\apache\conf\httpd.conf`
2. Descomentar (quitar #):
   ```apache
   LoadModule rewrite_module modules/mod_rewrite.so
   ```
3. Buscar `AllowOverride None` y cambiar a:
   ```apache
   AllowOverride All
   ```

**Reiniciar Apache** desde el Panel de Control de XAMPP.

### Paso 5: Verificar Permisos de Carpetas

**Windows:**
```powershell
# Dar permisos de escritura a uploads
icacls "C:\xampp\htdocs\pae\uploads" /grant Everyone:(OI)(CI)F
```

**Linux/Mac:**
```bash
chmod -R 755 /opt/lampp/htdocs/pae
chmod -R 777 /opt/lampp/htdocs/pae/uploads
```

### Paso 6: Iniciar el Servidor

1. Abrir Panel de Control de XAMPP
2. Iniciar **Apache**
3. Iniciar **MySQL**

### Paso 7: Acceder a la Aplicación

**Landing Page:**
```
http://localhost/pae/
```

**Panel Administrativo:**
```
http://localhost/pae/app/
```

**Credenciales Iniciales:**
- Usuario: `admin`
- Contraseña: `admin`

⚠️ **Cambiar estas credenciales inmediatamente después del primer login.**

---

## 🐳 Instalación con Docker (Opcional)

### Dockerfile

Crear archivo `Dockerfile` en la raíz del proyecto:

```dockerfile
FROM php:8.2-apache

# Instalar extensiones PHP
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Habilitar mod_rewrite
RUN a2enmod rewrite

# Copiar archivos del proyecto
COPY . /var/www/html/

# Permisos
RUN chown -R www-data:www-data /var/www/html/uploads
RUN chmod -R 755 /var/www/html

EXPOSE 80
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8080:80"
    volumes:
      - ./:/var/www/html
    depends_on:
      - db
    environment:
      - DB_HOST=db
      - DB_NAME=db-pae
      - DB_USER=root
      - DB_PASS=rootpassword

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: db-pae
    volumes:
      - db_data:/var/lib/mysql
      - ./sql:/docker-entrypoint-initdb.d

volumes:
  db_data:
```

### Ejecutar con Docker

```bash
# Construir y levantar contenedores
docker-compose up -d

# Ver logs
docker-compose logs -f

# Acceder a la aplicación
http://localhost:8080/app/
```

---

## 🔧 Configuración Avanzada

### Configurar Virtual Host (Opcional)

**Windows - Editar:** `C:\xampp\apache\conf\extra\httpd-vhosts.conf`

```apache
<VirtualHost *:80>
    ServerName pae.local
    DocumentRoot "C:/xampp/htdocs/pae"
    
    <Directory "C:/xampp/htdocs/pae">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog "logs/pae-error.log"
    CustomLog "logs/pae-access.log" common
</VirtualHost>
```

**Editar hosts:** `C:\Windows\System32\drivers\etc\hosts`

```
127.0.0.1 pae.local
```

**Acceder:** `http://pae.local/app/`

### Configurar PHP

**Editar:** `C:\xampp\php\php.ini`

```ini
# Aumentar límites para uploads
upload_max_filesize = 10M
post_max_size = 10M
max_execution_time = 300

# Habilitar errores (solo desarrollo)
display_errors = On
error_reporting = E_ALL

# Zona horaria
date.timezone = America/Bogota

# Extensiones requeridas
extension=pdo_mysql
extension=mbstring
extension=openssl
extension=fileinfo
extension=gd
```

**Reiniciar Apache** después de cambios.

---

## ✅ Verificación de Instalación

### Checklist Post-Instalación

- [ ] Apache corriendo en puerto 80
- [ ] MySQL corriendo en puerto 3306
- [ ] Base de datos `db-pae` creada
- [ ] Tablas importadas correctamente
- [ ] Usuario `admin` existe en tabla `users`
- [ ] Carpeta `uploads` tiene permisos de escritura
- [ ] Landing page carga: `http://localhost/pae/`
- [ ] Panel admin carga: `http://localhost/pae/app/`
- [ ] Login funciona con credenciales `admin/admin`
- [ ] Dashboard se muestra después del login

### Pruebas de API

**Test 1: Login**
```bash
curl -X POST http://localhost/pae/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": { ... }
  }
}
```

**Test 2: Listar Usuarios**
```bash
curl -X GET http://localhost/pae/api/users \
  -H "Authorization: Bearer {TOKEN_DEL_LOGIN}"
```

---

## 🐛 Solución de Problemas

### Error: "No se puede conectar a la base de datos"

**Solución:**
1. Verificar que MySQL esté corriendo
2. Revisar credenciales en `api/config/Database.php`
3. Verificar que la base de datos `db-pae` exista
4. Comprobar extensión `pdo_mysql`:
   ```bash
   php -m | grep pdo_mysql
   ```

### Error: "404 Not Found" en rutas API

**Solución:**
1. Verificar que `mod_rewrite` esté habilitado
2. Verificar archivo `.htaccess` en `/api`:
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.*)$ index.php [QSA,L]
   ```
3. Verificar `AllowOverride All` en configuración de Apache

### Error: "Token inválido o expirado"

**Solución:**
1. Hacer logout y login nuevamente
2. Verificar que la clave secreta en `JWT.php` no haya cambiado
3. Limpiar localStorage del navegador:
   ```javascript
   localStorage.clear();
   ```

### Error: "No se pueden subir archivos"

**Solución:**
1. Verificar permisos de carpeta `uploads`:
   ```bash
   # Windows
   icacls "C:\xampp\htdocs\pae\uploads" /grant Everyone:(OI)(CI)F
   
   # Linux
   chmod -R 777 /var/www/html/pae/uploads
   ```
2. Verificar configuración PHP:
   ```ini
   upload_max_filesize = 10M
   post_max_size = 10M
   ```

### Error: "CORS Policy"

**Solución:**
Verificar headers en `api/index.php`:
```php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
```

---

## 🔒 Seguridad Post-Instalación

### Checklist de Seguridad

- [ ] Cambiar contraseña del usuario `admin`
- [ ] Cambiar clave secreta JWT
- [ ] Cambiar credenciales de base de datos
- [ ] Deshabilitar `display_errors` en producción
- [ ] Configurar HTTPS (SSL/TLS)
- [ ] Configurar firewall
- [ ] Limitar acceso a phpMyAdmin
- [ ] Configurar backups automáticos
- [ ] Revisar permisos de archivos

### Cambiar Contraseña de Admin

1. Login con credenciales iniciales
2. Ir a "Gestión de Usuarios"
3. Editar usuario `admin`
4. Cambiar contraseña
5. Guardar cambios

---

## 📚 Próximos Pasos

Después de la instalación exitosa:

1. **Leer la documentación:**
   - `docs/PROYECTO_OVERVIEW.md`
   - `docs/API_REFERENCE.md`
   - `docs/ESTADO_DESARROLLO.md`

2. **Configurar el sistema:**
   - Crear roles adicionales
   - Crear usuarios de prueba
   - Crear entidades PAE de prueba

3. **Explorar la aplicación:**
   - Familiarizarse con la interfaz
   - Probar módulos disponibles
   - Revisar reportes

---

## 📞 Soporte

**Documentación:** `/docs`  
**Desarrollador:** OVCSYSTEMS S.A.S.  
**Issues:** [Agregar URL de repositorio si aplica]

---

**¡Instalación Completada! 🎉**

*Última actualización: 31 de Enero de 2026*

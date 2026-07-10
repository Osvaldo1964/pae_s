# Módulo de Gestión de Programas PAE

**Fecha:** 31 de Enero de 2026, 22:42  
**Propósito:** Permitir al Super Admin gestionar programas PAE (CRUD completo + upload de logos)

---

## ✅ Implementación Completada

### 1. Frontend: Vista de Gestión ✅

**Archivo:** `/app/assets/js/views/pae-programs.js`

**Características (v1.9.15):**
- ✅ Interfaz de **Pestañas (Tabs)**: Modal dividido en:
  - **General**: Info básica y servicios.
  - **Entidad**: Datos de la Entidad Territorial y logo.
  - **Operador**: Datos del Operador y logo.
  - **Contrato**: Nueva sección de seguimiento legal.
  - **Acceso**: (Solo creación) Credenciales de administrador.
- ✅ **Formato de Miles**: Campo de valor con separadores automáticos (1,000,000.00).
- ✅ Tabla DataTables con listado de todos los programas PAE.
- ✅ Visualización de **Número de Contrato** directamente en la tabla principal.
- ✅ Upload de logos (entidad y operador) con previsualización.

**Campos del Formulario:**
- **Programa:** Nombre, Email, Servicios
- **Entidad:** Nombre, NIT, Departamento, Ciudad, Logo
- **Operador:** Razón Social, NIT, Dirección, Teléfono, Email, Logo
- **Contrato:** No. Contrato, Valor (Formateado), Fecha Inicio, Fecha Fin, Periodicidad de informes

### 2. Backend: API Endpoints ✅

**Archivo:** `/api/controllers/TenantManagementController.php`

**Endpoints Implementados:**

#### GET `/api/tenant/list`
- **Descripción:** Listar todos los programas PAE
- **Autenticación:** JWT (Solo Super Admin)
- **Respuesta:** Array de programas con todos los campos

#### PUT `/api/tenant/update/{id}`
- **Descripción:** Actualizar programa PAE
- **Autenticación:** JWT (Solo Super Admin)
- **Body:** FormData con campos del programa + logos (opcional)
- **Funcionalidad:** 
  - Actualiza datos del programa
  - Sube nuevos logos si se proporcionan
  - Mantiene logos existentes si no se cambian

#### DELETE `/api/tenant/delete/{id}`
- **Descripción:** Eliminar programa PAE
- **Autenticación:** JWT (Solo Super Admin)
- **Validación:** No permite eliminar si tiene usuarios asociados
- **Respuesta:** Confirmación de eliminación

### 3. Rutas Configuradas ✅

**En `/api/index.php`:**
```php
// GET /api/tenant/list - Listar programas (con JWT)
// PUT /api/tenant/update/{id} - Actualizar programa (con JWT)
// DELETE /api/tenant/delete/{id} - Eliminar programa (con JWT)
```

**En `/app/assets/js/core/app.js`:**
```javascript
// Ruta: #pae-programs o #module/pae-programs
else if (hash === 'pae-programs' || hash === 'module/pae-programs') {
    App.loadView('pae-programs');
}
```

---

## 🔐 Seguridad

1. **Solo Super Admin:** Todos los endpoints validan que `role_id === 1`
2. **JWT Requerido:** Todos los endpoints requieren token válido
3. **Validación de Eliminación:** No permite eliminar programas con usuarios
4. **Upload Seguro:** Validación de archivos de imagen

---

## 📊 Tabla de Programas

**Columnas Mostradas:**
1. **Programa:** Nombre + ID
2. **Entidad:** Nombre + NIT
3. **Operador:** Razón Social + NIT
4. **Ubicación:** Ciudad, Departamento
5. **Logos:** Miniaturas de logos (entidad y operador)
6. **Acciones:** Editar | Eliminar

---

## 🎯 Cómo Acceder

### Opción 1: URL Directa
```
http://localhost/pae/app/#pae-programs
```

### Opción 2: Agregar al Menú Lateral
Agregar en el menú de navegación:
```html
<li class="nav-item">
    <a href="#pae-programs" class="nav-link">
        <i class="fas fa-building me-2"></i>
        Programas PAE
    </a>
</li>
```

---

## 🧪 Testing

### Probar Listado:
1. Iniciar sesión como Super Admin
2. Navegar a `#pae-programs`
3. Verificar que se muestran todos los programas

### Probar Edición:
1. Click en botón "Editar" de un programa
2. Modificar datos (ej: cambiar nombre)
3. Subir nuevo logo (opcional)
4. Guardar y verificar cambios

### Probar Upload de Logos:
1. Editar un programa
2. Seleccionar imagen para logo de entidad
3. Seleccionar imagen para logo de operador
4. Guardar
5. Verificar que los logos se muestran en la tabla
6. Verificar que los logos aparecen en el header

### Probar Eliminación:
1. Click en botón "Eliminar"
2. Confirmar eliminación
3. Verificar que el programa desaparece de la lista

---

## 📁 Estructura de Archivos

```
/pae
├── /api
│   ├── /controllers
│   │   └── TenantManagementController.php  ← NUEVO
│   └── index.php  ← MODIFICADO (rutas agregadas)
│
├── /app
│   └── /assets
│       └── /js
│           ├── /core
│           │   └── app.js  ← MODIFICADO (ruta agregada)
│           └── /views
│               └── pae-programs.js  ← NUEVO
│
└── /uploads
    └── /logos
        ├── entity_*.jpg
        └── operator_*.jpg
```

---

## 🔄 Flujo de Trabajo

### Crear Programa:
1. Usuario hace click en "Nuevo Programa"
2. Llena formulario con datos
3. Selecciona logos (opcional)
4. Click en "Guardar"
5. Frontend envía FormData a `/api/tenant/register`
6. Backend crea programa y sube logos
7. Retorna confirmación
8. Frontend recarga tabla

### Editar Programa:
1. Usuario hace click en "Editar"
2. Modal se llena con datos actuales
3. Usuario modifica campos
4. Puede cambiar logos
5. Click en "Guardar"
6. Frontend envía FormData a `/api/tenant/update/{id}`
7. Backend actualiza programa
8. Si hay nuevos logos, los sube y actualiza rutas
9. Retorna confirmación
10. Frontend recarga tabla

### Eliminar Programa:
1. Usuario hace click en "Eliminar"
2. Confirma en SweetAlert
3. Frontend envía DELETE a `/api/tenant/delete/{id}`
4. Backend verifica que no tenga usuarios
5. Si no tiene usuarios, elimina
6. Retorna confirmación
7. Frontend recarga tabla

---

## 🐛 Solución de Problemas

### Los logos no se muestran:
- Verificar que la carpeta `/uploads/logos/` existe
- Verificar permisos de escritura (777)
- Verificar que las rutas en BD no tengan `assets/` al inicio
- Verificar que las imágenes se subieron correctamente

### Error 403 al listar:
- Verificar que el usuario es Super Admin (`role_id = 1`)
- Verificar que el token JWT es válido

### No se pueden subir logos:
- Verificar configuración de PHP (`upload_max_filesize`, `post_max_size`)
- Verificar permisos de carpeta `/uploads/logos/`
- Verificar que el archivo es una imagen válida

---

## 📝 Próximos Pasos

1. [ ] Agregar módulo al menú lateral
2. [ ] Implementar búsqueda/filtros en la tabla
3. [ ] Agregar paginación del lado del servidor
4. [ ] Implementar vista previa de logos antes de subir
5. [ ] Agregar validación de tamaño/tipo de imagen
6. [ ] Implementar recorte de imágenes
7. [ ] Agregar auditoría de cambios

---

**Fin del Documento**  
*Generado: 31/01/2026 22:42*

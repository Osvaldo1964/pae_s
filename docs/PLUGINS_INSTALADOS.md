# Plugins Instalados Localmente

**Fecha:** 31 de Enero de 2026, 22:33  
**Ubicación:** `/app/assets/plugins/` y `/landing/assets/plugins/`

---

## 📦 Plugins Descargados

### 1. Bootstrap 5.3.0 ✅
**Ubicación:** `plugins/bootstrap/`
- **CSS:** `css/bootstrap.min.css`
- **JS:** `js/bootstrap.bundle.min.js`
- **Versión:** 5.3.0
- **Fuente:** https://github.com/twbs/bootstrap

### 2. jQuery 3.7.1 ✅
**Ubicación:** `plugins/jquery/`
- **JS:** `jquery.min.js`
- **Versión:** 3.7.1
- **Fuente:** https://code.jquery.com

### 3. DataTables 1.13.7 ✅
**Ubicación:** `plugins/datatables/`
- **JS Core:** `jquery.dataTables.min.js`
- **JS Bootstrap:** `dataTables.bootstrap5.min.js`
- **CSS:** `dataTables.bootstrap5.min.css`
- **Idioma:** `es-ES.json` (Español)
- **Versión:** 1.13.7
- **Fuente:** https://cdn.datatables.net

### 4. FontAwesome 6.5.1 ✅
**Ubicación:** `plugins/fontawesome/`
- **CSS:** `css/all.min.css`
- **Webfonts:** `webfonts/` (completo)
- **Versión:** 6.5.1 Free
- **Fuente:** https://fontawesome.com

### 5. SweetAlert2 11.x ✅
**Ubicación:** `plugins/sweetalert2/`
- **JS:** `sweetalert2.all.min.js`
- **CSS:** `sweetalert2.min.css`
- **Versión:** 11.x (latest)
- **Fuente:** https://sweetalert2.github.io

---

## 📂 Estructura de Carpetas

```
/pae
├── /app
│   └── /assets
│       └── /plugins
│           ├── /bootstrap
│           │   ├── /css
│           │   │   └── bootstrap.min.css
│           │   └── /js
│           │       └── bootstrap.bundle.min.js
│           ├── /jquery
│           │   └── jquery.min.js
│           ├── /datatables
│           │   ├── jquery.dataTables.min.js
│           │   ├── dataTables.bootstrap5.min.js
│           │   ├── dataTables.bootstrap5.min.css
│           │   └── es-ES.json
│           ├── /fontawesome
│           │   ├── /css
│           │   │   └── all.min.css
│           │   └── /webfonts
│           │       └── (archivos de fuentes)
│           └── /sweetalert2
│               ├── sweetalert2.all.min.js
│               └── sweetalert2.min.css
│
└── /landing
    └── /assets
        └── /plugins
            └── (misma estructura que /app)
```

---

## ✅ Rutas Configuradas

### En `/app/index.php`:
```html
<!-- CSS -->
<link href="/pae/app/assets/plugins/bootstrap/css/bootstrap.min.css" rel="stylesheet">
<link href="/pae/app/assets/plugins/fontawesome/css/all.min.css" rel="stylesheet">
<link href="/pae/app/assets/plugins/sweetalert2/sweetalert2.min.css" rel="stylesheet">
<link href="/pae/app/assets/plugins/datatables/dataTables.bootstrap5.min.css" rel="stylesheet">

<!-- JavaScript -->
<script src="/pae/app/assets/plugins/jquery/jquery.min.js"></script>
<script src="/pae/app/assets/plugins/datatables/jquery.dataTables.min.js"></script>
<script src="/pae/app/assets/plugins/datatables/dataTables.bootstrap5.min.js"></script>
<script src="/pae/app/assets/plugins/bootstrap/js/bootstrap.bundle.min.js"></script>
<script src="/pae/app/assets/plugins/sweetalert2/sweetalert2.all.min.js"></script>
```

### En `/landing/index.php`:
```html
<!-- CSS -->
<link href="assets/plugins/bootstrap/css/bootstrap.min.css" rel="stylesheet">
<link href="assets/plugins/fontawesome/css/all.min.css" rel="stylesheet">
<link href="assets/plugins/sweetalert2/sweetalert2.min.css" rel="stylesheet">

<!-- JavaScript -->
<script src="assets/plugins/bootstrap/js/bootstrap.bundle.min.js"></script>
<script src="assets/plugins/sweetalert2/sweetalert2.all.min.js"></script>
```

---

## 🧪 Verificación

### Verificar Bootstrap:
1. Abrir `/pae/app/` en el navegador
2. Verificar que los estilos se aplican correctamente
3. Probar un modal o dropdown

### Verificar DataTables:
1. Navegar a la vista de usuarios
2. Verificar que la tabla se inicializa
3. Verificar que el idioma está en español

### Verificar FontAwesome:
1. Verificar que los iconos se muestran correctamente
2. Revisar la consola del navegador (no debe haber errores 404)

### Verificar SweetAlert2:
1. Probar crear/editar un usuario
2. Verificar que las alertas se muestran correctamente

---

## 📝 Notas Importantes

1. **Rutas Absolutas:** Todos los archivos usan rutas absolutas desde `/pae/`
2. **Sin CDN:** Todos los plugins están localmente, no dependen de internet
3. **Duplicación:** Los plugins están en ambas carpetas (`/app` y `/landing`)
4. **Versiones:** Se usaron las versiones más recientes estables
5. **Idioma:** DataTables configurado en español con `es-ES.json`

---

## 🔄 Actualización Futura

Para actualizar un plugin:
1. Descargar la nueva versión
2. Reemplazar archivos en `/app/assets/plugins/[plugin]/`
3. Copiar a `/landing/assets/plugins/[plugin]/`
4. Limpiar caché del navegador

---

**Fin del Documento**  
*Generado: 31/01/2026 22:33*

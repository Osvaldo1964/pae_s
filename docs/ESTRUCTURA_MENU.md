# Estructura del Menú - PAE Control

**Actualizado:** 21 de Febrero de 2026, 00:00

## 🎯 Navegación por Rol

### Super Admin (role_id = 1)

```
📋 SIDEBAR
├── 🏠 Dashboard
├── 👥 Entorno
├── 🍽️ Cocina
├── ⚙️ Configuración ← Click aquí
│   └── 📦 Hub de Configuración
│       ├── 🔐 Roles y Permisos
│       ├── 🏢 Programas PAE ⭐ (Solo Super Admin)
│       └── 👤 Proveedores
└── 👥⚙️ Usuarios ⭐ (Standalone - Solo Super Admin)
```

**Características:**
- ✅ "Usuarios" aparece como ítem independiente en el sidebar
- ✅ "Programas PAE" aparece dentro de Configuración
- ✅ NO ve "Mi Equipo" en ningún lado

---

### Administrador PAE (role_id != 1 && pae_id)

```
📋 SIDEBAR
├── 🏠 Dashboard
├── 👥 Entorno
│   ├── 🏫 Instituciones Beneficiarias
│   └── 👨‍🎓 Beneficiarios
├── 🍽️ Cocina
│   └── 🥕 Ítems
├── 📊 Reportes
│   ├── 📅 Consumos (Reporte QR)
│   ├── 🥯 Alimentación (Hub)
│   ├── 💰 Financiero (Hub)
│   ├── 📋 Administrativos (Hub)
│   │   ├── 👥 Control de Asistencia
│   │   ├── 🪪 Impresión de Carnets
│   │   └── 📩 Bandeja de PQRs ⭐ (Nuevo)
│   └── 👥 Talento Humano (Hub)
│       ├── 💵 Nómina y Pagos
│       ├── 👔 Listado de Cargos
│       └── 🆔 Listado de Personal
└── ⚙️ Configuración ← Click aquí
    └── 📦 Hub de Configuración
        ├── 🔐 Roles y Permisos
        ├── 👤 Proveedores
        └── 👥 Mi Equipo ⭐ (Solo Admin PAE - Tarjeta Verde)
```

**Características:**
- ✅ NO ve "Usuarios" en el sidebar
- ✅ "Mi Equipo" aparece SOLO dentro de Configuración
- ✅ Tarjeta con borde verde para diferenciación visual
- ✅ NO puede ver al Super Admin en la lista

---

## 📊 Flujo de Navegación

### Para Super Admin

1. **Gestión Global de Usuarios:**
   ```
   Sidebar → "Usuarios" → DataTable con todos los usuarios
   ```

2. **Gestión de Programas PAE:**
   ```
   Sidebar → "Configuración" → Hub → "Programas PAE" → CRUD de PAEs
   ```

### Para Administrador PAE

1. **Gestión de Mi Equipo:**
   ```
   Sidebar → "Configuración" → Hub → "Mi Equipo" → DataTable con usuarios del PAE
   ```

---

## 🎨 Diferenciación Visual

### Tarjeta "Programas PAE" (Super Admin)
```html
<div class="card border-primary">
  <i class="fas fa-building text-primary"></i>
  <h5>Programas PAE</h5>
  <p>Gestión de entidades y operadores (Super Admin)</p>
  <a class="btn btn-outline-primary">Ingresar</a>
</div>
```
**Color:** Azul (Primary)

### Tarjeta "Mi Equipo" (Admin PAE)
```html
<div class="card border-success">
  <i class="fas fa-users text-success"></i>
  <h5>Mi Equipo</h5>
  <p>Gestión de miembros del equipo de trabajo</p>
  <a class="btn btn-outline-success">Ingresar</a>
</div>
```
**Color:** Verde (Success)

---

## 🔒 Matriz de Permisos

| Módulo | Super Admin | Admin PAE | Ubicación |
|--------|-------------|-----------|-----------|
| **Usuarios** | ✅ Ver/Crear/Editar/Eliminar | ❌ No visible | Sidebar (standalone) |
| **Programas PAE** | ✅ Ver/Crear/Editar/Eliminar | ❌ No visible | Configuración → Hub |
| **Mi Equipo** | ❌ No visible | ✅ Ver/Crear/Editar/Eliminar* | Configuración → Hub |
| **Consumos (QR)** | ✅ Ver/Imprimir | ✅ Ver/Imprimir | Reportes → Consumos |

*No puede eliminarse a sí mismo

---

## 🧪 Casos de Prueba

### ✅ Test 1: Super Admin accede a Configuración
**Pasos:**
1. Login como Super Admin
2. Click en "Configuración" en sidebar
3. Ver hub de Configuración

**Resultado Esperado:**
- ✅ Ve tarjeta "Programas PAE" (azul)
- ❌ NO ve tarjeta "Mi Equipo"

---

### ✅ Test 2: Admin PAE accede a Configuración
**Pasos:**
1. Login como Administrador PAE
2. Click en "Configuración" en sidebar
3. Ver hub de Configuración

**Resultado Esperado:**
- ✅ Ve tarjeta "Mi Equipo" (verde)
- ❌ NO ve tarjeta "Programas PAE"
- ❌ NO ve "Usuarios" en sidebar

---

### ✅ Test 3: Admin PAE intenta acceder a Usuarios
**Pasos:**
1. Login como Administrador PAE
2. Intentar navegar manualmente a `#users`

**Resultado Esperado:**
- ❌ No hay ítem en el menú
- ⚠️ Si accede por URL directa, el backend rechaza la petición (403)

---

## 📝 Notas de Implementación

### Código Clave en `app.js`

**Renderizado del Sidebar:**
```javascript
// Solo Super Admin ve "Usuarios"
if (App.state.user.role_id === 1) {
    sidebar.add("Usuarios");
}
```

**Renderizado del Hub de Configuración:**
```javascript
// Super Admin ve "Programas PAE"
if (group.name === 'Configuración' && user.role_id === 1) {
    cards.add("Programas PAE", "border-primary");
}

// Admin PAE ve "Mi Equipo"
if (group.name === 'Configuración' && user.role_id !== 1 && user.pae_id) {
    cards.add("Mi Equipo", "border-success");
}
```

---

## ✨ Ventajas de esta Estructura

1. **Claridad:** Cada rol tiene módulos específicos claramente identificados
2. **Seguridad:** Separación total de responsabilidades
3. **UX:** Nombres descriptivos ("Mi Equipo" vs "Usuarios")
4. **Visual:** Colores diferentes para fácil identificación
5. **Escalable:** Fácil agregar más módulos específicos por rol

---

## 🚀 Próximas Mejoras

- [ ] Agregar contador de miembros en tarjeta "Mi Equipo"
- [ ] Notificaciones cuando se agrega/elimina un miembro
- [ ] Historial de cambios en el equipo
- [ ] Exportar lista de equipo a PDF
- [ ] Roles personalizados por PAE

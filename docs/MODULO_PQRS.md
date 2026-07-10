# Módulo de PQRs (Peticiones, Quejas y Reclamos)

El módulo de PQRs permite la comunicación directa entre los ciudadanos y los administradores de los programas PAE, facilitando el reporte de incidencias y la resolución de solicitudes de manera organizada y trazable.

## 🚀 Funcionalidades Principales

### 1. Radicación Ciudadana (Público)
- **Ubicación:** Landing Page del sitio web.
- **Campos:** Selección de Programa (PAE), Tipo de Solicitud, Email de contacto y Mensaje.
- **Radicado:** Generación automática de número de radicado único para seguimiento.
- **Aislamiento:** Las solicitudes se dirigen automáticamente al `pae_id` correspondiente.

### 2. Notificaciones en Tiempo Real
- **Dashboard:** Icono de campana en la barra superior con badge rojo indicando el número de PQRs pendientes.
- **Polling:** Actualización automática cada 60 segundos sin necesidad de refrescar la página.
- **Acceso Rápido:** Al hacer clic en la campana, el sistema redirige directamente al módulo de gestión.

### 3. Bandeja de Gestión (Administrativo)
- **DataTable:** Listado completo de solicitudes recibidas para el programa actual.
- **Filtros:** Búsqueda por correo, tipo o mensaje.
- **Estados:** Pendiente, En Revisión, Respondida, Cerrada.

### 4. Resolución de Solicitudes
- **Modal de Respuesta:** Interfaz para que el administrador redacte la solución oficial.
- **Persistencia:** La respuesta se guarda en la base de datos vinculada al registro original.
- **Cierre:** Al marcar como "Respondida", el contador de notificaciones disminuye automáticamente.

---

## 🛠️ Detalles Técnicos

### Componentes Backend
- `PublicController.php`: Maneja la radicación pública y el conteo de notificaciones.
- `PqrController.php`: Gestiona el listado y la actualización administrativa (Requiere JWT).
- `api/utils/JWT.php`: Utilidad para decodificación y autorización basada en `pae_id`.

### Componentes Frontend
- `app/assets/js/views/pqrs.js`: Lógica de la tabla de gestión y modales.
- `app/assets/js/core/app.js`: Integración del polling y sistema de rutas.
- `landing/assets/php/process_pqr.php`: (Opcional) Script de procesamiento inicial si se usa fuera de la API. *Nota: Se recomienda usar el endpoint `/api/public/pqr`.*

### Estructura de Datos
**Tabla:** `pqrs`
- `id`: Identificador único (Radicado).
- `pae_id`: Vínculo con el programa específico.
- `type`: Categoría (Petición, Queja, Reclamo, Sugerencia).
- `email`: Contacto del remitente.
- `message`: Contenido de la solicitud.
- `response`: Respuesta oficial del administrador.
- `status`: Estado actual del trámite.
- `created_at`: Fecha y hora de radicación.

---

## 🔍 Flujo de Trabajo (E2E)

1. **Usuario Final:** Ingresa al Landing, selecciona el programa, escribe su duda y radica. Recibe un número de radicado.
2. **Administrador PAE:** Ve el número "1" en la campana de su Dashboard.
3. **Gestión:** Hace clic en la campana, abre la "Bandeja de PQRs", lee el mensaje y pulsa el botón de resolución.
4. **Cierre:** Escribe la respuesta, cambia el estado a "Respondida" y guarda. El contador de la campana vuelve a 0.

---
**Documentación Actualizada:** 26 de Marzo de 2026 (v1.9.15)
- ✅ **Resolución Directa**: Los administradores pueden responder y cerrar PQRs desde el panel administrativo.
- ✅ **Notificaciones**: Sistema de campana con actualización automática (Polling 60s).
- ✅ **Aislamiento**: Las PQRs están estrictamente ligadas al programa PAE correspondiente.

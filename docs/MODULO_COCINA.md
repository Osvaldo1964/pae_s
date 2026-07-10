# Módulo de Cocina - Implementación

## Resumen de Implementación

Se ha implementado el **Módulo de Cocina** completo siguiendo la **Resolución 0003 de 2026** del Programa de Alimentación Escolar (PAE).

### 📋 Componentes Implementados

#### 1. Base de Datos (`sql/09_kitchen_schema.sql`)

**Tablas Maestras:**
- `food_groups` - Grupos de alimentos (Cereales, Proteicos, Lácteos, Frutas, Verduras, Grasas, Azúcares, Condimentos, Bebidas)
- `measurement_units` - Unidades de medida (kg, g, L, ml, und, lb)

**Tabla Principal de Ítems:**
- `items` - Insumos/Ingredientes con:
  - Información básica (código, nombre, descripción, grupo, unidad)
  - **Factor de Rendimiento** (peso bruto, peso neto, % desperdicio)
  - **Información Nutricional completa** (calorías, proteínas, carbohidratos, grasas, fibra, hierro, calcio, sodio, vitaminas A y C)
  - **Alérgenos** (gluten, lactosa, maní, mariscos, huevo, soya)
  - **Compra Local** (Ley 2046 - 30% compra local)
  - **Trazabilidad** (registro sanitario, refrigeración, vida útil)
  - **Costos** (costo unitario, última compra)

**Tablas para Minutas (Preparadas para futura implementación):**
- `menu_cycles` - Ciclos de menús (típicamente 20 días)
- `menus` - Minutas diarias con derivación etárea
- `menu_items` - Composición de minutas (explosión de víveres)
- `nutritional_parameters` - Parámetros nutricionales por edad y tipo de comida

#### 2. Backend API (`api/controllers/ItemController.php`)

**Endpoints Implementados:**
- `GET /api/items` - Listar todos los ítems del PAE
- `GET /api/items/{id}` - Obtener un ítem específico
- `POST /api/items` - Crear nuevo ítem
- `PUT /api/items/{id}` - Actualizar ítem
- `DELETE /api/items/{id}` - Eliminar ítem
- `GET /api/items/food-groups` - Obtener grupos de alimentos
- `GET /api/items/measurement-units` - Obtener unidades de medida

**Características:**
- Multitenancy (aislamiento por `pae_id`)
- Autenticación JWT
- Normalización automática (nombres en MAYÚSCULAS)
- Cálculo automático de % de desperdicio
- Validación de duplicados
- Manejo de alérgenos y compra local

#### 3. Frontend (`app/assets/js/views/items.js`)

**Interfaz de Usuario:**
- **DataTable** con filtros por:
  - Grupo de alimento
  - Compra local
  - Estado (Activo/Inactivo)
- **Modal Multi-Pestaña** con 4 secciones:
  1. **Información Básica** - Nombre, código, grupo, unidad, factores de rendimiento
  2. **Información Nutricional** - Todos los macronutrientes y micronutrientes
  3. **Alérgenos** - Switches para marcar alérgenos presentes
  4. **Logística y Costos** - Compra local, registro sanitario, costos, refrigeración

**Funcionalidades:**
- Cálculo automático de % desperdicio
- Validación de campos obligatorios
- Badges de colores por grupo de alimento
- Indicadores visuales de compra local
- CRUD completo con confirmaciones

#### 4. Recetario Maestro (Estandarización) ⭐ NUEVO

**Base de Datos (`sql/16_recipes_schema.sql`):**
- `recipes`: Platos maestros con totales nutricionales pre-calculados.
- `recipe_items`: Composición detallada (ingredientes y cantidades patrón).
- `cycle_templates`: Estructuras de ciclos de 20 días.
- `cycle_template_days`: Mapeo de recetas a días y momentos de consumo.

**Backend API (`api/controllers/RecipeController.php`):**
- CRUD completo (`index`, `show`, `store`, `update`, `delete`).
- **Motor de Recalculación Nutricional:** Suma automática de nutrientes (calorías, proteínas, carbohidratos, grasas) basada en ingredientes (base 100g).
- Auto-corrección de datos "viva" al consultar la receta.

**Frontend (`app/assets/js/views/recetario.js`):**
- **Interfaz Compacta:** Grid de 4 columnas con fuentes optimizadas.
- **Scroll Interno:** Contenedor con scroll independiente para escalar a cientos de recetas.
- **Modales Dinámicos:** Creación y edición con carga automática de ingredientes.
- **Visualización Rápida:** 3 indicadores nutricionales clave en la tarjeta del plato.

#### 5. Módulo de Minutas y Ciclos ⭐ IMPLEMENTADO
 
 **Backend (`api/controllers/MenuCycleController.php`):**
 - **Generación Flexible:** Motor de calendario que permite ciclos de cualquier duración (no solo 20 días).
 - **Selector Granular:** El usuario define exactamente qué fechas incluyen alimentación via UI.
 - **Manejo de Festivos:** Exclusión automática de fines de semana y personalización manual de días hábiles.
 - **Integración:** Vincula plantillas maestras con fechas reales, calculando requerimientos automáticamente.
 
 **Frontend (`app/assets/js/views/minutas.js`):**
 - **Modal Interactivo:** Calendario visual para selección de rango y días específicos.
 - **Visualización:** Pestañas para Ciclos Activos vs Plantillas.
 - **Reportes:** Generación directa de explosión de insumos y minutas por sede.
 
 ### 🎯 Cumplimiento Normativo
 
 #### Resolución 0003 de 2026
 
 ✅ **Clasificación por Grupo de Alimento** - Implementada con 9 categorías legales  
 ✅ **Factor de Rendimiento** - Peso bruto vs neto con cálculo automático de desperdicio  
 ✅ **Compra Local (Ley 2046)** - Campo booleano con productor local  
 ✅ **Trazabilidad** - Registro sanitario, lote, vencimiento  
 ✅ **Información Nutricional Completa** - Por 100g/100ml  
 ✅ **Control de Alérgenos** - 6 alérgenos principales  
 ✅ **Control de Sodio** - Para ultraprocesados  
 ✅ **Ciclos de Menú** - Adaptables a calendario escolar real
 
 ### 📊 Estructura de Datos de Ejemplo
 
 **Ítem: Pechuga de Pollo**
 ```
 Nombre: PECHUGA DE POLLO
 Grupo: Proteicos
 Unidad: Kilogramos
 Peso Bruto: 100g
 Peso Neto: 80g
 % Desperdicio: 20% (hueso/piel)
 Calorías: 165 kcal
 Proteínas: 31g
 Sodio: 74mg
 Compra Local: Sí
 Productor: Avícola Santa Marta SAS
 ```
 
 ### 🔄 Próximos Pasos
 
 1. **Almacén** - Gestión de inventarios (Completado en Módulo Almacén)
 
 2. **Novedades y Entregas** - Registro de asistencia y consumo.
 
 3. **Integración SIMAT** - Sincronización automática de matrícula.
 
 ### ⚖️ Conversión Automática de Unidades
 El sistema ahora maneja automáticamente la conversión entre las **Cantidades Patrón** de la receta y las **Unidades de Almacén**:
 - **Recetas:** Se configuran siempre en la unidad mínima (Gramos para peso, Mililitros para volumen).
 - **Almacén:** Puede usar Kilogramos (KG), Litros (L) o Libras (LB).
 - **Lógica:** Al aprobar un ciclo, el sistema utiliza el `conversion_factor` de la tabla `measurement_units` para generar proyecciones de compra correctas (ej: 50,000g se proyectan como 50kg).


### 📁 Archivos Creados

```
sql/
  └── 09_kitchen_schema.sql

api/controllers/
  └── ItemController.php

app/assets/js/views/
  └── items.js
```

### 🚀 Cómo Usar

1. **Ejecutar el esquema SQL:**
   ```sql
   SOURCE c:/xampp/htdocs/pae/sql/09_kitchen_schema.sql
   ```

2. **Acceder al módulo:**
   - El módulo debe estar registrado en el menú del sistema
   - Ruta: `#module/items`

3. **Crear un ítem:**
   - Click en "Nuevo Ítem"
   - Completar las 4 pestañas
   - El sistema calcula automáticamente el % de desperdicio

### 🔐 Seguridad

- Todos los endpoints requieren autenticación JWT
- Aislamiento por PAE (multitenancy)
- Validación de permisos
- Protección contra SQL injection (PDO prepared statements)

### 📈 Métricas

- **Tablas creadas:** 7
- **Campos en tabla items:** 35+
- **Endpoints API:** 7
- **Líneas de código backend:** ~500
- **Líneas de código frontend:** ~650

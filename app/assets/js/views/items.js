/**
 * Items Module - Kitchen Ingredients Management
 * Resolution 0003 of 2026 Compliance
 */

// Use window.ItemsView to allow re-loading the script without "already declared" errors
window.ItemsView = {
    foodGroups: [],
    measurementUnits: [],
    currentItem: null,

    async init() {
        console.log('Initializing Items Module...');
        await this.loadMasterData();
        this.render();
        this.attachEvents();
        await this.loadItems();
    },

    async loadMasterData() {
        try {
            // Load Food Groups
            const groupsResponse = await Helper.fetchAPI('/items/food-groups');
            if (groupsResponse.success) {
                this.foodGroups = groupsResponse.data;
            }

            // Load Measurement Units
            const unitsResponse = await Helper.fetchAPI('/items/measurement-units');
            if (unitsResponse.success) {
                this.measurementUnits = unitsResponse.data;
            }
        } catch (error) {
            console.error('Error loading master data:', error);
            Helper.alert('error', '');
        }
    },

    render() {
        const html = `
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-carrot me-2"></i>Insumos de Cocina</h2>
                        <p class="text-muted mb-0">Gestión de insumos e ingredientes (Resolución 0003 de 2026)</p>
                    </div>
                    <button class="btn btn-success" onclick="ItemsView.openModal()">
                        <i class="fas fa-plus me-2"></i>Nuevo Insumo
                    </button>
                </div>

                <!-- Filters Card -->
                <div class="card shadow-sm mb-3">
                    <div class="card-body py-2">
                        <div class="row g-2 align-items-center">
                            <div class="col-md-3">
                                <select class="form-select form-select-sm" id="filter-food-group">
                                    <option value="">Todos los Grupos</option>
                                    ${this.foodGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select class="form-select form-select-sm" id="filter-local">
                                    <option value="">Todos</option>
                                    <option value="1">Compra Local</option>
                                    <option value="0">No Local</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select class="form-select form-select-sm" id="filter-status">
                                    <option value="">Todos los Estados</option>
                                    <option value="ACTIVO">Activos</option>
                                    <option value="INACTIVO">Inactivos</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-sm btn-outline-secondary w-100" onclick="ItemsView.clearFilters()">
                                    <i class="fas fa-times me-1"></i>Limpiar Filtros
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Items Table -->
                <div class="card shadow-sm">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table id="items-table" class="table table-hover table-sm">
                                <thead class="table-light">
                                    <tr>
                                        <th>Código</th>
                                        <th>Nombre</th>
                                        <th>Grupo</th>
                                        <th>Unidad</th>
                                        <th>% Desperdicio</th>
                                        <th>Calorías</th>
                                        <th>Proteínas (g)</th>
                                        <th>Compra Local</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Item Modal -->
            <div class="modal fade" id="itemModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-carrot me-2"></i><span id="modal-title">Nuevo Insumo</span>
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <!-- Tabs -->
                            <ul class="nav nav-tabs mb-3" id="itemTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="basic-tab" data-bs-toggle="tab" data-bs-target="#basic" type="button">
                                        <i class="fas fa-info-circle me-1"></i>Información Básica
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="nutrition-tab" data-bs-toggle="tab" data-bs-target="#nutrition" type="button">
                                        <i class="fas fa-apple-alt me-1"></i>Información Nutricional
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="allergens-tab" data-bs-toggle="tab" data-bs-target="#allergens" type="button">
                                        <i class="fas fa-exclamation-triangle me-1"></i>Alérgenos
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="logistics-tab" data-bs-toggle="tab" data-bs-target="#logistics" type="button">
                                        <i class="fas fa-truck me-1"></i>Logística y Costos
                                    </button>
                                </li>
                            </ul>

                            <form id="itemForm">
                                <div class="tab-content" id="itemTabContent">
                                    <!-- Tab 1: Basic Info -->
                                    <div class="tab-pane fade show active" id="basic" role="tabpanel">
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Nombre del Insumo <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" name="name" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Código</label>
                                                <input type="text" class="form-control" name="code" placeholder="Auto-generado">
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Estado</label>
                                                <select class="form-select" name="status">
                                                    <option value="ACTIVO">Activo</option>
                                                    <option value="INACTIVO">Inactivo</option>
                                                </select>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Grupo de Alimento <span class="text-danger">*</span></label>
                                                <select class="form-select" name="food_group_id" required>
                                                    <option value="">Seleccionar...</option>
                                                    ${this.foodGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                                                </select>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Unidad de Medida <span class="text-danger">*</span></label>
                                                <select class="form-select" name="measurement_unit_id" required>
                                                    <option value="">Seleccionar...</option>
                                                    ${this.measurementUnits.map(u => `<option value="${u.id}">${u.name} (${u.abbreviation})</option>`).join('')}
                                                </select>
                                            </div>
                                            <div class="col-12">
                                                <label class="form-label">Descripción</label>
                                                <textarea class="form-control" name="description" rows="2"></textarea>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Peso Bruto (g)</label>
                                                <input type="text" class="form-control text-end" name="gross_weight" value="100.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2); ItemsView.calculateWaste()">
                                                <small class="text-muted">Como se compra</small>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Peso Neto (g)</label>
                                                <input type="text" class="form-control text-end" name="net_weight" value="100.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2); ItemsView.calculateWaste()">
                                                <small class="text-muted">Después de limpiar</small>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">% Desperdicio</label>
                                                <input type="text" class="form-control text-end" name="waste_percentage" value="0.00" readonly>
                                                <small class="text-muted">Calculado automáticamente</small>
                                            </div>
                                        </div>
                                    </div>
...
                                    <!-- Tab 2: Nutrition -->
                                    <div class="tab-pane fade" id="nutrition" role="tabpanel">
                                        <p class="text-muted mb-3"><i class="fas fa-info-circle me-1"></i>Valores por 100g o 100ml del producto</p>
                                        <div class="row g-3">
                                            <div class="col-md-3">
                                                <label class="form-label">Calorías (kcal)</label>
                                                <input type="text" class="form-control text-end" name="calories" value="0.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2)">
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Proteínas (g)</label>
                                                <input type="text" class="form-control text-end" name="proteins" value="0.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2)">
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Carbohidratos (g)</label>
                                                <input type="text" class="form-control text-end" name="carbohydrates" value="0.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2)">
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Grasas (g)</label>
                                                <input type="text" class="form-control text-end" name="fats" value="0.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2)">
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Fibra (g)</label>
                                                <input type="text" class="form-control text-end" name="fiber" value="0.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2)">
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Hierro (mg)</label>
                                                <input type="text" class="form-control text-end" name="iron" value="0.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2)">
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Calcio (mg)</label>
                                                <input type="text" class="form-control text-end" name="calcium" value="0.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2)">
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Sodio (mg)</label>
                                                <input type="text" class="form-control text-end" name="sodium" value="0.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2)">
                                                <small class="text-muted">Control ultraprocesados</small>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Vitamina A (µg)</label>
                                                <input type="text" class="form-control text-end" name="vitamin_a" value="0.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2)">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Vitamina C (mg)</label>
                                                <input type="text" class="form-control text-end" name="vitamin_c" value="0.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2)">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Tab 3: Allergens -->
                                    <div class="tab-pane fade" id="allergens" role="tabpanel">
                                        <p class="text-muted mb-3"><i class="fas fa-exclamation-triangle me-1"></i>Marque los alérgenos presentes en este ítem</p>
                                        <div class="row g-3">
                                            <div class="col-md-4">
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" name="contains_gluten" id="gluten">
                                                    <label class="form-check-label" for="gluten">
                                                        <i class="fas fa-bread-slice me-1"></i>Contiene Gluten
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" name="contains_lactose" id="lactose">
                                                    <label class="form-check-label" for="lactose">
                                                        <i class="fas fa-cheese me-1"></i>Contiene Lactosa
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" name="contains_peanuts" id="peanuts">
                                                    <label class="form-check-label" for="peanuts">
                                                        <i class="fas fa-seedling me-1"></i>Contiene Maní
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" name="contains_seafood" id="seafood">
                                                    <label class="form-check-label" for="seafood">
                                                        <i class="fas fa-fish me-1"></i>Contiene Mariscos
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" name="contains_eggs" id="eggs">
                                                    <label class="form-check-label" for="eggs">
                                                        <i class="fas fa-egg me-1"></i>Contiene Huevo
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <div class="form-check form-switch">
                                                    <input class="form-check-input" type="checkbox" name="contains_soy" id="soy">
                                                    <label class="form-check-label" for="soy">
                                                        <i class="fas fa-leaf me-1"></i>Contiene Soya
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Tab 4: Logistics -->
                                    <div class="tab-pane fade" id="logistics" role="tabpanel">
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <div class="form-check form-switch mb-3">
                                                    <input class="form-check-input" type="checkbox" name="is_local_purchase" id="local-purchase" onchange="ItemsView.toggleLocalProducer()">
                                                    <label class="form-check-label" for="local-purchase">
                                                        <i class="fas fa-map-marker-alt me-1"></i>Compra Local (Ley 2046 - 30%)
                                                    </label>
                                                </div>
                                                <input type="text" class="form-control" name="local_producer" placeholder="Nombre del productor local" disabled id="local-producer-input">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Registro Sanitario (RSA/RSNV)</label>
                                                <input type="text" class="form-control" name="sanitary_registry" placeholder="Ej: RSA-123456">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Costo Unitario ($)</label>
                                                <input type="text" class="form-control text-end" name="unit_cost" value="0.00" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 2)">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Vida Útil (días)</label>
                                                <input type="text" class="form-control text-end" name="shelf_life_days" placeholder="Ej: 30" 
                                                       onfocus="ItemsView.unformatInput(this)" onblur="ItemsView.formatInput(this, 0)">
                                            </div>
                                            <div class="col-md-4">
                                                <div class="form-check form-switch mt-2">
                                                    <input class="form-check-input" type="checkbox" name="requires_refrigeration" id="refrigeration">
                                                    <label class="form-check-label" for="refrigeration">
                                                        <i class="fas fa-snowflake text-info me-1"></i>Requiere Refrigeración
                                                    </label>
                                                </div>
                                                <div class="form-check form-switch mt-2">
                                                    <input class="form-check-input" type="checkbox" name="is_perishable" id="perishable">
                                                    <label class="form-check-label" for="perishable">
                                                        <i class="fas fa-clock text-danger me-1"></i>Es Perecedero
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-success" onclick="ItemsView.saveItem()">
                                <i class="fas fa-save me-2"></i>Guardar Insumo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app').innerHTML = html;
    },

    attachEvents() {
        // Filter events
        $('#filter-food-group, #filter-local, #filter-status').on('change', () => {
            this.applyFilters();
        });

        // Sidebar toggle
        $('#sidebar-toggle').on('click', function () {
            $('#sidebar').toggleClass('d-none');
        });
    },

    async loadItems() {
        try {
            const response = await Helper.fetchAPI('/items');
            if (response.success) {
                this.renderTable(response.data);
            }
        } catch (error) {
            console.error('Error loading items:', error);
            Helper.alert('error', '');
        }
    },

    renderTable(items) {
        this.dataTable = Helper.initDataTable('#items-table', {
            data: items,
            columns: [
                { data: 'code' },
                {
                    data: 'name',
                    render: (data, type, row) => {
                        let html = `<strong>${data}</strong>`;
                        if (row.is_perishable == 1) {
                            html += ` <i class="fas fa-clock text-danger ms-1" title="Perecedero"></i>`;
                        }
                        if (row.requires_refrigeration == 1) {
                            html += ` <i class="fas fa-snowflake text-info ms-1" title="Refrigerado"></i>`;
                        }
                        return html;
                    }
                },
                {
                    data: 'food_group_name',
                    render: (data, type, row) => {
                        return `<span class="badge" style="background-color: ${row.food_group_color}">${data}</span>`;
                    }
                },
                {
                    data: 'unit_abbr',
                    render: (data) => `<span class="badge bg-secondary">${data}</span>`
                },
                {
                    data: 'waste_percentage',
                    render: (data) => `${parseFloat(data).toFixed(2)}%`
                },
                {
                    data: 'calories',
                    render: (data) => `${parseFloat(data).toFixed(0)} kcal`
                },
                {
                    data: 'proteins',
                    render: (data) => `${parseFloat(data).toFixed(1)}g`
                },
                {
                    data: 'is_local_purchase',
                    render: (data) => data == 1 ? '<span class="badge bg-success"><i class="fas fa-check"></i> Sí</span>' : '<span class="badge bg-secondary">No</span>'
                },
                {
                    data: 'status',
                    render: (data) => data === 'ACTIVO' ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>'
                },
                {
                    data: null,
                    orderable: false,
                    render: (data, type, row) => {
                        return `
                            <button class="btn btn-sm btn-primary" onclick="ItemsView.editItem(${row.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="ItemsView.deleteItem(${row.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        `;
                    }
                }
            ],
            order: [[1, 'asc']],
            pageLength: 25
        });
    },

    applyFilters() {
        const foodGroupId = $('#filter-food-group').val();
        const local = $('#filter-local').val();
        const status = $('#filter-status').val();

        // Buscar por nombre del grupo, no por ID
        let foodGroupName = '';
        if (foodGroupId) {
            const group = this.foodGroups.find(g => g.id == foodGroupId);
            foodGroupName = group ? group.name : '';
        }

        this.dataTable.columns(2).search(foodGroupName).draw();
        this.dataTable.columns(7).search(local ? (local === '1' ? 'Sí' : 'No') : '').draw();
        this.dataTable.columns(8).search(status).draw();
    },

    clearFilters() {
        $('#filter-food-group, #filter-local, #filter-status').val('');
        this.dataTable.search('').columns().search('').draw();
    },

    openModal(item = null) {
        this.currentItem = item;
        const modal = new bootstrap.Modal(document.getElementById('itemModal'));

        if (item) {
            document.getElementById('modal-title').textContent = 'Editar Insumo';
            document.querySelector('#itemModal .modal-header').classList.remove('bg-success');
            document.querySelector('#itemModal .modal-header').classList.add('bg-primary');
            this.fillForm(item);
        } else {
            document.getElementById('modal-title').textContent = 'Nuevo Insumo';
            document.querySelector('#itemModal .modal-header').classList.remove('bg-primary');
            document.querySelector('#itemModal .modal-header').classList.add('bg-success');
            document.getElementById('itemForm').reset();
        }

        modal.show();
    },

    async editItem(id) {
        try {
            const response = await Helper.fetchAPI(`/items/${id}`);
            if (response.success) {
                this.openModal(response.data);
            }
        } catch (error) {
            console.error('Error loading item:', error);
            Helper.alert('error', '');
        }
    },

    fillForm(item) {
        const form = document.getElementById('itemForm');
        Object.keys(item).forEach(key => {
            const input = form.elements[key];
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = item[key] == 1;
                } else {
                    input.value = item[key] || '';
                }
            }
        });

        // Toggle local producer field
        this.toggleLocalProducer();
    },

    calculateWaste() {
        const grossWeight = parseFloat(document.querySelector('[name="gross_weight"]').value) || 100;
        const netWeight = parseFloat(document.querySelector('[name="net_weight"]').value) || 100;
        const wastePercentage = ((grossWeight - netWeight) / grossWeight) * 100;
        document.querySelector('[name="waste_percentage"]').value = wastePercentage.toFixed(2);
    },

    toggleLocalProducer() {
        const checkbox = document.getElementById('local-purchase');
        const input = document.getElementById('local-producer-input');
        input.disabled = !checkbox.checked;
        if (!checkbox.checked) {
            input.value = '';
        }
    },

    async saveItem() {
        const form = document.getElementById('itemForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            if (form.elements[key].type === 'checkbox') {
                data[key] = form.elements[key].checked;
            } else {
                // Strip commas from potentially numeric fields
                const numericFields = [
                    'gross_weight', 'net_weight', 'calories', 'proteins',
                    'carbohydrates', 'fats', 'fiber', 'iron', 'calcium',
                    'sodium', 'vitamin_a', 'vitamin_c', 'unit_cost', 'shelf_life_days',
                    'is_local_purchase', 'requires_refrigeration', 'is_perishable'
                ];
                if (numericFields.includes(key)) {
                    data[key] = value.replace(/,/g, '');
                } else if (key === 'code' && !value.trim()) {
                    data[key] = null;
                } else {
                    data[key] = typeof value === 'string' ? value.trim() : value;
                }
            }
        });

        try {
            let response;
            if (this.currentItem) {
                response = await Helper.fetchAPI(`/items/${this.currentItem.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
            } else {
                response = await Helper.fetchAPI('/items', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            }

            if (response.success) {
                Helper.alert('success', response.message);
                bootstrap.Modal.getInstance(document.getElementById('itemModal')).hide();
                await this.loadItems();
            } else {
                Helper.alert('error', response.message);
            }
        } catch (error) {
            console.error('Error saving item:', error);
            Helper.alert('error', 'Error al procesar la solicitud');
        }
    },

    async deleteItem(id) {
        const result = await Swal.fire({
            title: '¿Eliminar insumo?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const response = await Helper.fetchAPI(`/items/${id}`, { method: 'DELETE' });
                if (response.success) {
                    Helper.alert(response.message, 'success');
                    await this.loadItems();
                } else {
                    Helper.alert(response.message, 'error');
                }
            } catch (error) {
                console.error('Error deleting item:', error);
                Helper.alert('error', '');
            }
        }
    },

    unformatInput(input) {
        let val = input.value;
        val = val.replace(/,/g, '');
        input.value = val;
        input.select();
    },

    formatInput(input, decimals = 2) {
        let val = input.value;
        val = val.replace(/[^0-9.]/g, '');
        if (val === '') return;

        const num = parseFloat(val);
        if (!isNaN(num)) {
            input.value = new Intl.NumberFormat('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(num);
        }
    }
};

// Initialize when view is loaded
if (typeof ItemsView !== 'undefined') {
    ItemsView.init();
}

/**
 * Almacen View - Warehouse & Inventory Module
 * Refined and Functional Version
 */

window.AlmacenView = {
    inventory: [],
    movements: [],
    suppliers: [],
    cycles: [],
    searchTerm: '',

    async init() {
        console.log('Initializing Almacen Module...');
        await this.loadData();
        this.render();
        this.attachEvents();
    },

    async loadData() {
        try {
            const [invRes, movRes, supRes, cycRes] = await Promise.all([
                Helper.fetchAPI('/inventory'),
                Helper.fetchAPI('/movements'),
                Helper.fetchAPI('/proveedores'),
                Helper.fetchAPI('/cycles')
            ]);

            this.inventory = invRes.success ? (invRes.data || []) : [];
            this.movements = movRes.success ? (movRes.data || []) : [];
            this.suppliers = supRes || []; // Suppliers returns array directly
            this.cycles = cycRes.success ? (cycRes.data || []) : [];
        } catch (error) {
            console.error('Error loading warehouse data:', error);
        }
    },

    render() {
        const lowStockCount = this.inventory.filter(i => parseFloat(i.stock) <= parseFloat(i.minimum_stock)).length;
        const totalValue = this.inventory.reduce((sum, item) => sum + (parseFloat(item.stock) * parseFloat(item.unit_cost || 0)), 0);

        const html = `
            <div class="container-fluid py-4">
                <!-- Dashboard de Inventario -->
                <div class="row g-3 mb-4">
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm bg-primary text-white p-3 h-100">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="small text-uppercase mb-1 opacity-75">Total Ítems</h6>
                                    <h3 class="mb-0">${this.inventory.length}</h3>
                                </div>
                                <div class="icon big opacity-50 text-white">
                                    <i class="fas fa-boxes fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm ${lowStockCount > 0 ? 'bg-danger' : 'bg-success'} text-white p-3 h-100">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="small text-uppercase mb-1 opacity-75">Stock Crítico</h6>
                                    <h3 class="mb-0">${lowStockCount}</h3>
                                </div>
                                <div class="icon big opacity-50 text-white">
                                    <i class="fas fa-exclamation-triangle fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm bg-info text-white p-3 h-100">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="small text-uppercase mb-1 opacity-75">Entradas (Mes)</h6>
                                    <h3 class="mb-0">${this.movements.filter(m => m.movement_type === 'ENTRADA').length}</h3>
                                </div>
                                <div class="icon big opacity-50 text-white">
                                    <i class="fas fa-file-import fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm bg-dark text-white p-3 h-100">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="small text-uppercase mb-1 opacity-75">Valor Inventario</h6>
                                    <h3 class="mb-0 overflow-hidden text-nowrap" title="${Helper.formatCurrency(totalValue)}">${Helper.formatCurrency(totalValue)}</h3>
                                </div>
                                <div class="icon big opacity-50 text-white">
                                    <i class="fas fa-dollar-sign fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tabs y Acciones -->
                <div class="card shadow-sm border-0">
                    <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                        <ul class="nav nav-tabs card-header-tabs border-0" id="warehouseTabs">
                            <li class="nav-item">
                                <a class="nav-link active fw-bold" data-bs-toggle="tab" href="#tab-stock">Existencias</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link fw-bold" data-bs-toggle="tab" href="#tab-movements">Movimientos</a>
                            </li>
                        </ul>
                        <div class="actions d-flex gap-2 align-items-center">
                            <div class="input-group input-group-sm" style="width: 250px;">
                                <span class="input-group-text bg-white border-end-0"><i class="fas fa-search text-muted"></i></span>
                                <input type="text" class="form-control border-start-0 ps-0" placeholder="Buscar ítem, código o grupo..." onkeyup="AlmacenView.handleSearch(event)">
                            </div>
                            <button class="btn btn-outline-dark btn-sm text-nowrap" onclick="AlmacenView.printBlindCount()">
                                <i class="fas fa-print me-1"></i> Planilla
                            </button>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="tab-content">
                            <!-- TAB EXISTENCIAS -->
                            <div class="tab-pane fade show active" id="tab-stock">
                                <div class="table-responsive" style="max-height: 600px; overflow-y: auto;">
                                    <table class="table table-hover align-middle mb-0" id="stockTable">
                                        <thead class="bg-light sticky-top" style="z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                            <tr>
                                                <th class="ps-4">Item</th>
                                                <th>Grupo</th>
                                                <th class="text-center">Stock Actual</th>
                                                <th>Unidad</th>
                                                <th class="text-end">Costo Unit.</th>
                                                <th class="text-end">Valor Total</th>
                                                <th>Mínimo</th>
                                                <th>Estado</th>
                                                <th class="text-end pe-4">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${this.renderStockTable()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <!-- TAB MOVIMIENTOS -->
                            <div class="tab-pane fade" id="tab-movements">
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0">
                                        <thead class="bg-light">
                                            <tr>
                                                <th class="ps-4">Fecha</th>
                                                <th>Tipo</th>
                                                <th>Referencia</th>
                                                <th>Proveedor</th>
                                                <th>Usuario</th>
                                                <th class="text-end pe-4">Detalle</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${this.renderMovementsTable()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = html;
        } else {
            console.error('App container not found');
        }
        // Initialize simple tooltips if using BS5
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[title]'))
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl)
        });

        this.initDataTable();

        // Si la ruta activa es devoluciones, cambiar a la pestaña de Devoluciones
        if (window.location.hash.includes('devoluciones')) {
            const devTabBtn = document.querySelector('button[data-bs-target="#tab-devoluciones"]');
            if (devTabBtn) {
                const tab = new bootstrap.Tab(devTabBtn);
                tab.show();
            }
        }
    },

    renderStockTable() {
        const term = this.searchTerm ? this.searchTerm.toLowerCase() : '';

        const filtered = this.inventory.filter(item =>
            item.name.toLowerCase().includes(term) ||
            item.code.toLowerCase().includes(term) ||
            item.food_group.toLowerCase().includes(term)
        );

        if (filtered.length === 0) return '<tr><td colspan="8" class="text-center py-5 text-muted"><i class="fas fa-search fa-2x mb-3 d-block opacity-50"></i>No se encontraron resultados</td></tr>';

        return filtered.map(item => {
            const isLow = parseFloat(item.stock) <= parseFloat(item.minimum_stock);
            return `
                <tr>
                    <td class="ps-4">
                        <div class="fw-bold text-primary">
                            ${item.name}
                            ${item.is_perishable == 1 ? '<i class="fas fa-clock text-danger ms-1" title="Perecedero"></i>' : ''}
                            ${item.requires_refrigeration == 1 ? '<i class="fas fa-snowflake text-info ms-1" title="Refrigerado"></i>' : ''}
                        </div>
                        <small class="text-muted">${item.code}</small>
                    </td>
                    <td><span class="badge bg-light text-dark border">${item.food_group}</span></td>
                    <td class="text-center fw-bold fs-5">${Helper.formatNumber(item.stock, 3)}</td>
                    <td>${item.unit}</td>
                    <td class="text-end text-muted">${Helper.formatCurrency(item.unit_cost || 0)}</td>
                    <td class="text-end fw-bold text-dark">${Helper.formatCurrency((parseFloat(item.stock) || 0) * (parseFloat(item.unit_cost) || 0))}</td>
                    <td class="text-muted">${Helper.formatNumber(item.minimum_stock, 3)}</td>
                    <td>
                        <span class="badge ${isLow ? 'bg-danger' : 'bg-success'} rounded-pill">
                            ${isLow ? 'ALERTA STOCK' : 'OK'}
                        </span>
                    </td>
                    <td class="text-end pe-4">
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-secondary" title="Ver Historial" onclick="AlmacenView.viewKardex(${item.item_id})">
                                <i class="fas fa-history"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary" title="Editar Stock" onclick="AlmacenView.editItemStock(${item.item_id})">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderMovementsTable() {
        if (this.movements.length === 0) return '<tr><td colspan="6" class="text-center py-4 text-muted">No hay movimientos registrados</td></tr>';

        return this.movements.map(m => `
            <tr>
                <td class="ps-4">${m.movement_date}</td>
                <td>
                    <span class="badge ${m.movement_type === 'ENTRADA' ? 'bg-success' : 'bg-danger'}">
                        ${m.movement_type}
                    </span>
                </td>
                <td><small class="fw-bold">${m.reference_number || '-'}</small></td>
                <td>${m.supplier_name || 'N/A'}</td>
                <td>${m.user_name}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light border" onclick="AlmacenView.viewMovementDetail(${m.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    renderReturnsTable() {
        const returns = this.movements.filter(m => m.movement_type === 'DEVOLUCION_SEDE' || (m.reference_number && m.reference_number.startsWith('DEV-')));

        if (returns.length === 0) return '<tr><td colspan="5" class="text-center py-4 text-muted">No hay devoluciones registradas</td></tr>';

        return returns.map(r => {
            const branchName = r.branch_name || (r.notes ? r.notes.split('|')[0].replace('Devolución desde Sede: ', '').trim() : 'Sede Desconocida');
            return `
            <tr>
                <td class="ps-4">${r.movement_date}</td>
                <td><span class="badge bg-danger me-2">Devolución</span> ${branchName}</td>
                <td>${r.cycle_id ? 'Ciclo ' + r.cycle_id : 'N/A'}</td>
                <td>${r.user_name}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light border" onclick="AlmacenView.viewMovementDetail(${r.id})" title="Ver Detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    },

    initDataTable() {
        // En un app real usaríamos DataTables.net aquí.
        console.log('DataTable initialized');
    },

    attachEvents() {
        // Eventos delegados si es necesario
    },

    async openReturnModal() {
        // Fetch branches for the modal
        let branches = [];
        try {
            const res = await Helper.fetchAPI('/branches');
            if (res.success) branches = res.data;
        } catch (e) {
            console.error('Error fetching branches', e);
        }

        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'returnModal';
        modalDiv.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title"><i class="fas fa-undo me-2"></i>Registrar Devolución de Sede</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form id="return-form">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Sede Educativa</label>
                                    <select class="form-select" name="branch_id" required>
                                        <option value="">Seleccione Sede...</option>
                                        ${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Ciclo</label>
                                    <select class="form-select" name="cycle_id" required>
                                        <option value="">Seleccione Ciclo...</option>
                                        ${this.cycles.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                                    </select>
                                </div>
                                
                                <div class="col-12 mt-4">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="mb-0 fw-bold">Ítems a Devolver</h6>
                                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="AlmacenView.addReturnItemRow()">
                                            <i class="fas fa-plus me-1"></i> Añadir Ítem
                                        </button>
                                    </div>
                                    <div class="table-responsive border rounded">
                                        <table class="table table-sm mb-0">
                                            <thead class="bg-light">
                                                <tr>
                                                    <th>Ítem</th>
                                                    <th style="width: 20%" class="text-end">Cantidad</th>
                                                    <th style="width: 30%">Justificación / Notas</th>
                                                    <th style="width: 5%"></th>
                                                </tr>
                                            </thead>
                                            <tbody id="return-items-body">
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div class="col-12 mt-3">
                                    <label class="form-label small fw-bold">Notas Adicionales (Opcional)</label>
                                    <textarea class="form-control" name="notes" rows="2"></textarea>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-danger" onclick="AlmacenView.saveReturn()">Confirmar Devolución</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        this.addReturnItemRow();

        modalDiv.addEventListener('hidden.bs.modal', function () {
            modalDiv.remove();
        });
    },

    addReturnItemRow() {
        const tbody = document.getElementById('return-items-body');
        const tr = document.createElement('tr');
        tr.className = 'return-item-row';
        tr.innerHTML = `
            <td>
                <select class="form-select form-select-sm" name="item_id" required>
                    <option value="">Buscar ítem...</option>
                    ${this.inventory.map(i => `<option value="${i.item_id}">${i.name} (${i.code})</option>`).join('')}
                </select>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm text-end" name="quantity" 
                       value="" step="0.001" min="0.001" required placeholder="0.000">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm" name="batch" placeholder="Motivo...">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    async saveReturn() {
        const form = document.getElementById('return-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const items = [];
        
        document.querySelectorAll('.return-item-row').forEach(row => {
            const itemId = row.querySelector('[name="item_id"]').value;
            const quantity = parseFloat(row.querySelector('[name="quantity"]').value);
            const batch = row.querySelector('[name="batch"]').value || 'DEVOLUCION';

            if (itemId && quantity > 0) {
                items.push({
                    item_id: itemId,
                    quantity: quantity,
                    batch: batch
                });
            }
        });

        if (items.length === 0) {
            Helper.alert('error', 'Debe añadir al menos un ítem con cantidad mayor a cero');
            return;
        }

        const data = {
            branch_id: formData.get('branch_id'),
            cycle_id: formData.get('cycle_id'),
            notes: formData.get('notes'),
            items: items
        };

        try {
            Helper.loading(true);
            const response = await Helper.fetchAPI('/inventory/returns', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            Helper.loading(false);

            if (response.success) {
                bootstrap.Modal.getInstance(document.getElementById('returnModal')).hide();
                Helper.alert('success', 'Devolución registrada correctamente');
                await this.init(); 
            } else {
                Helper.alert('error', response.message);
            }
        } catch (error) {
            Helper.loading(false);
            console.error('Error saving return:', error);
            Helper.alert('error', 'Error al procesar la devolución');
        }
    },

    openMovementModal(type) {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'movementModal';
        modalDiv.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header ${type === 'ENTRADA' ? 'bg-success' : 'bg-danger'} text-white">
                        <h5 class="modal-title">
                            <i class="fas ${type === 'ENTRADA' ? 'fa-sign-in-alt' : 'fa-sign-out-alt'} me-2"></i>
                            Registrar ${type} de Inventario
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form id="movement-form">
                            <input type="hidden" name="type" value="${type}">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Fecha</label>
                                    <input type="date" class="form-control" name="date" value="${new Date().toISOString().split('T')[0]}" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold">Número de Referencia (Factura/Remisión)</label>
                                    <input type="text" class="form-control" name="reference" placeholder="F-12345">
                                </div>
                                ${type === 'ENTRADA' ? `
                                <div class="col-md-12">
                                    <label class="form-label small fw-bold">Proveedor</label>
                                    <select class="form-select" name="supplier_id">
                                        <option value="">Seleccione Proveedor...</option>
                                        ${this.suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-md-12">
                                    <label class="form-label small fw-bold">Ciclo <small class="text-muted">(Opcional - para análisis de costos)</small></label>
                                    <select class="form-select" name="cycle_id">
                                        <option value="">Sin asignar a ciclo</option>
                                        ${this.cycles.map(c => `<option value="${c.id}">${c.name} (${c.start_date} - ${c.end_date})</option>`).join('')}
                                    </select>
                                </div>
                                ` : ''}
                                
                                <div class="col-12 mt-4">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="mb-0 fw-bold">Artículos a Mover</h6>
                                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="AlmacenView.addItemRow()">
                                            <i class="fas fa-plus me-1"></i> Añadir Ítem
                                        </button>
                                    </div>
                                    <div class="table-responsive border rounded">
                                        <table class="table table-sm mb-0">
                                            <thead class="bg-light">
                                                <tr>
                                                    <th>Ítem</th>
                                                    <th style="width: 15%" class="text-end">Cantidad</th>
                                                    ${type === 'ENTRADA' ? '<th style="width: 15%" class="text-end">Precio Unit.</th>' : ''}
                                                    <th style="width: 20%">Observación/Lote</th>
                                                    <th style="width: 5%"></th>
                                                </tr>
                                            </thead>
                                            <tbody id="movement-items-body">
                                                <!-- Filas de ítems dinámicas -->
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div class="col-12 mt-3">
                                    <label class="form-label small fw-bold">Notas Generales</label>
                                    <textarea class="form-control" name="notes" rows="2"></textarea>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn ${type === 'ENTRADA' ? 'btn-success' : 'btn-danger'}" onclick="AlmacenView.saveMovement()">
                            Confirmar Movimiento
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        // Agregar la primera fila automáticamente
        this.addItemRow();

        modalDiv.addEventListener('hidden.bs.modal', function () {
            modalDiv.remove();
        });
    },

    addItemRow() {
        const tbody = document.getElementById('movement-items-body');
        const modalType = document.querySelector('#movement-form input[name="type"]').value;
        const tr = document.createElement('tr');
        tr.className = 'item-row';
        tr.innerHTML = `
            <td>
                <select class="form-select form-select-sm" name="item_id" required>
                    <option value="">Buscar ítem...</option>
                    ${this.inventory.map(i => `<option value="${i.item_id}">${i.name} (${i.code})</option>`).join('')}
                </select>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm text-end" name="quantity" 
                       value="1.000" onfocus="AlmacenView.unformatInput(this)" 
                       onblur="AlmacenView.formatInput(this, 3)" required>
            </td>
            ${modalType === 'ENTRADA' ? `
            <td>
                <input type="text" class="form-control form-control-sm text-end" name="unit_price" 
                       value="0.00" onfocus="AlmacenView.unformatInput(this)" 
                       onblur="AlmacenView.formatInput(this, 2)" placeholder="$0.00">
            </td>` : ''}
            <td>
                <input type="text" class="form-control form-control-sm" name="batch" placeholder="Lote/Venc">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    async saveMovement() {
        const form = document.getElementById('movement-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const type = formData.get('type');

        const items = [];
        document.querySelectorAll('.item-row').forEach(row => {
            const itemId = row.querySelector('[name="item_id"]').value;
            const quantity = row.querySelector('[name="quantity"]').value;
            const batch = row.querySelector('[name="batch"]').value;
            const priceInput = row.querySelector('[name="unit_price"]');
            const unitPrice = priceInput ? priceInput.value : null;

            if (itemId && quantity > 0) {
                const item = {
                    item_id: itemId,
                    quantity: quantity,
                    batch: batch
                };
                if (unitPrice) {
                    item.unit_price = parseFloat(unitPrice.replace(/,/g, ''));
                }
                items.push(item);
            }
        });

        if (items.length === 0) {
            Helper.alert('error', 'Debe añadir al menos un ítem con cantidad mayor a cero');
            return;
        }

        const data = {
            type: type,
            date: formData.get('date'),
            reference: formData.get('reference'),
            supplier_id: formData.get('supplier_id'),
            cycle_id: formData.get('cycle_id'),
            notes: formData.get('notes'),
            items: items.map(item => ({
                item_id: item.item_id,
                quantity: item.quantity.toString().replace(/,/g, ''), // Remove commas
                unit_price: item.unit_price,
                batch: item.batch
            }))
        };

        try {
            const response = await Helper.fetchAPI('/movements', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                bootstrap.Modal.getInstance(document.getElementById('movementModal')).hide();
                Helper.alert('success', 'Movimiento registrado correctamente');
                await this.init(); // Recargar todo
            } else {
                Helper.alert('error', response.message);
            }
        } catch (error) {
            console.error('Error saving movement:', error);
            Helper.alert('error', 'Error al procesar el movimiento');
        }
    },

    async viewKardex(itemId) {
        try {
            const item = this.inventory.find(i => i.item_id == itemId);
            if (!item) return;

            const res = await Helper.fetchAPI(`/inventory/kardex/${itemId}`);
            if (!res.success) {
                Helper.alert('error', 'No se pudo cargar el historial');
                return;
            }

            const movements = res.data;
            // CHECK LOGS REMOVED

            let currentBalance = 0;
            const rows = movements.map(m => {
                // Normalize keys (handle potential Uppercase from PDO)
                const date = m.movement_date || m.MOVEMENT_DATE;
                const type = m.movement_type || m.MOVEMENT_TYPE;
                const ref = m.reference_number || m.REFERENCE_NUMBER || '-';
                const notes = m.notes || m.NOTES || '';
                const qtyRaw = m.quantity !== undefined ? m.quantity : m.QUANTITY;

                const qty = parseFloat(qtyRaw) || 0;

                // Determine logic
                let isEntry = false;
                if (type === 'ENTRADA' || type === 'AJUSTE' || type === 'ENTRADA_OC') {
                    isEntry = qty > 0;
                } else if (type === 'SALIDA' || type === 'SALIDA_SEDE') {
                    isEntry = false;
                }

                const factor = isEntry ? 1 : -1;
                const realQty = qty * factor;

                currentBalance += realQty;

                return `
                    <tr>
                        <td>${Helper.formatDate(date)}</td>
                        <td>
                            <span class="badge ${factor > 0 ? 'bg-success' : 'bg-danger'}">
                                ${type || 'Indefinido'}
                            </span>
                        </td>
                        <td>${ref}</td>
                        <td><small>${notes}</small></td>
                        <td class="text-end ${factor > 0 ? 'text-success' : 'text-muted'}">${factor > 0 ? Helper.formatNumber(qty, 3) : '-'}</td>
                        <td class="text-end ${factor < 0 ? 'text-danger' : 'text-muted'}">${factor < 0 ? Helper.formatNumber(qty, 3) : '-'}</td>
                        <td class="text-end fw-bold">${Helper.formatNumber(currentBalance, 3)}</td>
                    </tr>
                `;
            }).join('');

            const modalHtml = `
                <div class="modal fade" id="kardexModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="fas fa-history me-2"></i>Kardex: ${item.name}
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-0">
                                <div class="table-responsive">
                                    <table class="table table-striped table-hover mb-0">
                                        <thead class="bg-light sticky-top">
                                            <tr>
                                                <th>Fecha</th>
                                                <th>Tipo</th>
                                                <th>Documento</th>
                                                <th>Detalle / Destino</th>
                                                <th class="text-end">Entrada</th>
                                                <th class="text-end">Salida</th>
                                                <th class="text-end">Saldo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rows.length ? rows : '<tr><td colspan="7" class="text-center py-4">Sin movimientos registrados</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            const existingModal = document.getElementById('kardexModal');
            if (existingModal) existingModal.remove();

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('kardexModal'));
            modal.show();

        } catch (error) {
            console.error(error);
            Helper.alert('error', 'Error al cargar kardex');
        }
    },

    unformatInput(input) {
        let val = input.value;
        val = val.replace(/,/g, '');
        input.value = val;
        input.select();
    },

    formatInput(input, decimals = 3) {
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
    },

    handleSearch(e) {
        this.searchTerm = e.target.value.toLowerCase();
        const tbody = document.querySelector('#stockTable tbody');
        if (tbody) {
            tbody.innerHTML = this.renderStockTable();
        }
    },

    printBlindCount() {
        const date = new Date().toLocaleDateString('es-CO');
        const items = this.inventory.sort((a, b) => a.food_group.localeCompare(b.food_group) || a.name.localeCompare(b.name));

        let html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2>Planilla de Toma Física de Inventario</h2>
                    <p>Fecha: ${date} | Generado por: PAE Control</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Código</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Ítem</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Grupo</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Unidad</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 100px;">Conteo Real</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let currentGroup = '';
        items.forEach(item => {
            if (item.food_group !== currentGroup) {
                currentGroup = item.food_group;
                html += `
                    <tr style="background-color: #e9ecef;">
                        <td colspan="6" style="border: 1px solid #ddd; padding: 5px 8px; font-weight: bold;">
                            ${currentGroup}
                        </td>
                    </tr>
                `;
            }
            html += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.code}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.food_group}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.unit}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; border-bottom: 2px solid #000;"></td>
                    <td style="border: 1px solid #ddd; padding: 8px;"></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                    <div style="text-align: center;">
                        <br><br><br>
                        __________________________<br>
                        Firma Responsable Almacén
                    </div>
                    <div style="text-align: center;">
                        <br><br><br>
                        __________________________<br>
                        Firma Auditor/Contador
                    </div>
                </div>
            </div>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    },

    async editItemStock(itemId) {
        const item = this.inventory.find(i => i.item_id == itemId);
        if (!item) return;

        const { value: realStock } = await Swal.fire({
            title: `Ajuste de Stock: ${item.name}`,
            html: `
                <div class="text-start">
                    <p class="mb-1">Stock Sistema: <strong>${Helper.formatNumber(item.stock, 3)} ${item.unit}</strong></p>
                    <label class="form-label">Ingrese el <strong>Stock Físico Real</strong>:</label>
                    <input type="number" id="swal-input1" class="form-control" step="0.001" placeholder="Ej: ${item.stock}">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Registrar Ajuste',
            preConfirm: () => {
                return document.getElementById('swal-input1').value;
            }
        });

        if (realStock) {
            const current = parseFloat(item.stock);
            const actual = parseFloat(realStock);
            const diff = actual - current;

            if (diff === 0) {
                Helper.alert('info', 'No hay diferencias para ajustar.');
                return;
            }

            const type = diff > 0 ? 'ENTRADA' : 'SALIDA'; // Backend handles simple types
            // Ideally we should have an 'AJUSTE' type, but let's stick to simple logic for now or verify if backend supports 'AJUSTE'. 
            // In AlmacenView.renderMovementsTable, we handle 'ENTRADA' and 'SALIDA'. 
            // Let's use 'AJUSTE' as note or movement_type if allowed.
            // The prompt said: "movement_type enum('ENTRADA','SALIDA','AJUSTE')". 
            // I'll check if backend validates enum. Assuming yes, I can send 'AJUSTE' if I modify backend or just send 'ENTRADA'/'SALIDA' with 'AJUSTE' in notes.
            // Safe bet: Use ENTRADA/SALIDA and put "AJUSTE DE INVENTARIO" in notes.

            const note = `AJUSTE DE INVENTARIO (Sistema: ${current} -> Físico: ${actual})`;

            const data = {
                type: 'AJUSTE', // Let's try sending AJUSTE if the backend supports it, otherwise fallback to ENT/SAL logic in backend?
                // The registerMovement in InventoryController takes 'type'. 
                // Let's send ENTRADA/SALIDA for safety, but with a clear note.
                // Actually, if I send AJUSTE, I need to make sure backend handles it.
                // Looking at `registerMovement` in Controller (from ViewFile earlier, it wasn't fully shown but it inserts into `inventory_movements`).
                // Let's stick to standard types to ensure stock calculation works (Backend likely adds for ENTRADA, subtracts for SALIDA).
                // If I send 'AJUSTE', does backend know what to do?
                // `InventoryController` usually has `updateStock` logic.
                // To be safe, I will send ENTRADA or SALIDA.
            };

            const payload = {
                type: diff > 0 ? 'ENTRADA' : 'SALIDA',
                date: new Date().toISOString().split('T')[0],
                reference: 'AJUSTE-' + Date.now().toString().slice(-6),
                supplier_id: null,
                notes: note,
                items: [{
                    item_id: itemId,
                    quantity: Math.abs(diff),
                    batch: 'AJUSTE'
                }]
            };

            const response = await Helper.fetchAPI('/movements', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (response.success) {
                Helper.alert('success', 'Ajuste realizado correctamente');
                this.init();
            } else {
                Helper.alert('error', response.message);
            }
        }
    }
};

// Initialize
if (typeof AlmacenView !== 'undefined') {
    AlmacenView.init();
}

/**
 * Compras View - Módulo de Inventarios
 */
console.log('compras.js loaded');

window.ComprasView = {
    orders: [],
    suppliers: [],
    items: [],

    async init() {
        console.log('Initializing Compras Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [orderRes, supplierRes, itemRes, cycleRes] = await Promise.all([
                Helper.fetchAPI('/purchase-orders'),
                Helper.fetchAPI('/proveedores'),
                Helper.fetchAPI('/items'),
                Helper.fetchAPI('/menu-cycles')
            ]);

            this.orders = orderRes.success ? (orderRes.data || []) : (Array.isArray(orderRes) ? orderRes : []);
            this.suppliers = supplierRes.success ? (supplierRes.data || []) : (Array.isArray(supplierRes) ? supplierRes : []);
            const rawItems = itemRes.success ? (itemRes.data || []) : (Array.isArray(itemRes) ? itemRes : []);
            this.items = rawItems.map(i => ({ ...i, unit: i.unit || i.unit_abbr }));
            this.cycles = cycleRes.success ? (cycleRes.data || []) : (Array.isArray(cycleRes) ? cycleRes : []);
        } catch (error) {
            console.error('Error loading purchase orders data:', error);
            Helper.alert('error', 'Error al cargar los datos de compras');
        }
    },

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1 text-primary fw-bold"><i class="fas fa-shopping-cart me-2"></i>Órdenes de Compra</h2>
                        <p class="text-muted mb-0">Gestión de pedidos realizados a proveedores</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="ComprasView.openModal()">
                        <i class="fas fa-plus me-1"></i> Nueva Orden
                    </button>
                </div>

                <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0" id="orders-table">
                                <thead class="bg-light">
                                    <tr class="text-muted small text-uppercase fw-bold">
                                        <th class="ps-4">No. Orden</th>
                                        <th>Proveedor</th>
                                        <th>Fecha</th>
                                        <th>Entrega Esperada</th>
                                        <th class="text-end">Total</th>
                                        <th>Estado</th>
                                        <th class="text-end pe-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderTableRows()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = html;
            this.initTable();
        } else {
            console.error('App container not found');
        }
    },

    renderTableRows() {
        if (!this.orders || this.orders.length === 0) {
            return '';
        }

        return this.orders.map(o => `
            <tr>
                <td class="ps-4 fw-bold text-dark">${o.po_number || 'N/A'}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm bg-light rounded-circle text-primary d-flex align-items-center justify-content-center me-2" style="width:32px; height:32px">
                            <i class="fas fa-building small"></i>
                        </div>
                        <span class="fw-medium">${o.supplier_name}</span>
                    </div>
                </td>
                <td>${o.po_date}</td>
                <td>
                    <div class="small fw-bold text-muted">${o.cycle_name || 'Sin Ciclo'}</div>
                    <div class="small text-muted">${o.expected_delivery || '-'}</div>
                </td>
                <td class="fw-bold text-primary text-end">${Helper.formatCurrency(o.total_amount)}</td>
                <td>
                    <span class="badge rounded-pill ${this.getStatusBadgeClass(o.status)}">${o.status}</span>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group shadow-sm rounded-3">
                        <button class="btn btn-white btn-sm" onclick="ComprasView.openModal(${o.id})" title="Ver/Editar"><i class="fas fa-edit text-primary"></i></button>
                        <button class="btn btn-white btn-sm" onclick="ComprasView.deleteOrder(${o.id})" title="Eliminar"><i class="fas fa-trash text-danger"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    getStatusBadgeClass(status) {
        switch (status) {
            case 'RECIBIDA_TOTAL': return 'bg-success-soft text-success';
            case 'CANCELADA': return 'bg-danger-soft text-danger';
            case 'RECIBIDA_PARCIAL': return 'bg-warning-soft text-warning';
            default: return 'bg-secondary-soft text-secondary';
        }
    },

    initTable() {
        if ($.fn.DataTable.isDataTable('#orders-table')) {
            $('#orders-table').DataTable().destroy();
        }
        $('#orders-table').DataTable({
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json',
                emptyTable: "No se encontraron órdenes de compra registradas"
            },
            pageLength: 10,
            ordering: true,
            info: true,
            columnDefs: [{ targets: 6, orderable: false }]
        });
    },

    async openModal(id = null) {
        const isEdit = !!id;
        const order = isEdit ? this.orders.find(o => o.id === id) : null;
        let orderItems = [];

        if (isEdit) {
            try {
                const res = await Helper.fetchAPI(`/purchase-orders/${id}/details`);
                orderItems = res.success ? res.data : [];
            } catch (error) {
                console.error('Error fetching order details:', error);
            }
        }

        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'orderModal';

        const suppliersHtml = this.suppliers.map(s => `<option value="${s.id}" ${order && order.supplier_id == s.id ? 'selected' : ''}>${s.name}</option>`).join('');

        modalDiv.innerHTML = `
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-primary text-white py-3">
                        <h5 class="modal-title fw-bold">
                            <i class="fas ${isEdit ? 'fa-edit' : 'fa-plus-circle'} me-2"></i>
                            ${isEdit ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4 bg-light">
                        <form id="order-form">
                            <div class="card border-0 shadow-sm mb-4 rounded-3">
                                <div class="card-body p-4">
                                    <div class="row g-3">
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Proveedor</label>
                                            <select class="form-control form-select-lg border-2" id="msg-supplier" required>
                                                <option value="">-- Seleccionar Proveedor --</option>
                                                ${suppliersHtml}
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Ciclo de Menú (Proyecciones)</label>
                                            <select class="form-control form-select-lg border-2" id="msg-cycle" onchange="ComprasView.handleCycleChange(this.value)">
                                                <option value="">-- Compra Manual (Sin Ciclo) --</option>
                                                ${this.cycles.map(c => `<option value="${c.id}" ${order && order.cycle_id == c.id ? 'selected' : ''}>${c.name} (${c.status})</option>`).join('')}
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">No. Orden</label>
                                            <input type="text" class="form-control form-control-lg border-2" id="msg-number" value="${order ? order.po_number : ''}" placeholder="OC-2026-XXX" required>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Fecha Orden</label>
                                            <div class="d-flex">
                                                <input type="date" class="form-control form-control-lg border-2 me-2" id="msg-date" value="${order ? order.po_date : new Date().toISOString().split('T')[0]}" required>
                                                ${isEdit ? `
                                                <button type="button" class="btn btn-outline-dark shadow-sm" title="Imprimir Orden" onclick="ComprasView.printOrder(${order.id})">
                                                    <i class="fas fa-print"></i>
                                                </button>` : ''}
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Fecha Entrega Esperada</label>
                                            <input type="date" class="form-control form-control-lg border-2" id="msg-delivery" value="${order ? order.expected_delivery : ''}">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Estado</label>
                                            <select class="form-control form-select-lg border-2" id="msg-status">
                                                <option value="PENDIENTE" ${order && order.status === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
                                                <option value="ENVIADA" ${order && order.status === 'ENVIADA' ? 'selected' : ''}>ENVIADA</option>
                                                <option value="RECIBIDA_PARCIAL" ${order && order.status === 'RECIBIDA_PARCIAL' ? 'selected' : ''}>RECIBIDA PARCIAL</option>
                                                <option value="RECIBIDA_TOTAL" ${order && order.status === 'RECIBIDA_TOTAL' ? 'selected' : ''}>RECIBIDA TOTAL</option>
                                                <option value="CANCELADA" ${order && order.status === 'CANCELADA' ? 'selected' : ''}>CANCELADA</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card border-0 shadow-sm rounded-3">
                                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                                    <h6 class="mb-0 fw-bold"><i class="fas fa-list me-2 text-primary"></i>Ítems de la Orden</h6>
                                    <button type="button" class="btn btn-outline-primary btn-sm rounded-pill" onclick="ComprasView.addItemRow()">
                                        <i class="fas fa-plus me-1"></i> Agregar Ítem
                                    </button>
                                </div>
                                <div class="card-body p-0">
                                    <div class="table-responsive">
                                        <table class="table table-hover align-middle mb-0">
                                            <thead class="bg-light small text-uppercase">
                                                <tr>
                                                    <th class="ps-4">Ítem / Insumo</th>
                                                    <th style="width: 150px;" class="text-end">Proyectado</th>
                                                    <th style="width: 150px;" class="text-end">Cant. Pedir</th>
                                                    <th style="width: 200px;" class="text-end">Costo Unit.</th>
                                                    <th style="width: 200px;" class="text-end">Subtotal</th>
                                                    <th class="text-end pe-4" style="width: 50px;"></th>
                                                </tr>
                                            </thead>
                                            <tbody id="order-items-body">
                                                <!-- Rows here -->
                                            </tbody>
                                            <tfoot class="bg-light fw-bold">
                                            <tfoot class="bg-light fw-bold">
                                                <tr>
                                                    <td colspan="4" class="text-end py-3">TOTAL ORDEN:</td>
                                                    <td id="msg-total-display" class="py-3 text-primary fs-5 text-end">$ 0.00</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer bg-white py-3">
                        <button type="button" class="btn btn-link text-muted fw-bold text-decoration-none" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary px-5 rounded-pill shadow" onclick="ComprasView.save(${order ? order.id : null})">
                            <i class="fas fa-save me-2"></i>${isEdit ? 'Actualizar Orden' : 'Guardar Orden'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        // Pre-fetch projections if a cycle is selected (Edit Mode) to avoid race conditions in rows
        if (order && order.cycle_id) {
            try {
                const res = await Helper.fetchAPI(`/inventory/cycle-projections/${order.cycle_id}`);
                if (res.success) {
                    this.currentProjections = res.data;
                }
            } catch (error) {
                console.error('Error pre-fetching projections:', error);
            }
        } else {
            this.currentProjections = null;
        }

        if (isEdit && orderItems.length > 0) {
            orderItems.forEach(item => this.addItemRow(item));
        } else {
            this.addItemRow(); // At least one empty row
        }

        modalDiv.addEventListener('hidden.bs.modal', () => modalDiv.remove());
    },

    async handleCycleChange(cycleId) {
        if (!cycleId) return;

        const confirm = await Swal.fire({
            title: '¿Cargar proyecciones?',
            text: "Se cargarán automáticamente los ítems proyectados para este ciclo descontando lo ya ordenado.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, cargar ítems',
            cancelButtonText: 'No'
        });

        if (confirm.isConfirmed) {
            try {
                const res = await Helper.fetchAPI(`/inventory/cycle-projections/${cycleId}`);
                if (res.success && res.data.length > 0) {
                    this.currentProjections = res.data;
                    document.getElementById('order-items-body').innerHTML = '';
                    res.data.forEach(item => {
                        const remaining = item.projected_qty - item.ordered_qty;
                        if (remaining > 0) {
                            this.addItemRow({
                                item_id: item.item_id,
                                quantity: remaining,
                                unit_price: 0,
                                projected_info: `${item.ordered_qty} / ${item.projected_qty} ${item.unit}`
                            });
                        }
                    });
                } else if (res.data.length === 0) {
                    Helper.alert('info', 'No hay proyecciones pendientes para este ciclo.');
                }
            } catch (error) {
                Helper.alert('error', 'Error al cargar proyecciones');
            }
        }
    },

    addItemRow(data = null) {
        const body = document.getElementById('order-items-body');
        const row = document.createElement('tr');

        const itemsHtml = this.items.map(i => `<option value="${i.id}" ${data && data.item_id == i.id ? 'selected' : ''}>${i.name} (${i.unit})</option>`).join('');

        // Helper to initially format values if data exists
        const formatInitial = (val) => val ? Helper.formatNumber(val, 2) : '';
        const qtyVal = data ? (data.quantity || data.quantity_ordered) : '1';
        const priceVal = data ? data.unit_price : '0';

        row.innerHTML = `
            <td class="ps-4">
                <select class="form-select border-0 bg-transparent row-item" required onchange="ComprasView.calculateRow(this)">
                    <option value="">-- Seleccionar Ítem --</option>
                    ${itemsHtml}
                </select>
            </td>
            <td class="small text-muted text-end">
                ${data && data.projected_info ? data.projected_info : '-'}
            </td>
            <td>
                <input type="text" class="form-control border-0 bg-transparent row-qty text-end" 
                       value="${qtyVal}" 
                       onfocus="ComprasView.unformatInput(this)" 
                       onblur="ComprasView.formatInput(this, 3)" 
                       oninput="ComprasView.calculateRow(this)" required>
            </td>
            <td>
                <div class="input-group input-group-sm">
                    <span class="input-group-text bg-transparent border-0">$</span>
                    <input type="text" class="form-control border-0 bg-transparent row-price text-end" 
                           value="${priceVal}" 
                           onfocus="ComprasView.unformatInput(this)" 
                           onblur="ComprasView.formatInput(this, 2)" 
                           oninput="ComprasView.calculateRow(this)" required>
                </div>
            </td>
            <td class="fw-bold text-dark row-subtotal text-end">$ 0.00</td>
            <td class="text-end pe-4">
                <button type="button" class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove(); ComprasView.calculateTotal();">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        body.appendChild(row);

        // Initialize formatting
        const qtyInput = row.querySelector('.row-qty');
        const priceInput = row.querySelector('.row-price');
        this.formatInput(qtyInput, 3);
        this.formatInput(priceInput, 2);

        this.calculateRow(row.querySelector('.row-item'));
    },

    unformatInput(input) {
        let val = input.value;
        // Remove thousands separators (commas)
        val = val.replace(/,/g, '');
        input.value = val;
        input.select();
    },

    formatInput(input, decimals = 2) {
        let val = input.value;
        // Clean non-numeric except dot
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

    async calculateRow(element) {
        const row = element.closest('tr');

        // Parse removing commas
        const parseVal = (str) => parseFloat(str.replace(/,/g, '')) || 0;

        const qty = parseVal(row.querySelector('.row-qty').value);
        const price = parseVal(row.querySelector('.row-price').value);

        // Update projection info if triggered by item change
        if (element.classList.contains('row-item')) {
            const itemId = element.value;
            const cycleId = document.getElementById('msg-cycle').value;
            const projectionCell = row.cells[1]; // The 'Proyectado' column

            if (itemId && cycleId) {
                try {
                    if (this.currentProjections) {
                        const proj = this.currentProjections.find(p => p.item_id == itemId);
                        if (proj) {
                            projectionCell.innerText = `${proj.ordered_qty} / ${proj.projected_qty} ${proj.unit}`;
                        } else {
                            projectionCell.innerText = 'No proyectado';
                        }
                    } else {
                        // Attempt to fetch if not loaded
                        const res = await Helper.fetchAPI(`/inventory/cycle-projections/${cycleId}`);
                        if (res.success) {
                            this.currentProjections = res.data;
                            const proj = this.currentProjections.find(p => p.item_id == itemId);
                            if (proj) {
                                projectionCell.innerText = `${proj.ordered_qty} / ${proj.projected_qty} ${proj.unit}`;
                            } else {
                                projectionCell.innerText = 'No proyectado';
                            }
                        }
                    }

                } catch (e) {
                    console.error(e);
                }
            } else {
                projectionCell.innerText = '-';
            }
        }

        const subtotal = qty * price;
        row.querySelector('.row-subtotal').innerText = Helper.formatCurrency(subtotal);
        row.dataset.subtotal = subtotal;
        this.calculateTotal();
    },

    calculateTotal() {
        let total = 0;
        document.querySelectorAll('#order-items-body tr').forEach(row => {
            total += parseFloat(row.dataset.subtotal) || 0;
        });
        document.getElementById('msg-total-display').innerText = Helper.formatCurrency(total);
        this.total = total;
    },

    async save(id = null) {
        const form = document.getElementById('order-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const items = [];
        document.querySelectorAll('#order-items-body tr').forEach(row => {
            const itemId = row.querySelector('.row-item').value;
            if (itemId) {
                items.push({
                    item_id: itemId,
                    quantity: row.querySelector('.row-qty').value.replace(/,/g, ''),
                    unit_price: row.querySelector('.row-price').value.replace(/,/g, ''),
                    subtotal: row.dataset.subtotal
                });
            }
        });

        if (items.length === 0) {
            Helper.alert('warning', 'Debe agregar al menos un ítem.');
            return;
        }

        const data = {
            id: id,
            supplier_id: document.getElementById('msg-supplier').value,
            cycle_id: document.getElementById('msg-cycle').value,
            po_number: document.getElementById('msg-number').value,
            po_date: document.getElementById('msg-date').value,
            expected_delivery: document.getElementById('msg-delivery').value,
            status: document.getElementById('msg-status').value,
            total_amount: this.total,
            items: items
        };

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/purchase-orders/${id}` : '/purchase-orders';
            const res = await Helper.fetchAPI(url, { method, body: JSON.stringify(data) });

            if (res.success) {
                bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide();
                Helper.alert('success', 'Orden de Compra guardada');
                this.init();
            } else {
                Helper.alert('error', res.message);
            }
        } catch (error) {
            Helper.alert('error', 'Error al guardar la orden');
        }
    },

    async deleteOrder(id) {
        const confirm = await Helper.confirm('¿Eliminar orden?', 'Esta acción no se puede deshacer.');
        if (confirm) {
            try {
                const res = await Helper.fetchAPI(`/purchase-orders/${id}`, { method: 'DELETE' });
                if (res.success) {
                    Helper.alert('success', 'Orden eliminada');
                    this.init();
                } else {
                    Helper.alert('error', res.message);
                }
            } catch (error) {
                Helper.alert('error', 'Error al eliminar');
            }
        }
    },

    async printOrder(id) {
        const order = this.orders.find(o => o.id === id);
        if (!order) return;

        try {
            const res = await Helper.fetchAPI(`/purchase-orders/${id}/details`);
            const items = res.success ? res.data : [];
            const supplier = this.suppliers.find(s => s.id == order.supplier_id);

            let itemsHtml = '';
            items.forEach(item => {
                const itemInfo = this.items.find(i => i.id == item.item_id);
                // Calculate subtotal for the row depending on what data we have
                // item.subtotal might be available, otherwise calculate
                const unitPrice = parseFloat(item.unit_price) || 0;
                // Try qty ordered first (edit mode usually has it), fall back to qty if newly created object (unlikely here)
                const qty = parseFloat(item.quantity_ordered) || parseFloat(item.quantity) || 0;
                const subtotal = qty * unitPrice;

                itemsHtml += `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${itemInfo ? itemInfo.name : 'Unknown Item'}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${itemInfo ? itemInfo.unit : ''}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${Helper.formatNumber(qty, 3)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${Helper.formatCurrency(unitPrice)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${Helper.formatCurrency(subtotal)}</td>
                    </tr>
                `;
            });

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Orden de Compra #${order.po_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.4; font-size: 14px; }
                        .header { margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
                        .title { font-size: 24px; font-weight: bold; color: #333; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
                        th { background-color: #f8f9fa; border: 1px solid #ddd; padding: 10px; text-align: left; font-weight: bold; }
                        td { border: 1px solid #ddd; padding: 8px; }
                        .total-row td { background-color: #eee; font-weight: bold; font-size: 14px; }
                        @media print {
                            body { padding: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="title">ORDEN DE COMPRA</div>
                            <div style="color: #667;"># ${order.po_number}</div>
                        </div>
                        <div style="text-align: right;">
                             <div><strong>Fecha:</strong> ${Helper.formatDate(order.po_date)}</div>             
                        </div>
                    </div>
                    
                    <div class="info-grid">
                        <div>
                            <div style="font-size: 11px; text-transform: uppercase; color: #777; margin-bottom: 4px;">Proveedor</div>
                            <div style="font-weight: bold; font-size: 16px;">${supplier ? supplier.name : 'N/A'}</div>
                            <div>NIT: ${supplier ? supplier.nit : 'N/A'}</div>
                            <div>${supplier ? supplier.phone : ''}</div>
                        </div>
                        <div style="text-align: right;">
                             <div style="margin-bottom: 5px;"><strong>Entrega Esperada:</strong> ${order.expected_delivery ? Helper.formatDate(order.expected_delivery) : 'N/A'}</div>
                             <div><strong>Estado:</strong> ${order.status}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Ítem / Descripción</th>
                                <th style="text-align: center; width: 80px;">Unidad</th>
                                <th style="text-align: right; width: 100px;">Cantidad</th>
                                <th style="text-align: right; width: 120px;">Valor Unitario</th>
                                <th style="text-align: right; width: 120px;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                            <tr class="total-row">
                                <td colspan="4" style="text-align: right;">TOTAL</td>
                                <td style="text-align: right;">${Helper.formatCurrency(order.total_amount)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style="font-size: 11px; color: #999; margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
                        <p>Documento generado por PAE Control</p>
                    </div>
                </body>
                </html>
            `;

            Helper.printHTML(html);

        } catch (e) {
            console.error(e);
            Helper.alert('error', 'Error al generar impresión');
        }
    }
};

// Initialize
if (typeof ComprasView !== 'undefined') {
    ComprasView.init();
}

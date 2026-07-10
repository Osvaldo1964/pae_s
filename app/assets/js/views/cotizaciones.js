/**
 * Cotizaciones View - Módulo de Inventarios
 */

window.CotizacionesView = {
    quotes: [],
    suppliers: [],
    items: [],

    async init() {
        console.log('Initializing Cotizaciones Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [quoteRes, supplierRes, itemRes] = await Promise.all([
                Helper.fetchAPI('/quotes'),
                Helper.fetchAPI('/proveedores'),
                Helper.fetchAPI('/items')
            ]);

            this.quotes = quoteRes.success ? (quoteRes.data || []) : (Array.isArray(quoteRes) ? quoteRes : []);
            this.suppliers = supplierRes.success ? (supplierRes.data || []) : (Array.isArray(supplierRes) ? supplierRes : []);
            this.items = itemRes.success ? (itemRes.data || []) : (Array.isArray(itemRes) ? itemRes : []);
        } catch (error) {
            console.error('Error loading quotes data:', error);
            Helper.alert('error', 'Error al cargar los datos de cotizaciones');
        }
    },

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1 text-primary fw-bold"><i class="fas fa-file-invoice-dollar me-2"></i>Cotizaciones</h2>
                        <p class="text-muted mb-0">Gestión de precios y propuestas de proveedores</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="CotizacionesView.openModal()">
                        <i class="fas fa-plus me-1"></i> Nueva Cotización
                    </button>
                </div>

                <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0" id="quotes-table">
                                <thead class="bg-light">
                                    <tr class="text-muted small text-uppercase fw-bold">
                                        <th class="ps-4">No. Cotización</th>
                                        <th>Proveedor</th>
                                        <th>Fecha</th>
                                        <th>Vencimiento</th>
                                        <th>Total</th>
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
        if (!this.quotes || this.quotes.length === 0) {
            return ''; // Let DataTables handle the empty state
        }

        return this.quotes.map(q => `
            <tr>
                <td class="ps-4 fw-bold text-dark">${q.quote_number || 'N/A'}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm bg-light rounded-circle text-primary d-flex align-items-center justify-content-center me-2" style="width:32px; height:32px">
                            <i class="fas fa-building small"></i>
                        </div>
                        <span class="fw-medium">${q.supplier_name}</span>
                    </div>
                </td>
                <td>${q.quote_date}</td>
                <td>${q.valid_until || '<span class="text-muted">-</span>'}</td>
                <td class="fw-bold text-primary">${Helper.formatCurrency(q.total_amount)}</td>
                <td>
                    <span class="badge rounded-pill ${this.getStatusBadgeClass(q.status)}">${q.status}</span>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group shadow-sm rounded-3">
                        <button class="btn btn-white btn-sm" onclick="CotizacionesView.openModal(${q.id})" title="Ver/Editar"><i class="fas fa-edit text-primary"></i></button>
                        <button class="btn btn-white btn-sm" onclick="CotizacionesView.deleteQuote(${q.id})" title="Eliminar"><i class="fas fa-trash text-danger"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    getStatusBadgeClass(status) {
        switch (status) {
            case 'APROBADA': return 'bg-success-soft text-success';
            case 'RECHAZADA': return 'bg-danger-soft text-danger';
            case 'ENVIADA': return 'bg-info-soft text-info';
            default: return 'bg-secondary-soft text-secondary';
        }
    },

    initTable() {
        if ($.fn.DataTable.isDataTable('#quotes-table')) {
            $('#quotes-table').DataTable().destroy();
        }
        $('#quotes-table').DataTable({
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json',
                emptyTable: "No se encontraron cotizaciones registradas"
            },
            pageLength: 10,
            ordering: true,
            info: true,
            columnDefs: [{ targets: 6, orderable: false }]
        });
    },

    async openModal(id = null) {
        const isEdit = !!id;
        const quote = isEdit ? this.quotes.find(q => q.id == id) : null;
        let quoteItems = [];

        if (isEdit) {
            try {
                const res = await Helper.fetchAPI(`/quotes/${id}/details`);
                quoteItems = res.success ? res.data : [];
            } catch (error) {
                console.error('Error fetching quote details:', error);
            }
        }

        const modalId = 'quoteModal';
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = modalId;

        const suppliersHtml = this.suppliers.map(s => `<option value="${s.id}" ${quote && quote.supplier_id == s.id ? 'selected' : ''}>${s.name}</option>`).join('');

        modalDiv.innerHTML = `
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-primary text-white py-3">
                        <h5 class="modal-title fw-bold">
                            <i class="fas ${isEdit ? 'fa-edit' : 'fa-plus-circle'} me-2"></i>
                            ${isEdit ? 'Editar Cotización' : 'Nueva Cotización'}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4 bg-light">
                        <form id="quote-form">
                            <div class="card border-0 shadow-sm mb-4 rounded-3">
                                <div class="card-body p-4">
                                    <div class="row g-3">
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Proveedor</label>
                                            <select class="form-control form-select-lg border-2" id="q-supplier" required>
                                                <option value="">-- Seleccionar Proveedor --</option>
                                                ${suppliersHtml}
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label small fw-bold text-muted text-uppercase">No. Cotización</label>
                                            <input type="text" class="form-control form-control-lg border-2" id="q-number" value="${quote ? quote.quote_number : ''}" placeholder="Ej: COT-2026-001">
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Fecha</label>
                                            <div class="d-flex">
                                                <input type="date" class="form-control form-control-lg border-2 me-2" id="q-date" value="${quote ? quote.quote_date : new Date().toISOString().split('T')[0]}" required>
                                                ${isEdit ? `
                                                <button type="button" class="btn btn-outline-dark shadow-sm" title="Imprimir Cotización" onclick="CotizacionesView.printQuote(${quote.id})">
                                                    <i class="fas fa-print"></i>
                                                </button>` : ''}
                                            </div>
                                        </div>
                                        <div class="col-md-2">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Vence</label>
                                            <input type="date" class="form-control form-control-lg border-2" id="q-expiry" value="${quote ? quote.valid_until : ''}">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card border-0 shadow-sm rounded-3">
                                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                                    <h6 class="mb-0 fw-bold"><i class="fas fa-list me-2 text-primary"></i>Ítems de la Cotización</h6>
                                    <button type="button" class="btn btn-outline-primary btn-sm rounded-pill" onclick="CotizacionesView.addItemRow()">
                                        <i class="fas fa-plus me-1"></i> Agregar Ítem
                                    </button>
                                </div>
                                <div class="card-body p-0">
                                    <div class="table-responsive">
                                        <table class="table table-hover align-middle mb-0" id="quote-items-table">
                                            <thead class="bg-light small text-uppercase">
                                                <tr>
                                                    <th class="ps-4">Ítem / Ingrediente</th>
                                                    <th style="width: 150px;" class="text-end">Cantidad</th>
                                                    <th style="width: 200px;" class="text-end">Precio Unitario</th>
                                                    <th style="width: 200px;" class="text-end">Subtotal</th>
                                                    <th class="text-end pe-4" style="width: 50px;"></th>
                                                </tr>
                                            </thead>
                                            <tbody id="quote-items-body">
                                                <!-- Row will be inserted here -->
                                            </tbody>
                                            <tfoot class="bg-light fw-bold">
                                                <tr>
                                                    <td colspan="4" class="text-end py-3">TOTAL COTIZACIÓN:</td>
                                                    <td id="q-total-display" class="py-3 text-primary fs-5 text-end">$ 0.00</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer bg-white py-3">
                        <button type="button" class="btn btn-link text-muted fw-bold text-decoration-none" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary px-5 rounded-pill shadow" onclick="CotizacionesView.save(${quote ? quote.id : null})">
                            <i class="fas fa-save me-2"></i>${isEdit ? 'Actualizar Cotización' : 'Guardar Cotización'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        if (isEdit && quoteItems.length > 0) {
            quoteItems.forEach(item => this.addItemRow(item));
        } else {
            this.addItemRow(); // At least one empty row
        }

        modalDiv.addEventListener('hidden.bs.modal', () => modalDiv.remove());
    },

    addItemRow(data = null) {
        const body = document.getElementById('quote-items-body');
        const row = document.createElement('tr');

        const itemsHtml = this.items.map(i => `<option value="${i.id}" ${data && data.item_id == i.id ? 'selected' : ''}>${i.name} (${i.unit})</option>`).join('');

        // Formatted initial values
        const qtyVal = data ? Helper.formatNumber(data.quantity, 3) : '1.000';
        const priceVal = data ? Helper.formatNumber(data.unit_price, 2) : '0.00';

        row.innerHTML = `
            <td class="ps-4">
                <select class="form-select border-0 bg-transparent row-item" required onchange="CotizacionesView.calculateRow(this)">
                    <option value="">-- Seleccionar Ítem --</option>
                    ${itemsHtml}
                </select>
            </td>
            <td>
                <input type="text" class="form-control border-0 bg-transparent row-qty text-end" 
                       value="${qtyVal}" 
                       onfocus="CotizacionesView.unformatInput(this)" 
                       onblur="CotizacionesView.formatInput(this, 3)" 
                       oninput="CotizacionesView.calculateRow(this)" required>
            </td>
            <td>
                <div class="input-group input-group-sm">
                    <span class="input-group-text bg-transparent border-0">$</span>
                    <input type="text" class="form-control border-0 bg-transparent row-price text-end" 
                           value="${priceVal}" 
                           onfocus="CotizacionesView.unformatInput(this)" 
                           onblur="CotizacionesView.formatInput(this, 2)" 
                           oninput="CotizacionesView.calculateRow(this)" required>
                </div>
            </td>
            <td class="fw-bold text-dark row-subtotal text-end">$ 0.00</td>
            <td class="text-end pe-4">
                <button type="button" class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove(); CotizacionesView.calculateTotal();">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        body.appendChild(row);
        this.calculateRow(row.querySelector('.row-item'));
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
    },

    calculateRow(element) {
        const row = element.closest('tr');

        const parseVal = (str) => parseFloat(str.replace(/,/g, '')) || 0;

        const qty = parseVal(row.querySelector('.row-qty').value);
        const price = parseVal(row.querySelector('.row-price').value);

        const subtotal = qty * price;
        row.querySelector('.row-subtotal').innerText = Helper.formatCurrency(subtotal);
        row.dataset.subtotal = subtotal;
        this.calculateTotal();
    },

    calculateTotal() {
        let total = 0;
        document.querySelectorAll('#quote-items-body tr').forEach(row => {
            total += parseFloat(row.dataset.subtotal) || 0;
        });
        document.getElementById('q-total-display').innerText = Helper.formatCurrency(total);
        this.total = total;
    },

    async save(id = null) {
        const form = document.getElementById('quote-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const items = [];
        document.querySelectorAll('#quote-items-body tr').forEach(row => {
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
            supplier_id: document.getElementById('q-supplier').value,
            quote_number: document.getElementById('q-number').value,
            quote_date: document.getElementById('q-date').value,
            valid_until: document.getElementById('q-expiry').value,
            total_amount: this.total,
            items: items
        };

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/quotes/${id}` : '/quotes';
            const res = await Helper.fetchAPI(url, { method, body: JSON.stringify(data) });

            if (res.success) {
                bootstrap.Modal.getInstance(document.getElementById('quoteModal')).hide();
                Helper.alert('success', 'Cotización guardada exitosamente');
                this.init();
            } else {
                Helper.alert('error', res.message);
            }
        } catch (error) {
            Helper.alert('error', 'Error al guardar la cotización');
        }
    },

    async deleteQuote(id) {
        const confirm = await Helper.confirm('¿Eliminar cotización?', 'Esta acción no se puede deshacer.');
        if (confirm) {
            try {
                const res = await Helper.fetchAPI(`/quotes/${id}`, { method: 'DELETE' });
                if (res.success) {
                    Helper.alert('success', 'Cotización eliminada');
                    this.init();
                } else {
                    Helper.alert('error', res.message);
                }
            } catch (error) {
                Helper.alert('error', 'Error al eliminar la cotización');
            }
        }
    },

    async printQuote(id) {
        const quote = this.quotes.find(q => q.id === id);
        if (!quote) return;

        try {
            const res = await Helper.fetchAPI(`/quotes/${id}/details`);
            const items = res.success ? res.data : [];
            const supplier = this.suppliers.find(s => s.id == quote.supplier_id);

            let itemsHtml = '';
            items.forEach(item => {
                const itemInfo = this.items.find(i => i.id == item.item_id);
                // Calculate subtotal for the row
                const subtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
                itemsHtml += `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${itemInfo ? itemInfo.name : 'Unknown Item'}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${itemInfo ? itemInfo.unit : ''}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${Helper.formatNumber(item.quantity, 3)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${Helper.formatCurrency(item.unit_price)}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${Helper.formatCurrency(subtotal)}</td>
                    </tr>
                `;
            });

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Cotización #${quote.quote_number}</title>
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
                            <div class="title">COTIZACIÓN</div>
                            <div style="color: #667;"># ${quote.quote_number}</div>
                        </div>
                        <div style="text-align: right;">
                             <div><strong>Fecha:</strong> ${Helper.formatDate(quote.quote_date)}</div>             
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
                             <div style="margin-bottom: 5px;"><strong>Vencimiento:</strong> ${quote.valid_until ? Helper.formatDate(quote.valid_until) : 'N/A'}</div>
                             <div><strong>Estado:</strong> ${quote.status}</div>
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
                                <td style="text-align: right;">${Helper.formatCurrency(quote.total_amount)}</td>
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

// Auto-initialize if loaded directly
if (typeof CotizacionesView !== 'undefined' && document.getElementById('app')) {
    CotizacionesView.init();
}

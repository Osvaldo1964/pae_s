/**
 * Remisiones Entradas View - Módulo de Inventarios
 * Maneja el ingreso de mercancía desde proveedores vinculada a Órdenes de Compra
 */

window.RemisionesEntradasView = {
    remissions: [],
    purchaseOrders: [],
    suppliers: [],
    items: [],

    async init() {
        console.log('Initializing Remisiones Entradas Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [remRes, poRes, supplierRes, itemRes] = await Promise.all([
                Helper.fetchAPI('/remissions'), // Aquí filtraremos por tipo en el render
                Helper.fetchAPI('/purchase-orders'),
                Helper.fetchAPI('/proveedores'),
                Helper.fetchAPI('/items')
            ]);
            // Filtrar solo las de tipo ENTRADA_OC
            this.remissions = remRes.success ? (remRes.data || []).filter(r => r.type === 'ENTRADA_OC') : (Array.isArray(remRes) ? remRes.filter(r => r.type === 'ENTRADA_OC') : []);
            this.purchaseOrders = poRes.success ? (poRes.data || []) : (Array.isArray(poRes) ? poRes : []);
            this.suppliers = supplierRes.success ? (supplierRes.data || []) : (Array.isArray(supplierRes) ? supplierRes : []);
            this.items = itemRes.success ? (itemRes.data || []) : (Array.isArray(itemRes) ? itemRes : []);
        } catch (error) {
            console.error('Error loading remissions data:', error);
            Helper.alert('error', 'Error al cargar los datos de remisiones');
        }
    },

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1 text-primary fw-bold"><i class="fas fa-file-import me-2"></i>Remisiones de Entrada</h2>
                        <p class="text-muted mb-0">Ingreso de suministros desde proveedores (Cruce con OC)</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="RemisionesEntradasView.openModal()">
                        <i class="fas fa-plus me-1"></i> Nueva Entrada
                    </button>
                </div>

                <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0" id="remissions-entradas-table">
                                <thead class="bg-light">
                                    <tr class="text-muted small text-uppercase fw-bold">
                                        <th class="ps-4">No. Remisión</th>
                                        <th>Proveedor</th>
                                        <th>OC Soportada</th>
                                        <th>Fecha Ingreso</th>
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
        }
    },

    renderTableRows() {
        if (!this.remissions || this.remissions.length === 0) return '';

        return this.remissions.map(r => `
            <tr>
                <td class="ps-4 fw-bold text-dark">${r.remission_number || 'N/A'}</td>
                <td>
                    <span class="fw-medium">${r.supplier_name || 'N/A'}</span>
                </td>
                <td>
                    <span class="badge bg-light text-primary border">${r.po_number || 'S/O'}</span>
                </td>
                <td>${r.remission_date}</td>
                <td>
                    <span class="badge rounded-pill bg-success-soft text-success">INGRESADA</span>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group shadow-sm rounded-3">
                        <button class="btn btn-white btn-sm" onclick="RemisionesEntradasView.openModal(${r.id})" title="Ver"><i class="fas fa-eye text-primary"></i></button>
                        <button class="btn btn-white btn-sm text-danger" onclick="RemisionesEntradasView.delete(${r.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    initTable() {
        if ($.fn.DataTable.isDataTable('#remissions-entradas-table')) {
            $('#remissions-entradas-table').DataTable().destroy();
        }
        $('#remissions-entradas-table').DataTable({
            language: { url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json' },
            pageLength: 10,
            ordering: true,
            columnDefs: [{ targets: 5, orderable: false }]
        });
    },

    async openModal(id = null) {
        const isEdit = !!id;
        const remission = isEdit ? this.remissions.find(r => r.id == id) : null;
        let details = [];

        if (isEdit) {
            const res = await Helper.fetchAPI(`/remissions/${id}/details`);
            details = res.success ? res.data : [];
        }

        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'remissionEntradaModal';

        modalDiv.innerHTML = `
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-primary text-white py-3">
                        <h5 class="modal-title fw-bold">
                            <i class="fas fa-file-import me-2"></i> ${isEdit ? 'Detalle de Entrada' : 'Registrar Ingreso de Mercancía'}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4 bg-light">
                        <form id="remission-entrada-form">
                            <div class="card border-0 shadow-sm mb-4 rounded-3">
                                <div class="card-body p-4">
                                    <div class="row g-3">
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Orden de Compra</label>
                                            <select class="form-control form-select-lg border-2" id="msg-po" ${isEdit ? 'disabled' : ''} onchange="RemisionesEntradasView.handlePOChange(this.value)">
                                                <option value="">-- Compra sin OC / Directa --</option>
                                                ${this.purchaseOrders.map(po => `<option value="${po.id}" ${remission && remission.po_id == po.id ? 'selected' : ''}>${po.po_number} - ${po.supplier_name}</option>`).join('')}
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Proveedor</label>
                                            <select class="form-control form-select-lg border-2" id="msg-supplier" required ${isEdit ? 'disabled' : ''}>
                                                <option value="">-- Seleccionar Proveedor --</option>
                                                ${this.suppliers.map(s => `<option value="${s.id}" ${remission && remission.supplier_id == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">No. Factura / Remisión Prov.</label>
                                            <input type="text" class="form-control form-control-lg border-2" id="msg-number" value="${remission ? remission.remission_number : ''}" required ${isEdit ? 'readonly' : ''}>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Fecha Ingreso</label>
                                            <div class="d-flex">
                                                <input type="date" class="form-control form-control-lg border-2 me-2" id="msg-date" value="${remission ? remission.remission_date : new Date().toISOString().split('T')[0]}" required ${isEdit ? 'readonly' : ''}>
                                                ${isEdit && remission ? `
                                                <button type="button" class="btn btn-outline-dark shadow-sm" title="Imprimir Remisión" onclick="RemisionesEntradasView.printRemission(${remission.id})">
                                                    <i class="fas fa-print"></i>
                                                </button>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card border-0 shadow-sm rounded-3">
                                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                                    <h6 class="mb-0 fw-bold"><i class="fas fa-list me-2 text-primary"></i>Ítems Recibidos</h6>
                                    ${!isEdit ? `
                                    <button type="button" class="btn btn-outline-primary btn-sm rounded-pill" onclick="RemisionesEntradasView.addItemRow()">
                                        <i class="fas fa-plus me-1"></i> Agregar Manual
                                    </button>
                                    ` : ''}
                                </div>
                                <div class="card-body p-0">
                                    <div class="table-responsive">
                                        <table class="table table-hover align-middle mb-0">
                                            <thead class="bg-light small text-uppercase">
                                                <tr>
                                                    <th class="ps-4">Ítem / Insumo</th>
                                                    <th style="width: 150px;" class="text-end">Solicitado</th>
                                                    <th style="width: 150px;" class="text-end">Recibido</th>
                                                    <th class="text-end pe-4" style="width: 50px;"></th>
                                                </tr>
                                            </thead>
                                            <tbody id="remission-entrada-items-body">
                                                <!-- Rows here -->
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer bg-white py-3">
                        <button type="button" class="btn btn-link text-muted fw-bold text-decoration-none" data-bs-dismiss="modal">Cerrar</button>
                        ${!isEdit ? `
                        <button type="button" class="btn btn-primary px-5 rounded-pill shadow" onclick="RemisionesEntradasView.save()">
                            <i class="fas fa-check-circle me-2"></i>Registrar Ingreso
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        if (isEdit) {
            details.forEach(item => this.addItemRow(item, true));
        }

        modalDiv.addEventListener('hidden.bs.modal', () => modalDiv.remove());
    },

    async handlePOChange(poId) {
        if (!poId) return;
        const po = this.purchaseOrders.find(p => p.id == poId);
        if (po) {
            document.getElementById('msg-supplier').value = po.supplier_id;

            const confirm = await Swal.fire({
                title: '¿Cargar ítems de la OC?',
                text: "Se cargarán los productos pendientes por recibir de esta orden.",
                icon: 'question',
                showCancelButton: true
            });

            if (confirm.isConfirmed) {
                try {
                    const res = await Helper.fetchAPI(`/purchase-orders/${poId}/details`);
                    if (res.success) {
                        document.getElementById('remission-entrada-items-body').innerHTML = '';
                        res.data.forEach(item => {
                            const ordered = parseFloat(item.quantity_ordered) || 0;
                            const received = parseFloat(item.quantity_received) || 0;
                            const pending = ordered - received;

                            if (pending > 0) {
                                this.addItemRow({
                                    item_id: item.item_id,
                                    quantity: pending,
                                    requested: pending
                                });
                            }
                        });

                        if (document.getElementById('remission-entrada-items-body').innerHTML === '') {
                            Helper.alert('info', 'Esta orden ya ha sido recibida completamente.');
                        }
                    }
                } catch (error) {
                    Helper.alert('error', 'Error al cargar detalles de la OC');
                }
            }

        }
    },

    async delete(id) {
        const confirm = await Swal.fire({
            title: '¿Eliminar Remisión?',
            text: "Esta acción descontará el stock que ingresó. Si ya consumiste este stock en salidas, tu inventario podría quedar en negativo.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            try {
                const res = await Helper.fetchAPI(`/remissions/${id}`, { method: 'DELETE' });
                if (res.success) {
                    Swal.fire('¡Eliminado!', 'La remisión ha sido eliminada y el stock revertido.', 'success');
                    this.init();
                } else {
                    Helper.alert('error', res.message);
                }
            } catch (error) {
                Helper.alert('error', 'Error al eliminar');
            }
        }
    },

    addItemRow(data = null, readonly = false) {
        const body = document.getElementById('remission-entrada-items-body');
        const row = document.createElement('tr');

        const itemsHtml = this.items.map(i => `<option value="${i.id}" ${data && data.item_id == i.id ? 'selected' : ''}>${i.name} (${i.unit_abbr || i.unit})</option>`).join('');

        row.innerHTML = `
            <td class="ps-4">
                <select class="form-select border-0 bg-transparent row-item" required ${readonly ? 'disabled' : ''}>
                    <option value="">-- Seleccionar --</option>
                    ${itemsHtml}
                </select>
            </td>
            <td class="text-muted small text-end">
                ${data && data.requested ? Helper.formatNumber(data.requested, 3) : '-'}
            </td>
            <td>
                <input type="text" class="form-control border-0 bg-transparent row-qty text-end" 
                       value="${data ? Helper.formatNumber(data.quantity_sent || data.quantity, 3) : '1.000'}" 
                       onfocus="RemisionesEntradasView.unformatInput(this)" 
                       onblur="RemisionesEntradasView.formatInput(this, 3)" required ${readonly ? 'readonly' : ''}>
            </td>
            <td class="text-end pe-4">
                ${!readonly ? `
                <button type="button" class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove()">
                    <i class="fas fa-times"></i>
                </button>
                ` : ''}
            </td>
        `;
        body.appendChild(row);
    },

    async save() {
        const form = document.getElementById('remission-entrada-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const items = [];
        document.querySelectorAll('#remission-entrada-items-body tr').forEach(row => {
            const itemId = row.querySelector('.row-item').value;
            const qtyStr = row.querySelector('.row-qty').value.replace(/,/g, '');
            const qty = parseFloat(qtyStr) || 0;
            
            if (itemId && qty > 0) {
                items.push({
                    item_id: itemId,
                    quantity: qtyStr
                });
            }
        });

        if (items.length === 0) {
            Helper.alert('warning', 'Debe haber al menos un ítem.');
            return;
        }

        const data = {
            type: 'ENTRADA_OC',
            po_id: document.getElementById('msg-po').value || null,
            supplier_id: document.getElementById('msg-supplier').value,
            remission_number: document.getElementById('msg-number').value,
            remission_date: document.getElementById('msg-date').value,
            status: 'ENTREGADA',
            items: items.map(item => ({
                item_id: item.item_id,
                quantity: item.quantity.replace(/,/g, '') // Remove commas
            }))
        };

        try {
            const res = await Helper.fetchAPI('/remissions', { method: 'POST', body: JSON.stringify(data) });
            if (res.success) {
                bootstrap.Modal.getInstance(document.getElementById('remissionEntradaModal')).hide();
                Swal.fire('¡Éxito!', 'Entrada registrada y stock actualizado.', 'success');
                this.init();
            } else {
                Helper.alert('error', res.message);
            }
        } catch (error) {
            Helper.alert('error', 'Error en el servidor');
        }
    },

    async deleteRemission(id) {
        if (!await Helper.confirm('¿Eliminar esta entrada?', 'Se revertirá el impacto en el inventario.')) return;

        try {
            const res = await Helper.fetchAPI(`/remissions/${id}`, { method: 'DELETE' });
            if (res.success) {
                Helper.alert('success', 'Entrada eliminada');
                this.init();
            } else {
                Helper.alert('error', res.message);
            }
        } catch (error) {
            Helper.alert('error', 'Error al eliminar');
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

    async printRemission(id) {
        const remission = this.remissions.find(r => r.id == id);
        if (!remission) return;

        try {
            const res = await Helper.fetchAPI(`/remissions/${id}/details`);
            const items = res.success ? res.data : [];
            const supplier = this.suppliers.find(s => s.id == remission.supplier_id);
            const po = this.purchaseOrders.find(p => p.id == remission.po_id);

            let itemsHtml = '';
            items.forEach(item => {
                const itemInfo = this.items.find(i => i.id == item.item_id);
                // For remissions, we focus on Quantity Received
                const qty = parseFloat(item.quantity_sent || item.quantity) || 0;

                itemsHtml += `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${itemInfo ? itemInfo.name : 'Unknown Item'}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${itemInfo ? (itemInfo.unit_abbr || itemInfo.unit) : ''}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${Helper.formatNumber(qty, 3)}</td>
                    </tr>
                `;
            });

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Remisión de Entrada #${remission.remission_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.4; font-size: 14px; }
                        .header { margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
                        .title { font-size: 24px; font-weight: bold; color: #333; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
                        th { background-color: #f8f9fa; border: 1px solid #ddd; padding: 10px; text-align: left; font-weight: bold; }
                        td { border: 1px solid #ddd; padding: 8px; }
                        .signature-section { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                        .signature-box { width: 45%; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
                        @media print {
                            body { padding: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="title">REMISIÓN DE ENTRADA / INGRESO</div>
                            <div style="color: #667;">Ref: ${remission.remission_number}</div>
                        </div>
                        <div style="text-align: right;">
                             <div><strong>Fecha Ingreso:</strong> ${Helper.formatDate(remission.remission_date)}</div>
                             <div style="font-size: 12px; color: #999;">Generado: ${new Date().toLocaleString()}</div>
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
                             <div style="margin-bottom: 5px;"><strong>Orden de Compra:</strong> ${po ? po.po_number : 'NO APLICA / DIRECTA'}</div>
                             <div><strong>Estado:</strong> ${remission.status}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Ítem / Descripción</th>
                                <th style="text-align: center; width: 100px;">Unidad</th>
                                <th style="text-align: right; width: 120px;">Cantidad Recibida</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="signature-section">
                        <div class="signature-box">
                            <div>Recibido Por (Almacén)</div>
                            <div style="font-size: 11px; color: #999; margin-top: 5px;">Firma y Sello</div>
                        </div>
                        <div class="signature-box">
                            <div>Entregado Por (Proveedor)</div>
                            <div style="font-size: 11px; color: #999; margin-top: 5px;">Firma y Cédula</div>
                        </div>
                    </div>

                    <div style="font-size: 11px; color: #999; margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
                        <p>Documento generado por PAE Control WebApp</p>
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
if (typeof RemisionesEntradasView !== 'undefined') {
    RemisionesEntradasView.init();
}

/**
 * Salidas View - Módulo de Inventarios
 * Maneja las salidas de almacén hacia las sedes educativas basadas en proyecciones.
 */

window.SalidasView = {
    remissions: [],
    branches: [],
    items: [],
    cycles: [],
    currentProjections: [],

    async init() {
        console.log('Initializing Salidas Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [remRes, branchRes, itemRes, cycleRes] = await Promise.all([
                Helper.fetchAPI('/remissions'),
                Helper.fetchAPI('/branches'),
                Helper.fetchAPI('/items'),
                Helper.fetchAPI('/menu-cycles')
            ]);

            this.remissions = remRes.success ? (remRes.data || []).filter(r => r.type === 'SALIDA_SEDE') : (Array.isArray(remRes) ? remRes.filter(r => r.type === 'SALIDA_SEDE') : []);
            this.branches = branchRes.success ? (branchRes.data || []) : (Array.isArray(branchRes) ? branchRes : []);
            this.items = itemRes.success ? (itemRes.data || []) : (Array.isArray(itemRes) ? itemRes : []);
            this.cycles = cycleRes.success ? (cycleRes.data || []) : (Array.isArray(cycleRes) ? cycleRes : []);
        } catch (error) {
            console.error('Error loading remissions data:', error);
            Helper.alert('error', 'Error al cargar los datos de salidas');
        }
    },

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1 text-primary fw-bold"><i class="fas fa-truck-loading me-2"></i>Salidas de Almacén</h2>
                        <p class="text-muted mb-0">Control de entregas y despachos a sedes educativas</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="SalidasView.openModal()">
                        <i class="fas fa-plus me-1"></i> Nueva Salida
                    </button>
                </div>

                <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0" id="salidas-table">
                                <thead class="bg-light">
                                    <tr class="text-muted small text-uppercase fw-bold">
                                        <th class="ps-4">No. Salida</th>
                                        <th>Sede Destino</th>
                                        <th>Fecha</th>
                                        <th>Conductor</th>
                                        <th>Placa</th>
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
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm bg-light rounded-circle text-primary d-flex align-items-center justify-content-center me-2" style="width:32px; height:32px">
                            <i class="fas fa-school small"></i>
                        </div>
                        <span class="fw-medium">${r.branch_name}</span>
                    </div>
                </td>
                <td>${r.remission_date}</td>
                <td>${r.carrier_name || '<span class="text-muted">-</span>'}</td>
                <td><span class="badge bg-light text-dark border">${r.vehicle_plate || '-'}</span></td>
                <td>
                    <span class="badge rounded-pill ${this.getStatusBadgeClass(r.status)}">${r.status}</span>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group shadow-sm rounded-3">
                        <button class="btn btn-white btn-sm" onclick="SalidasView.openModal(${r.id})" title="Ver/Editar"><i class="fas fa-edit text-primary"></i></button>
                        <button class="btn btn-white btn-sm" onclick="SalidasView.deleteRemission(${r.id})" title="Eliminar"><i class="fas fa-trash text-danger"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    getStatusBadgeClass(status) {
        switch (status) {
            case 'ENTREGADA': return 'bg-success-soft text-success';
            case 'CON_NOVEDAD': return 'bg-danger-soft text-danger';
            case 'CAMINO': return 'bg-info-soft text-info';
            default: return 'bg-secondary-soft text-secondary';
        }
    },

    initTable() {
        if ($.fn.DataTable.isDataTable('#salidas-table')) {
            $('#salidas-table').DataTable().destroy();
        }
        $('#salidas-table').DataTable({
            language: { url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json' },
            pageLength: 10,
            ordering: true,
            columnDefs: [{ targets: 6, orderable: false }]
        });
    },

    async openModal(id = null) {
        this.currentProjections = [];
        const isEdit = !!id;
        const remission = isEdit ? this.remissions.find(r => r.id == id) : null;
        let remissionItems = [];

        if (isEdit) {
            try {
                const res = await Helper.fetchAPI(`/remissions/${id}/details`);
                remissionItems = res.success ? res.data : [];
            } catch (error) {
                console.error('Error fetching remission details:', error);
            }
        }

        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'salidaModal';

        const branchesHtml = this.branches.map(b => `<option value="${b.id}" ${remission && remission.branch_id == b.id ? 'selected' : ''}>${b.name}</option>`).join('');

        modalDiv.innerHTML = `
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-primary text-white py-3">
                        <h5 class="modal-title fw-bold">
                            <i class="fas ${isEdit ? 'fa-edit' : 'fa-plus-circle'} me-2"></i>
                            ${isEdit ? 'Editar Salida' : 'Nueva Salida de Almacén'}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4 bg-light">
                        <form id="salida-form">
                            <div class="card border-0 shadow-sm mb-4 rounded-3">
                                <div class="card-body p-4">
                                    <div class="row g-3">
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Ciclo de Menú</label>
                                            <select class="form-control form-select-lg border-2" id="msg-cycle" required onchange="SalidasView.handleHeaderChange()">
                                                <option value="">-- Seleccionar Ciclo --</option>
                                                ${this.cycles.map(c => `<option value="${c.id}" ${remission && remission.cycle_id == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                                            </select>
                                        </div>
                                        <div class="col-md-5">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Sede Destino</label>
                                            <select class="form-control form-select-lg border-2" id="msg-branch" required onchange="SalidasView.handleHeaderChange()">
                                                <option value="">-- Seleccionar Sede --</option>
                                                ${branchesHtml}
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label small fw-bold text-muted text-uppercase">No. Salida</label>
                                            <input type="text" class="form-control form-control-lg border-2" id="msg-number" value="${remission ? remission.remission_number : ''}" placeholder="SAL-XXX" required>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Fecha Despacho</label>
                                            <div class="d-flex">
                                                <input type="date" class="form-control form-control-lg border-2 me-2" id="msg-date" value="${remission ? remission.remission_date : new Date().toISOString().split('T')[0]}" required>
                                                ${isEdit && remission ? `
                                                <button type="button" class="btn btn-outline-dark shadow-sm" title="Imprimir Salida" onclick="SalidasView.printRemission(${remission.id})">
                                                    <i class="fas fa-print"></i>
                                                </button>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row g-3 mt-2">
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Conductor</label>
                                            <input type="text" class="form-control border-2" id="msg-carrier" value="${remission ? remission.carrier_name : ''}" required>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Placa Vehículo</label>
                                            <input type="text" class="form-control border-2" id="msg-plate" value="${remission ? remission.vehicle_plate : ''}" required>
                                        </div>
                                        <div class="col-md-5">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Estado</label>
                                            <select class="form-control border-2" id="msg-status">
                                                <option value="CAMINO" ${remission && remission.status === 'CAMINO' ? 'selected' : ''}>EN CAMINO</option>
                                                <option value="ENTREGADA" ${remission && remission.status === 'ENTREGADA' ? 'selected' : ''}>ENTREGADA</option>
                                                <option value="CON_NOVEDAD" ${remission && remission.status === 'CON_NOVEDAD' ? 'selected' : ''}>CON NOVEDAD</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card border-0 shadow-sm rounded-3">
                                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                                    <h6 class="mb-0 fw-bold"><i class="fas fa-boxes me-2 text-primary"></i>Ítems a Despachar</h6>
                                    <button type="button" class="btn btn-outline-primary btn-sm rounded-pill" onclick="SalidasView.addItemRow()">
                                        <i class="fas fa-plus me-1"></i> Agregar Ítem
                                    </button>
                                </div>
                                <div class="card-body p-0">
                                    <div class="table-responsive">
                                        <table class="table table-hover align-middle mb-0">
                                            <thead class="bg-light small text-uppercase">
                                                <tr>
                                                    <th class="ps-4">Ítem / Alimento</th>
                                                    <th style="width: 120px;" class="text-end">Proyectado</th>
                                                    <th style="width: 120px;" class="text-end">Pendiente</th>
                                                    <th style="width: 180px;">Lote (Opcional)</th>
                                                    <th style="width: 130px;" class="text-end">Cantidad</th>
                                                    <th class="text-end pe-4" style="width: 50px;"></th>
                                                </tr>
                                            </thead>
                                            <tbody id="salida-items-body">
                                                <!-- Rows here -->
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer bg-white py-3">
                        <button type="button" class="btn btn-link text-muted fw-bold text-decoration-none" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary px-5 rounded-pill shadow" onclick="SalidasView.save(${remission ? remission.id : null})">
                            <i class="fas fa-save me-2"></i>${isEdit ? 'Actualizar Salida' : 'Guardar Salida'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        if (isEdit && remissionItems.length > 0) {
            remissionItems.forEach(item => this.addItemRow(item));
        } else {
            this.addItemRow();
        }

        modalDiv.addEventListener('hidden.bs.modal', () => modalDiv.remove());
    },

    async handleHeaderChange() {
        this.currentProjections = [];
        const cycleId = document.getElementById('msg-cycle').value;
        const branchId = document.getElementById('msg-branch').value;

        if (cycleId && branchId) {
            try {
                // Proactively fetch projections so balances are available for manual selection
                const res = await Helper.fetchAPI(`/inventory/branch-projections/${cycleId}/${branchId}`);
                if (res.success) {
                    this.currentProjections = res.data;

                    // Only prompt if they have pending items to load
                    const hasPending = this.currentProjections.some(p => (parseFloat(p.projected_qty) - parseFloat(p.delivered_qty)) > 0);

                    if (hasPending) {
                        const confirm = await Swal.fire({
                            title: '¿Cargar proyecciones?',
                            text: "Se cargarán automáticamente los ítems con saldo pendiente para esta sede.",
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Sí, cargar'
                        });

                        if (confirm.isConfirmed) {
                            document.getElementById('salida-items-body').innerHTML = '';
                            this.currentProjections.forEach(item => {
                                const pend = parseFloat(item.projected_qty) - parseFloat(item.delivered_qty);
                                if (pend > 0) {
                                    this.addItemRow({
                                        item_id: item.item_id,
                                        quantity: pend,
                                        projected_info: Helper.formatNumber(item.projected_qty, 2),
                                        pending_info: Helper.formatNumber(pend, 2)
                                    });
                                }
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching projections:', error);
                Helper.alert('error', 'Error al cargar datos de proyecciones');
            }
        }
    },

    addItemRow(data = null) {
        const body = document.getElementById('salida-items-body');
        const row = document.createElement('tr');

        // Filter items based on currentProjections if cycle/branch are selected
        let filteredItems = this.items;
        if (this.currentProjections.length > 0) {
            const projectedIds = this.currentProjections
                .filter(p => (parseFloat(p.projected_qty) - parseFloat(p.delivered_qty)) > 0)
                .map(p => parseInt(p.item_id));

            // If we are editing/viewing existing data, we must include that item even if pend <= 0
            if (data && data.item_id) {
                if (!projectedIds.includes(parseInt(data.item_id))) {
                    projectedIds.push(parseInt(data.item_id));
                }
            }

            filteredItems = this.items.filter(i => projectedIds.includes(parseInt(i.id)));
        }

        const itemsHtml = filteredItems.map(i => `<option value="${i.id}" ${data && data.item_id == i.id ? 'selected' : ''}>${i.name} (${i.unit_abbr || i.unit || ''})</option>`).join('');

        row.innerHTML = `
            <td class="ps-4">
                <select class="form-select border-0 bg-transparent row-item" required onchange="SalidasView.updateRowProjected(this)">
                    <option value="">-- Seleccionar Ítem --</option>
                    ${itemsHtml}
                </select>
            </td>
            <td class="small text-muted text-end row-projected-info">
                ${data && data.projected_info ? data.projected_info : '-'}
            </td>
            <td class="small fw-bold text-end row-pending-info">
                ${data && data.pending_info ? data.pending_info : '-'}
            </td>
            <td>
                <input type="text" class="form-control border-0 bg-transparent row-batch" value="${data ? (data.batch_number || '') : ''}" placeholder="Lote...">
            </td>
            <td>
                <input type="text" class="form-control border-0 bg-transparent row-qty text-end" 
                       value="${data ? Helper.formatNumber(data.quantity || data.quantity_sent, 3) : '1.000'}" 
                       onfocus="SalidasView.unformatInput(this)" 
                       onblur="SalidasView.formatInput(this, 3)" required>
            </td>
            <td class="text-end pe-4">
                <button type="button" class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        body.appendChild(row);
    },

    updateRowProjected(select) {
        const row = select.closest('tr');
        const projectedTd = row.querySelector('.row-projected-info');
        const pendingTd = row.querySelector('.row-pending-info');
        const itemId = select.value;

        if (!itemId) {
            projectedTd.innerText = '-';
            pendingTd.innerText = '-';
            return;
        }

        const projection = this.currentProjections.find(p => p.item_id == itemId);
        if (projection) {
            const pend = parseFloat(projection.projected_qty) - parseFloat(projection.delivered_qty);
            projectedTd.innerText = Helper.formatNumber(projection.projected_qty, 2);
            pendingTd.innerText = Helper.formatNumber(pend, 2);

            // Auto-fill quantity if it's currently 1.000 (default) or 0
            const qtyInput = row.querySelector('.row-qty');
            if (qtyInput.value === '1.000' || parseFloat(qtyInput.value) === 0) {
                qtyInput.value = Helper.formatNumber(pend, 3);
            }
        } else {
            projectedTd.innerText = 'No proyectado';
            pendingTd.innerText = '-';
        }
    },

    async save(id = null) {
        const form = document.getElementById('salida-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const items = [];
        document.querySelectorAll('#salida-items-body tr').forEach(row => {
            const itemId = row.querySelector('.row-item').value;
            if (itemId) {
                items.push({
                    item_id: itemId,
                    batch: row.querySelector('.row-batch').value,
                    quantity: row.querySelector('.row-qty').value
                });
            }
        });

        if (items.length === 0) {
            Helper.alert('warning', 'Debe agregar al menos un ítem.');
            return;
        }

        const data = {
            type: 'SALIDA_SEDE',
            cycle_id: document.getElementById('msg-cycle').value,
            branch_id: document.getElementById('msg-branch').value,
            remission_number: document.getElementById('msg-number').value,
            remission_date: document.getElementById('msg-date').value,
            carrier_name: document.getElementById('msg-carrier').value,
            vehicle_plate: document.getElementById('msg-plate').value,
            status: document.getElementById('msg-status').value,
            notes: document.getElementById('msg-notes') ? document.getElementById('msg-notes').value : '',
            items: items.map(item => ({
                item_id: item.item_id,
                batch: item.batch,
                quantity: item.quantity.replace(/,/g, '') // Remove commas
            }))
        };

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/remissions/${id}` : '/remissions';
            const res = await Helper.fetchAPI(url, { method, body: JSON.stringify(data) });

            if (res.success) {
                bootstrap.Modal.getInstance(document.getElementById('salidaModal')).hide();
                Helper.alert('success', 'Salida de Almacén guardada');
                this.init();
            } else {
                Helper.alert('error', res.message);
            }
        } catch (error) {
            Helper.alert('error', 'Error al guardar');
        }
    },

    async deleteRemission(id) {
        if (!await Helper.confirm('¿Eliminar esta remisión?', 'Se revertirá el impacto en el inventario.')) return;

        try {
            const res = await Helper.fetchAPI(`/remissions/${id}`, { method: 'DELETE' });
            if (res.success) {
                Helper.alert('success', 'Remisión eliminada');
                this.init();
            } else {
                Helper.alert('error', res.message);
            }
        } catch (error) {
            Helper.alert('error', 'Error al eliminar');
        }
    },

    async printRemission(id) {
        const remission = this.remissions.find(r => r.id == id);
        if (!remission) return;

        try {
            const res = await Helper.fetchAPI(`/remissions/${id}/details`);
            const items = res.success ? res.data : [];
            const branch = this.branches.find(b => b.id == remission.branch_id);
            const cycle = this.cycles.find(c => c.id == remission.cycle_id);

            let itemsHtml = '';
            items.forEach(item => {
                const itemInfo = this.items.find(i => i.id == item.item_id);
                // For salidas, backend returns 'quantity' inside details? No, it's 'quantity_sent' in inventory_remission_details
                // but InventoryController getRemissionDetails selects * from inventory_remission_details.
                // However, wait, the stored procedure/controller might return generic 'quantity' if aliased?
                // Let's use fallback.
                const qtyVal = parseFloat(item.quantity || item.quantity_sent) || 0;

                itemsHtml += `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${itemInfo ? itemInfo.name : 'Unknown Item'}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${itemInfo ? (itemInfo.unit_abbr || itemInfo.unit) : ''}</td>
                        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${Helper.formatNumber(qtyVal, 3)}</td>
                    </tr>
                `;
            });

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Salida de Almacén #${remission.remission_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.4; font-size: 14px; }
                        .header { margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
                        .title { font-size: 24px; font-weight: bold; color: #333; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
                        th { background-color: #f8f9fa; border: 1px solid #ddd; padding: 10px; text-align: left; font-weight: bold; }
                        td { border: 1px solid #ddd; padding: 8px; }
                        .signature-section { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }
                        .signature-box { width: 30%; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
                        @media print {
                            body { padding: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="title">SALIDA DE ALMACÉN / DESPACHO</div>
                            <div style="color: #667;">Ref: ${remission.remission_number}</div>
                        </div>
                        <div style="text-align: right;">
                             <div><strong>Fecha Despacho:</strong> ${Helper.formatDate(remission.remission_date)}</div>
                             <div style="font-size: 12px; color: #999;">Generado: ${new Date().toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <div class="info-grid">
                        <div>
                            <div style="font-size: 11px; text-transform: uppercase; color: #777; margin-bottom: 4px;">Destino (Sede Educativa)</div>
                            <div style="font-weight: bold; font-size: 16px;">${branch ? branch.name : 'N/A'}</div>
                            <div>Ciclo de Menú: ${cycle ? cycle.name : 'N/A'}</div>
                        </div>
                        <div style="text-align: right;">
                             <div style="margin-bottom: 5px;"><strong>Transportador:</strong> ${remission.carrier_name || 'N/A'}</div>
                             <div><strong>Vehículo / Placa:</strong> ${remission.vehicle_plate || 'N/A'}</div>
                             <div style="margin-top: 5px;"><strong>Estado:</strong> ${remission.status}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Ítem / Descripción</th>
                                <th style="text-align: center; width: 100px;">Unidad</th>
                                <th style="text-align: right; width: 120px;">Cantidad Despachada</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="signature-section">
                        <div class="signature-box">
                            <div>Entregado Por (Almacén)</div>
                            <div style="font-size: 11px; color: #999; margin-top: 5px;">Firma y Sello</div>
                        </div>
                        <div class="signature-box">
                            <div>Transportador</div>
                            <div style="font-size: 11px; color: #999; margin-top: 5px;">Firma y Cédula</div>
                        </div>
                        <div class="signature-box">
                            <div>Recibido Por (Sede)</div>
                            <div style="font-size: 11px; color: #999; margin-top: 5px;">Firma y Sello</div>
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
    }
};

// Initialize
if (typeof SalidasView !== 'undefined') {
    SalidasView.init();
}

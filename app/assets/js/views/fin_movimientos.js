/**
 * Movimientos View - Finance Module
 * Daily Record of Income and Expenses
 */

window.MovimientosView = {
    movimientos: [],
    budget: [],
    terceros: [],

    async init() {
        console.log('Initializing Movimientos Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [movimientos, budget, terceros, movimientoTipos] = await Promise.all([
                Helper.fetchAPI('/movimientos'),
                Helper.fetchAPI('/movimientos/budget'),
                Helper.fetchAPI('/terceros'),
                Helper.fetchAPI('/movimientos-tipos')
            ]);
            this.movimientos = Array.isArray(movimientos) ? movimientos : [];
            this.budget = Array.isArray(budget) ? budget : [];
            this.terceros = Array.isArray(terceros) ? terceros : [];
            this.movimientoTipos = Array.isArray(movimientoTipos) ? movimientoTipos : [];
        } catch (error) {
            console.error('Error loading movements data:', error);
        }
    },

    render() {
        const totalGastado = this.movimientos.reduce((acc, mov) => acc + parseFloat(mov.valor), 0);
        const hoy = new Date().toISOString().split('T')[0];
        const gastadoHoy = this.movimientos
            .filter(m => m.fecha === hoy)
            .reduce((acc, mov) => acc + parseFloat(mov.valor), 0);

        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="text-primary-custom fw-bold mb-0">Movimientos Financieros</h2>
                        <p class="text-muted">Registro diario de egresos y ejecución presupuestal</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="MovimientosView.openModal()">
                        <i class="fas fa-plus me-2"></i>Nuevo Movimiento
                    </button>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm p-3 h-100 border-start border-danger border-4">
                            <h6 class="small text-uppercase mb-1 text-muted">Total Ejecutado (Histórico)</h6>
                            <h3 class="mb-0 fw-bold text-danger">${Helper.formatCurrency(totalGastado)}</h3>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm p-3 h-100 border-start border-warning border-4">
                            <h6 class="small text-uppercase mb-1 text-muted">Ejecutado Hoy</h6>
                            <h3 class="mb-0 fw-bold text-warning">${Helper.formatCurrency(gastadoHoy)}</h3>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="movimientosTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">Fecha / Doc</th>
                                        <th>Rubro / Centro</th>
                                        <th>Tercero / Beneficiario</th>
                                        <th class="text-end">Valor</th>
                                        <th class="text-center">Soporte</th>
                                        <th class="text-center pe-4" style="width: 120px;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderTableBody()}
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
            Helper.initDataTable('#movimientosTable', { order: [[0, 'desc']] });
        }
    },

    renderTableBody() {
        return this.movimientos.map(m => `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold">${Helper.formatDate(m.fecha)}</div>
                    <small class="text-muted"><i class="fas fa-file-invoice me-1"></i>${m.numero_documento || 'S/N'}</small>
                </td>
                <td>
                    <div class="small fw-bold">${m.item_codigo} - ${m.item_nombre}</div>
                    <div class="x-small text-muted" style="font-size: 0.75rem;">${m.school_name} - ${m.branch_name}</div>
                </td>
                <td>
                    <div class="fw-bold text-primary-custom text-uppercase">${m.tercero_nombre}</div>
                    <div class="x-small text-muted">${m.tipo_movimiento}</div>
                </td>
                <td class="text-end">
                    <span class="fw-bold text-danger">${Helper.formatCurrency(m.valor)}</span>
                </td>
                <td class="text-center">
                    ${m.soporte_url ?
                `<a href="${Config.ROOT_URL}${m.soporte_url}" target="_blank" class="btn btn-sm btn-light text-info shadow-sm">
                            <i class="fas fa-eye me-1"></i>Ver
                         </a>` :
                `<span class="text-muted small">Sin soporte</span>`}
                </td>
                <td class="text-center pe-4">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary border-0" onclick="MovimientosView.editItem(${m.id_movimiento})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger border-0" onclick="MovimientosView.deleteItem(${m.id_movimiento})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    async openModal(editId = null) {
        let item = null;
        if (editId) {
            Helper.loading(true);
            item = await Helper.fetchAPI(`/movimientos/${editId}`);
            Helper.loading(false);
        }

        const budgetOptions = this.budget.map(b => {
            const isSelected = item?.asignacion_id == b.id_asignacion;
            // If editing, and it's the current assignment, available balance should include current value
            let saldo = parseFloat(b.saldo_disponible);
            if (isSelected) saldo = parseFloat(item.saldo_disponible_con_mov);

            return `<option value="${b.id_asignacion}" ${isSelected ? 'selected' : ''} data-saldo="${saldo}">
                ${b.codigo} - ${b.item_nombre} (${b.school_name} - ${b.branch_name}) | Saldo: ${Helper.formatCurrency(saldo)}
             </option>`;
        }).join('');

        const tercerOptions = this.terceros.map(t =>
            `<option value="${t.id_tercero}" ${item?.tercero_id == t.id_tercero ? 'selected' : ''}>${t.identificacion} - ${t.nombres}</option>`
        ).join('');

        const today = new Date().toISOString().split('T')[0];

        const { value: formValues } = await Swal.fire({
            title: `<strong>${editId ? 'Editar' : 'Nuevo'} Movimiento</strong>`,
            width: '1000px',
            html: `
                <div class="text-start px-2 py-3">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-uppercase">Fecha</label>
                            <input id="mov-fecha" type="date" class="form-control" value="${item?.fecha || today}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-uppercase">Tipo Movimiento</label>
                            <select id="mov-tipo" class="form-select">
                                ${this.movimientoTipos.map(t => {
                                    const isSelected = item?.tipo_movimiento?.toUpperCase() === t.nombre.toUpperCase();
                                    return `<option value="${t.nombre}" ${isSelected ? 'selected' : ''}>${t.nombre}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-uppercase">Valor ($)</label>
                            <input id="mov-valor" type="number" step="any" class="form-control" placeholder="0.00" value="${item?.valor || ''}">
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-uppercase">Rubro / Centro de Costo (Saldo Disponible)</label>
                            <select id="mov-asignacion" class="form-select" ${editId ? 'disabled' : ''}>
                                <option value="">Seleccione Rubro/Centro</option>
                                ${budgetOptions}
                            </select>
                            ${editId ? '<small class="text-muted">El rubro no se puede cambiar en edición. Elimine y cree uno nuevo si es necesario.</small>' : ''}
                        </div>

                        <div class="col-md-8">
                            <label class="form-label small fw-bold text-uppercase">Tercero / Beneficiario</label>
                            <select id="mov-tercero" class="form-select">
                                <option value="">Seleccione Tercero</option>
                                ${tercerOptions}
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-uppercase">No. Documento / Factura</label>
                            <input id="mov-documento" class="form-control" placeholder="Nro de soporte" value="${item?.numero_documento || ''}">
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-uppercase">Soporte (PDF/Imagen) - <small class="text-muted text-lowercase font-italic">Opcional</small></label>
                            <input id="mov-soporte" type="file" class="form-control" accept="image/*,application/pdf">
                            ${item?.soporte_url ? `<div class="mt-1 small"><a href="${Config.ROOT_URL}${item.soporte_url}" target="_blank" class="text-primary"><i class="fas fa-file-download me-1"></i>Ver soporte actual</a></div>` : ''}
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-uppercase">Detalle / Observación</label>
                            <textarea id="mov-detalle" class="form-control" rows="3" placeholder="Descripción detallada del egreso...">${item?.detalle || ''}</textarea>
                        </div>
                    </div>
                </div>
            `,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Guardar',
            cancelButtonText: 'Cerrar',
            preConfirm: () => {
                const asignacion_id = document.getElementById('mov-asignacion').value;
                const tercero_id = document.getElementById('mov-tercero').value;
                const valor = parseFloat(document.getElementById('mov-valor').value) || 0;
                const fecha = document.getElementById('mov-fecha').value;

                if (!asignacion_id || !tercero_id || valor <= 0 || !fecha) {
                    Swal.showValidationMessage('Complete todos los campos obligatorios y asegure que el valor sea mayor a 0');
                    return false;
                }

                // Balance check
                const selectEl = document.getElementById('mov-asignacion');
                const selectedOption = selectEl.options[selectEl.selectedIndex];
                const saldoDisponible = parseFloat(selectedOption.dataset.saldo) || 0;

                if (valor > saldoDisponible) {
                    Swal.showValidationMessage(`Saldo insuficiente. Disponible: ${Helper.formatCurrency(saldoDisponible)}`);
                    return false;
                }

                const formData = new FormData();
                formData.append('asignacion_id', asignacion_id);
                formData.append('tercero_id', tercero_id);
                formData.append('valor', valor);
                formData.append('fecha', fecha);
                formData.append('tipo_movimiento', document.getElementById('mov-tipo').value);
                formData.append('numero_documento', document.getElementById('mov-documento').value);
                formData.append('detalle', document.getElementById('mov-detalle').value);

                const fileInput = document.getElementById('mov-soporte');
                if (fileInput.files[0]) formData.append('soporte', fileInput.files[0]);

                return formData;
            }
        });

        if (formValues) {
            this.save(formValues, editId);
        }
    },

    async save(formData, id = null) {
        Helper.loading(true, id ? 'Actualizando...' : 'Registrando...');
        try {
            const url = id ? `/movimientos/${id}` : '/movimientos';
            const res = await Helper.fetchAPI(url, {
                method: 'POST',
                body: formData
            });
            Helper.loading(false);
            if (res.success) {
                Helper.alert('success', 'Movimiento procesado correctamente');
                this.init();
            } else {
                Helper.alert('error', res.message || 'Error al procesar');
            }
        } catch (error) {
            Helper.loading(false);
            Helper.alert('error', 'Error de conexión');
        }
    },

    async editItem(id) {
        this.openModal(id);
    },

    async deleteItem(id) {
        if (await Helper.confirm('¿Deseas eliminar este movimiento? El saldo ejecutado del presupuesto se restaurará.')) {
            Helper.loading(true, 'Eliminando y restaurando presupuesto...');
            try {
                const res = await Helper.fetchAPI(`/movimientos/${id}`, { method: 'DELETE' });
                Helper.loading(false);
                if (res.success) {
                    Helper.alert('success', 'Movimiento eliminado');
                    this.init();
                } else {
                    Helper.alert('error', res.message || 'Error al eliminar');
                }
            } catch (e) {
                Helper.loading(false);
                Helper.alert('error', 'No se pudo conectar con el servidor');
            }
        }
    }
};

MovimientosView.init();

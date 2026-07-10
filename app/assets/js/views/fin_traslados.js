/**
 * Traslados View - Finance Module
 * Management of transfers between accounts or items
 */

window.TrasladosView = {
    traslados: [],
    budget: [],

    async init() {
        console.log('Initializing Traslados Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [traslados, budget] = await Promise.all([
                Helper.fetchAPI('/traslados'),
                Helper.fetchAPI('/movimientos/budget') // Reusing active budget endpoint
            ]);
            this.traslados = Array.isArray(traslados) ? traslados : [];
            this.budget = Array.isArray(budget) ? budget : [];
        } catch (error) {
            console.error('Error loading transfer data:', error);
        }
    },

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="text-primary-custom fw-bold mb-0">Traslados Internos</h2>
                        <p class="text-muted">Gestión de transferencias entre cuentas o rubros presupuestales</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="TrasladosView.openModal()">
                        <i class="fas fa-exchange-alt me-2"></i>Nuevo Traslado
                    </button>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="trasladosTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">Fecha</th>
                                        <th>Origen (Se Debita)</th>
                                        <th class="text-center"><i class="fas fa-arrow-right text-muted"></i></th>
                                        <th>Destino (Se Acredita)</th>
                                        <th class="text-end">Valor Trasladado</th>
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
            Helper.initDataTable('#trasladosTable', { order: [[0, 'desc']] });
        }
    },

    renderTableBody() {
        return this.traslados.map(t => `
            <tr>
                <td class="ps-4 fw-bold">${Helper.formatDate(t.fecha)}</td>
                <td>
                    <div class="small fw-bold text-danger">${t.cod_origen} - ${t.nom_origen}</div>
                    <div class="x-small text-muted">${t.school_origen} - ${t.branch_origen}</div>
                </td>
                <td class="text-center text-muted">
                    <i class="fas fa-long-arrow-alt-right fa-lg"></i>
                </td>
                <td>
                    <div class="small fw-bold text-success">${t.cod_destino} - ${t.nom_destino}</div>
                    <div class="x-small text-muted">${t.school_destino} - ${t.branch_destino}</div>
                </td>
                <td class="text-end fw-bold text-dark">
                    ${Helper.formatCurrency(t.valor)}
                    <button class="btn btn-sm btn-link p-0 ms-1" title="${t.justificacion}">
                        <i class="fas fa-comment-dots text-info"></i>
                    </button>
                </td>
                <td class="text-center pe-4">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary border-0" onclick="TrasladosView.editItem(${t.id_traslado})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger border-0" onclick="TrasladosView.deleteItem(${t.id_traslado})" title="Eliminar">
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
            item = await Helper.fetchAPI(`/traslados/${editId}`);
            Helper.loading(false);
        }

        const budgetOptions = this.budget.map(b => {
            const isOrigen = item?.origen_id == b.id_asignacion;
            let saldo = parseFloat(b.saldo_disponible);
            if (isOrigen) saldo = parseFloat(item.saldo_disponible_origen_con_tras);

            return `<option value="${b.id_asignacion}" ${isOrigen ? 'selected' : (item?.destino_id == b.id_asignacion ? 'selected' : '')} data-saldo="${saldo}">
                ${b.codigo} - ${b.item_nombre} (${b.school_name} - ${b.branch_name}) | Saldo: ${Helper.formatCurrency(saldo)}
             </option>`;
        }).join('');

        const today = new Date().toISOString().split('T')[0];

        const { value: formValues } = await Swal.fire({
            title: `<strong>${editId ? 'Editar' : 'Nuevo'} Traslado Presupuestal</strong>`,
            width: '1000px',
            html: `
                <div class="text-start px-2 py-3">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase">Fecha del Traslado</label>
                            <input id="tras-fecha" type="date" class="form-control" value="${item?.fecha || today}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase">Valor a Trasladar ($)</label>
                            <input id="tras-valor" type="number" step="any" class="form-control" placeholder="0.00" value="${item?.valor || ''}">
                        </div>

                        <div class="col-12 mt-3">
                            <label class="form-label small fw-bold text-uppercase text-danger"><i class="fas fa-minus-circle me-1"></i>Origen de Fondos (Se Debita)</label>
                            <select id="tras-origen" class="form-select" ${editId ? 'disabled' : ''}>
                                <option value="">Seleccione Rubro/Centro</option>
                                ${budgetOptions}
                            </select>
                        </div>

                        <div class="col-12 mt-3">
                            <label class="form-label small fw-bold text-uppercase text-success"><i class="fas fa-plus-circle me-1"></i>Destino de Fondos (Se Acredita)</label>
                            <select id="tras-destino" class="form-select" ${editId ? 'disabled' : ''}>
                                <option value="">Seleccione Rubro/Centro</option>
                                ${budgetOptions}
                            </select>
                        </div>

                        <div class="col-12 mt-3">
                            <label class="form-label small fw-bold text-uppercase">Justificación / Detalle</label>
                            <textarea id="tras-detalle" class="form-control" rows="3" placeholder="Razón del traslado...">${item?.justificacion || ''}</textarea>
                        </div>
                    </div>
                </div>
            `,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Guardar',
            cancelButtonText: 'Cerrar',
            preConfirm: () => {
                const origen_id = document.getElementById('tras-origen').value;
                const destino_id = document.getElementById('tras-destino').value;
                const valor = parseFloat(document.getElementById('tras-valor').value) || 0;
                const fecha = document.getElementById('tras-fecha').value;
                const justificacion = document.getElementById('tras-detalle').value;

                if (!origen_id || !destino_id || valor <= 0 || !fecha || !justificacion) {
                    Swal.showValidationMessage('Complete todos los campos obligatorios');
                    return false;
                }

                if (origen_id === destino_id) {
                    Swal.showValidationMessage('El origen y el destino no pueden ser iguales');
                    return false;
                }

                // Balance check for origin
                const selectOrig = document.getElementById('tras-origen');
                const selectedOrigOption = selectOrig.options[selectOrig.selectedIndex];
                const saldoDisponible = parseFloat(selectedOrigOption.dataset.saldo) || 0;

                if (valor > saldoDisponible) {
                    Swal.showValidationMessage(`Saldo insuficiente en origen. Disponible: ${Helper.formatCurrency(saldoDisponible)}`);
                    return false;
                }

                return { origen_id, destino_id, valor, fecha, justificacion };
            }
        });

        if (formValues) {
            this.save(formValues, editId);
        }
    },

    async save(data, id = null) {
        Helper.loading(true, id ? 'Actualizando...' : 'Procesando...');
        try {
            const url = id ? `/traslados/${id}` : '/traslados';
            const res = await Helper.fetchAPI(url, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            Helper.loading(false);
            if (res.success) {
                Helper.alert('success', res.message);
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
        if (await Helper.confirm('¿Deseas eliminar este traslado? Los saldos de origen y destino se revertirán.')) {
            Helper.loading(true, 'Eliminando traslado...');
            try {
                const res = await Helper.fetchAPI(`/traslados/${id}`, { method: 'DELETE' });
                Helper.loading(false);
                if (res.success) {
                    Helper.alert('success', 'Traslado eliminado');
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

TrasladosView.init();

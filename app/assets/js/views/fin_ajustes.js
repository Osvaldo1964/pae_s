/**
 * Ajustes View - Finance Module
 * Budget Adjustments (Additions and Reductions)
 */

window.AjustesView = {
    ajustes: [],
    allocations: [],
    dataTable: null,

    async init() {
        console.log('Initializing Ajustes Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [ajustes, allocations] = await Promise.all([
                Helper.fetchAPI('/ajustes'),
                Helper.fetchAPI('/ajustes/allocations')
            ]);
            this.ajustes = Array.isArray(ajustes) ? ajustes : [];
            this.allocations = Array.isArray(allocations) ? allocations : [];
        } catch (error) {
            console.error('Error loading adjustments data:', error);
        }
    },

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="text-primary-custom fw-bold mb-0">Ajustes Presupuestales</h2>
                        <p class="text-muted">Adiciones y reducciones directas sobre rubros asignados</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="AjustesView.openModal()">
                        <i class="fas fa-sliders-h me-2"></i>Nuevo Ajuste
                    </button>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="ajustesTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">Fecha</th>
                                        <th>Rubro / Centro de Costo</th>
                                        <th class="text-center">Tipo de Ajuste</th>
                                        <th class="text-end">Valor del Ajuste</th>
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
            Helper.initDataTable('#ajustesTable', { order: [[0, 'desc']] });
        }
    },

    renderTableBody() {
        return this.ajustes.map(a => {
            const isAdicion = a.tipo_ajuste === 'ADICION';
            const badgeClass = isAdicion ? 'bg-success' : 'bg-danger';
            const badgeText = isAdicion ? 'Adición' : 'Reducción';

            return `
                <tr>
                    <td class="ps-4 fw-bold">${Helper.formatDate(a.fecha)}</td>
                    <td>
                        <div class="small fw-bold text-dark">${a.item_codigo} - ${a.item_nombre}</div>
                        <div class="x-small text-muted">${a.school_name} - ${a.branch_name}</div>
                    </td>
                    <td class="text-center">
                        <span class="badge ${badgeClass} rounded-pill px-3">${badgeText}</span>
                    </td>
                    <td class="text-end fw-bold text-dark">
                        ${Helper.formatCurrency(a.valor)}
                        <button class="btn btn-sm btn-link p-0 ms-1" title="${a.justificacion || 'Sin observaciones'}">
                            <i class="fas fa-comment-dots text-info"></i>
                        </button>
                    </td>
                    <td class="text-center pe-4">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary border-0" onclick="AjustesView.editItem(${a.id_ajuste})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger border-0" onclick="AjustesView.deleteItem(${a.id_ajuste})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async openModal(editId = null) {
        let item = null;
        if (editId) {
            Helper.loading(true);
            item = await Helper.fetchAPI(`/ajustes/${editId}`);
            Helper.loading(false);
        }

        const budgetOptions = this.allocations.map(b => {
            const isSelected = item?.asignacion_id == b.id_asignacion;
            let saldo = parseFloat(b.saldo_disponible);
            
            // Si es edición, revertimos temporalmente el impacto de este ajuste en el saldo mostrado en el dropdown
            if (isSelected && item) {
                if (item.tipo_ajuste === 'ADICION') {
                    saldo = saldo - parseFloat(item.valor);
                } else {
                    saldo = saldo + parseFloat(item.valor);
                }
            }

            return `<option value="${b.id_asignacion}" ${isSelected ? 'selected' : ''} data-saldo="${saldo}">
                ${b.codigo} - ${b.item_nombre} (${b.school_name} - ${b.branch_name}) | Saldo Disponible: ${Helper.formatCurrency(saldo)}
             </option>`;
        }).join('');

        const today = new Date().toISOString().split('T')[0];

        const { value: formValues } = await Swal.fire({
            title: `<strong>${editId ? 'Editar' : 'Nuevo'} Ajuste Presupuestal</strong>`,
            width: '800px',
            html: `
                <div class="text-start px-2 py-3">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase">Fecha del Ajuste</label>
                            <input id="aj-fecha" type="date" class="form-control" value="${item?.fecha || today}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase">Tipo de Ajuste</label>
                            <select id="aj-tipo" class="form-select">
                                <option value="ADICION" ${item?.tipo_ajuste === 'ADICION' ? 'selected' : ''}>ADICIÓN (Incrementar presupuesto)</option>
                                <option value="REDUCCION" ${item?.tipo_ajuste === 'REDUCCION' ? 'selected' : ''}>REDUCCIÓN (Disminuir presupuesto)</option>
                            </select>
                        </div>
                        <div class="col-12 mt-3">
                            <label class="form-label small fw-bold text-uppercase">Rubro / Centro de Costo</label>
                            <select id="aj-asignacion" class="form-select" ${editId ? 'disabled' : ''}>
                                <option value="">Seleccione Rubro/Centro</option>
                                ${budgetOptions}
                            </select>
                        </div>
                        <div class="col-md-12 mt-3">
                            <label class="form-label small fw-bold text-uppercase">Valor del Ajuste ($)</label>
                            <input id="aj-valor" type="number" step="any" class="form-control" placeholder="0.00" value="${item?.valor || ''}">
                        </div>
                        <div class="col-12 mt-3">
                            <label class="form-label small fw-bold text-uppercase">Justificación / Detalle</label>
                            <textarea id="aj-justificacion" class="form-control" rows="3" placeholder="Razón del ajuste presupuestal...">${item?.justificacion || ''}</textarea>
                        </div>
                    </div>
                </div>
            `,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Guardar',
            cancelButtonText: 'Cerrar',
            preConfirm: () => {
                const asignacion_id = document.getElementById('aj-asignacion').value;
                const tipo_ajuste = document.getElementById('aj-tipo').value;
                const valor = parseFloat(document.getElementById('aj-valor').value) || 0;
                const fecha = document.getElementById('aj-fecha').value;
                const justificacion = document.getElementById('aj-justificacion').value;

                if (!asignacion_id || !tipo_ajuste || valor <= 0 || !fecha || !justificacion) {
                    Swal.showValidationMessage('Complete todos los campos obligatorios');
                    return false;
                }

                // Validación de reducción contra saldo disponible
                if (tipo_ajuste === 'REDUCCION') {
                    const select = document.getElementById('aj-asignacion');
                    const selectedOption = select.options[select.selectedIndex];
                    const saldoDisponible = parseFloat(selectedOption.dataset.saldo) || 0;

                    if (valor > saldoDisponible) {
                        Swal.showValidationMessage(`Saldo insuficiente para realizar la reducción. Disponible: ${Helper.formatCurrency(saldoDisponible)}`);
                        return false;
                    }
                }

                return { asignacion_id, tipo_ajuste, valor, fecha, justificacion };
            }
        });

        if (formValues) {
            this.save(formValues, editId);
        }
    },

    async save(data, id = null) {
        Helper.loading(true, id ? 'Actualizando...' : 'Procesando...');
        try {
            const url = id ? `/ajustes/${id}` : '/ajustes';
            const method = id ? 'PUT' : 'POST';
            const res = await Helper.fetchAPI(url, {
                method: method,
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
        if (await Helper.confirm('¿Deseas eliminar este ajuste? Se revertirá su impacto en el presupuesto del rubro.')) {
            Helper.loading(true, 'Eliminando ajuste...');
            try {
                const res = await Helper.fetchAPI(`/ajustes/${id}`, { method: 'DELETE' });
                Helper.loading(false);
                if (res.success) {
                    Helper.alert('success', 'Ajuste presupuestal eliminado');
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

AjustesView.init();

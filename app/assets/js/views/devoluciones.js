/**
 * Devoluciones View - Módulo Independiente de Devoluciones de Inventario
 * Maneja el reingreso de mercancía/alimentos desde Sedes Educativas hacia el Almacén.
 */

window.DevolucionesView = {
    movements: [],
    branches: [],
    items: [],
    cycles: [],
    searchTerm: '',

    async init() {
        console.log('Initializing Devoluciones Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [movRes, branchRes, itemRes, cycleRes] = await Promise.all([
                Helper.fetchAPI('/movements'),
                Helper.fetchAPI('/branches'),
                Helper.fetchAPI('/items'),
                Helper.fetchAPI('/menu-cycles')
            ]);

            const allMovements = movRes.success ? (movRes.data || []) : [];
            // Filtrar únicamente las devoluciones de sede
            this.movements = allMovements.filter(m => 
                m.movement_type === 'DEVOLUCION_SEDE' || 
                (m.reference_number && m.reference_number.startsWith('DEV-'))
            );

            this.branches = branchRes.success ? (branchRes.data || []) : (Array.isArray(branchRes) ? branchRes : []);
            this.items = itemRes.success ? (itemRes.data || []) : (Array.isArray(itemRes) ? itemRes : []);
            this.cycles = cycleRes.success ? (cycleRes.data || []) : (Array.isArray(cycleRes) ? cycleRes : []);
        } catch (error) {
            console.error('Error loading devoluciones data:', error);
            Helper.alert('error', 'Error al cargar los datos de devoluciones');
        }
    },

    render() {
        const totalDevoluciones = this.movements.length;
        const uniqueBranches = new Set(this.movements.map(m => m.branch_id || m.notes)).size;
        const lastReturn = this.movements.length > 0 ? this.movements[0].movement_date : 'N/A';

        const html = `
            <div class="container-fluid py-4">
                <!-- Header y Título -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1 text-danger fw-bold"><i class="fas fa-undo-alt me-2"></i>Devoluciones de Sede</h2>
                        <p class="text-muted mb-0">Gestión y reingreso de mercancía o insumos retornados por sedes educativas</p>
                    </div>
                    <button class="btn btn-danger rounded-pill px-4 shadow-sm fw-bold" onclick="DevolucionesView.openModal()">
                        <i class="fas fa-plus me-1"></i> Registrar Devolución
                    </button>
                </div>

                <!-- Tarjetas de Métricas (KPIs) -->
                <div class="row g-3 mb-4">
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm rounded-4 p-3 bg-white border-start border-danger border-4">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="text-muted small text-uppercase fw-bold">Total Registros</span>
                                    <h3 class="mb-0 text-dark fw-bold">${totalDevoluciones}</h3>
                                </div>
                                <div class="bg-danger bg-opacity-10 text-danger p-3 rounded-circle">
                                    <i class="fas fa-receipt fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm rounded-4 p-3 bg-white border-start border-primary border-4">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="text-muted small text-uppercase fw-bold">Sedes Vinculadas</span>
                                    <h3 class="mb-0 text-dark fw-bold">${uniqueBranches}</h3>
                                </div>
                                <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                                    <i class="fas fa-school fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm rounded-4 p-3 bg-white border-start border-success border-4">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="text-muted small text-uppercase fw-bold">Último Registro</span>
                                    <h4 class="mb-0 text-dark fw-bold">${lastReturn}</h4>
                                </div>
                                <div class="bg-success bg-opacity-10 text-success p-3 rounded-circle">
                                    <i class="fas fa-calendar-check fa-2x"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tabla Principal -->
                <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div class="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
                        <h6 class="mb-0 fw-bold text-secondary"><i class="fas fa-list me-2"></i>Historial de Devoluciones</h6>
                        <div class="input-group style-search" style="max-width: 300px;">
                            <span class="input-group-text bg-light border-end-0"><i class="fas fa-search text-muted"></i></span>
                            <input type="text" class="form-control bg-light border-start-0 ps-0" id="search-devoluciones" placeholder="Buscar por sede o nota..." onkeyup="DevolucionesView.filterTable(this.value)">
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0" id="devoluciones-table">
                                <thead class="bg-light">
                                    <tr class="text-muted small text-uppercase fw-bold">
                                        <th class="ps-4">No. Referencia</th>
                                        <th>Fecha</th>
                                        <th>Sede Educativa</th>
                                        <th>Ciclo</th>
                                        <th>Registrado Por</th>
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
        }
    },

    renderTableRows() {
        if (this.movements.length === 0) {
            return `
                <tr>
                    <td colspan="6" class="text-center py-5 text-muted">
                        <i class="fas fa-inbox fa-3x mb-3 text-light"></i>
                        <p class="mb-0">No se han registrado devoluciones aún.</p>
                    </td>
                </tr>
            `;
        }

        const filtered = this.movements.filter(m => {
            if (!this.searchTerm) return true;
            const term = this.searchTerm.toLowerCase();
            const branchName = (m.branch_name || m.notes || '').toLowerCase();
            const ref = (m.reference_number || '').toLowerCase();
            return branchName.includes(term) || ref.includes(term);
        });

        if (filtered.length === 0) {
            return `<tr><td colspan="6" class="text-center py-4 text-muted">No se encontraron resultados para "${this.searchTerm}"</td></tr>`;
        }

        return filtered.map(m => {
            const branchDisplay = m.branch_name || (m.notes ? m.notes.split('|')[0].replace('Devolución desde Sede: ', '').trim() : 'Sede Desconocida');
            
            return `
                <tr>
                    <td class="ps-4">
                        <span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill font-monospace">
                            ${m.reference_number || ('DEV-' + m.id)}
                        </span>
                    </td>
                    <td class="fw-medium">${m.movement_date}</td>
                    <td>
                        <div class="fw-bold text-dark">${branchDisplay}</div>
                    </td>
                    <td>
                        <span class="badge bg-light text-dark border">
                            ${m.cycle_id ? 'Ciclo #' + m.cycle_id : 'Sin ciclo'}
                        </span>
                    </td>
                    <td class="small text-muted"><i class="fas fa-user-circle me-1"></i>${m.user_name || 'Sistema'}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="DevolucionesView.viewDetail(${m.id})">
                            <i class="fas fa-eye me-1"></i> Ver Detalle
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    filterTable(term) {
        this.searchTerm = term;
        const tbody = document.querySelector('#devoluciones-table tbody');
        if (tbody) {
            tbody.innerHTML = this.renderTableRows();
        }
    },

    async openModal() {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'devolucionModal';
        modalDiv.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header bg-danger text-white rounded-top-4 p-4">
                        <h5 class="modal-title fw-bold mb-0">
                            <i class="fas fa-undo-alt me-2"></i>Registrar Devolución de Sede
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form id="devolucion-form">
                            <div class="row g-3 mb-4">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-secondary">Sede Educativa (Colegio) <span class="text-danger">*</span></label>
                                    <select class="form-select border-2" name="branch_id" required>
                                        <option value="">Seleccione Sede...</option>
                                        ${this.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-secondary">Ciclo de Menú <span class="text-danger">*</span></label>
                                    <select class="form-select border-2" name="cycle_id" required>
                                        <option value="">Seleccione Ciclo...</option>
                                        ${this.cycles.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6 class="fw-bold text-dark mb-0"><i class="fas fa-boxes me-2 text-danger"></i>Ítems a Devolver</h6>
                                <button type="button" class="btn btn-sm btn-outline-danger rounded-pill" onclick="DevolucionesView.addRow()">
                                    <i class="fas fa-plus me-1"></i> Añadir Línea
                                </button>
                            </div>

                            <div class="table-responsive border rounded-3 mb-3">
                                <table class="table table-sm align-middle mb-0">
                                    <thead class="bg-light text-uppercase small text-muted">
                                        <tr>
                                            <th style="width: 45%;">Ítem / Insumo</th>
                                            <th style="width: 25%;" class="text-end">Cantidad</th>
                                            <th style="width: 25%;">Justificación / Motivo</th>
                                            <th style="width: 5%;"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="items-table-body">
                                    </tbody>
                                </table>
                            </div>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-secondary">Observaciones Generales</label>
                                <textarea class="form-control" name="notes" rows="2" placeholder="Escriba aquí detalles adicionales sobre esta devolución..."></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer bg-light p-3 rounded-bottom-4">
                        <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-danger rounded-pill px-4 fw-bold" onclick="DevolucionesView.save()">
                            <i class="fas fa-check me-1"></i> Confirmar y Guardar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        // Agregar al menos una fila por defecto
        this.addRow();

        modalDiv.addEventListener('hidden.bs.modal', function () {
            modalDiv.remove();
        });
    },

    addRow() {
        const tbody = document.getElementById('items-table-body');
        if (!tbody) return;

        const tr = document.createElement('tr');
        tr.className = 'devolucion-row';
        tr.innerHTML = `
            <td class="p-2">
                <select class="form-select form-select-sm item-select" required>
                    <option value="">Seleccionar ítem...</option>
                    ${this.items.map(i => `<option value="${i.id}">${i.name} (${i.code || 'S/C'})</option>`).join('')}
                </select>
            </td>
            <td class="p-2">
                <input type="number" class="form-control form-control-sm text-end qty-input" step="0.001" min="0.001" placeholder="0.00" required>
            </td>
            <td class="p-2">
                <input type="text" class="form-control form-control-sm batch-input" placeholder="Ej. Sobrante de ciclo">
            </td>
            <td class="text-center p-2">
                <button type="button" class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove()">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    async save() {
        const form = document.getElementById('devolucion-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const items = [];

        document.querySelectorAll('.devolucion-row').forEach(row => {
            const itemId = row.querySelector('.item-select').value;
            const quantity = parseFloat(row.querySelector('.qty-input').value);
            const batch = row.querySelector('.batch-input').value || 'DEVOLUCION';

            if (itemId && quantity > 0) {
                items.push({
                    item_id: itemId,
                    quantity: quantity,
                    batch: batch
                });
            }
        });

        if (items.length === 0) {
            Helper.alert('error', 'Debe agregar al menos un ítem con cantidad válida');
            return;
        }

        const payload = {
            branch_id: formData.get('branch_id'),
            cycle_id: formData.get('cycle_id'),
            notes: formData.get('notes'),
            items: items
        };

        try {
            Helper.loading(true);
            const res = await Helper.fetchAPI('/inventory/returns', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            Helper.loading(false);

            if (res.success) {
                const modalEl = document.getElementById('devolucionModal');
                if (modalEl) {
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
                Helper.alert('success', 'Devolución registrada exitosamente');
                await this.init();
            } else {
                Helper.alert('error', res.message || 'No se pudo guardar la devolución');
            }
        } catch (error) {
            Helper.loading(false);
            console.error('Error saving return:', error);
            Helper.alert('error', 'Error de conexión al servidor');
        }
    },

    async viewDetail(movementId) {
        try {
            Helper.loading(true);
            const res = await Helper.fetchAPI(`/movements`);
            Helper.loading(false);

            const mov = (res.data || []).find(m => m.id == movementId);
            if (!mov) {
                Helper.alert('error', 'No se encontró información de la devolución');
                return;
            }

            const branchDisplay = mov.branch_name || (mov.notes ? mov.notes.split('|')[0].replace('Devolución desde Sede: ', '').trim() : 'Sede Desconocida');

            const modalDiv = document.createElement('div');
            modalDiv.className = 'modal fade';
            modalDiv.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg rounded-4">
                        <div class="modal-header bg-dark text-white rounded-top-4 p-3">
                            <h5 class="modal-title fw-bold"><i class="fas fa-file-alt me-2 text-danger"></i>Detalle de Devolución</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <div class="border-bottom pb-3 mb-3">
                                <div class="row">
                                    <div class="col-6">
                                        <small class="text-muted text-uppercase d-block">Referencia</small>
                                        <span class="fw-bold text-danger">${mov.reference_number || ('DEV-' + mov.id)}</span>
                                    </div>
                                    <div class="col-6 text-end">
                                        <small class="text-muted text-uppercase d-block">Fecha</small>
                                        <span class="fw-bold">${mov.movement_date}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3">
                                <small class="text-muted text-uppercase d-block">Sede Educativa</small>
                                <span class="fw-bold fs-6 text-dark">${branchDisplay}</span>
                            </div>

                            <div class="mb-3">
                                <small class="text-muted text-uppercase d-block">Notas / Observaciones</small>
                                <p class="mb-0 text-secondary bg-light p-2 rounded">${mov.notes || 'Sin observaciones'}</p>
                            </div>

                            <div class="small text-muted border-top pt-2">
                                Registrado por: <strong>${mov.user_name || 'Sistema'}</strong>
                            </div>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modalDiv);
            const modal = new bootstrap.Modal(modalDiv);
            modal.show();
            modalDiv.addEventListener('hidden.bs.modal', function () { modalDiv.remove(); });

        } catch (e) {
            Helper.loading(false);
            console.error(e);
            Helper.alert('error', 'Error al cargar el detalle');
        }
    }
};

// Auto-inicializar cuando el script se cargue dinámicamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.DevolucionesView.init());
} else {
    window.DevolucionesView.init();
}

/**
 * PQRs View — Módulo de Resolución de PQRs
 * Accesible desde el badge de la campanita del dashboard.
 */
const PqrsView = {
    data: [],

    init: async () => {
        const container = document.getElementById('app-container');
        if (!container) return;

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 class="mb-1 fw-bold text-dark">
                        <i class="fas fa-inbox text-primary me-2"></i>Bandeja de PQRs
                    </h4>
                    <p class="text-muted mb-0 small">Gestión de Peticiones, Quejas y Reclamos del programa</p>
                </div>
                <button class="btn btn-outline-primary btn-sm" onclick="PqrsView.init()">
                    <i class="fas fa-sync-alt me-1"></i>Actualizar
                </button>
            </div>

            <div class="card shadow-sm border-0">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table id="pqrs-table" class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4">Radicado</th>
                                    <th>Tipo</th>
                                    <th>Email</th>
                                    <th>Mensaje</th>
                                    <th>Estado</th>
                                    <th>Fecha</th>
                                    <th class="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="pqrs-tbody">
                                <tr>
                                    <td colspan="7" class="text-center py-5">
                                        <div class="spinner-border text-primary" role="status"></div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal de Respuesta -->
            <div class="modal fade" id="pqrModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content border-0 shadow">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-reply me-2"></i>Gestionar PQR
                                <span id="modal-pqr-id" class="badge bg-light text-primary ms-2"></span>
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="fw-semibold text-muted small">TIPO</label>
                                <p id="modal-pqr-type" class="fw-bold fs-6 mb-0"></p>
                            </div>
                            <div class="mb-3">
                                <label class="fw-semibold text-muted small">EMAIL DEL SOLICITANTE</label>
                                <p id="modal-pqr-email" class="mb-0"></p>
                            </div>
                            <div class="mb-3">
                                <label class="fw-semibold text-muted small">MENSAJE ORIGINAL</label>
                                <div id="modal-pqr-message" class="p-3 bg-light rounded small text-dark"></div>
                            </div>
                            <hr>
                            <div class="mb-3">
                                <label class="form-label fw-semibold">Estado <span class="text-danger">*</span></label>
                                <select id="modal-pqr-status" class="form-select">
                                    <option value="Pendiente">🟡 Pendiente</option>
                                    <option value="En Revisión">🔵 En Revisión</option>
                                    <option value="Respondida">🟢 Respondida</option>
                                    <option value="Cerrada">⚫ Cerrada</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-semibold">Respuesta / Nota interna</label>
                                <textarea id="modal-pqr-response" class="form-control" rows="4"
                                    placeholder="Escriba aquí la respuesta al ciudadano o una nota interna..."></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-primary" onclick="PqrsView.savePqr()">
                                <i class="fas fa-save me-1"></i>Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await PqrsView.loadData();
    },

    loadData: async () => {
        try {
            const pqrs = await App.api('/pqrs');
            PqrsView.data = pqrs;
            PqrsView.renderTable(pqrs);
        } catch (e) {
            document.getElementById('pqrs-tbody').innerHTML =
                '<tr><td colspan="7" class="text-center py-4 text-danger">Error cargando las PQRs.</td></tr>';
        }
    },

    renderTable: (pqrs) => {
        const tbody = document.getElementById('pqrs-tbody');
        if (!pqrs || pqrs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5 text-muted">
                        <i class="fas fa-inbox fa-3x mb-3 d-block opacity-25"></i>
                        No hay PQRs registradas todavía.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = pqrs.map(p => {
            const statusBadge = PqrsView.statusBadge(p.status);
            const date = new Date(p.created_at).toLocaleDateString('es-CO', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const msgShort = p.message.length > 60 ? p.message.substring(0, 60) + '…' : p.message;
            return `
                <tr>
                    <td class="ps-4">
                        <span class="fw-bold text-primary">#${String(p.id).padStart(6, '0')}</span>
                    </td>
                    <td><span class="badge bg-light text-dark border">${p.type}</span></td>
                    <td class="small text-muted">${p.email}</td>
                    <td class="small text-muted" title="${p.message}">${msgShort}</td>
                    <td>${statusBadge}</td>
                    <td class="small text-muted">${date}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-primary" onclick="PqrsView.openModal(${p.id})" title="Gestionar">
                            <i class="fas fa-reply"></i>
                        </button>
                    </td>
                </tr>`;
        }).join('');

        // Init DataTable si está disponible
        if (typeof $ !== 'undefined' && $.fn.DataTable) {
            if ($.fn.DataTable.isDataTable('#pqrs-table')) {
                $('#pqrs-table').DataTable().destroy();
            }
            $('#pqrs-table').DataTable({
                language: { url: '' },
                order: [[5, 'desc']],
                columnDefs: [{ orderable: false, targets: [3, 6] }],
                pageLength: 15
            });
        }
    },

    statusBadge: (status) => {
        const map = {
            'Pendiente':   'bg-warning text-dark',
            'En Revisión': 'bg-info text-white',
            'Respondida':  'bg-success text-white',
            'Cerrada':     'bg-secondary text-white'
        };
        const cls = map[status] || 'bg-light text-dark';
        return `<span class="badge ${cls}">${status}</span>`;
    },

    openModal: (id) => {
        const p = PqrsView.data.find(x => x.id == id);
        if (!p) return;

        document.getElementById('modal-pqr-id').textContent = '#' + String(p.id).padStart(6, '0');
        document.getElementById('modal-pqr-type').textContent = p.type;
        document.getElementById('modal-pqr-email').textContent = p.email;
        document.getElementById('modal-pqr-message').textContent = p.message;
        document.getElementById('modal-pqr-status').value = p.status;
        document.getElementById('modal-pqr-response').value = p.response || '';

        // Store current ID for save
        document.getElementById('pqrModal').dataset.pqrId = id;

        const modal = new bootstrap.Modal(document.getElementById('pqrModal'));
        modal.show();
    },

    savePqr: async () => {
        const id  = document.getElementById('pqrModal').dataset.pqrId;
        const status   = document.getElementById('modal-pqr-status').value;
        const response = document.getElementById('modal-pqr-response').value.trim();

        const btn = document.querySelector('#pqrModal .btn-primary');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando…';

        try {
            const res = await App.api(`/pqrs/${id}`, 'PUT', { status, response });
            bootstrap.Modal.getInstance(document.getElementById('pqrModal')).hide();

            if (res.message) {
                Swal.fire({ icon: 'success', title: 'Actualizado', text: res.message, timer: 2000, showConfirmButton: false });
                await PqrsView.loadData();
                // Refresh bell badge immediately
                if (typeof App !== 'undefined') App.loadNotifications();
            } else {
                Swal.fire('Error', res.message || 'No se pudo actualizar', 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'Error de conexión', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save me-1"></i>Guardar cambios';
        }
    }
};

// Auto-init
if (document.getElementById('app-container')) {
    PqrsView.init();
}

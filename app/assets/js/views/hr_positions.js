/**
 * HR Positions Management
 */
const HRPositionsView = {
    dataTable: null,

    init: async () => {
        HRPositionsView.render();
        await HRPositionsView.loadData();
    },

    render: () => {
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4 fade-in">
                <div>
                    <h2 class="text-primary-custom fw-bold mb-0">Gestión de Cargos</h2>
                    <p class="text-muted">Defina los roles y cargos de la organización.</p>
                </div>
                <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="HRPositionsView.openModal()">
                    <i class="fas fa-plus me-2"></i>Nuevo Cargo
                </button>
            </div>

            <div class="card shadow-sm border-0 rounded-3">
                <div class="card-body p-0">
                    <div class="table-responsive p-3">
                        <table id="positions-table" class="table table-hover align-middle mb-0" style="width:100%">
                            <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                <tr>
                                    <th class="ps-4">ID</th>
                                    <th>Descripción / Nombre</th>
                                    <th>Riesgo ARL (%)</th>
                                    <th>Estado</th>
                                    <th class="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="positions-table-body">
                                <tr><td colspan="4" class="text-center py-4 text-muted">Cargando datos...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    loadData: async () => {
        const res = await App.api('/hr-positions');
        const tbody = document.getElementById('positions-table-body');

        if (HRPositionsView.dataTable) {
            HRPositionsView.dataTable.destroy();
        }

        if (res.success && res.data) {
            let html = '';
            res.data.forEach(item => {
                const statusBadge = item.status === 'ACTIVO'
                    ? '<span class="badge bg-success-light text-success"><i class="fas fa-check-circle me-1"></i>ACTIVO</span>'
                    : '<span class="badge bg-danger-light text-danger"><i class="fas fa-times-circle me-1"></i>INACTIVO</span>';

                html += `
                    <tr>
                        <td class="ps-4 text-muted small">#${item.id}</td>
                        <td class="fw-bold text-dark">${item.description}</td>
                        <td><span class="badge bg-secondary-light text-secondary">${item.arl_risk_percent}%</span></td>
                        <td>${statusBadge}</td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-light text-primary me-2" onclick='HRPositionsView.openModal(${JSON.stringify(item)})'>
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-danger" onclick="HRPositionsView.delete(${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
            HRPositionsView.dataTable = Helper.initDataTable('#positions-table');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Error al cargar cargos.</td></tr>';
        }
    },

    openModal: async (item = null) => {
        const isEdit = !!item;
        const { value: formValues } = await Swal.fire({
            title: isEdit ? 'Editar Cargo' : 'Nuevo Cargo',
            html: `
                <div class="text-start px-2">
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-muted text-uppercase">Descripción del Cargo</label>
                        <input id="pos-name" class="form-control" placeholder="Ej: Coordinador, Manipuladora" value="${item ? item.description : ''}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-muted text-uppercase">Riesgo ARL (%)</label>
                        <input id="pos-arl" type="number" step="0.001" class="form-control" placeholder="0.522 o 1.044" value="${item ? item.arl_risk_percent : '0.522'}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-muted text-uppercase">Estado</label>
                        <select id="pos-status" class="form-select">
                            <option value="ACTIVO" ${item && item.status === 'ACTIVO' ? 'selected' : ''}>ACTIVO</option>
                            <option value="INACTIVO" ${item && item.status === 'INACTIVO' ? 'selected' : ''}>INACTIVO</option>
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            confirmButtonColor: '#1B4F72',
            preConfirm: () => {
                const name = document.getElementById('pos-name').value;
                const arl = document.getElementById('pos-arl').value;
                if (!name || arl === '') {
                    Swal.showValidationMessage('Nombre y % de Riesgo son obligatorios');
                    return false;
                }
                return {
                    description: name,
                    arl_risk_percent: parseFloat(arl),
                    status: document.getElementById('pos-status').value
                };
            }
        });

        if (formValues) {
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/hr-positions/${item.id}` : '/hr-positions';
            const res = await App.api(url, method, formValues);

            if (res.success) {
                Helper.alert('success', isEdit ? 'Cargo actualizado' : 'Cargo creado');
                HRPositionsView.loadData();
            } else {
                Swal.fire('Error', res.message || 'Error al guardar', 'error');
            }
        }
    },

    delete: async (id) => {
        const result = await Swal.fire({
            title: '¿Confirmar eliminación?',
            text: "No podrás revertir esto si el cargo no está en uso.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar'
        });

        if (result.isConfirmed) {
            const res = await App.api(`/hr-positions/${id}`, 'DELETE');
            if (res.success) {
                Helper.alert('success', 'Eliminado correctamente');
                HRPositionsView.loadData();
            } else {
                Swal.fire('Error', res.message || 'Error al eliminar', 'error');
            }
        }
    }
};

HRPositionsView.init();

/**
 * HR Payroll Configuration View
 */
var HRPayrollConfigView = {
    configs: [],

    init: async () => {
        HRPayrollConfigView.render();
        await HRPayrollConfigView.loadData();
    },

    render: () => {
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4 fade-in">
                <div>
                    <h2 class="text-primary-custom fw-bold mb-0">Parámetros de Nómina</h2>
                    <p class="text-muted">Configuración de valores legales anuales para cálculos de nómina.</p>
                </div>
                <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="HRPayrollConfigView.openModal()">
                    <i class="fas fa-plus me-2"></i>Nuevo Año
                </button>
            </div>

            <div class="card shadow-sm border-0 rounded-3">
                <div class="card-body p-0">
                    <div class="table-responsive p-3">
                        <table id="config-table" class="table table-hover align-middle mb-0" style="width:100%">
                            <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                <tr>
                                    <th class="ps-4">Año</th>
                                    <th>Salario Mínimo (SMLV)</th>
                                    <th>Auxilio Transporte</th>
                                    <th>Exoneración L1819</th>
                                    <th>Estado</th>
                                    <th class="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="config-table-body">
                                <tr><td colspan="5" class="text-center py-4 text-muted">Cargando datos...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    loadData: async () => {
        const res = await App.api('/hr-payroll/config');
        const tbody = document.getElementById('config-table-body');

        if (res.success && res.data) {
            let html = '';
            res.data.forEach(item => {
                const statusBadge = item.status === 'ACTIVO'
                    ? '<span class="badge bg-success-light text-success">ACTIVO</span>'
                    : '<span class="badge bg-danger-light text-danger">INACTIVO</span>';

                const exoneradoBadge = item.is_exonerated == 1
                    ? '<span class="badge bg-success-light text-success"><i class="fas fa-check"></i> SÍ</span>'
                    : '<span class="badge bg-secondary-light text-secondary"><i class="fas fa-times"></i> NO</span>';

                html += `
                    <tr>
                        <td class="ps-4 fw-bold text-dark">${item.year}</td>
                        <td>
                            <div class="fw-bold">${Helper.formatCurrency(item.smlv)}</div>
                        </td>
                        <td>
                            <div class="fw-bold">${Helper.formatCurrency(item.aux_transporte)}</div>
                        </td>
                        <td>${exoneradoBadge}</td>
                        <td>${statusBadge}</td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-light text-primary me-2" onclick='HRPayrollConfigView.openModal(${JSON.stringify(item)})'>
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html || '<tr><td colspan="5" class="text-center py-4 text-muted">No hay configuraciones registradas.</td></tr>';
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error al cargar configuraciones.</td></tr>';
        }
    },

    openModal: (item = null) => {
        const isEdit = !!item;

        // Use Swal for simplicity and consistency with other modules
        Swal.fire({
            title: isEdit ? 'Editar Parámetros' : 'Nuevos Parámetros Anuales',
            html: `
                <div class="text-start">
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-uppercase">Año</label>
                        <input type="number" id="cfg-year" class="form-control" value="${item ? item.year : new Date().getFullYear()}" ${isEdit ? 'readonly' : ''}>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-uppercase">Salario Mínimo (SMLV)</label>
                        <input type="number" id="cfg-smlv" class="form-control" value="${item ? item.smlv : ''}" placeholder="Ej: 1300000">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-uppercase">Auxilio Transporte</label>
                        <input type="number" id="cfg-aux" class="form-control" value="${item ? item.aux_transporte : ''}" placeholder="Ej: 162000">
                    </div>
                    <div class="mb-3 form-check form-switch mt-4">
                        <input class="form-check-input" type="checkbox" id="cfg-exonerado" ${item && item.is_exonerated == 1 ? 'checked' : ''}>
                        <label class="form-check-label small fw-bold text-uppercase" for="cfg-exonerado">¿Aplica Exoneración Ley 1819?</label>
                        <div class="form-text small text-muted">Exime de aportes patronales a Salud (8.5%), SENA (2%) e ICBF (3%)</div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const year = document.getElementById('cfg-year').value;
                const smlv = document.getElementById('cfg-smlv').value;
                const aux = document.getElementById('cfg-aux').value;
                const is_exonerated = document.getElementById('cfg-exonerado').checked ? 1 : 0;

                if (!year || !smlv || !aux) {
                    Swal.showValidationMessage('Todos los campos son obligatorios');
                    return false;
                }
                return { year, smlv, aux_transporte: aux, is_exonerated };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await App.api('/hr-payroll/config', 'POST', result.value);
                if (res.success) {
                    Helper.alert('success', 'Configuración guardada');
                    HRPayrollConfigView.loadData();
                } else {
                    Swal.fire('Error', res.message || 'Error al guardar', 'error');
                }
            }
        });
    }
};

HRPayrollConfigView.init();

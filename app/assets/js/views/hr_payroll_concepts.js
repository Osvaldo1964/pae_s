/**
 * HR Payroll Concepts Management View
 */
var HRPayrollConceptsView = {
    concepts: [],

    init: async () => {
        HRPayrollConceptsView.render();
        await HRPayrollConceptsView.loadData();
    },

    render: () => {
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4 fade-in">
                <div>
                    <h2 class="text-primary-custom fw-bold mb-0">Conceptos de Nómina</h2>
                    <p class="text-muted">Gestión de tipos de pagos (devengados) y descuentos (deducciones).</p>
                </div>
                <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="HRPayrollConceptsView.openModal()">
                    <i class="fas fa-plus me-2"></i>Nuevo Concepto
                </button>
            </div>

            <div class="card shadow-sm border-0 rounded-3">
                <div class="card-body p-0">
                    <div class="table-responsive p-3">
                        <table id="concepts-table" class="table table-hover align-middle mb-0" style="width:100%">
                            <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                <tr>
                                    <th class="ps-4">Nombre del Concepto</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th class="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="concepts-table-body">
                                <tr><td colspan="4" class="text-center py-4 text-muted">Cargando datos...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    loadData: async () => {
        const res = await App.api('/hr-payroll/concepts');
        const tbody = document.getElementById('concepts-table-body');

        if (res.success && res.data) {
            HRPayrollConceptsView.concepts = res.data;
            let html = '';
            res.data.forEach(item => {
                const typeBadge = item.type === 'DEVENGADO'
                    ? '<span class="badge bg-success-light text-success"><i class="fas fa-plus-circle me-1"></i>DEVENGADO</span>'
                    : '<span class="badge bg-danger-light text-danger"><i class="fas fa-minus-circle me-1"></i>DEDUCCIÓN</span>';

                const statusBadge = item.status === 'ACTIVO'
                    ? '<span class="badge bg-success-light text-success shadow-none border-0">ACTIVO</span>'
                    : '<span class="badge bg-secondary-light text-secondary shadow-none border-0">INACTIVO</span>';

                html += `
                    <tr>
                        <td class="ps-4 fw-bold text-dark">${item.name}</td>
                        <td>${typeBadge}</td>
                        <td>${statusBadge}</td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-light text-primary me-2" onclick='HRPayrollConceptsView.openModal(${JSON.stringify(item)})'>
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-danger" onclick="HRPayrollConceptsView.deleteConcept(${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html || '<tr><td colspan="4" class="text-center py-4 text-muted">No hay conceptos registrados.</td></tr>';
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Error al cargar datos.</td></tr>';
        }
    },

    openModal: (item = null) => {
        const isEdit = !!item;

        Swal.fire({
            title: isEdit ? 'Editar Concepto' : 'Nuevo Concepto de Nómina',
            html: `
                <div class="text-start">
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-uppercase">Nombre del Concepto</label>
                        <input type="text" id="con-name" class="form-control" value="${item ? item.name : ''}" placeholder="Ej: Bono de Alimentación">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-uppercase">Tipo</label>
                        <select id="con-type" class="form-select">
                            <option value="DEVENGADO" ${item && item.type === 'DEVENGADO' ? 'selected' : ''}>DEVENGADO (Suma)</option>
                            <option value="DEDUCCION" ${item && item.type === 'DEDUCCION' ? 'selected' : ''}>DEDUCCIÓN (Resta)</option>
                        </select>
                    </div>
                    ${isEdit ? `
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-uppercase">Estado</label>
                        <select id="con-status" class="form-select">
                            <option value="ACTIVO" ${item.status === 'ACTIVO' ? 'selected' : ''}>ACTIVO</option>
                            <option value="INACTIVO" ${item.status === 'INACTIVO' ? 'selected' : ''}>INACTIVO</option>
                        </select>
                    </div>` : ''}
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const name = document.getElementById('con-name').value;
                const type = document.getElementById('con-type').value;
                const status = isEdit ? document.getElementById('con-status').value : 'ACTIVO';

                if (!name || !type) {
                    Swal.showValidationMessage('El nombre y el tipo son obligatorios');
                    return false;
                }
                return { id: item ? item.id : undefined, name, type, status };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await App.api('/hr-payroll/concepts', 'POST', result.value);
                if (res.success) {
                    Helper.alert('success', 'Concepto guardado correctamente');
                    HRPayrollConceptsView.loadData();
                } else {
                    Swal.fire('Error', res.message || 'Error al guardar', 'error');
                }
            }
        });
    },

    deleteConcept: async (id) => {
        if (await Helper.swalConfirm('¿Eliminar concepto?', 'Si eliminas este concepto no podrás visualizarlo en futuras liquidaciones. Solo se permitirá si no tiene registros asociados.')) {
            const res = await App.api(`/hr-payroll/concepts/${id}`, 'DELETE');
            if (res.success) {
                Helper.alert('success', 'Concepto eliminado');
                HRPayrollConceptsView.loadData();
            } else {
                Swal.fire('Error', res.message || 'No se pudo eliminar', 'error');
            }
        }
    }
};

HRPayrollConceptsView.init();

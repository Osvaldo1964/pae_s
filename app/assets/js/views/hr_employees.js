/**
 * HR Employees Management
 */
const HREmployeesView = {
    dataTable: null,
    positions: [],

    init: async () => {
        HREmployeesView.render();
        await HREmployeesView.loadPositions();
        await HREmployeesView.loadData();
    },

    loadPositions: async () => {
        const res = await App.api('/hr-positions');
        if (res.success) {
            HREmployeesView.positions = res.data.filter(p => p.status === 'ACTIVO');
        }
    },

    render: () => {
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4 fade-in">
                <div>
                    <h2 class="text-primary-custom fw-bold mb-0">Gestión de Empleados</h2>
                    <p class="text-muted">Maestro de personal, datos de nómina y seguridad social.</p>
                </div>
                <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="HREmployeesView.openModal()">
                    <i class="fas fa-plus me-2"></i>Nuevo Empleado
                </button>
            </div>

            <div class="card shadow-sm border-0 rounded-3">
                <div class="card-body p-0">
                    <div class="table-responsive p-3">
                        <table id="employees-table" class="table table-hover align-middle mb-0" style="width:100%">
                            <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                <tr>
                                    <th class="ps-4">Identificación</th>
                                    <th>Nombres y Apellidos</th>
                                    <th>Cargo</th>
                                    <th>Contacto</th>
                                    <th>Estado</th>
                                    <th class="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="employees-table-body">
                                <tr><td colspan="6" class="text-center py-4 text-muted">Cargando datos...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    loadData: async () => {
        const res = await App.api('/hr-employees');
        const tbody = document.getElementById('employees-table-body');

        if (HREmployeesView.dataTable) {
            HREmployeesView.dataTable.destroy();
        }

        if (res.success && res.data) {
            let html = '';
            res.data.forEach(item => {
                const fullName = `${item.first_name} ${item.last_name1} ${item.last_name2 || ''}`;
                const statusBadge = item.status === 'ACTIVO'
                    ? '<span class="badge bg-success-light text-success">ACTIVO</span>'
                    : '<span class="badge bg-danger-light text-danger">INACTIVO</span>';

                html += `
                    <tr>
                        <td class="ps-4 fw-bold text-dark">${item.document_number}</td>
                        <td>
                            <div class="fw-bold">${fullName}</div>
                        </td>
                        <td>
                            <div class="text-muted small text-uppercase">${item.position_name || 'N/A'}</div>
                        </td>
                        <td>
                            <div class="small"><i class="fas fa-phone text-muted me-1"></i>${item.phone || '-'}</div>
                            <div class="small"><i class="fas fa-envelope text-muted me-1"></i>${item.email || '-'}</div>
                        </td>
                        <td>${statusBadge}</td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-light text-primary me-2" onclick='HREmployeesView.openModal(${JSON.stringify(item)})'>
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-danger" onclick="HREmployeesView.delete(${item.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
            HREmployeesView.dataTable = Helper.initDataTable('#employees-table');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Error al cargar empleados.</td></tr>';
        }
    },

    openModal: async (item = null) => {
        const isEdit = !!item;

        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'employeeModal';
        modalDiv.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title fw-bold">
                            <i class="fas ${isEdit ? 'fa-edit' : 'fa-user-plus'} me-2"></i>
                            ${isEdit ? 'Editar Empleado' : 'Registro de Empleado'}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <!-- Navigation Tabs -->
                        <ul class="nav nav-tabs nav-justified bg-light mb-0" id="employeeTabs" role="tablist">
                            <li class="nav-item">
                                <a class="nav-link active fw-bold py-3" id="basic-tab" data-bs-toggle="tab" href="#tab-basic" role="tab">
                                    <i class="fas fa-id-card me-2"></i>Datos Básicos
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link fw-bold py-3" id="work-tab" data-bs-toggle="tab" href="#tab-work" role="tab">
                                    <i class="fas fa-briefcase me-2"></i>Información Laboral
                                </a>
                            </li>
                        </ul>
                        
                        <div class="tab-content p-4" id="employeeTabsContent">
                            <!-- Tab 1: Basic Info -->
                            <div class="tab-pane fade show active" id="tab-basic" role="tabpanel">
                                <form id="form-basic">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Nombres *</label>
                                            <input type="text" class="form-control" name="first_name" required value="${item ? item.first_name : ''}">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Primer Apellido *</label>
                                            <input type="text" class="form-control" name="last_name1" required value="${item ? item.last_name1 : ''}">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Segundo Apellido</label>
                                            <input type="text" class="form-control" name="last_name2" value="${item ? item.last_name2 || '' : ''}">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small fw-bold text-muted text-uppercase">No. Identificación *</label>
                                            <input type="text" class="form-control" name="document_number" required value="${item ? item.document_number : ''}">
                                        </div>
                                        <div class="col-md-12">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Dirección</label>
                                            <input type="text" class="form-control" name="address" value="${item ? item.address || '' : ''}">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Teléfono</label>
                                            <input type="text" class="form-control" name="phone" value="${item ? item.phone || '' : ''}">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Email</label>
                                            <input type="email" class="form-control" name="email" value="${item ? item.email || '' : ''}">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Estado</label>
                                            <select class="form-select" name="status">
                                                <option value="ACTIVO" ${item && item.status === 'ACTIVO' ? 'selected' : ''}>ACTIVO</option>
                                                <option value="INACTIVO" ${item && item.status === 'INACTIVO' ? 'selected' : ''}>INACTIVO</option>
                                            </select>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <!-- Tab 2: Work Info -->
                            <div class="tab-pane fade" id="tab-work" role="tabpanel">
                                <form id="form-work">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Cargo</label>
                                            <select class="form-select" name="position_id">
                                                <option value="">Seleccione Cargo...</option>
                                                ${HREmployeesView.positions.map(p => `<option value="${p.id}" ${item && item.position_id == p.id ? 'selected' : ''}>${p.description}</option>`).join('')}
                                            </select>
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Salario Mensual</label>
                                            <input type="number" class="form-control" name="salary" step="0.01" value="${item ? item.salary : '0'}">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Fecha Ingreso</label>
                                            <input type="date" class="form-control" name="hire_date" value="${item ? item.hire_date || '' : ''}">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Fecha Retiro</label>
                                            <input type="date" class="form-control" name="termination_date" value="${item ? item.termination_date || '' : ''}">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">EPS</label>
                                            <input type="text" class="form-control" name="eps" value="${item ? item.eps || '' : ''}">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">Pensiones (AFP)</label>
                                            <input type="text" class="form-control" name="afp" value="${item ? item.afp || '' : ''}">
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small fw-bold text-muted text-uppercase">ARL</label>
                                            <input type="text" class="form-control" name="arl" value="${item ? item.arl || '' : ''}">
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer bg-light">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary px-4 fw-bold" onclick="HREmployeesView.save(${item ? item.id : 'null'})">
                            <i class="fas fa-save me-2"></i>Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        modalDiv.addEventListener('hidden.bs.modal', () => {
            modalDiv.remove();
        });
    },

    save: async (id) => {
        const basicData = Object.fromEntries(new FormData(document.getElementById('form-basic')));
        const workData = Object.fromEntries(new FormData(document.getElementById('form-work')));

        // Merge data
        const payload = { ...basicData, ...workData };

        // Basic validation
        if (!payload.first_name || !payload.last_name1 || !payload.document_number) {
            Helper.alert('warning', 'Por favor complete nombres, apellido e identificación');
            return;
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/hr-employees/${id}` : '/hr-employees';
        const res = await App.api(url, method, payload);

        if (res.success) {
            Helper.alert('success', id ? 'Empleado actualizado' : 'Empleado registrado');
            bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
            HREmployeesView.loadData();
        } else {
            Swal.fire('Error', res.message || 'Error al guardar', 'error');
        }
    },

    delete: async (id) => {
        const result = await Swal.fire({
            title: '¿Confirmar eliminación?',
            text: "Esta acción eliminará permanentemente la ficha del empleado.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar'
        });

        if (result.isConfirmed) {
            const res = await App.api(`/hr-employees/${id}`, 'DELETE');
            if (res.success) {
                Helper.alert('success', 'Eliminado correctamente');
                HREmployeesView.loadData();
            } else {
                Swal.fire('Error', res.message || 'Error al eliminar', 'error');
            }
        }
    }
};

HREmployeesView.init();

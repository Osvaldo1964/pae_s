/**
 * HR Payrolls Management View - Enhanced with Novelties
 */
var HRPayrollsView = {
    periods: [],
    employees: [],
    concepts: [],
    currentPeriodId: null,

    init: async () => {
        HRPayrollsView.render();
        await HRPayrollsView.loadPeriods();
        await HRPayrollsView.loadMetadata();
    },

    loadMetadata: async () => {
        const empRes = await App.api('/hr-employees');
        if (empRes.success && Array.isArray(empRes.data)) {
            HRPayrollsView.employees = empRes.data;
        }

        const conceptRes = await App.api('/hr-payroll/concepts');
        if (conceptRes.success && Array.isArray(conceptRes.data)) {
            HRPayrollsView.concepts = conceptRes.data;
        }
    },

    render: () => {
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4 fade-in">
                <div>
                    <h2 class="text-primary-custom fw-bold mb-0">Gestión de Nómina</h2>
                    <p class="text-muted">Liquidación de salarios, periodos y novedades.</p>
                </div>
                <div>
                    <button class="btn btn-outline-primary rounded-pill px-4 me-2 shadow-sm" onclick="HRPayrollsView.loadPeriods()">
                        <i class="fas fa-sync-alt me-2"></i>Actualizar
                    </button>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="HRPayrollsView.openPeriodModal()">
                        <i class="fas fa-calendar-plus me-2"></i>Nuevo Periodo
                    </button>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-md-3">
                    <div class="card shadow-sm border-0 rounded-3 h-100">
                        <div class="card-header bg-white py-3">
                            <h5 class="mb-0 fw-bold"><i class="fas fa-history me-2 text-primary"></i>Periodos</h5>
                        </div>
                        <div class="card-body p-0">
                            <div class="list-group list-group-flush" id="periods-list">
                                <div class="text-center py-4 text-muted small">Cargando...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-9">
                    <div id="payroll-details-container" class="card shadow-sm border-0 rounded-3 h-100">
                        <div class="card-body d-flex flex-column justify-content-center align-items-center text-muted py-5">
                            <i class="fas fa-file-invoice-dollar fa-4x mb-3 opacity-25"></i>
                            <p>Seleccione un periodo para ver detalles.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    loadPeriods: async () => {
        const res = await App.api('/hr-payroll/periods');
        const list = document.getElementById('periods-list');
        if (res.success && res.data) {
            HRPayrollsView.periods = res.data;
            let html = '';
            res.data.forEach(p => {
                const active = HRPayrollsView.currentPeriodId == p.id ? 'active' : '';
                html += `
                    <button class="list-group-item list-group-item-action p-3 ${active}" onclick="HRPayrollsView.selectPeriod(${p.id})">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-1 fw-bold">${p.name}</h6>
                        </div>
                        <small class="${active ? 'text-white-50' : 'text-muted'}">
                            ${p.start_date} / ${p.end_date}
                        </small>
                    </button>
                `;
            });
            list.innerHTML = html || '<div class="text-center py-4 text-muted">Vacio</div>';
        }
    },

    selectPeriod: async (id) => {
        HRPayrollsView.currentPeriodId = id;
        const period = HRPayrollsView.periods.find(p => p.id == id);
        const container = document.getElementById('payroll-details-container');

        // Render Tabs
        container.innerHTML = `
            <div class="card-header bg-white p-0 overflow-hidden">
                <ul class="nav nav-tabs border-0" id="payrollTabs" role="tablist">
                    <li class="nav-item">
                        <button class="nav-link active px-4 py-3 fw-bold border-0" id="results-tab" data-bs-toggle="tab" data-bs-target="#results" type="button">
                            <i class="fas fa-table me-2"></i>Resultados
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link px-4 py-3 fw-bold border-0" id="novelties-tab" data-bs-toggle="tab" data-bs-target="#novelties" type="button">
                            <i class="fas fa-exclamation-circle me-2"></i>Novedades
                        </button>
                    </li>
                </ul>
            </div>
            <div class="card-body p-0">
                <div class="tab-content" id="payrollTabsContent">
                    <div class="tab-pane fade show active" id="results" role="tabpanel">
                        <div class="p-3 d-flex justify-content-between align-items-center bg-light border-bottom">
                            <span class="text-muted small">Liquidación calculada para ${period.name}</span>
                            ${period.status === 'ABIERTO' ? `
                                <button class="btn btn-success btn-sm rounded-pill px-3" onclick="HRPayrollsView.processPayroll(${id})">
                                    <i class="fas fa-play me-1"></i>Liquidar Ahora
                                </button>
                            ` : '<span class="badge bg-secondary">CERRADO</span>'}
                        </div>
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="small fw-bold text-muted text-uppercase bg-light">
                                    <tr>
                                        <th class="ps-3">Empleado</th>
                                        <th class="text-end">Devengados</th>
                                        <th class="text-end">Deducciones</th>
                                        <th class="text-end pe-3">Neto</th>
                                    </tr>
                                </thead>
                                <tbody id="payroll-results-body">
                                    <tr><td colspan="4" class="text-center py-4">Cargando...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="novelties" role="tabpanel">
                        <div class="p-3 d-flex justify-content-between align-items-center bg-light border-bottom">
                            <h6 class="mb-0 fw-bold">Novedades del Periodo</h6>
                            <button class="btn btn-primary btn-sm rounded-pill px-3" onclick="HRPayrollsView.openNoveltyModal()">
                                <i class="fas fa-plus me-1"></i>Agregar Novedad
                            </button>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="small fw-bold text-muted text-uppercase bg-light">
                                    <tr>
                                        <th class="ps-3">Empleado</th>
                                        <th>Concepto</th>
                                        <th class="text-end">Valor</th>
                                        <th class="text-end pe-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="novelties-body">
                                    <tr><td colspan="4" class="text-center py-4">Cargando...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await HRPayrollsView.loadResults(id);
        await HRPayrollsView.loadNovelties(id);
        HRPayrollsView.loadPeriods(); // Refresh list to show active
    },

    loadResults: async (id) => {
        const res = await App.api(`/hr-payroll/results/${id}`);
        const tbody = document.getElementById('payroll-results-body');
        if (res.success && res.data) {
            if (res.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">No se ha liquidado el periodo.</td></tr>';
                return;
            }
            let html = '';
            res.data.forEach(r => {
                html += `
                    <tr>
                        <td class="ps-3">
                            <div class="fw-bold">${r.first_name} ${r.last_name1}</div>
                            <small class="text-muted">${r.position_name || 'Empleado'}</small>
                        </td>
                        <td class="text-end text-success">${Helper.formatCurrency(r.total_devengado)}</td>
                        <td class="text-end text-danger">${Helper.formatCurrency(r.total_deduccion)}</td>
                        <td class="text-end pe-3 fw-bold">${Helper.formatCurrency(r.total_neto)}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
    },

    loadNovelties: async (id) => {
        const res = await App.api(`/hr-payroll/novelties/${id}`);
        const tbody = document.getElementById('novelties-body');
        if (res.success && res.data) {
            let html = '';
            res.data.forEach(n => {
                const color = n.concept_type === 'DEVENGADO' ? 'success' : 'danger';
                html += `
                    <tr>
                        <td class="ps-3">
                            <div class="fw-bold">${n.first_name} ${n.last_name1}</div>
                        </td>
                        <td>
                            <span class="badge bg-${color}-light text-${color}">${n.concept_name}</span>
                        </td>
                        <td class="text-end fw-bold">${Helper.formatCurrency(n.amount)}</td>
                        <td class="text-end pe-3">
                            <button class="btn btn-sm btn-light text-danger" onclick="HRPayrollsView.deleteNovelty(${n.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html || '<tr><td colspan="4" class="text-center py-5 text-muted">No hay novedades registradas.</td></tr>';
        }
    },

    openNoveltyModal: () => {
        let empOptions = '';
        HRPayrollsView.employees.forEach(e => empOptions += `<option value="${e.id}">${e.first_name} ${e.last_name1}</option>`);

        let conceptOptions = '';
        HRPayrollsView.concepts.forEach(c => conceptOptions += `<option value="${c.id}">${c.name} (${c.type})</option>`);

        Swal.fire({
            title: 'Agregar Novedad',
            html: `
                <div class="text-start">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Empleado</label>
                        <select id="nov-emp" class="form-select">${empOptions}</select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Concepto</label>
                        <select id="nov-con" class="form-select">${conceptOptions}</select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Valor</label>
                        <input type="number" id="nov-amt" class="form-control" placeholder="0.00">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Observaciones</label>
                        <textarea id="nov-obs" class="form-control" rows="2"></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            preConfirm: () => {
                return {
                    period_id: HRPayrollsView.currentPeriodId,
                    employee_id: document.getElementById('nov-emp').value,
                    concept_id: document.getElementById('nov-con').value,
                    amount: document.getElementById('nov-amt').value,
                    description: document.getElementById('nov-obs').value
                };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await App.api('/hr-payroll/novelties', 'POST', result.value);
                if (res.success) {
                    Helper.alert('success', 'Novedad guardada');
                    HRPayrollsView.loadNovelties(HRPayrollsView.currentPeriodId);
                }
            }
        });
    },

    deleteNovelty: async (id) => {
        if (await Helper.swalConfirm('¿Eliminar novedad?', 'Esta acción no se puede deshacer.')) {
            const res = await App.api(`/hr-payroll/novelties/${id}`, 'DELETE');
            if (res.success) {
                Helper.alert('success', 'Eliminado');
                HRPayrollsView.loadNovelties(HRPayrollsView.currentPeriodId);
            }
        }
    },

    processPayroll: async (id) => {
        const result = await Swal.fire({
            title: '¿Iniciar liquidación?',
            text: "Se calcularán los salarios considerando las novedades registradas.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, procesar',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                return await App.api(`/hr-payroll/calculate/${id}`, 'POST');
            }
        });

        if (result.isConfirmed && result.value.success) {
            Helper.alert('success', result.value.message);
            HRPayrollsView.selectPeriod(id);
        }
    },

    openPeriodModal: () => {
        Swal.fire({
            title: 'Nuevo Periodo',
            html: `
                <div class="text-start">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">Nombre</label>
                        <input type="text" id="p-name" class="form-control" placeholder="Mayo 2026">
                    </div>
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold">Inicio</label>
                            <input type="date" id="p-start" class="form-control">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold">Fin</label>
                            <input type="date" id="p-end" class="form-control">
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Crear',
            preConfirm: () => {
                return {
                    name: document.getElementById('p-name').value,
                    start_date: document.getElementById('p-start').value,
                    end_date: document.getElementById('p-end').value,
                    type: 'MENSUAL'
                };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await App.api('/hr-payroll/periods', 'POST', result.value);
                if (res.success) {
                    HRPayrollsView.loadPeriods();
                }
            }
        });
    }
};

HRPayrollsView.init();

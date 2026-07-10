window.RationTypesView = {
    rationTypes: [],
    populationTypes: [],

    init: async () => {
        const appContainer = document.getElementById('app');
        appContainer.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                     <h2 class="text-primary-custom fw-bold"><i class="fas fa-utensils me-2"></i>Gestión de Raciones Diferenciales</h2>
                     <p class="text-muted">Configure los tipos de ración y las poblaciones objetivo para la atención diferencial.</p>
                </div>
            </div>

            <div class="card shadow-sm border-0 rounded-3">
                <div class="card-header bg-white border-bottom-0 pt-3 px-3">
                    <ul class="nav nav-tabs card-header-tabs" id="rationsTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="rations-tab" data-bs-toggle="tab" data-bs-target="#rations-content" type="button" role="tab" aria-controls="rations-content" aria-selected="true">
                                <i class="fas fa-hamburger me-2"></i>Tipos de Ración
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="populations-tab" data-bs-toggle="tab" data-bs-target="#populations-content" type="button" role="tab" aria-controls="populations-content" aria-selected="false">
                                <i class="fas fa-users me-2"></i>Tipos de Población
                            </button>
                        </li>
                    </ul>
                </div>
                <div class="card-body p-4">
                    <div class="tab-content" id="rationsTabsContent">
                        
                        <!-- PESTAÑA: TIPOS DE RACIÓN -->
                        <div class="tab-pane fade show active" id="rations-content" role="tabpanel" aria-labelledby="rations-tab">
                            <div class="d-flex justify-content-end mb-3">
                                <button class="btn btn-primary rounded-pill px-4" onclick="RationTypesView.openRationModal()">
                                    <i class="fas fa-plus me-2"></i>Nuevo Tipo de Ración
                                </button>
                            </div>
                            <div class="table-responsive">
                                <table id="rationTable" class="table table-hover align-middle mb-0">
                                    <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                        <tr>
                                            <th class="ps-3">Nombre</th>
                                            <th>Población Objetivo</th>
                                            <th>Hora</th>
                                            <th>Descripción</th>
                                            <th class="text-end pe-3">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="ration-table-body">
                                        <tr><td colspan="4" class="text-center py-4">Cargando...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- PESTAÑA: TIPOS DE POBLACIÓN -->
                        <div class="tab-pane fade" id="populations-content" role="tabpanel" aria-labelledby="populations-tab">
                            <div class="d-flex justify-content-end mb-3">
                                <button class="btn btn-success rounded-pill px-4" onclick="RationTypesView.openPopulationModal()">
                                    <i class="fas fa-plus me-2"></i>Nuevo Tipo de Población
                                </button>
                            </div>
                            <div class="table-responsive">
                                <table id="populationTable" class="table table-hover align-middle mb-0">
                                    <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                        <tr>
                                            <th class="ps-3">Nombre</th>
                                            <th>Descripción</th>
                                            <th>Estado</th>
                                            <th class="text-end pe-3">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="population-table-body">
                                        <tr><td colspan="4" class="text-center py-4">Cargando...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            
            <!-- MODAL RACIÓN -->
            <div class="modal fade" id="modalRation" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="modalRationTitle">Tipo de Ración</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="formRation">
                                <input type="hidden" id="ration-id">
                                <div class="mb-3">
                                    <label class="form-label">Nombre *</label>
                                    <input type="text" class="form-control" id="ration-name" required placeholder="Ej: ALMUERZO INDÍGENA">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tipo de Población</label>
                                    <select class="form-select" id="ration-population-id">
                                        <option value="">-- General / Sin Especificar --</option>
                                    </select>
                                    <div class="form-text">Si se deja vacío, aplica para población general.</div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Hora de Servir Sugerida</label>
                                    <input type="time" class="form-control" id="ration-service-time">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción</label>
                                    <textarea class="form-control" id="ration-description" rows="2"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="RationTypesView.saveRation()">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL POBLACIÓN -->
            <div class="modal fade" id="modalPopulation" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title" id="modalPopulationTitle">Tipo de Población</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="formPopulation">
                                <input type="hidden" id="population-id">
                                <div class="mb-3">
                                    <label class="form-label">Nombre *</label>
                                    <input type="text" class="form-control" id="population-name" required placeholder="Ej: INDÍGENA">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción</label>
                                    <textarea class="form-control" id="population-description" rows="2"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-success" onclick="RationTypesView.savePopulation()">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await Promise.all([
            RationTypesView.loadRations(),
            RationTypesView.loadPopulations()
        ]);

        // Listeners for tabs to refresh data if needed, or just let them load once

        // Auto-select tab based on route
        if (window.location.hash.includes('population-types')) {
            const tabTrigger = new bootstrap.Tab(document.getElementById('populations-tab'));
            tabTrigger.show();
        }
    },

    // ==========================================
    // LOGIC FOR RATIONS
    // ==========================================
    loadRations: async () => {
        const tbody = document.getElementById('ration-table-body');

        // Destroy existing DataTable before modifying DOM
        if ($.fn.DataTable.isDataTable('#rationTable')) {
            $('#rationTable').DataTable().destroy();
        }

        try {
            const res = await Helper.fetchAPI('/ration-types');
            if (res.success) {
                RationTypesView.rationTypes = res.data || [];
                tbody.innerHTML = '';

                if (RationTypesView.rationTypes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No hay raciones configuradas.</td></tr>';
                    return;
                }

                RationTypesView.rationTypes.forEach(rt => {
                    const popBadge = rt.population_name
                        ? `<span class="badge bg-info text-dark">${rt.population_name}</span>`
                        : '<span class="badge bg-light text-secondary border">General</span>';

                    tbody.innerHTML += `
                        <tr>
                            <td class="ps-3 fw-bold text-primary-custom">${rt.name}</td>
                            <td>${popBadge}</td>
                            <td><span class="badge bg-light text-dark"><i class="fas fa-clock me-1"></i>${rt.service_time ? rt.service_time.substring(0, 5) : '-'}</span></td>
                            <td><small class="text-muted">${rt.description || '-'}</small></td>
                            <td class="text-end pe-3">
                                <button class="btn btn-sm btn-outline-primary me-1" onclick='RationTypesView.openRationModal(${JSON.stringify(rt)})'>
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="RationTypesView.deleteRation(${rt.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                Helper.initDataTable('#rationTable');
            } else {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${res.message}</td></tr>`;
            }
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error de conexión</td></tr>`;
        }
    },

    openRationModal: (rt = null) => {
        const isEdit = !!rt;
        document.getElementById('modalRationTitle').innerText = isEdit ? 'Editar Tipo de Ración' : 'Nuevo Tipo de Ración';
        document.getElementById('ration-id').value = isEdit ? rt.id : '';
        document.getElementById('ration-name').value = isEdit ? rt.name : '';
        document.getElementById('ration-description').value = isEdit ? rt.description || '' : '';
        document.getElementById('ration-service-time').value = isEdit ? (rt.service_time ? rt.service_time.substring(0, 5) : '') : '';

        // Populate population select
        const select = document.getElementById('ration-population-id');
        select.innerHTML = '<option value="">-- General / Sin Especificar --</option>';
        RationTypesView.populationTypes.forEach(pt => {
            select.innerHTML += `<option value="${pt.id}">${pt.name}</option>`;
        });

        if (isEdit) {
            select.value = rt.population_type_id || '';
        }

        new bootstrap.Modal(document.getElementById('modalRation')).show();
    },

    saveRation: async () => {
        const id = document.getElementById('ration-id').value;
        const name = document.getElementById('ration-name').value;
        const desc = document.getElementById('ration-description').value;
        const popId = document.getElementById('ration-population-id').value;
        const serviceTime = document.getElementById('ration-service-time').value;

        if (!name) return Helper.alert('error', 'El nombre es obligatorio');

        const data = {
            name: name.toUpperCase(),
            description: desc,
            population_type_id: popId || null,
            service_time: serviceTime || null
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/ration-types/${id}` : '/ration-types';

        try {
            const res = await Helper.fetchAPI(url, { method, body: JSON.stringify(data) });
            if (res.success || res.message) {
                Helper.alert('success', 'Guardado correctamente');
                bootstrap.Modal.getInstance(document.getElementById('modalRation')).hide();
                RationTypesView.loadRations();
            } else {
                Helper.alert('error', res.message || 'Error al guardar');
            }
        } catch (e) {
            Helper.alert('error', 'Error de conexión');
        }
    },

    deleteRation: async (id) => {
        if (!await Helper.confirm('¿Seguro que desea eliminar esta ración? Puede afectar recetas existentes.')) return;
        try {
            const res = await Helper.fetchAPI(`/ration-types/${id}`, { method: 'DELETE' });
            if (res.success || res.message) {
                Helper.alert('success', 'Eliminado correctamente');
                RationTypesView.loadRations();
            } else {
                Helper.alert('error', res.message || 'Error al eliminar');
            }
        } catch (e) {
            Helper.alert('error', 'Error de conexión');
        }
    },


    // ==========================================
    // LOGIC FOR POPULATIONS
    // ==========================================
    loadPopulations: async () => {
        const tbody = document.getElementById('population-table-body');

        // Destroy existing DataTable before modifying DOM
        if ($.fn.DataTable.isDataTable('#populationTable')) {
            $('#populationTable').DataTable().destroy();
        }

        try {
            const res = await Helper.fetchAPI('/population-types');
            if (res.success) {
                RationTypesView.populationTypes = res.data || [];
                tbody.innerHTML = '';

                if (RationTypesView.populationTypes.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No hay poblaciones configuradas.</td></tr>';
                    return;
                }

                RationTypesView.populationTypes.forEach(pt => {
                    tbody.innerHTML += `
                        <tr>
                            <td class="ps-3 fw-bold text-success">${pt.name}</td>
                            <td><small>${pt.description || '-'}</small></td>
                            <td><span class="badge bg-light text-dark border">${pt.status}</span></td>
                            <td class="text-end pe-3">
                                <button class="btn btn-sm btn-outline-success me-1" onclick='RationTypesView.openPopulationModal(${JSON.stringify(pt)})'>
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="RationTypesView.deletePopulation(${pt.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                Helper.initDataTable('#populationTable');
            }
        } catch (e) {
            console.error(e);
        }
    },

    openPopulationModal: (pt = null) => {
        const isEdit = !!pt;
        document.getElementById('modalPopulationTitle').innerText = isEdit ? 'Editar Tipo de Población' : 'Nuevo Tipo de Población';
        document.getElementById('population-id').value = isEdit ? pt.id : '';
        document.getElementById('population-name').value = isEdit ? pt.name : '';
        document.getElementById('population-description').value = isEdit ? pt.description || '' : '';

        new bootstrap.Modal(document.getElementById('modalPopulation')).show();
    },

    savePopulation: async () => {
        const id = document.getElementById('population-id').value;
        const name = document.getElementById('population-name').value;
        const desc = document.getElementById('population-description').value;

        if (!name) return Helper.alert('error', 'El nombre es obligatorio');

        const data = {
            name: name.toUpperCase(),
            description: desc
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/population-types/${id}` : '/population-types';

        try {
            const res = await Helper.fetchAPI(url, { method, body: JSON.stringify(data) });
            if (res.success || res.message) {
                Helper.alert('success', 'Guardado correctamente');
                bootstrap.Modal.getInstance(document.getElementById('modalPopulation')).hide();
                RationTypesView.loadPopulations();
                // Reload rations logic to update the select dropdown in the other modal
                RationTypesView.loadRations();
            } else {
                Helper.alert('error', res.message || 'Error al guardar');
            }
        } catch (e) {
            Helper.alert('error', 'Error de conexión');
        }
    },

    deletePopulation: async (id) => {
        if (!await Helper.confirm('¿Seguro que desea eliminar esta población?')) return;
        try {
            const res = await Helper.fetchAPI(`/population-types/${id}`, { method: 'DELETE' });
            if (res.success || res.message) {
                Helper.alert('success', 'Eliminado correctamente');
                RationTypesView.loadPopulations();
                RationTypesView.loadRations();
            } else {
                Helper.alert('error', res.message || 'Error al eliminar');
            }
        } catch (e) {
            Helper.alert('error', 'Error de conexión');
        }
    }
};

if (typeof RationTypesView !== 'undefined') {
    RationTypesView.init();
}

// Use var or global assignment to avoid "already declared" errors on SPA navigation
var PaeProgramsView = {
    programs: [],
    state: {
        availableServices: []
    },

    /**
     * Render the view
     */
    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h2><i class="fas fa-building me-2"></i>Crear Programa</h2>
                                <p class="text-muted">Gestión de entidades y operadores del programa</p>
                            </div>
                            <button class="btn btn-success" onclick="PaeProgramsView.openModal()">
                                <i class="fas fa-plus me-2"></i>Crear Programa
                            </button>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-12">
                        <div class="card shadow-sm">
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table id="paeTable" class="table table-hover align-middle">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Programa</th>
                                                <th>Entidad</th>
                                                <th>Operador</th>
                                                <th>Servicios</th>
                                                <th>Ubicación</th>
                                                <th>Logos</th>
                                                <th class="text-end">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="pae-table-body">
                                            <!-- Data will be loaded here -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Create/Edit PAE -->
            <div class="modal fade" id="modalPae" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="modalPaeTitle">
                                <i class="fas fa-building me-2"></i>Crear Programa
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0">
                            <!-- Tabs Navigation -->
                            <ul class="nav nav-tabs px-3 pt-2 bg-light" id="paeTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="general-tab" data-bs-toggle="tab" data-bs-target="#tab-general" type="button" role="tab">
                                        <i class="fas fa-info-circle me-1"></i> General
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="entidad-tab" data-bs-toggle="tab" data-bs-target="#tab-entidad" type="button" role="tab">
                                        <i class="fas fa-landmark me-1"></i> Entidad
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="operador-tab" data-bs-toggle="tab" data-bs-target="#tab-operador" type="button" role="tab">
                                        <i class="fas fa-briefcase me-1"></i> Operador
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="contrato-tab" data-bs-toggle="tab" data-bs-target="#tab-contrato" type="button" role="tab">
                                        <i class="fas fa-file-contract me-1"></i> Contrato
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation" id="acceso-tab-item">
                                    <button class="nav-link" id="acceso-tab" data-bs-toggle="tab" data-bs-target="#tab-acceso" type="button" role="tab">
                                        <i class="fas fa-user-shield me-1"></i> Acceso
                                    </button>
                                </li>
                            </ul>

                            <form id="formPae" enctype="multipart/form-data" class="p-4">
                                <input type="hidden" id="pae-id">
                                
                                <div class="tab-content" id="paeTabsContent">
                                    <!-- Tab: General -->
                                    <div class="tab-pane fade show active" id="tab-general" role="tabpanel">
                                        <h6 class="text-primary mb-3">Información del Programa</h6>
                                        <div class="row mb-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Nombre del Programa *</label>
                                                <input type="text" class="form-control" id="pae-name" required>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Email de Contacto</label>
                                                <input type="email" class="form-control" id="pae-email">
                                            </div>
                                        </div>

                                        <h6 class="text-primary mb-3 mt-4">Servicios del Programa</h6>
                                        <div class="row mb-3">
                                            <div class="col-12">
                                                <label class="form-label text-muted small">Seleccione los servicios disponibles para este programa *</label>
                                                <div id="services-container" class="d-flex flex-wrap gap-3 p-3 bg-light rounded border">
                                                    <div class="text-muted small">Cargando servicios...</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Tab: Entidad -->
                                    <div class="tab-pane fade" id="tab-entidad" role="tabpanel">
                                        <h6 class="text-primary mb-3">Datos de la Entidad Territorial</h6>
                                        <div class="row mb-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Nombre Entidad *</label>
                                                <input type="text" class="form-control" id="entity-name" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">NIT Entidad *</label>
                                                <input type="text" class="form-control" id="entity-nit" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Logo Entidad</label>
                                                <input type="file" class="form-control" id="entity-logo" accept="image/*" onchange="PaeProgramsView.previewImage(this, 'entity-preview')">
                                                <div id="entity-preview" class="mt-2 text-center border rounded p-1" style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; background-color: #f8f9fa;">
                                                    <span class="text-muted small">Sin logo</span>
                                                </div>
                                                <small class="text-muted" id="entity-logo-current"></small>
                                            </div>
                                        </div>
                                        <div class="row mb-3">
                                            <div class="col-md-4">
                                                <label class="form-label">Departamento</label>
                                                <input type="text" class="form-control" id="entity-department">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Ciudad</label>
                                                <input type="text" class="form-control" id="entity-city">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Dirección</label>
                                                <input type="text" class="form-control" id="entity-address">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Tab: Operador -->
                                    <div class="tab-pane fade" id="tab-operador" role="tabpanel">
                                        <h6 class="text-primary mb-3">Datos del Operador</h6>
                                        <div class="row mb-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Razón Social Operador *</label>
                                                <input type="text" class="form-control" id="operator-name" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">NIT Operador *</label>
                                                <input type="text" class="form-control" id="operator-nit" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Logo Operador</label>
                                                <input type="file" class="form-control" id="operator-logo" accept="image/*" onchange="PaeProgramsView.previewImage(this, 'operator-preview')">
                                                <div id="operator-preview" class="mt-2 text-center border rounded p-1" style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; background-color: #f8f9fa;">
                                                    <span class="text-muted small">Sin logo</span>
                                                </div>
                                                <small class="text-muted" id="operator-logo-current"></small>
                                            </div>
                                        </div>
                                        <div class="row mb-3">
                                            <div class="col-md-4">
                                                <label class="form-label">Dirección</label>
                                                <input type="text" class="form-control" id="operator-address">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Teléfono</label>
                                                <input type="text" class="form-control" id="operator-phone">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Email</label>
                                                <input type="email" class="form-control" id="operator-email">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Tab: Contrato -->
                                    <div class="tab-pane fade" id="tab-contrato" role="tabpanel">
                                        <h6 class="text-primary mb-3">Información del Contrato</h6>
                                        <div class="row mb-3">
                                            <div class="col-md-4">
                                                <label class="form-label">No. Contrato / Convenio</label>
                                                <input type="text" class="form-control" id="contract_number">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Valor del Contrato</label>
                                                <div class="input-group">
                                                    <span class="input-group-text">$</span>
                                                    <input type="text" class="form-control" id="contract_value" 
                                                        oninput="PaeProgramsView.formatNumberInput(this)" 
                                                        placeholder="0.00">
                                                </div>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Periodicidad de Informes</label>
                                                <select class="form-select" id="reporting_periodicity">
                                                    <option value="Mensual">Mensual</option>
                                                    <option value="Bimensual">Bimensual</option>
                                                    <option value="Semestral">Semestral</option>
                                                    <option value="Anual">Anual</option>
                                                    <option value="Ejecución Total">Ejecución Total</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="row mb-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Fecha de Inicio</label>
                                                <input type="date" class="form-control" id="start_date">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Fecha de Terminación</label>
                                                <input type="date" class="form-control" id="end_date">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Tab: Acceso -->
                                    <div class="tab-pane fade" id="tab-acceso" role="tabpanel">
                                        <div id="admin-user-section">
                                            <h6 class="text-primary mb-3">Usuario Administrador</h6>
                                            <div class="alert alert-info py-2 small">
                                                <i class="fas fa-info-circle me-1"></i> Se creará un usuario con rol <strong>PAE_ADMIN</strong> vinculado a este programa.
                                            </div>
                                            <div class="row mb-3">
                                                <div class="col-md-6">
                                                    <label class="form-label">Email Admin *</label>
                                                    <input type="email" class="form-control" id="admin-email">
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Contraseña *</label>
                                                    <input type="password" class="form-control" id="admin-password">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="PaeProgramsView.save()">
                                <i class="fas fa-save me-1"></i>Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-container').innerHTML = html;
        this.init();
    },

    /**
     * Initialize the view
     */
    async init() {
        await this.loadServices();
        await this.loadPrograms();
    },

    /**
     * Load available services
     */
    async loadServices() {
        try {
            const services = await Helper.fetchAPI('/services');
            this.state.availableServices = services;
            this.renderServices();
        } catch (error) {
            console.error('Error loading services:', error);
        }
    },

    /**
     * Render services checkboxes
     */
    renderServices() {
        const container = document.getElementById('services-container');
        if (!container) return;

        if (!this.state.availableServices || this.state.availableServices.length === 0) {
            container.innerHTML = '<div class="text-muted small">No hay servicios disponibles</div>';
            return;
        }

        container.innerHTML = this.state.availableServices.map(service => `
            <div class="form-check form-check-inline">
                <input class="form-check-input service-checkbox" type="checkbox" value="${service.id}" id="service-${service.id}">
                <label class="form-check-label" for="service-${service.id}">${service.name}</label>
            </div>
        `).join('');
    },

    /**
     * Load all PAE programs
     */
    async loadPrograms() {
        console.log("PaeProgramsView: Loading programs...");
        try {
            const data = await Helper.fetchAPI('/tenant/list');
            console.log("PaeProgramsView: Programs loaded", data);

            if (Array.isArray(data)) {
                this.programs = data;
                this.renderTable();
            } else {
                Helper.alert('error', data.message || 'Error al cargar programas');
            }
        } catch (error) {
            console.error('Error loading programs:', error);
            Helper.alert('error', 'Error al cargar programas');
        }
    },

    /**
     * Render programs table
     */
    renderTable() {
        const tbody = document.getElementById('pae-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.programs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron programas registrados</td></tr>';
            return;
        }

        this.programs.forEach(pae => {
            const defaultEntity = `${Config.BASE_URL}assets/img/logos/default_entity.png`;
            const defaultOperator = `${Config.BASE_URL}assets/img/logos/default_operator.png`;

            // If path starts with assets/, it's relative to app/
            const entityUrl = pae.entity_logo_path ? `${Config.BASE_URL}${pae.entity_logo_path}` : defaultEntity;
            const operatorUrl = pae.operator_logo_path ? `${Config.BASE_URL}${pae.operator_logo_path}` : defaultOperator;

            const entityLogo = `<img src="${entityUrl}" alt="Entidad" style="height: 30px;" onerror="this.onerror=null; this.src='${defaultEntity}'">`;
            const operatorLogo = `<img src="${operatorUrl}" alt="Operador" style="height: 30px;" onerror="this.onerror=null; this.src='${defaultOperator}'">`;

            tbody.innerHTML += `
                <tr>
                    <td>
                        <strong>${pae.name}</strong><br>
                        <small class="text-muted">ID: ${pae.id}</small>
                    </td>
                    <td>
                        ${pae.entity_name}<br>
                        <small class="text-muted">NIT: ${pae.nit || '-'}</small>
                    </td>
                    <td>
                        ${pae.operator_name || '-'}<br>
                        <small class="text-muted">NIT: ${pae.operator_nit || '-'}</small>
                    </td>
                    <td>
                        <div class="d-flex flex-wrap gap-1" style="max-width: 200px;">
                            ${pae.services && pae.services.length > 0
                    ? pae.services.map(s => `<span class="badge bg-primary" style="font-size: 0.7rem;">${s.name}</span>`).join('')
                    : '<span class="text-muted small">Sin servicios</span>'}
                        </div>
                    </td>
                    <td>
                        ${pae.city || '-'}, ${pae.department || '-'}
                        <div class="mt-1">
                            <span class="badge bg-light text-dark border" title="No. Contrato">
                                <i class="fas fa-file-contract me-1 text-primary"></i>${pae.contract_number || 'S/N'}
                            </span>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex gap-2">
                            ${entityLogo}
                            ${operatorLogo}
                        </div>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-primary" onclick='PaeProgramsView.openModal(${JSON.stringify(pae)})'>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="PaeProgramsView.delete(${pae.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        // Initialize DataTable
        if ($.fn.DataTable.isDataTable('#paeTable')) {
            $('#paeTable').DataTable().destroy();
        }
        Helper.initDataTable('#paeTable');
    },

    /**
     * Open modal for create/edit
     */
    openModal(pae = null) {
        const modal = new bootstrap.Modal(document.getElementById('modalPae'));
        const isEdit = !!pae;

        // Reset form
        document.getElementById('formPae').reset();
        document.getElementById('entity-logo-current').textContent = '';
        document.getElementById('operator-logo-current').textContent = '';

        // Reset previews
        document.getElementById('entity-preview').innerHTML = '<span class="text-muted small">Sin logo</span>';
        document.getElementById('operator-preview').innerHTML = '<span class="text-muted small">Sin logo</span>';

        // Reset services
        document.querySelectorAll('.service-checkbox').forEach(cb => cb.checked = false);

        // Reset to first tab
        const firstTab = document.querySelector('#paeTabs .nav-link:first-child');
        if (firstTab) {
            const tabTrigger = new bootstrap.Tab(firstTab);
            tabTrigger.show();
        }

        // Show/Hide access tab item
        document.getElementById('acceso-tab-item').style.display = isEdit ? 'none' : 'block';

        // Show/Hide admin section (only for create)
        document.getElementById('admin-user-section').style.display = isEdit ? 'none' : 'block';
        document.getElementById('admin-email').required = !isEdit;
        document.getElementById('admin-password').required = !isEdit;

        if (isEdit) {
            document.getElementById('modalPaeTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Editar Programa';
            document.getElementById('pae-id').value = pae.id;
            document.getElementById('pae-name').value = pae.name || '';
            document.getElementById('pae-email').value = pae.email || '';
            document.getElementById('entity-name').value = pae.entity_name || '';
            document.getElementById('entity-nit').value = pae.nit || '';
            document.getElementById('entity-department').value = pae.department || '';
            document.getElementById('entity-city').value = pae.city || '';
            document.getElementById('entity-address').value = pae.address || '';
            document.getElementById('operator-name').value = pae.operator_name || '';
            document.getElementById('operator-nit').value = pae.operator_nit || '';
            document.getElementById('operator-address').value = pae.operator_address || '';
            document.getElementById('operator-phone').value = pae.operator_phone || '';
            document.getElementById('operator-email').value = pae.operator_email || '';
            
            // Contract Fields
            document.getElementById('start_date').value = pae.start_date || '';
            document.getElementById('end_date').value = pae.end_date || '';
            document.getElementById('contract_number').value = pae.contract_number || '';
            
            // Format contract value for display
            const contractValueInput = document.getElementById('contract_value');
            contractValueInput.value = pae.contract_value ? Helper.formatNumber(pae.contract_value) : '0.00';
            
            document.getElementById('reporting_periodicity').value = pae.reporting_periodicity || 'Mensual';

            if (pae.entity_logo_path) {
                document.getElementById('entity-logo-current').textContent = `Actual: ${pae.entity_logo_path.split('/').pop()}`;
                document.getElementById('entity-preview').innerHTML = `<img src="${pae.entity_logo_path}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
            }
            if (pae.operator_logo_path) {
                document.getElementById('operator-logo-current').textContent = `Actual: ${pae.operator_logo_path.split('/').pop()}`;
                document.getElementById('operator-preview').innerHTML = `<img src="${pae.operator_logo_path}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
            }

            // Pre-select services
            if (pae.services) {
                pae.services.forEach(s => {
                    const cb = document.getElementById(`service-${s.id}`);
                    if (cb) cb.checked = true;
                });
            }
        } else {
            document.getElementById('modalPaeTitle').innerHTML = '<i class="fas fa-plus me-2"></i>Nuevo Programa PAE';
        }

        modal.show();
    },

    /**
     * Save PAE program
     */
    async save() {
        const paeId = document.getElementById('pae-id').value;
        const isEdit = !!paeId;

        if (!document.getElementById('pae-name').value ||
            !document.getElementById('entity-name').value ||
            !document.getElementById('entity-nit').value ||
            !document.getElementById('operator-name').value ||
            !document.getElementById('operator-nit').value ||
            (!isEdit && !document.getElementById('admin-email').value) ||
            (!isEdit && !document.getElementById('admin-password').value)) {
            Helper.alert('warning', 'Complete los campos obligatorios');
            return;
        }

        // Create FormData
        const formData = new FormData();
        formData.append('name', document.getElementById('pae-name').value);
        formData.append('email', document.getElementById('pae-email').value);
        formData.append('entity_name', document.getElementById('entity-name').value);
        formData.append('nit', document.getElementById('entity-nit').value);
        formData.append('department', document.getElementById('entity-department').value);
        formData.append('city', document.getElementById('entity-city').value);
        formData.append('address', document.getElementById('entity-address').value);
        formData.append('operator_name', document.getElementById('operator-name').value);
        formData.append('operator_nit', document.getElementById('operator-nit').value);
        formData.append('operator_address', document.getElementById('operator-address').value);
        formData.append('operator_phone', document.getElementById('operator-phone').value);
        formData.append('operator_email', document.getElementById('operator-email').value);
        
        // Contract Fields
        formData.append('start_date', document.getElementById('start_date').value);
        formData.append('end_date', document.getElementById('end_date').value);
        formData.append('contract_number', document.getElementById('contract_number').value);
        
        // Clean contract value (remove commas) before saving
        const contractValue = document.getElementById('contract_value').value.replace(/,/g, '');
        formData.append('contract_value', contractValue || 0);
        
        formData.append('reporting_periodicity', document.getElementById('reporting_periodicity').value);

        // Add services
        const selectedServices = Array.from(document.querySelectorAll('.service-checkbox:checked')).map(cb => cb.value);
        selectedServices.forEach(id => formData.append('services[]', id));

        if (!isEdit) {
            formData.append('admin_email', document.getElementById('admin-email').value);
            formData.append('admin_password', document.getElementById('admin-password').value);
        }

        // Add logos if selected
        const entityLogo = document.getElementById('entity-logo').files[0];
        const operatorLogo = document.getElementById('operator-logo').files[0];
        if (entityLogo) formData.append('entity_logo', entityLogo);
        if (operatorLogo) formData.append('operator_logo', operatorLogo);

        try {
            const endpoint = isEdit ? `/tenant/update/${paeId}` : '/tenant/register';
            const data = await Helper.fetchAPI(endpoint, {
                method: 'POST',
                body: formData,
                headers: {} // Let fetch set Content-Type for FormData
            });

            if (data.success) {
                Helper.alert('success', isEdit ? 'Programa actualizado' : 'Programa creado');
                bootstrap.Modal.getInstance(document.getElementById('modalPae')).hide();
                await this.loadPrograms();
            } else {
                Helper.alert('error', data.message || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error saving PAE:', error);
            Helper.alert('error', 'Error al guardar programa');
        }
    },

    /**
     * Delete PAE program
     */
    async delete(id) {
        if (!await Helper.confirm('Esta acción no se puede deshacer', '¿Eliminar programa?')) return;

        try {
            const data = await Helper.fetchAPI(`/tenant/delete/${id}`, {
                method: 'DELETE'
            });

            if (data.success) {
                Helper.alert('success', 'Programa eliminado exitosamente');
                await this.loadPrograms();
            } else {
                Helper.alert('error', data.message || 'Error al eliminar');
            }
        } catch (error) {
            console.error('Error deleting PAE:', error);
            Helper.alert('error', 'Error al eliminar programa');
        }
    },

    /**
     * Preview selected image
     */
    previewImage(input, previewId) {
        const preview = document.getElementById(previewId);
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
            };
            reader.readAsDataURL(input.files[0]);
        } else {
            preview.innerHTML = '<span class="text-muted small">Sin logo</span>';
        }
    },

    /**
     * Format a number input with thousands separators
     * @param {HTMLInputElement} input 
     */
    formatNumberInput(input) {
        // Remove non-numeric characters except dot
        let value = input.value.replace(/[^0-9.]/g, '');
        
        // Split parts
        const parts = value.split('.');
        let integerPart = parts[0];
        let decimalPart = parts[1];

        // Format integer part with commas
        if (integerPart) {
            integerPart = parseInt(integerPart).toLocaleString('en-US');
        }

        // Rejoin
        input.value = decimalPart !== undefined ? `${integerPart}.${decimalPart.substring(0, 2)}` : integerPart;
    }
};

// Auto-execute
PaeProgramsView.render();

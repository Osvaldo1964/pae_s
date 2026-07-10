/**
 * Schools and Branches View
 * Manage educational institutions and their physical locations
 */

var SchoolsView = {
    schools: [],
    branches: [],
    selectedSchoolId: null,

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
                                <h2><i class="fas fa-university me-2"></i>Entorno: Centros y Puntos de Atención</h2>
                                <p class="text-muted">Administración de centros, instituciones y sus puntos de atención</p>
                            </div>
                            <button class="btn btn-success" onclick="SchoolsView.openSchoolModal()">
                                <i class="fas fa-plus me-2"></i>Nuevo Centro
                            </button>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <!-- Schools List -->
                    <div class="col-md-7">
                        <div class="card shadow-sm h-100">
                            <div class="card-header bg-white py-3">
                                <h5 class="card-title mb-0">Listado de Centros / Instituciones</h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table id="schoolsTable" class="table table-hover align-middle">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Centro / Institución</th>
                                                <th>Responsable / Ubicación</th>
                                                <th class="text-end">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody id="schools-table-body">
                                            <!-- Data will be loaded here -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Branches List (Contextual) -->
                    <div class="col-md-5">
                        <div class="card shadow-sm h-100 border-primary">
                            <div class="card-header bg-primary text-white py-3 d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0" id="branches-title">Puntos de Atención</h5>
                                <button class="btn btn-sm btn-light" id="btn-new-branch" onclick="SchoolsView.openBranchModal()" style="display:none">
                                    <i class="fas fa-plus"></i> Punto
                                </button>
                            </div>
                            <div class="card-body">
                                <div id="branches-container">
                                    <p class="text-center text-muted py-5">Seleccione un centro para ver sus puntos de atención</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: School -->
            <div class="modal fade" id="modalSchool" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="modalSchoolTitle">Nuevo Centro</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="formSchool">
                                <input type="hidden" id="school-id">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label class="form-label">Código Externo / DANE *</label>
                                        <input type="text" class="form-control" id="school-dane" required placeholder="Ej: 14700... ">
                                    </div>
                                    <div class="col-md-8">
                                        <label class="form-label">Nombre del Centro *</label>
                                        <input type="text" class="form-control" id="school-name" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Tipo *</label>
                                        <select class="form-select" id="school-type" required>
                                            <option value="PUBLICO">Colegio Público</option>
                                            <option value="PRIVADO">Colegio Privado</option>
                                            <option value="MIXTO">Colegio Mixto</option>
                                            <option value="INDIGENA">Colegio Indígena</option>
                                            <option value="CDI">CDI - Centro Desarrollo Infantil</option>
                                            <option value="HI">HI - Hogar Infantil</option>
                                            <option value="ANCIANATO">Centro Adulto Mayor</option>
                                            <option value="COMEDOR_COMUNITARIO">Comedor Comunitario</option>
                                            <option value="PUNTO_ENTREGA">Punto de Entrega</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Rector / Director / Responsable</label>
                                        <input type="text" class="form-control" id="school-rector">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" id="school-email">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Departamento</label>
                                        <input type="text" class="form-control" id="school-department">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Municipio</label>
                                        <input type="text" class="form-control" id="school-municipality">
                                    </div>
                                    <div class="col-md-8">
                                        <label class="form-label">Dirección</label>
                                        <input type="text" class="form-control" id="school-address">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Teléfono</label>
                                        <input type="text" class="form-control" id="school-phone">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Ubicación *</label>
                                        <select class="form-select" id="school-area" required>
                                            <option value="URBANA">Urbana</option>
                                            <option value="RURAL">Rural</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Logo</label>
                                        <div class="d-flex align-items-center gap-2">
                                            <div class="flex-grow-1">
                                                <input type="file" class="d-none" id="school-logo" accept="image/*" onchange="SchoolsView.previewLogo(this)">
                                                <div class="input-group">
                                                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('school-logo').click()">
                                                        <i class="fas fa-upload me-1"></i> Seleccionar
                                                    </button>
                                                    <span class="form-control form-control-sm text-truncate" id="school-logo-label" style="background: #f8f9fa;">
                                                        Seleccione un archivo...
                                                    </span>
                                                </div>
                                            </div>
                                            <div id="school-logo-preview-container" class="border rounded bg-light d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; min-width: 40px; overflow: hidden;">
                                                <img id="school-logo-preview" src="" style="width: 100%; height: 100%; object-fit: cover; display: none;">
                                                <i id="school-logo-placeholder" class="fas fa-image text-muted"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="SchoolsView.saveSchool()">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Branch -->
            <div class="modal fade" id="modalBranch" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title" id="modalBranchTitle">Nuevo Punto de Atención</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="formBranch">
                                <input type="hidden" id="branch-id">
                                <div class="mb-3">
                                    <label class="form-label">Código Externo / DANE *</label>
                                    <input type="text" class="form-control" id="branch-dane" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Nombre del Punto *</label>
                                    <input type="text" class="form-control" id="branch-name" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Encargado</label>
                                    <input type="text" class="form-control" id="branch-manager">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Total Beneficiarios (SIMAT)</label>
                                    <input type="number" class="form-control" id="branch-total-beneficiaries" placeholder="0">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Dirección</label>
                                    <input type="text" class="form-control" id="branch-address">
                                </div>
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Teléfono</label>
                                        <input type="text" class="form-control" id="branch-phone">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Ubicación *</label>
                                        <select class="form-select" id="branch-area" required>
                                            <option value="URBANA">Urbana</option>
                                            <option value="RURAL">Rural</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-info text-white" onclick="SchoolsView.saveBranch()">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-container').innerHTML = html;
        this.init();
    },

    async init() {
        await this.loadSchools();
        if (this.schools.length > 0) {
            console.log("Auto-selecting first school:", this.schools[0].id);
            this.selectSchool(this.schools[0].id);
        }
    },

    async loadSchools() {
        try {
            const data = await Helper.fetchAPI('/schools');
            if (Array.isArray(data)) {
                this.schools = data;
                this.renderSchoolsTable();
            }
        } catch (err) {
            console.error(err);
        }
    },

    renderSchoolsTable() {
        if ($.fn.DataTable.isDataTable('#schoolsTable')) {
            $('#schoolsTable').DataTable().destroy();
        }

        const tbody = document.getElementById('schools-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        this.schools.forEach(s => {
            const logo = s.logo_path ? `${Config.BASE_URL}${s.logo_path}` : `${Config.BASE_URL}assets/img/logos/logo_ovc.png`;
            tbody.innerHTML += `
                <tr class="school-row ${this.selectedSchoolId == s.id ? 'table-primary' : ''}" style="cursor:pointer" data-id="${s.id}" onclick="SchoolsView.selectSchool(${s.id})">
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${logo}" class="rounded-circle me-3" style="width: 40px; height: 40px; object-fit: cover;" onerror="this.src='${Config.BASE_URL}assets/img/logos/logo_ovc.png'">
                            <div>
                                <h6 class="mb-0">${s.name}</h6>
                                <small class="text-primary fw-bold" style="font-size: 0.75rem;">COD: ${s.dane_code || '-'}</small> | 
                                <small class="badge bg-secondary">${s.school_type}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <small class="d-block text-dark">${s.rector || '-'}</small>
                        <small class="text-muted"><i class="fas fa-map-marker-alt me-1"></i>${s.municipality}, ${s.area_type}</small>
                    </td>
                    <td class="text-end" onclick="event.stopPropagation()">
                        <button class="btn btn-sm btn-outline-primary" onclick="SchoolsView.openSchoolModal(${s.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="SchoolsView.deleteSchool(${s.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        Helper.initDataTable('#schoolsTable');
    },

    async selectSchool(id) {
        if (!id) return;
        console.log("Selecting School ID:", id);
        this.selectedSchoolId = id;
        const school = this.schools.find(s => s.id == id);

        if (!school) {
            console.warn("School not found in local list for ID:", id);
            return;
        }

        const titleEl = document.getElementById('branches-title');
        if (titleEl) titleEl.innerText = `Puntos: ${school.name}`;

        const btnNew = document.getElementById('btn-new-branch');
        if (btnNew) btnNew.style.display = 'block';

        // Highlight row
        const rows = document.querySelectorAll('.school-row');
        rows.forEach(r => r.classList.remove('table-primary'));
        const activeRow = document.querySelector(`.school-row[data-id="${id}"]`);
        if (activeRow) activeRow.classList.add('table-primary');

        await this.loadBranches(id);
    },

    async loadBranches(schoolId) {
        try {
            const data = await Helper.fetchAPI(`/branches?school_id=${schoolId}`);
            if (Array.isArray(data)) {
                this.branches = data;
                this.renderBranches();
            }
        } catch (err) {
            console.error(err);
        }
    },

    renderBranches() {
        const container = document.getElementById('branches-container');
        if (!container) return;

        if (this.branches.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-5">No hay puntos registrados para este centro</p>';
            return;
        }

        let html = '<div class="list-group list-group-flush">';
        this.branches.forEach(b => {
            html += `
                <div class="list-group-item px-0">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${b.name} ${b.name === 'PRINCIPAL' ? '<span class="badge bg-info text-white ms-2" style="font-size:0.7em">MATRIZ</span>' : ''}</h6>
                            <small class="text-primary d-block fw-bold mb-1" style="font-size: 0.8rem;">COD: ${b.dane_code || '-'}</small>
                            <small class="text-muted"><i class="fas fa-user me-1"></i>${b.manager_name || '-'}</small><br>
                            <small class="text-secondary fw-bold" style="font-size: 0.85rem;"><i class="fas fa-users me-1"></i>SIMAT: ${b.total_beneficiaries || 0}</small><br>
                            <small class="text-muted"><i class="fas fa-phone me-1"></i>${b.phone || '-'}</small>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-link text-primary" onclick="SchoolsView.openBranchModal(${b.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-link text-danger" ${b.name === 'PRINCIPAL' ? 'disabled' : ''} onclick="SchoolsView.deleteBranch(${b.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    },

    previewLogo(input) {
        const previewImg = document.getElementById('school-logo-preview');
        const placeholder = document.getElementById('school-logo-placeholder');
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
                document.getElementById('school-logo-label').innerText = 'Imagen cargada (click para cambiar)';
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    openSchoolModal(schoolOrId = null) {
        let school = (typeof schoolOrId === 'number' || (typeof schoolOrId === 'string' && schoolOrId !== ''))
            ? this.schools.find(s => s.id == schoolOrId)
            : schoolOrId;
        const isEdit = !!school;
        document.getElementById('formSchool').reset();
        document.getElementById('school-id').value = isEdit ? school.id : '';
        document.getElementById('modalSchoolTitle').innerText = isEdit ? 'Editar Centro / Institución' : 'Nuevo Centro / Institución';

        if (!isEdit) {
            document.getElementById('school-logo-preview').style.display = 'none';
            document.getElementById('school-logo-placeholder').style.display = 'block';
            document.getElementById('school-logo-label').innerText = 'Ningún archivo seleccionado';
        }

        if (isEdit) {
            document.getElementById('school-dane').value = school.dane_code || '';
            document.getElementById('school-name').value = school.name;
            document.getElementById('school-type').value = school.school_type;
            document.getElementById('school-rector').value = school.rector || '';
            document.getElementById('school-email').value = school.email || '';
            document.getElementById('school-department').value = school.department || '';
            document.getElementById('school-municipality').value = school.municipality || '';
            document.getElementById('school-address').value = school.address || '';
            document.getElementById('school-phone').value = school.phone || '';
            document.getElementById('school-area').value = school.area_type;

            const previewImg = document.getElementById('school-logo-preview');
            const placeholder = document.getElementById('school-logo-placeholder');
            if (school.logo_path) {
                previewImg.src = Config.BASE_URL + school.logo_path;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
                document.getElementById('school-logo-label').innerText = 'Imagen cargada (click para cambiar)';
            } else {
                previewImg.src = '';
                previewImg.style.display = 'none';
                placeholder.style.display = 'block';
            }
        }

        new bootstrap.Modal(document.getElementById('modalSchool')).show();
    },

    async saveSchool() {
        const id = document.getElementById('school-id').value;
        const formData = new FormData();
        formData.append('dane_code', document.getElementById('school-dane').value.toUpperCase());
        formData.append('name', document.getElementById('school-name').value.toUpperCase());
        formData.append('school_type', document.getElementById('school-type').value);
        formData.append('rector', document.getElementById('school-rector').value.toUpperCase());
        formData.append('email', document.getElementById('school-email').value.toLowerCase());
        formData.append('department', document.getElementById('school-department').value);
        formData.append('municipality', document.getElementById('school-municipality').value);
        formData.append('address', document.getElementById('school-address').value);
        formData.append('phone', document.getElementById('school-phone').value);
        formData.append('area_type', document.getElementById('school-area').value);

        const logo = document.getElementById('school-logo').files[0];
        if (logo) formData.append('logo', logo);

        try {
            const endpoint = id ? `/schools/update/${id}` : '/schools';
            const res = await Helper.fetchAPI(endpoint, {
                method: 'POST',
                body: formData,
                headers: {} // Let fetch set Content-Type for FormData
            });

            if (res.message) {
                Helper.alert('success', res.message);
                bootstrap.Modal.getInstance(document.getElementById('modalSchool')).hide();
                await this.loadSchools();
                if (id) {
                    this.selectSchool(id);
                } else if (this.schools.length > 0) {
                    const maxId = Math.max(...this.schools.map(s => s.id));
                    this.selectSchool(maxId);
                }
            }
        } catch (err) {
            console.error(err);
            Helper.alert('error', 'Error al guardar centro');
        }
    },

    async deleteSchool(id) {
        if (!await Helper.confirm('Esta acción eliminará también todos sus puntos de atención registrados.')) return;

        try {
            const res = await Helper.fetchAPI(`/schools/${id}`, { method: 'DELETE' });
            if (res.message) {
                Helper.alert('success', res.message);
                await this.loadSchools();
                if (this.selectedSchoolId == id) {
                    this.selectedSchoolId = null;
                    document.getElementById('branches-container').innerHTML = '<p class="text-center text-muted py-5">Seleccione un centro para ver sus puntos de atención</p>';
                    document.getElementById('btn-new-branch').style.display = 'none';
                }
            }
        } catch (err) {
            console.error(err);
        }
    },

    openBranchModal(branchOrId = null) {
        let branch = (typeof branchOrId === 'number' || (typeof branchOrId === 'string' && branchOrId !== ''))
            ? this.branches.find(b => b.id == branchOrId)
            : branchOrId;
        const isEdit = !!branch;
        document.getElementById('formBranch').reset();
        document.getElementById('branch-id').value = isEdit ? branch.id : '';
        document.getElementById('modalBranchTitle').innerText = isEdit ? 'Editar Punto de Atención' : 'Nuevo Punto de Atención';

        if (isEdit) {
            document.getElementById('branch-dane').value = branch.dane_code || '';
            document.getElementById('branch-name').value = branch.name;
            document.getElementById('branch-manager').value = branch.manager_name || '';
            document.getElementById('branch-total-beneficiaries').value = branch.total_beneficiaries || 0;
            document.getElementById('branch-address').value = branch.address || '';
            document.getElementById('branch-phone').value = branch.phone || '';
            document.getElementById('branch-area').value = branch.area_type;

            if (branch.name === 'PRINCIPAL') {
                document.getElementById('branch-name').readOnly = true;
            } else {
                document.getElementById('branch-name').readOnly = false;
            }
        }

        new bootstrap.Modal(document.getElementById('modalBranch')).show();
    },

    async saveBranch() {
        const id = document.getElementById('branch-id').value;
        const data = {
            school_id: this.selectedSchoolId,
            dane_code: document.getElementById('branch-dane').value.toUpperCase(),
            name: document.getElementById('branch-name').value.toUpperCase(),
            manager_name: document.getElementById('branch-manager').value.toUpperCase(),
            total_beneficiaries: document.getElementById('branch-total-beneficiaries').value || 0,
            address: document.getElementById('branch-address').value,
            phone: document.getElementById('branch-phone').value,
            area_type: document.getElementById('branch-area').value
        };

        try {
            const endpoint = id ? `/branches/${id}` : '/branches';
            const method = id ? 'PUT' : 'POST';
            const res = await Helper.fetchAPI(endpoint, {
                method,
                body: JSON.stringify(data)
            });

            if (res.message) {
                Helper.alert('success', res.message);
                bootstrap.Modal.getInstance(document.getElementById('modalBranch')).hide();
                await this.loadBranches(this.selectedSchoolId);
            }
        } catch (err) {
            console.error(err);
            Helper.alert('error', 'Error al guardar punto de atención');
        }
    },

    async deleteBranch(id) {
        if (!await Helper.confirm('¿Seguro que desea eliminar este punto de atención?')) return;

        try {
            const res = await Helper.fetchAPI(`/branches/${id}`, { method: 'DELETE' });
            if (res.message) {
                Helper.alert('success', res.message);
                await this.loadBranches(this.selectedSchoolId);
            }
        } catch (err) {
            console.error(err);
        }
    }
};

// Auto-render
SchoolsView.render();

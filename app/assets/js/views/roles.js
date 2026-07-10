
/**
 * Roles and Permissions View
 * Redesigned for improved usability with DataTable and Modal-based permissions
 */
var RolesPermissionsView = {
    roles: [],
    modules: [],
    selectedRoleId: null,
    permissions: {},
    canModifyRoles: false,

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="text-primary-custom fw-bold"><i class="fas fa-shield-alt me-2"></i>Roles y Permisos</h2>
                        <p class="text-muted">Administración de niveles de acceso y perfiles de usuario</p>
                    </div>
                    <div id="role-actions-top" style="display: none;">
                        <button class="btn btn-success rounded-pill px-4 shadow-sm" onclick="RolesPermissionsView.openRoleModal()">
                            <i class="fas fa-plus me-2"></i>Nuevo Rol
                        </button>
                    </div>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="rolesTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">ID</th>
                                        <th>Nombre del Rol</th>
                                        <th>Descripción</th>
                                        <th class="text-end pe-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="roles-table-body">
                                    <!-- Data loaded dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Role (Create/Edit) -->
            <div class="modal fade" id="modalRole" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="modalRoleTitle">Gestionar Rol</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="formRole">
                                <input type="hidden" id="role-id">
                                <div class="mb-3">
                                    <label class="form-label text-uppercase small fw-bold">Nombre del Rol *</label>
                                    <input type="text" class="form-control" id="role-name-input" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label text-uppercase small fw-bold">Descripción</label>
                                    <textarea class="form-control" id="role-description-input" rows="3"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="RolesPermissionsView.saveRole()">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Permissions (The Key) -->
            <div class="modal fade" id="modalPermissions" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content border-0 shadow">
                        <div class="modal-header bg-dark text-white">
                            <h5 class="modal-title"><i class="fas fa-key me-2 text-warning"></i>Permisos Roles de Usuario</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0">
                            <div id="permissions-modal-body" style="max-height: 65vh; overflow-y: auto;" class="p-3">
                                <!-- Permissions matrix loaded here -->
                            </div>
                        </div>
                        <div class="modal-footer bg-light justify-content-center">
                            <button type="button" class="btn btn-success px-4" onclick="RolesPermissionsView.saveAllPermissions()">
                                <i class="fas fa-check-circle me-2"></i>Guardar Cambios
                            </button>
                            <button type="button" class="btn btn-danger px-4" data-bs-dismiss="modal">
                                <i class="fas fa-times-circle me-2"></i>Salir
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-container').innerHTML = html;
        this.init();
    },

    async init() {
        await this.loadModules();
        await this.loadRoles();
    },

    async loadRoles() {
        try {
            const res = await Helper.fetchAPI('/permissions/roles');
            if (res.success) {
                this.roles = res.data;
                this.canModifyRoles = res.can_modify_roles;

                if (this.canModifyRoles) {
                    document.getElementById('role-actions-top').style.display = 'block';
                }

                this.renderRolesTable();
            }
        } catch (e) {
            console.error(e);
        }
    },

    async loadModules() {
        try {
            const res = await Helper.fetchAPI('/permissions/modules');
            if (res.success) {
                this.modules = res.data;
            }
        } catch (e) {
            console.error(e);
        }
    },

    renderRolesTable() {
        if ($.fn.DataTable.isDataTable('#rolesTable')) {
            $('#rolesTable').DataTable().destroy();
        }

        const tbody = document.getElementById('roles-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        this.roles.forEach(role => {
            const isSuperAdmin = role.id == 1;
            tbody.innerHTML += `
                <tr>
                    <td class="ps-4"># ${role.id}</td>
                    <td class="fw-bold text-dark text-uppercase">${role.name}</td>
                    <td class="text-muted small">${role.description || '-'}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-dark me-1" onclick="RolesPermissionsView.openPermissionsModal(${role.id})" title="Permisos">
                            <i class="fas fa-key text-warning"></i>
                        </button>
                        ${this.canModifyRoles ? `
                            <button class="btn btn-sm btn-outline-info me-1" onclick='RolesPermissionsView.openRoleModal(${JSON.stringify(role)})' title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${!isSuperAdmin ? `
                                <button class="btn btn-sm btn-outline-danger" onclick="RolesPermissionsView.deleteRole(${role.id})" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        Helper.initDataTable('#rolesTable');
    },

    openRoleModal(role = null) {
        document.getElementById('formRole').reset();
        document.getElementById('role-id').value = role ? role.id : '';
        document.getElementById('role-name-input').value = role ? role.name : '';
        document.getElementById('role-description-input').value = role ? role.description : '';
        document.getElementById('modalRoleTitle').innerText = role ? 'Editar Rol' : 'Nuevo Rol';

        new bootstrap.Modal(document.getElementById('modalRole')).show();
    },

    async saveRole() {
        const id = document.getElementById('role-id').value;
        const name = document.getElementById('role-name-input').value.toUpperCase();
        const description = document.getElementById('role-description-input').value;

        if (!name) return Helper.alert('warning', 'El nombre es obligatorio');

        const method = id ? 'PUT' : 'POST'; // Note: PermissionController backend might differ in endpoints, using POST as per existing code/standard
        const url = '/permissions/roles';

        try {
            const res = await Helper.fetchAPI(url, {
                method: method,
                body: JSON.stringify({ id, name, description })
            });

            if (res.success) {
                Helper.alert('success', res.message);
                bootstrap.Modal.getInstance(document.getElementById('modalRole')).hide();
                this.loadRoles();
            } else {
                Helper.alert('error', res.message);
            }
        } catch (e) {
            console.error(e);
        }
    },

    async openPermissionsModal(roleId) {
        this.selectedRoleId = roleId;
        const role = this.roles.find(r => r.id == roleId);

        // Show loading state or clear
        document.getElementById('permissions-modal-body').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

        const modal = new bootstrap.Modal(document.getElementById('modalPermissions'));
        modal.show();

        try {
            const res = await Helper.fetchAPI(`/permissions/matrix/${roleId}`);
            if (res.success) {
                this.permissions = {};
                res.data.forEach(p => {
                    this.permissions[p.module_id] = {
                        can_create: parseInt(p.can_create),
                        can_read: parseInt(p.can_read),
                        can_update: parseInt(p.can_update),
                        can_delete: parseInt(p.can_delete)
                    };
                });
                this.renderPermissionsMatrix();
            }
        } catch (e) {
            console.error(e);
            document.getElementById('permissions-modal-body').innerHTML = '<p class="text-danger text-center py-5">Error al cargar matriz</p>';
        }
    },

    renderPermissionsMatrix() {
        const container = document.getElementById('permissions-modal-body');
        let html = '';

        this.modules.forEach(group => {
            html += `
                <div class="mb-4">
                    <h6 class="text-uppercase fw-bold text-primary mb-3" style="letter-spacing: 1px; border-left: 4px solid; padding-left: 10px;">
                        <i class="${group.icon} me-2"></i>${group.name}
                    </h6>
                    <table class="table table-sm table-hover border-bottom">
                        <thead class="text-secondary small">
                            <tr>
                                <th style="width: 40%">Módulo</th>
                                <th class="text-center">Leer</th>
                                <th class="text-center">Escribir</th>
                                <th class="text-center">Actualizar</th>
                                <th class="text-center">Eliminar</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            group.modules.forEach(m => {
                const p = this.permissions[m.id] || { can_create: 0, can_read: 0, can_update: 0, can_delete: 0 };
                html += `
                    <tr>
                        <td class="py-2">
                            <div class="fw-bold">${m.name}</div>
                            <div class="text-muted x-small">${m.description || ''}</div>
                        </td>
                        <td class="text-center">
                            <input type="checkbox" class="form-check-input perm-cb" data-module="${m.id}" data-perm="can_read" ${p.can_read ? 'checked' : ''}>
                        </td>
                        <td class="text-center">
                            <input type="checkbox" class="form-check-input perm-cb" data-module="${m.id}" data-perm="can_create" ${p.can_create ? 'checked' : ''}>
                        </td>
                        <td class="text-center">
                            <input type="checkbox" class="form-check-input perm-cb" data-module="${m.id}" data-perm="can_update" ${p.can_update ? 'checked' : ''}>
                        </td>
                        <td class="text-center">
                            <input type="checkbox" class="form-check-input perm-cb" data-module="${m.id}" data-perm="can_delete" ${p.can_delete ? 'checked' : ''}>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        container.innerHTML = html;

        // Casing trick for small text
        const style = document.createElement('style');
        style.innerHTML = '.x-small { font-size: 0.75rem; }';
        document.head.appendChild(style);
    },

    async saveAllPermissions() {
        const checkboxes = document.querySelectorAll('.perm-cb');
        const grouped = {};

        checkboxes.forEach(cb => {
            const mId = cb.dataset.module;
            const perm = cb.dataset.perm;
            if (!grouped[mId]) grouped[mId] = { can_create: 0, can_read: 0, can_update: 0, can_delete: 0 };
            grouped[mId][perm] = cb.checked ? 1 : 0;
        });

        // The current backend updatePermissions expects one module at a time.
        // I will Loop through and save all changed ones, or better, implement a bulk save on backend later.
        // For now, I'll stick to the current backend API but optimize by only sending what changed or just batch calls.

        Helper.alert('info', 'Procesando cambios...', '', false);

        try {
            const promises = Object.keys(grouped).map(mId => {
                return Helper.fetchAPI('/permissions/update', {
                    method: 'PUT',
                    body: JSON.stringify({
                        role_id: this.selectedRoleId,
                        module_id: mId,
                        permissions: grouped[mId]
                    })
                });
            });

            await Promise.all(promises);
            Helper.alert('success', 'Todos los permisos actualizados correctamente');
            bootstrap.Modal.getInstance(document.getElementById('modalPermissions')).hide();
        } catch (e) {
            console.error(e);
            Helper.alert('error', 'Error al guardar algunos permisos');
        }
    },

    async deleteRole(id) {
        if (!await Helper.confirm('¿Eliminar este rol? Los usuarios asignados perderán sus permisos.')) return;
        try {
            const res = await Helper.fetchAPI(`/permissions/roles/${id}`, { method: 'DELETE' });
            if (res.success) {
                Helper.alert('success', res.message);
                this.loadRoles();
            }
        } catch (e) {
            console.error(e);
        }
    }
};

RolesPermissionsView.render();

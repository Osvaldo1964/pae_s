
var UsersView = {
    users: [],

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2 class="text-primary-custom fw-bold"><i class="fas fa-users me-2"></i>Gestión de Usuarios</h2>
                    <button class="btn btn-success rounded-pill px-4 shadow-sm" onclick="UsersView.openUserModal()">
                        <i class="fas fa-plus me-2"></i>Nuevo Usuario
                    </button>
                </div>
                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="usersTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">Nombre Completo</th>
                                        <th>Contacto</th>
                                        <th>Credenciales</th>
                                        <th>Rol</th>
                                        <th class="text-end pe-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="users-table-body">
                                    <!-- Data will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = html;
            this.init();
        } else {
            // Fallback for direct #app if app-container is missing
            document.getElementById('app').innerHTML = html;
            this.init();
        }
    },

    async init() {
        await this.loadUsers();
    },

    async loadUsers() {
        try {
            if ($.fn.DataTable.isDataTable('#usersTable')) {
                $('#usersTable').DataTable().destroy();
            }

            const users = await Helper.fetchAPI('/users');
            const tbody = document.getElementById('users-table-body');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (users.error || !Array.isArray(users)) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Error: ${users.message || 'Respuesta inválida del servidor'}</td></tr>`;
                return;
            }

            users.forEach(u => {
                tbody.innerHTML += `
                    <tr>
                        <td class="ps-4">
                            <div class="fw-bold text-dark">${u.full_name}</div>
                            <small class="text-muted"><i class="fas fa-id-badge me-1"></i>ID: ${u.id}</small>
                        </td>
                        <td>
                            ${u.address ? `<div class="small"><i class="fas fa-map-marker-alt text-danger me-1"></i>${u.address}</div>` : ''}
                            ${u.phone ? `<div class="small text-muted"><i class="fas fa-phone text-success me-1"></i>${u.phone}</div>` : '<span class="small text-muted">-</span>'}
                        </td>
                        <td>
                            <div class="fw-medium text-dark"><i class="fas fa-user-circle me-1 text-muted"></i>${u.username}</div>
                            <small class="text-muted">************</small>
                        </td>
                        <td><span class="badge rounded-pill bg-light text-primary border border-primary text-uppercase">${u.role_name || 'N/A'}</span></td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-light text-primary me-2" onclick='UsersView.openUserModal(${JSON.stringify(u)})' title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${u.id != App.state.user.id ? `
                            <button class="btn btn-sm btn-light text-danger" onclick="UsersView.deleteUser(${u.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>` : ''}
                        </td>
                    </tr>
                `;
            });

            Helper.initDataTable('#usersTable');
        } catch (e) {
            console.error(e);
        }
    },

    openUserModal: async function (user = null) {
        let rolesHtml = '';
        try {
            const roles = await Helper.fetchAPI('/roles');
            roles.filter(r => r.id != 1).forEach(r => {
                const selected = user && user.role_id == r.id ? 'selected' : '';
                rolesHtml += `<option value="${r.id}" ${selected}>${r.name}</option>`;
            });
        } catch (e) { console.error(e); }

        const isEdit = !!user;
        const headerColor = isEdit ? '#3498db' : '#27ae60';

        const { value: formValues } = await Swal.fire({
            title: `<span style="color: white">${isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</span>`,
            background: '#fff',
            width: '600px',
            padding: '0',
            showCloseButton: true,
            html: `
                <style>
                    .swal2-title { background-color: ${headerColor}; border-radius: 5px 5px 0 0; display: flex !important; margin: 0 !important; width: 100%; justify-content: center; }
                    .form-label-custom { text-transform: uppercase; font-size: 0.75rem; font-weight: 700; color: #555; margin-bottom: 4px; display: block; text-align: left; }
                </style>
                <div class="px-4 py-3 text-start">
                    <div class="mb-3">
                        <label class="form-label-custom">Nombre Completo</label>
                        <input id="swal-fullname" class="form-control" placeholder="Ej: JUAN PÉREZ" value="${user ? user.full_name : ''}">
                    </div>
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label-custom">Dirección</label>
                            <input id="swal-address" class="form-control" placeholder="Ej: Calle 123" value="${user && user.address ? user.address : ''}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label-custom">Teléfono</label>
                            <input id="swal-phone" class="form-control" placeholder="Ej: 300 123 4567" value="${user && user.phone ? user.phone : ''}">
                        </div>
                    </div>
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label-custom">Usuario / Correo</label>
                            <input id="swal-username" class="form-control" placeholder="juan.perez" value="${user ? user.username : ''}" ${isEdit ? 'readonly' : ''}>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label-custom">Contraseña ${isEdit ? '<small class="text-muted fw-normal">(Opcional)</small>' : ''}</label>
                            <input id="swal-password" type="password" class="form-control" placeholder="******">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label-custom">Rol Asignado</label>
                        <select id="swal-role" class="form-select">${rolesHtml}</select>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: headerColor,
            preConfirm: () => {
                return {
                    full_name: document.getElementById('swal-fullname').value.toUpperCase(),
                    address: document.getElementById('swal-address').value,
                    phone: document.getElementById('swal-phone').value,
                    username: document.getElementById('swal-username').value.toLowerCase(),
                    role_id: document.getElementById('swal-role').value,
                    password: document.getElementById('swal-password').value
                }
            }
        });

        if (formValues) {
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/users/${user.id}` : '/users';
            const res = await Helper.fetchAPI(url, { method, body: JSON.stringify(formValues) });
            if (res.message) {
                Helper.alert('success', res.message);
                this.loadUsers();
            }
        }
    },

    async deleteUser(id) {
        if (!await Helper.confirm('¿Está seguro de eliminar este usuario?')) return;
        const res = await Helper.fetchAPI(`/users/${id}`, { method: 'DELETE' });
        if (res.message) {
            Helper.alert('success', res.message);
            this.loadUsers();
        }
    }
};

UsersView.render();

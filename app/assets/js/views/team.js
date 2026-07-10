/**
 * Team View - Mi Equipo (Team Management for PAE Administrators)
 */

// Use window.TeamView to allow re-loading the script without "already declared" errors
window.TeamView = {
    currentMember: null,

    async init() {
        console.log('Initializing Team Module...');
        this.render();
        await this.loadTeam();
    },

    render() {
        const html = `
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-users me-2"></i>Mi Equipo</h2>
                        <p class="text-muted mb-0">Gestión de miembros del equipo de trabajo</p>
                    </div>
                    <button class="btn btn-success rounded-pill px-4 shadow-sm" onclick="TeamView.openModal()">
                        <i class="fas fa-user-plus me-2"></i>Agregar Miembro
                    </button>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="teamTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">Nombre Completo</th>
                                        <th>Contacto</th>
                                        <th>Credenciales</th>
                                        <th>Rol</th>
                                        <th class="text-end pe-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="team-table-body">
                                    <!-- Dynamic content -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app').innerHTML = html;
    },

    async loadTeam() {
        try {
            const members = await Helper.fetchAPI('/team');
            const tbody = document.getElementById('team-table-body');
            tbody.innerHTML = '';

            if (!Array.isArray(members)) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Error: ${members.message || 'Respuesta inválida del servidor'}</td></tr>`;
                console.error("API Error:", members);
                return;
            }

            if (members.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No hay miembros en el equipo</td></tr>`;
                return;
            }

            // Get current user ID from token
            const currentUserId = this.getCurrentUserId();

            members.forEach(m => {
                const isCurrentUser = m.id == currentUserId;
                tbody.innerHTML += `
                    <tr>
                        <td class="ps-4">
                            <div class="fw-bold text-dark">
                                ${m.full_name}
                                ${isCurrentUser ? '<span class="badge bg-primary ms-2">Tú</span>' : ''}
                            </div>
                            <small class="text-muted"><i class="fas fa-id-badge me-1"></i>ID: ${m.id}</small>
                        </td>
                        <td>
                            ${m.address ? `<div class="small"><i class="fas fa-map-marker-alt text-danger me-1"></i>${m.address}</div>` : ''}
                            ${m.phone ? `<div class="small text-muted"><i class="fas fa-phone text-success me-1"></i>${m.phone}</div>` : '<span class="small text-muted">-</span>'}
                        </td>
                        <td>
                            <div class="fw-medium text-dark"><i class="fas fa-user-circle me-1 text-muted"></i>${m.username}</div>
                            <small class="text-muted">************</small>
                        </td>
                        <td><span class="badge rounded-pill bg-light text-primary border border-primary text-uppercase">${m.role_name || 'N/A'}</span></td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-light text-primary me-2" onclick='TeamView.openModal(${JSON.stringify(m)})' title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${!isCurrentUser ? `
                            <button class="btn btn-sm btn-light text-danger" onclick="TeamView.deleteMember(${m.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>` : ''}
                        </td>
                    </tr>
                `;
            });

            // Initialize DataTable
            Helper.initDataTable('#teamTable');

        } catch (e) {
            console.error(e);
            document.getElementById('team-table-body').innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error cargando equipo.</td></tr>';
        }
    },

    getCurrentUserId() {
        const token = localStorage.getItem('pae_token');
        if (!token) return null;

        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            return payload.data?.id || null;
        } catch (e) {
            return null;
        }
    },

    async openModal(member = null) {
        // Fetch Roles
        let rolesHtml = '';
        try {
            const roles = await Helper.fetchAPI('/roles');
            // Filter roles: Exclude Super Admin (id=1)
            roles.filter(r => r.id != 1).forEach(r => {
                const selected = member && member.role_id == r.id ? 'selected' : '';
                rolesHtml += `<option value="${r.id}" ${selected}>${r.name}</option>`;
            });
        } catch (e) {
            console.error("Error fetching roles", e);
            rolesHtml = '<option value="">Error cargando roles</option>';
        }

        const isEdit = !!member;
        const title = isEdit ? 'Editar Miembro del Equipo' : 'Nuevo Miembro del Equipo';
        const headerColor = isEdit ? '#3498db' : '#27ae60';
        const btnColor = isEdit ? '#3498db' : '#27ae60';

        const { value: formValues } = await Swal.fire({
            title: `<span style="color: white">${title}</span>`,
            background: '#fff',
            width: '600px',
            padding: '0',
            customClass: {
                title: 'py-3 m-0 w-100'
            },
            showCloseButton: true,
            html: `
                <style>
                    .swal2-title { background-color: ${headerColor}; border-radius: 5px 5px 0 0; display: flex !important; margin: 0 !important; width: 100%; }
                    .swal2-close { color: white !important; }
                    .form-label-custom { text-transform: uppercase; font-size: 0.75rem; font-weight: 700; color: #555; margin-bottom: 4px; display: block; text-align: left; }
                </style>
                <div class="px-4 py-3 text-start">
                    <div class="mb-3">
                        <label class="form-label-custom">Nombre Completo</label>
                        <input id="swal-fullname" class="form-control" placeholder="Ej: Juan Pérez" value="${member ? member.full_name : ''}">
                    </div>
                    
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label-custom">Dirección</label>
                            <input id="swal-address" class="form-control" placeholder="Ej: Calle 123" value="${member && member.address ? member.address : ''}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label-custom">Teléfono</label>
                            <input id="swal-phone" class="form-control" placeholder="Ej: 300 123 4567" value="${member && member.phone ? member.phone : ''}">
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label-custom">Usuario / Correo</label>
                            <input id="swal-username" class="form-control" placeholder="juan.perez" value="${member ? member.username : ''}" ${isEdit ? 'readonly' : ''}>
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
            confirmButtonColor: btnColor,
            cancelButtonColor: '#6c757d',
            preConfirm: () => {
                return {
                    full_name: document.getElementById('swal-fullname').value,
                    address: document.getElementById('swal-address').value,
                    phone: document.getElementById('swal-phone').value,
                    username: document.getElementById('swal-username').value,
                    role_id: document.getElementById('swal-role').value,
                    password: document.getElementById('swal-password').value
                }
            }
        });

        if (formValues) {
            if (!formValues.full_name || !formValues.username || (!isEdit && !formValues.password)) {
                Swal.fire('Error', 'Por favor complete los campos obligatorios.', 'warning');
                return;
            }

            try {
                let response;
                if (isEdit) {
                    response = await Helper.fetchAPI(`/team/${member.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(formValues)
                    });
                } else {
                    response = await Helper.fetchAPI('/team', {
                        method: 'POST',
                        body: JSON.stringify(formValues)
                    });
                }

                if (response.message) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Guardado',
                        text: response.message,
                        timer: 1500,
                        showConfirmButton: false
                    });
                    await this.loadTeam();
                } else {
                    Swal.fire('Error', 'No se pudo guardar.', 'error');
                }
            } catch (error) {
                console.error('Error saving member:', error);
                Swal.fire('Error', error.message || 'Error al guardar miembro del equipo', 'error');
            }
        }
    },

    async deleteMember(id) {
        const result = await Swal.fire({
            title: '¿Eliminar miembro del equipo?',
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const response = await Helper.fetchAPI(`/team/${id}`, { method: 'DELETE' });
                if (response.message) {
                    Swal.fire('Eliminado', response.message, 'success');
                    await this.loadTeam();
                } else {
                    Swal.fire('Error', 'No se pudo eliminar.', 'error');
                }
            } catch (error) {
                console.error('Error deleting member:', error);
                Swal.fire('Error', error.message || 'Error al eliminar miembro', 'error');
            }
        }
    }
};

// Initialize when view is loaded
if (typeof TeamView !== 'undefined') {
    TeamView.init();
}

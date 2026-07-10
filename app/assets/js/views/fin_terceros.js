/**
 * Terceros View - Finance Module
 * Management of Suppliers and Clients
 */

window.TercerosView = {
    terceros: [],

    async init() {
        console.log('Initializing Terceros Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const res = await Helper.fetchAPI('/terceros');
            this.terceros = Array.isArray(res) ? res : [];
        } catch (error) {
            console.error('Error loading terceros:', error);
            this.terceros = [];
        }
    },

    render() {
        const total = this.terceros.length;
        const suppliers = this.terceros.filter(t => t.tipo_tercero === 'Proveedor').length;
        const others = total - suppliers;

        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="text-primary-custom fw-bold mb-0">Directorio de Terceros</h2>
                        <p class="text-muted">Gestión de personas y empresas vinculadas financieramente</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="TercerosView.openModal()">
                        <i class="fas fa-plus me-2"></i>Nuevo Tercero
                    </button>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm p-3 h-100 border-start border-primary border-4">
                            <h6 class="small text-uppercase mb-1 text-muted">Total Terceros</h6>
                            <h3 class="mb-0">${total}</h3>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm p-3 h-100 border-start border-success border-4">
                            <h6 class="small text-uppercase mb-1 text-muted">Proveedores</h6>
                            <h3 class="mb-0">${suppliers}</h3>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm p-3 h-100 border-start border-info border-4">
                            <h6 class="small text-uppercase mb-1 text-muted">Otros / Contratistas</h6>
                            <h3 class="mb-0">${others}</h3>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="tercerosTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">Identificación</th>
                                        <th>Nombres / Razón Social</th>
                                        <th>Tipo</th>
                                        <th>Teléfono / Email</th>
                                        <th class="text-end pe-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderTableBody()}
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
            Helper.initDataTable('#tercerosTable');
        }
    },

    renderTableBody() {
        return this.terceros.map(t => `
            <tr>
                <td class="ps-4 fw-bold text-dark">${t.identificacion}</td>
                <td>
                    <div class="fw-bold text-primary-custom text-uppercase">${t.nombres}</div>
                    <small class="text-muted"><i class="fas fa-map-marker-alt me-1"></i>${t.direccion || 'Sin dirección'}</small>
                </td>
                <td><span class="badge rounded-pill bg-light text-primary border border-primary text-uppercase">${t.tipo_tercero}</span></td>
                <td>
                    <div class="small"><i class="fas fa-phone text-success me-1"></i>${t.telefono || '-'}</div>
                    <div class="small text-muted"><i class="fas fa-envelope me-1"></i>${t.email || '-'}</div>
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light text-primary me-2 shadow-sm" onclick='TercerosView.openModal(${JSON.stringify(t)})' title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-light text-danger shadow-sm" onclick="TercerosView.delete(${t.id_tercero})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    async openModal(tercero = null) {
        const isEdit = !!tercero;
        const title = isEdit ? 'Editar Tercero' : 'Nuevo Tercero';

        const { value: formValues } = await Swal.fire({
            title: `<strong>${title}</strong>`,
            width: '800px',
            customClass: {
                container: 'swal2-large-modal'
            },
            html: `
                <div class="text-start px-2 py-3">
                    <p class="small text-info mb-4 border-bottom pb-2">Los campos con asterisco (*) son obligatorios.</p>
                    
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase">Identificación *</label>
                            <input id="swal-identificacion" class="form-control" placeholder="NIT o Cédula" value="${tercero ? tercero.identificacion : ''}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase">Nombres / Razón Social *</label>
                            <input id="swal-nombres" class="form-control" placeholder="Nombre completo" value="${tercero ? tercero.nombres : ''}">
                        </div>
                        
                        <div class="col-12">
                            <label class="form-label small fw-bold text-uppercase">Dirección</label>
                            <input id="swal-direccion" class="form-control" placeholder="Dirección de correspondencia" value="${tercero ? tercero.direccion : ''}">
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase">Teléfono</label>
                            <input id="swal-telefono" class="form-control" placeholder="Teléfono de contacto" value="${tercero ? tercero.telefono : ''}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase">Email</label>
                            <input id="swal-email" type="email" class="form-control" placeholder="Correo electrónico" value="${tercero ? tercero.email : ''}">
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-uppercase">Tipo Tercero *</label>
                            <select id="swal-tipo" class="form-select">
                                <option value="Proveedor" ${tercero && tercero.tipo_tercero === 'Proveedor' ? 'selected' : ''}>Proveedor</option>
                                <option value="Empleado" ${tercero && tercero.tipo_tercero === 'Empleado' ? 'selected' : ''}>Empleado</option>
                                <option value="Contratista" ${tercero && tercero.tipo_tercero === 'Contratista' ? 'selected' : ''}>Contratista</option>
                                <option value="Otro" ${tercero && tercero.tipo_tercero === 'Otro' ? 'selected' : ''}>Otro</option>
                            </select>
                        </div>
                    </div>
                </div>
            `,
            showCloseButton: true,
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Guardar',
            cancelButtonText: '<i class="fas fa-times-circle me-1"></i> Cerrar',
            confirmButtonColor: '#16a085',
            cancelButtonColor: '#e74c3c',
            preConfirm: () => {
                const identificacion = document.getElementById('swal-identificacion').value;
                const nombres = document.getElementById('swal-nombres').value;
                const tipo = document.getElementById('swal-tipo').value;

                if (!identificacion || !nombres) {
                    Swal.showValidationMessage('Identificación y Nombres son obligatorios');
                    return false;
                }

                return {
                    identificacion,
                    nombres,
                    direccion: document.getElementById('swal-direccion').value,
                    telefono: document.getElementById('swal-telefono').value,
                    email: document.getElementById('swal-email').value,
                    tipo_tercero: tipo
                }
            }
        });

        if (formValues) {
            try {
                const url = isEdit ? `/terceros/${tercero.id_tercero}` : '/terceros';
                const method = isEdit ? 'PUT' : 'POST';
                const res = await Helper.fetchAPI(url, {
                    method,
                    body: JSON.stringify(formValues)
                });

                if (res.success || res.message) {
                    Swal.fire('Éxito', res.message, 'success');
                    await this.init();
                } else {
                    Swal.fire('Error', res.message || 'No se pudo guardar el tercero', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Error al procesar la solicitud', 'error');
            }
        }
    },

    async delete(id) {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: "Esta acción marcará al tercero como inactivo.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const res = await Helper.fetchAPI(`/terceros/${id}`, { method: 'DELETE' });
                if (res.success) {
                    Swal.fire('Eliminado', res.message, 'success');
                    await this.init();
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Error al eliminar el tercero', 'error');
            }
        }
    }
};

// Initialize
TercerosView.init();

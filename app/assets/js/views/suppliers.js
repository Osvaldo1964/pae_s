/**
 * Suppliers (Proveedores) View
 * CRUD management for program suppliers
 */
var SuppliersView = {
    suppliers: [],

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="text-primary-custom fw-bold"><i class="fas fa-truck me-2"></i>Directorio de Proveedores</h2>
                        <p class="text-muted">Gestión de proveedores locales y externos del programa</p>
                    </div>
                    <button class="btn btn-success rounded-pill px-4 shadow-sm" onclick="SuppliersView.openSupplierModal()">
                        <i class="fas fa-plus me-2"></i>Nuevo Proveedor
                    </button>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="suppliersTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">NIT</th>
                                        <th>Razón Social / Nombre</th>
                                        <th>Contacto</th>
                                        <th>Ciudad</th>
                                        <th>Estado</th>
                                        <th class="text-end pe-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="suppliers-table-body">
                                    <!-- Dynamic content -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal: Supplier -->
            <div class="modal fade" id="modalSupplier" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content border-0 shadow">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="modalSupplierTitle">Gestionar Proveedor</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <form id="formSupplier">
                                <input type="hidden" id="supplier-id">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label class="form-label text-uppercase small fw-bold">NIT *</label>
                                        <input type="text" class="form-control" id="supplier-nit" required placeholder="Ej: 900.123.456-7">
                                    </div>
                                    <div class="col-md-8">
                                        <label class="form-label text-uppercase small fw-bold">Razón Social / Nombre *</label>
                                        <input type="text" class="form-control" id="supplier-name" required style="text-transform: uppercase;">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-uppercase small fw-bold">Persona de Contacto</label>
                                        <input type="text" class="form-control" id="supplier-contact" style="text-transform: uppercase;">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-uppercase small fw-bold">Correo Electrónico</label>
                                        <input type="email" class="form-control" id="supplier-email" style="text-transform: lowercase;">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label text-uppercase small fw-bold">Teléfono</label>
                                        <input type="text" class="form-control" id="supplier-phone">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label text-uppercase small fw-bold">Ciudad</label>
                                        <input type="text" class="form-control" id="supplier-city" style="text-transform: uppercase;">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label text-uppercase small fw-bold">Tipo</label>
                                        <select class="form-select" id="supplier-type">
                                            <option value="JURIDICA">JURÍDICA</option>
                                            <option value="NATURAL">NATURAL</option>
                                        </select>
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label text-uppercase small fw-bold">Dirección</label>
                                        <input type="text" class="form-control" id="supplier-address">
                                    </div>
                                    <div class="col-md-4" id="supplier-status-container" style="display: none;">
                                        <label class="form-label text-uppercase small fw-bold">Estado</label>
                                        <select class="form-select" id="supplier-status">
                                            <option value="active">ACTIVO</option>
                                            <option value="inactive">INACTIVO</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary px-4" onclick="SuppliersView.saveSupplier()">
                                <i class="fas fa-save me-2"></i>Guardar
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
        await this.loadSuppliers();
    },

    async loadSuppliers() {
        try {
            const res = await Helper.fetchAPI('/proveedores');
            // Backend returns array directly in this case based on standard
            if (Array.isArray(res)) {
                this.suppliers = res;
                this.renderTable();
            }
        } catch (e) {
            console.error(e);
        }
    },

    renderTable() {
        // 1. Destroy existing DataTable before modifying DOM
        if ($.fn.DataTable.isDataTable('#suppliersTable')) {
            $('#suppliersTable').DataTable().destroy();
        }

        const tbody = document.getElementById('suppliers-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        this.suppliers.forEach(s => {
            const statusBadge = s.status === 'active'
                ? '<span class="badge bg-success-light text-success">ACTIVO</span>'
                : '<span class="badge bg-danger-light text-danger">INACTIVO</span>';

            tbody.innerHTML += `
                <tr class="supplier-row" data-id="${s.id}">
                    <td class="ps-4 fw-bold"># ${s.nit}</td>
                    <td>
                        <div class="fw-bold text-dark text-uppercase">${s.name}</div>
                        <div class="text-muted x-small">${s.address || ''}</div>
                    </td>
                    <td>
                        <div class="small"><i class="fas fa-user-tie me-1"></i>${s.contact_person || '-'}</div>
                        <div class="x-small text-muted"><i class="fas fa-phone me-1"></i>${s.phone || '-'}</div>
                    </td>
                    <td><span class="text-uppercase small">${s.city || '-'}</span></td>
                    <td>${statusBadge}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-info me-1" onclick='SuppliersView.openSupplierModal(${JSON.stringify(s)})' title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="SuppliersView.deleteSupplier(${s.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        Helper.initDataTable('#suppliersTable');

        // CSS for custom badges if not in main bootstrap
        const style = document.createElement('style');
        style.innerHTML = `
            .bg-success-light { background-color: rgba(46, 204, 113, 0.1); }
            .bg-danger-light { background-color: rgba(231, 76, 60, 0.1); }
            .x-small { font-size: 0.75rem; }
        `;
        document.head.appendChild(style);
    },

    openSupplierModal(supplier = null) {
        const isEdit = !!supplier;
        document.getElementById('formSupplier').reset();
        document.getElementById('supplier-id').value = isEdit ? supplier.id : '';
        document.getElementById('modalSupplierTitle').innerText = isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor';
        document.getElementById('supplier-status-container').style.display = isEdit ? 'block' : 'none';

        if (isEdit) {
            document.getElementById('supplier-nit').value = supplier.nit;
            document.getElementById('supplier-name').value = supplier.name;
            document.getElementById('supplier-contact').value = supplier.contact_person;
            document.getElementById('supplier-email').value = supplier.email;
            document.getElementById('supplier-phone').value = supplier.phone;
            document.getElementById('supplier-city').value = supplier.city;
            document.getElementById('supplier-type').value = supplier.type;
            document.getElementById('supplier-address').value = supplier.address;
            document.getElementById('supplier-status').value = supplier.status;
        }

        new bootstrap.Modal(document.getElementById('modalSupplier')).show();
    },

    async saveSupplier() {
        const id = document.getElementById('supplier-id').value;
        const data = {
            nit: document.getElementById('supplier-nit').value,
            name: document.getElementById('supplier-name').value.toUpperCase(),
            contact_person: document.getElementById('supplier-contact').value.toUpperCase(),
            email: document.getElementById('supplier-email').value.toLowerCase(),
            phone: document.getElementById('supplier-phone').value,
            city: document.getElementById('supplier-city').value.toUpperCase(),
            type: document.getElementById('supplier-type').value,
            address: document.getElementById('supplier-address').value,
            status: document.getElementById('supplier-status').value
        };

        if (!data.nit || !data.name) return Helper.alert('warning', 'NIT y Razón Social son obligatorios');

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/proveedores/${id}` : '/proveedores';

        try {
            const res = await Helper.fetchAPI(url, {
                method: method,
                body: JSON.stringify(data)
            });

            if (res.message) {
                Helper.alert('success', res.message);
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalSupplier'));
                if (modal) modal.hide();
                SuppliersView.loadSuppliers();
            }
        } catch (e) {
            console.error(e);
            Helper.alert('error', e.message || 'Error al procesar la solicitud');
        }
    },

    async deleteSupplier(id) {
        if (!await Helper.confirm('¿Eliminar este proveedor de su directorio?')) return;
        try {
            const res = await Helper.fetchAPI(`/proveedores/${id}`, { method: 'DELETE' });
            if (res.message) {
                Helper.alert('success', res.message);
                SuppliersView.loadSuppliers();
            }
        } catch (e) {
            console.error(e);
        }
    }
};

SuppliersView.render();

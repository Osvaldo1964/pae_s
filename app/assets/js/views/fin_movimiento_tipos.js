/**
 * Movimiento Tipos View - Finance Module
 * Parameterization of Egresos/Expenses Movement Types
 */

window.MovimientoTiposView = {
    tipos: [],
    dataTable: null,

    async init() {
        console.log('Initializing Movimiento Tipos Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const tipos = await Helper.fetchAPI('/movimientos-tipos');
            this.tipos = Array.isArray(tipos) ? tipos : [];
        } catch (error) {
            console.error('Error loading movement types data:', error);
        }
    },

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="text-primary-custom fw-bold mb-0">Tipos de Movimientos</h2>
                        <p class="text-muted">Parámetros para clasificar egresos y costos del presupuesto</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="MovimientoTiposView.openModal()">
                        <i class="fas fa-plus me-2"></i>Nuevo Tipo
                    </button>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="tiposTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">Nombre del Tipo</th>
                                        <th>Descripción</th>
                                        <th class="text-center pe-4" style="width: 120px;">Acciones</th>
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
            Helper.initDataTable('#tiposTable', { order: [[0, 'asc']] });
        }
    },

    renderTableBody() {
        return this.tipos.map(t => `
            <tr>
                <td class="ps-4 fw-bold text-primary-custom">${t.nombre}</td>
                <td class="text-muted">${t.descripcion || '<span class="text-muted small">Sin descripción</span>'}</td>
                <td class="text-center pe-4">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary border-0" onclick="MovimientoTiposView.editItem(${t.id_tipo_movimiento})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger border-0" onclick="MovimientoTiposView.deleteItem(${t.id_tipo_movimiento})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    async openModal(editId = null) {
        let item = null;
        if (editId) {
            Helper.loading(true);
            item = await Helper.fetchAPI(`/movimientos-tipos/${editId}`);
            Helper.loading(false);
        }

        const { value: formValues } = await Swal.fire({
            title: `<strong>${editId ? 'Editar' : 'Nuevo'} Tipo de Movimiento</strong>`,
            width: '600px',
            html: `
                <div class="text-start px-2 py-3">
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-uppercase">Nombre del Tipo</label>
                        <input id="tipo-nombre" class="form-control" placeholder="Ej: TRANSPORTES, PAPELERIA" value="${item?.nombre || ''}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-uppercase">Descripción</label>
                        <textarea id="tipo-descripcion" class="form-control" rows="3" placeholder="Detalle sobre los gastos agrupados en esta categoría...">${item?.descripcion || ''}</textarea>
                    </div>
                </div>
            `,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Guardar',
            cancelButtonText: 'Cerrar',
            preConfirm: () => {
                const nombre = document.getElementById('tipo-nombre').value.trim();
                const descripcion = document.getElementById('tipo-descripcion').value.trim();

                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return false;
                }

                return { nombre, descripcion };
            }
        });

        if (formValues) {
            this.save(formValues, editId);
        }
    },

    async save(data, id = null) {
        Helper.loading(true, id ? 'Actualizando...' : 'Registrando...');
        try {
            const url = id ? `/movimientos-tipos/${id}` : '/movimientos-tipos';
            const method = id ? 'PUT' : 'POST';
            const res = await Helper.fetchAPI(url, {
                method: method,
                body: JSON.stringify(data)
            });
            Helper.loading(false);
            if (res.success) {
                Helper.alert('success', res.message);
                this.init();
            } else {
                Helper.alert('error', res.message || 'Error al procesar');
            }
        } catch (error) {
            Helper.loading(false);
            Helper.alert('error', 'Error de conexión o validación');
        }
    },

    async editItem(id) {
        this.openModal(id);
    },

    async deleteItem(id) {
        if (await Helper.confirm('¿Deseas eliminar este tipo de movimiento? Esta acción solo es posible si no tiene transacciones registradas.')) {
            Helper.loading(true, 'Eliminando...');
            try {
                const res = await Helper.fetchAPI(`/movimientos-tipos/${id}`, { method: 'DELETE' });
                Helper.loading(false);
                if (res.success) {
                    Helper.alert('success', 'Tipo de movimiento eliminado');
                    this.init();
                } else {
                    Helper.alert('error', res.message || 'Error al eliminar');
                }
            } catch (e) {
                Helper.loading(false);
                Helper.alert('error', 'Error al eliminar el registro');
            }
        }
    }
};

MovimientoTiposView.init();

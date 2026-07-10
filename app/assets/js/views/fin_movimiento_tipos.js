/**
 * Movimiento Tipos View - Finance Module
 * Definición Costos y Gastos (Jerarquía de Egresos)
 */

window.MovimientoTiposView = {
    tipos: [],
    dataTable: null,

    async init() {
        console.log('Initializing Definición Costos y Gastos Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const tipos = await Helper.fetchAPI('/movimientos-tipos');
            const rawTipos = Array.isArray(tipos) ? tipos : [];
            this.tipos = this.buildTree(rawTipos);
        } catch (error) {
            console.error('Error loading movement types data:', error);
        }
    },

    buildTree(list) {
        const level1 = list.filter(item => !item.padre_id);
        const level2 = list.filter(item => {
            const p = list.find(x => x.id_tipo_movimiento == item.padre_id);
            return p && !p.padre_id;
        });
        const level3 = list.filter(item => {
            const p = list.find(x => x.id_tipo_movimiento == item.padre_id);
            const gp = p ? list.find(x => x.id_tipo_movimiento == p.padre_id) : null;
            return p && gp;
        });

        const sorted = [];
        level1.sort((a, b) => a.nombre.localeCompare(b.nombre));
        level1.forEach(l1 => {
            l1.nivel = 1;
            sorted.push(l1);
            
            const l2Children = level2.filter(x => x.padre_id == l1.id_tipo_movimiento);
            l2Children.sort((a, b) => a.nombre.localeCompare(b.nombre));
            l2Children.forEach(l2 => {
                l2.nivel = 2;
                sorted.push(l2);
                
                const l3Children = level3.filter(x => x.padre_id == l2.id_tipo_movimiento);
                l3Children.sort((a, b) => a.nombre.localeCompare(b.nombre));
                l3Children.forEach(l3 => {
                    l3.nivel = 3;
                    sorted.push(l3);
                });
            });
        });
        
        // Append any orphaned items (safety fallback)
        list.forEach(item => {
            if (!sorted.find(x => x.id_tipo_movimiento == item.id_tipo_movimiento)) {
                item.nivel = 1;
                sorted.push(item);
            }
        });
        
        return sorted;
    },

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="text-primary-custom fw-bold mb-0">Definición Costos y Gastos</h2>
                        <p class="text-muted">Parámetros jerárquicos (hasta 3 niveles) para clasificar egresos y costos</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="MovimientoTiposView.openModal()">
                        <i class="fas fa-plus me-2"></i>Nuevo Elemento
                    </button>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="tiposTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">Clasificación / Nombre</th>
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
            
            // Custom ordering to keep tree hierarchy intact: we disable sorting in DataTable
            // so it stays structured according to our buildTree sorting
            Helper.initDataTable('#tiposTable', { 
                ordering: false,
                pageLength: 25
            });
        }
    },

    renderTableBody() {
        return this.tipos.map(t => {
            const indent = (t.nivel - 1) * 25;
            const prefix = t.nivel === 2 ? '— ' : t.nivel === 3 ? '—— ' : '';
            const textClass = t.nivel === 1 ? 'fw-bold text-primary-custom' : t.nivel === 2 ? 'text-dark fw-semibold' : 'text-muted';
            
            return `
                <tr>
                    <td class="ps-4" style="padding-left: ${24 + indent}px !important;">
                        <span class="${textClass}">${prefix}${t.nombre}</span>
                    </td>
                    <td class="text-muted small">${t.descripcion || '<span class="text-muted small">Sin descripción</span>'}</td>
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
            `;
        }).join('');
    },

    async openModal(editId = null) {
        let item = null;
        if (editId) {
            Helper.loading(true);
            item = await Helper.fetchAPI(`/movimientos-tipos/${editId}`);
            Helper.loading(false);
        }

        // Build valid parent options: Nivel 1 & 2 categories, excluding current edited item
        const parentOptions = this.tipos
            .filter(x => x.nivel < 3 && x.id_tipo_movimiento != editId)
            .map(x => {
                const indent = x.nivel === 2 ? '&nbsp;&nbsp;&nbsp;&nbsp;— ' : '';
                const isSelected = item?.padre_id == x.id_tipo_movimiento ? 'selected' : '';
                return `<option value="${x.id_tipo_movimiento}" ${isSelected}>${indent}${x.nombre}</option>`;
            }).join('');

        const { value: formValues } = await Swal.fire({
            title: `<strong>${editId ? 'Editar' : 'Nuevo'} Costo / Gasto</strong>`,
            width: '600px',
            html: `
                <div class="text-start px-2 py-3">
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-uppercase">Nombre</label>
                        <input id="tipo-nombre" class="form-control" placeholder="Ej: NOMINA, SALARIOS, PENSION" value="${item?.nombre || ''}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-uppercase">Grupo / Subgrupo Superior</label>
                        <select id="tipo-padre" class="form-select">
                            <option value="">Ninguno (Nivel 1 - Grupo Principal)</option>
                            ${parentOptions}
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-uppercase">Descripción</label>
                        <textarea id="tipo-descripcion" class="form-control" rows="3" placeholder="Detalle sobre este rubro o categoría de gasto...">${item?.descripcion || ''}</textarea>
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
                const padre_id = document.getElementById('tipo-padre').value || null;

                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return false;
                }

                return { nombre, descripcion, padre_id };
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
        if (await Helper.confirm('¿Deseas eliminar este elemento? Esta acción solo es posible si no tiene subgrupos ni transacciones registradas.')) {
            Helper.loading(true, 'Eliminando...');
            try {
                const res = await Helper.fetchAPI(`/movimientos-tipos/${id}`, { method: 'DELETE' });
                Helper.loading(false);
                if (res.success) {
                    Helper.alert('success', 'Elemento eliminado correctamente');
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

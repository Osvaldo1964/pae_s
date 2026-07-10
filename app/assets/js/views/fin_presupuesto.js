/**
 * Presupuesto View - Finance Module
 * Financial Planning and Budget Tracking
 */

window.PresupuestoView = {
    items: [],
    branches: [],

    async init() {
        console.log('Initializing Presupuesto Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [items, branches] = await Promise.all([
                Helper.fetchAPI('/presupuesto'),
                Helper.fetchAPI('/presupuesto/branches')
            ]);

            let itemsArray = Array.isArray(items) ? items : [];
            itemsArray.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }));
            
            // Calculate totals for parents based on children
            this.items = this.calculateSummaries(itemsArray);
            this.branches = Array.isArray(branches) ? branches : [];
        } catch (error) {
            console.error('Error loading budget data:', error);
        }
    },

    /**
     * Business Logic: Parents sum children's values
     */
    calculateSummaries(items) {
        // First, reset parent totals to 0 if they have children
        const hasChildren = new Set();
        items.forEach(item => {
            if (item.padre_id) hasChildren.add(parseInt(item.padre_id));
        });

        // Create a map for quick access
        const map = {};
        items.forEach(item => {
            item.isParent = hasChildren.has(parseInt(item.id_item));
            if (item.isParent) {
                item.valor_total_oficial = 0;
                item.cantidad_global = 0;
            } else {
                item.valor_total_oficial = parseFloat(item.valor_total_oficial) || 0;
            }
            map[item.id_item] = item;
        });

        // Sum up (bottom-up approach by code length/nesting would be ideal, 
        // but for now we iterate and add to immediate parent)
        // Note: This logic assumes simple parent-child. For deep nesting, it needs recursion.

        // Strategy: Sort by code length descending to process children first
        const sorted = [...items].sort((a, b) => b.codigo.length - a.codigo.length);

        sorted.forEach(item => {
            if (item.padre_id && map[item.padre_id]) {
                map[item.padre_id].valor_total_oficial += parseFloat(item.valor_total_oficial);
            }
        });

        return items;
    },

    render() {
        const totalBudget = this.items.reduce((acc, item) => {
            // Only sum top-level items for the grand total to avoid double counting
            return !item.padre_id ? acc + parseFloat(item.valor_total_oficial) : acc;
        }, 0);

        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="text-primary-custom fw-bold mb-0">Planeación Presupuestal</h2>
                        <p class="text-muted">Definición y seguimiento de rubros presupuestales</p>
                    </div>
                    <div class="d-flex gap-2">
                        <div class="bg-white border rounded px-3 py-1 shadow-sm d-flex align-items-center">
                            <small class="text-muted text-uppercase fw-bold me-2">Presupuesto Total:</small>
                            <span class="fs-5 fw-bold text-primary">${Helper.formatCurrency(totalBudget)}</span>
                        </div>
                        <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="PresupuestoView.openModal()">
                            <i class="fas fa-plus me-2"></i>Nuevo Rubro
                        </button>
                    </div>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="presupuestoTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">Código</th>
                                        <th>Nombre del Rubro</th>
                                        <th class="text-end">Vlr. Unitario</th>
                                        <th class="text-center">Cant / Tiempo</th>
                                        <th class="text-end">Total Oficial</th>
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
            Helper.initDataTable('#presupuestoTable', {
                order: [[0, 'asc']],
                pageLength: 25
            });
        }
    },

    renderTableBody() {
        return this.items.map(item => {
            const isParent = item.isParent;
            const rowClass = isParent ? 'bg-light fw-bold' : '';
            const indent = (item.codigo.split('.').length - 1) * 20;
            const orderAttr = item.codigo.split('.').map(n => n.padStart(5, '0')).join('');

            return `
                <tr class="${rowClass}">
                    <td class="ps-4 text-nowrap" style="padding-left: ${24 + indent}px !important;" data-order="${orderAttr}">
                        ${isParent ? '<i class="fas fa-folder me-2 text-warning"></i>' : '<i class="far fa-file-alt me-2 text-muted"></i>'}
                        ${item.codigo}
                    </td>
                    <td>
                        <div class="${isParent ? 'text-dark' : 'text-primary-custom'}">${item.nombre}</div>
                        ${item.descripcion ? `<small class="text-muted d-block text-truncate" style="max-width: 300px;">${item.descripcion}</small>` : ''}
                    </td>
                    <td class="text-end">
                        ${!isParent ? `<span class="text-success">${Helper.formatCurrency(item.valor_unitario_oficial)}</span>` : '-'}
                    </td>
                    <td class="text-center">
                        ${!isParent ? `
                            <span class="badge bg-white text-dark border">${item.cantidad_global} ${item.unidad_medida || 'Und'}</span>
                            <div class="x-small text-muted mt-1">${item.tiempo_global} Meses</div>
                        ` : '<span class="text-muted small">Consolidado</span>'}
                    </td>
                    <td class="text-end">
                        <span class="fw-bold ${isParent ? 'text-dark fs-6' : ''}">${Helper.formatCurrency(item.valor_total_oficial)}</span>
                    </td>
                    <td class="text-center pe-4">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary border-0" onclick="PresupuestoView.editItem(${item.id_item})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger border-0" onclick="PresupuestoView.deleteItem(${item.id_item})" title="Eliminar">
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
            item = await Helper.fetchAPI(`/presupuesto/${editId}`);
            Helper.loading(false);
        }

        const branchesHtml = this.branches.map(b => {
            const dist = item?.distribucion?.find(d => d.branch_id == b.id) || {};
            return `
                <tr data-branch-id="${b.id}">
                    <td style="max-width: 300px;">
                        <div class="fw-bold small text-truncate">${b.name}</div>
                        <div class="text-muted x-small" style="font-size: 0.7rem;">${b.school_name}</div>
                    </td>
                    <td><input type="number" class="form-control form-control-sm dist-cant" value="${dist.cantidad || 0}" step="any" oninput="PresupuestoView.calcRow(this)"></td>
                    <td><input type="number" class="form-control form-control-sm dist-meses" value="${dist.meses || 0}" step="any" oninput="PresupuestoView.calcRow(this)"></td>
                    <td><input type="number" class="form-control form-control-sm dist-vlr" value="${dist.valor_unitario || 0}" step="any" oninput="PresupuestoView.calcRow(this)"></td>
                    <td class="text-end"><span class="fw-bold dist-total text-secondary">${Helper.formatCurrency(dist.valor_inicial || 0)}</span></td>
                </tr>
            `;
        }).join('');

        const parentsHtml = this.items
            .filter(i => i.id_item != editId)
            .map(i => `<option value="${i.id_item}" ${item?.padre_id == i.id_item ? 'selected' : ''}>${i.codigo} - ${i.nombre}</option>`)
            .join('');

        const { value: formValues } = await Swal.fire({
            title: `<strong>${editId ? 'Editar' : 'Nuevo'} Rubro Presupuestal</strong>`,
            width: '1000px',
            html: `
                <div class="text-start px-2 py-3" style="max-height: 80vh; overflow-y: auto;">
                    <div class="alert alert-info border-0 shadow-sm mb-4">
                        <i class="fas fa-info-circle me-2"></i> 
                        <b>Nota:</b> Si este rubro es un "Padre" (tiene sub-rubros), no asigne valores aquí; el sistema los sumará automáticamente de sus hijos.
                    </div>

                    <h6 class="text-primary border-bottom pb-2 mb-3 fw-bold text-uppercase small">
                        <i class="fas fa-folder-open me-2"></i>Información General
                    </h6>
                    <div class="row g-3 mb-4">
                        <div class="col-md-3">
                            <label class="form-label small fw-bold">CÓDIGO (JERARQUÍA) *</label>
                            <input id="bud-codigo" class="form-control" value="${item?.codigo || ''}" placeholder="Ej: 2.1.3">
                        </div>
                        <div class="col-md-5">
                            <label class="form-label small fw-bold">NOMBRE DEL RUBRO *</label>
                            <input id="bud-nombre" class="form-control" value="${item?.nombre || ''}" placeholder="Nombre descriptivo">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold">RUBRO PADRE</label>
                            <select id="bud-padre" class="form-select">
                                <option value="">Ninguno (Rubro Principal)</option>
                                ${parentsHtml}
                            </select>
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold">DESCRIPCIÓN</label>
                            <textarea id="bud-descripcion" class="form-control" rows="2">${item?.descripcion || ''}</textarea>
                        </div>
                    </div>

                    <div id="values-container" style="${item?.isParent ? 'display:none' : ''}">
                        <h6 class="text-primary border-bottom pb-2 mb-3 fw-bold text-uppercase small">
                            <i class="fas fa-calculator me-2"></i>Cálculo Global contratado
                        </h6>
                        <div class="row g-3 mb-4 bg-light p-3 rounded border">
                            <div class="col-md-2">
                                <label class="form-label small fw-bold">UNIDAD</label>
                                <input id="bud-unidad" class="form-control" value="${item?.unidad_medida || ''}" placeholder="Mes/Glb/Hect">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small fw-bold">CANTIDAD</label>
                                <input id="bud-cant" type="number" class="form-control" value="${item?.cantidad_global || 0}" step="any" oninput="PresupuestoView.calcGlobal()">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small fw-bold">MESES / TIEMPO</label>
                                <input id="bud-meses" type="number" class="form-control" value="${item?.tiempo_global || 0}" step="any" oninput="PresupuestoView.calcGlobal()">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold">VALOR UNITARIO</label>
                                <div class="input-group">
                                    <span class="input-group-text">$</span>
                                    <input id="bud-vlr" type="number" class="form-control" value="${item?.valor_unitario_oficial || 0}" step="any" oninput="PresupuestoView.calcGlobal()">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-success">TOTAL GLOBAL</label>
                                <div id="bud-total-global" class="fs-4 fw-bold text-success" data-val="${item?.valor_total_oficial || 0}">${Helper.formatCurrency(item?.valor_total_oficial || 0)}</div>
                            </div>
                        </div>

                        <h6 class="text-primary border-bottom pb-2 mb-3 fw-bold text-uppercase small">
                            <i class="fas fa-sitemap me-2"></i>Distribución por Sedes
                        </h6>
                        <div class="table-responsive border rounded bg-white shadow-sm mb-4">
                            <table class="table table-sm table-hover align-middle mb-0" id="distribucionTable">
                                <thead class="bg-light small fw-bold text-secondary">
                                    <tr>
                                        <th class="ps-3 py-2">CENTRO / SEDE</th>
                                        <th style="width: 100px;">CANTIDAD</th>
                                        <th style="width: 80px;">MESES</th>
                                        <th style="width: 160px;">VLR. UNITARIO</th>
                                        <th class="text-end pe-3" style="width: 150px;">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${branchesHtml}
                                </tbody>
                                <tfoot class="bg-light fw-bold border-top">
                                    <tr>
                                        <td colspan="4" class="text-end text-uppercase small">Total Asignado:</td>
                                        <td class="text-end pe-3"><span id="sum-asignado" class="fs-6" data-val="${item?.valor_total_oficial || 0}">${Helper.formatCurrency(item?.valor_total_oficial || 0)}</span></td>
                                    </tr>
                                    <tr>
                                        <td colspan="4" class="text-end text-uppercase small">Diferencia:</td>
                                        <td class="text-end pe-3"><span id="diff-asignado" class="text-success" data-val="0">$ 0</span></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            `,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const codigo = document.getElementById('bud-codigo').value;
                const nombre = document.getElementById('bud-nombre').value;
                if (!codigo || !nombre) {
                    Swal.showValidationMessage('Código y Nombre son obligatorios');
                    return false;
                }

                // If is parent, we don't validate values
                const isParentCheck = editId ? PresupuestoView.items.some(i => i.padre_id == editId) : false;
                if (isParentCheck) return { codigo, nombre, padre_id: document.getElementById('bud-padre').value, descripcion: document.getElementById('bud-descripcion').value };

                const totalGlobal = parseFloat(document.getElementById('bud-total-global').dataset.val) || 0;
                const totalAsignado = parseFloat(document.getElementById('sum-asignado').dataset.val) || 0;

                if (Math.abs(totalGlobal - totalAsignado) > 1) {
                    Swal.showValidationMessage('La distribución no coincide con el total global');
                    return false;
                }

                const distribucion = [];
                document.querySelectorAll('#distribucionTable tbody tr').forEach(tr => {
                    const branchId = tr.dataset.branchId;
                    const cant = parseFloat(tr.querySelector('.dist-cant').value) || 0;
                    const meses = parseFloat(tr.querySelector('.dist-meses').value) || 0;
                    const vlr = parseFloat(tr.querySelector('.dist-vlr').value) || 0;
                    const total = cant * meses * vlr;

                    if (total > 0) {
                        distribucion.push({ branch_id: branchId, cantidad: cant, meses: meses, valor_unitario: vlr, total: total });
                    }
                });

                return {
                    codigo, nombre,
                    padre_id: document.getElementById('bud-padre').value,
                    descripcion: document.getElementById('bud-descripcion').value,
                    unidad_medida: document.getElementById('bud-unidad').value,
                    cantidad_global: parseFloat(document.getElementById('bud-cant').value) || 0,
                    tiempo_global: parseFloat(document.getElementById('bud-meses').value) || 0,
                    valor_unitario_oficial: parseFloat(document.getElementById('bud-vlr').value) || 0,
                    valor_total_oficial: totalGlobal,
                    distribucion
                }
            }
        });

        if (formValues) {
            this.save(formValues, editId);
        }
    },

    async save(data, id = null) {
        Helper.loading(true, id ? 'Actualizando...' : 'Guardando...');
        try {
            const url = id ? `/presupuesto/${id}` : '/presupuesto';
            const res = await Helper.fetchAPI(url, {
                method: 'POST', // Backend PHP update uses POST with segment or PUT
                body: JSON.stringify(data)
            });
            Helper.loading(false);
            if (res.success) {
                Helper.alert('success', 'Presupuesto actualizado correctamente');
                this.init();
            } else {
                Helper.alert('error', res.message || 'Error al guardar');
            }
        } catch (error) {
            Helper.loading(false);
            Helper.alert('error', 'Error de conexión');
        }
    },

    async editItem(id) {
        this.openModal(id);
    },

    async deleteItem(id) {
        if (await Helper.confirm('¿Deseas eliminar este rubro?')) {
            Helper.loading(true);
            try {
                const res = await Helper.fetchAPI(`/presupuesto/${id}`, { method: 'DELETE' });
                if (res.success) {
                    Helper.alert('success', 'Rubro eliminado');
                    this.init();
                } else {
                    Helper.loading(false);
                    Helper.alert('error', res.message || 'No se pudo eliminar');
                }
            } catch (e) {
                Helper.loading(false);
                Helper.alert('error', 'No se pudo eliminar');
            }
        }
    },

    calcGlobal() {
        const cant = parseFloat(document.getElementById('bud-cant').value) || 0;
        const meses = parseFloat(document.getElementById('bud-meses').value) || 0;
        const vlr = parseFloat(document.getElementById('bud-vlr').value) || 0;
        const total = cant * meses * vlr;

        const el = document.getElementById('bud-total-global');
        el.innerText = Helper.formatCurrency(total);
        el.dataset.val = total;
        this.updateDifference();
    },

    calcRow(input) {
        const tr = input.closest('tr');
        const cant = parseFloat(tr.querySelector('.dist-cant').value) || 0;
        const meses = parseFloat(tr.querySelector('.dist-meses').value) || 0;
        const vlr = parseFloat(tr.querySelector('.dist-vlr').value) || 0;
        const total = cant * meses * vlr;

        const span = tr.querySelector('.dist-total');
        span.innerText = Helper.formatCurrency(total);
        span.dataset.val = total;
        this.updateDifference();
    },

    updateDifference() {
        let sum = 0;
        document.querySelectorAll('#distribucionTable tbody tr').forEach(tr => {
            const val = parseFloat(tr.querySelector('.dist-total').dataset.val) || 0;
            sum += val;
        });

        const sumEl = document.getElementById('sum-asignado');
        sumEl.innerText = Helper.formatCurrency(sum);
        sumEl.dataset.val = sum;

        const totalGlobal = parseFloat(document.getElementById('bud-total-global').dataset.val) || 0;
        const diff = totalGlobal - sum;

        const diffEl = document.getElementById('diff-asignado');
        diffEl.innerText = Helper.formatCurrency(diff);
        diffEl.dataset.val = diff;
        diffEl.className = Math.abs(diff) < 1 ? 'text-success' : 'text-danger';
    }
};

PresupuestoView.init();

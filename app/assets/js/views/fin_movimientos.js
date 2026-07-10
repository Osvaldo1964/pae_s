/**
 * Movimientos View - Finance Module
 * Registro diario de ingresos y egresos
 */

window.MovimientosView = {
    movimientos: [],
    budget: [],
    terceros: [],
    movimientoTipos: [],
    typesWithLevels: [],

    async init() {
        console.log('Initializing Movimientos Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [movimientos, budget, terceros, movimientoTipos] = await Promise.all([
                Helper.fetchAPI('/movimientos'),
                Helper.fetchAPI('/movimientos/budget'),
                Helper.fetchAPI('/terceros'),
                Helper.fetchAPI('/movimientos-tipos')
            ]);
            this.movimientos = Array.isArray(movimientos) ? movimientos : [];
            this.budget = Array.isArray(budget) ? budget : [];
            this.terceros = Array.isArray(terceros) ? terceros : [];
            this.movimientoTipos = Array.isArray(movimientoTipos) ? movimientoTipos : [];
        } catch (error) {
            console.error('Error loading movements data:', error);
        }
    },

    render() {
        const totalGastado = this.movimientos.reduce((acc, mov) => acc + parseFloat(mov.valor), 0);
        const hoy = new Date().toISOString().split('T')[0];
        const gastadoHoy = this.movimientos
            .filter(m => m.fecha === hoy)
            .reduce((acc, mov) => acc + parseFloat(mov.valor), 0);

        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="text-primary-custom fw-bold mb-0">Registro Costos y Gastos</h2>
                        <p class="text-muted">Registro de Movimientos de Costos y Gastos</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="MovimientosView.openModal()">
                        <i class="fas fa-plus me-2"></i>Nuevo Movimiento
                    </button>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm p-3 h-100 border-start border-danger border-4">
                            <h6 class="small text-uppercase mb-1 text-muted">Total Ejecutado (Histórico)</h6>
                            <h3 class="mb-0 fw-bold text-danger">${Helper.formatCurrency(totalGastado)}</h3>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm p-3 h-100 border-start border-warning border-4">
                            <h6 class="small text-uppercase mb-1 text-muted">Ejecutado Hoy</h6>
                            <h3 class="mb-0 fw-bold text-warning">${Helper.formatCurrency(gastadoHoy)}</h3>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="movimientosTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">Fecha / Doc</th>
                                        <th>Rubro / Centro</th>
                                        <th>Tercero / Beneficiario</th>
                                        <th class="text-end">Valor</th>
                                        <th class="text-center">Soporte</th>
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
            Helper.initDataTable('#movimientosTable', { order: [[0, 'desc']] });
        }
    },

    renderTableBody() {
        return this.movimientos.map(m => {
            // Reconstruct hierarchy path for the list display
            let path = m.tipo_movimiento || 'Sin clasificación';
            if (m.tipo_movimiento_nombre) {
                const parts = [];
                if (m.tipo_movimiento_abuelo_nombre) parts.push(m.tipo_movimiento_abuelo_nombre);
                if (m.tipo_movimiento_padre_nombre) parts.push(m.tipo_movimiento_padre_nombre);
                parts.push(m.tipo_movimiento_nombre);
                path = parts.join(' &gt; ');
            }

            return `
                <tr>
                    <td class="ps-4">
                        <div class="fw-bold">${Helper.formatDate(m.fecha)}</div>
                        <small class="text-muted"><i class="fas fa-file-invoice me-1"></i>${m.numero_documento || 'S/N'}</small>
                    </td>
                    <td>
                        <div class="small fw-bold">${m.item_codigo} - ${m.item_nombre}</div>
                        <div class="x-small text-muted" style="font-size: 0.75rem;">${m.school_name} - ${m.branch_name}</div>
                    </td>
                    <td>
                        <div class="fw-bold text-primary-custom text-uppercase">${m.tercero_nombre}</div>
                        <div class="x-small text-muted"><i class="fas fa-tags me-1 text-secondary"></i>${path}</div>
                    </td>
                    <td class="text-end">
                        <span class="fw-bold text-danger">${Helper.formatCurrency(m.valor)}</span>
                    </td>
                    <td class="text-center">
                        ${m.soporte_url ?
                    `<a href="${Config.ROOT_URL}${m.soporte_url}" target="_blank" class="btn btn-sm btn-light text-info shadow-sm">
                                <i class="fas fa-eye me-1"></i>Ver
                             </a>` :
                    `<span class="text-muted small">Sin soporte</span>`}
                    </td>
                    <td class="text-center pe-4">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary border-0" onclick="MovimientosView.editItem(${m.id_movimiento})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger border-0" onclick="MovimientosView.deleteItem(${m.id_movimiento})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    handleTipoCascade(level) {
        const l1Val = document.getElementById('mov-tipo-l1').value;
        const l2Select = document.getElementById('mov-tipo-l2');
        const l3Select = document.getElementById('mov-tipo-l3');

        if (level === 1) {
            l2Select.innerHTML = '<option value="">Seleccione...</option>';
            l2Select.disabled = true;
            l3Select.innerHTML = '<option value="">Seleccione...</option>';
            l3Select.disabled = true;

            if (l1Val) {
                const level2Items = this.typesWithLevels.filter(x => x.padre_id == l1Val);
                if (level2Items.length > 0) {
                    level2Items.forEach(x => {
                        const opt = document.createElement('option');
                        opt.value = x.id_tipo_movimiento;
                        opt.textContent = x.nombre;
                        l2Select.appendChild(opt);
                    });
                    l2Select.disabled = false;
                }
            }
        } else if (level === 2) {
            l3Select.innerHTML = '<option value="">Seleccione...</option>';
            l3Select.disabled = true;

            const l2Val = l2Select.value;
            if (l2Val) {
                const level3Items = this.typesWithLevels.filter(x => x.padre_id == l2Val);
                if (level3Items.length > 0) {
                    level3Items.forEach(x => {
                        const opt = document.createElement('option');
                        opt.value = x.id_tipo_movimiento;
                        opt.textContent = x.nombre;
                        l3Select.appendChild(opt);
                    });
                    l3Select.disabled = false;
                }
            }
        }
    },

    initCascadeDropdowns(item) {
        // Pre-compute levels
        this.typesWithLevels = this.movimientoTipos.map(t => {
            let nivel = 1;
            if (t.padre_id) {
                const parent = this.movimientoTipos.find(p => p.id_tipo_movimiento == t.padre_id);
                if (parent) {
                    nivel = 2;
                    if (parent.padre_id) {
                        nivel = 3;
                    }
                }
            }
            return { ...t, nivel };
        });

        const l1Select = document.getElementById('mov-tipo-l1');
        const level1Items = this.typesWithLevels.filter(x => x.nivel === 1);
        level1Items.forEach(x => {
            const opt = document.createElement('option');
            opt.value = x.id_tipo_movimiento;
            opt.textContent = x.nombre;
            l1Select.appendChild(opt);
        });

        if (item && item.tipo_movimiento_id) {
            const activeType = this.typesWithLevels.find(x => x.id_tipo_movimiento == item.tipo_movimiento_id);
            let selectedL1 = '';
            let selectedL2 = '';
            let selectedL3 = '';
            
            if (activeType) {
                if (activeType.nivel === 1) {
                    selectedL1 = activeType.id_tipo_movimiento;
                } else if (activeType.nivel === 2) {
                    selectedL2 = activeType.id_tipo_movimiento;
                    selectedL1 = activeType.padre_id;
                } else if (activeType.nivel === 3) {
                    selectedL3 = activeType.id_tipo_movimiento;
                    selectedL2 = activeType.padre_id;
                    const parent = this.typesWithLevels.find(p => p.id_tipo_movimiento == selectedL2);
                    selectedL1 = parent ? parent.padre_id : '';
                }
            }

            if (selectedL1) {
                l1Select.value = selectedL1;
                this.handleTipoCascade(1);
            }
            if (selectedL2) {
                document.getElementById('mov-tipo-l2').value = selectedL2;
                this.handleTipoCascade(2);
            }
            if (selectedL3) {
                document.getElementById('mov-tipo-l3').value = selectedL3;
            }
        }
    },

    async openModal(editId = null) {
        let item = null;
        if (editId) {
            Helper.loading(true);
            item = await Helper.fetchAPI(`/movimientos/${editId}`);
            Helper.loading(false);
        }

        const budgetOptions = this.budget.map(b => {
            const isSelected = item?.asignacion_id == b.id_asignacion;
            let saldo = parseFloat(b.saldo_disponible);
            if (isSelected) saldo = parseFloat(item.saldo_disponible_con_mov);

            return `<option value="${b.id_asignacion}" ${isSelected ? 'selected' : ''} data-saldo="${saldo}">
                ${b.codigo} - ${b.item_nombre} (${b.school_name} - ${b.branch_name}) | Saldo: ${Helper.formatCurrency(saldo)}
             </option>`;
        }).join('');

        const tercerOptions = this.terceros.map(t =>
            `<option value="${t.id_tercero}" ${item?.tercero_id == t.id_tercero ? 'selected' : ''}>${t.identificacion} - ${t.nombres}</option>`
        ).join('');

        const today = new Date().toISOString().split('T')[0];

        const { value: formValues } = await Swal.fire({
            title: `<strong>${editId ? 'Editar' : 'Nuevo'} Movimiento</strong>`,
            width: '1000px',
            html: `
                <div class="text-start px-2 py-3">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-uppercase">Fecha</label>
                            <input id="mov-fecha" type="date" class="form-control" value="${item?.fecha || today}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-uppercase">Valor ($)</label>
                            <input id="mov-valor" type="number" step="any" class="form-control" placeholder="0.00" value="${item?.valor || ''}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-uppercase">No. Documento / Factura</label>
                            <input id="mov-documento" class="form-control" placeholder="Nro de soporte" value="${item?.numero_documento || ''}">
                        </div>

                        <div class="col-12 mt-2">
                            <div class="card p-3 bg-light border-0">
                                <h6 class="fw-bold mb-3 text-secondary text-uppercase small"><i class="fas fa-tags me-1"></i>Clasificación de Costo / Gasto</h6>
                                <div class="row g-2">
                                    <div class="col-md-4">
                                        <label class="form-label small text-muted text-uppercase mb-1">Grupo Principal (Nivel 1)</label>
                                        <select id="mov-tipo-l1" class="form-select" onchange="MovimientosView.handleTipoCascade(1)">
                                            <option value="">Seleccione...</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label small text-muted text-uppercase mb-1">Subgrupo (Nivel 2)</label>
                                        <select id="mov-tipo-l2" class="form-select" onchange="MovimientosView.handleTipoCascade(2)" disabled>
                                            <option value="">Seleccione...</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label small text-muted text-uppercase mb-1">Detalle (Nivel 3)</label>
                                        <select id="mov-tipo-l3" class="form-select" disabled>
                                            <option value="">Seleccione...</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-uppercase">Rubro / Centro de Costo (Saldo Disponible)</label>
                            <select id="mov-asignacion" class="form-select" ${editId ? 'disabled' : ''}>
                                <option value="">Seleccione Rubro/Centro</option>
                                ${budgetOptions}
                            </select>
                            ${editId ? '<small class="text-muted">El rubro no se puede cambiar en edición. Elimine y cree uno nuevo si es necesario.</small>' : ''}
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-uppercase">Tercero / Beneficiario</label>
                            <select id="mov-tercero" class="form-select">
                                <option value="">Seleccione Tercero</option>
                                ${tercerOptions}
                            </select>
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-uppercase">Soporte (PDF/Imagen) - <small class="text-muted text-lowercase font-italic">Opcional</small></label>
                            <input id="mov-soporte" type="file" class="form-control" accept="image/*,application/pdf">
                            ${item?.soporte_url ? `<div class="mt-1 small"><a href="${Config.ROOT_URL}${item.soporte_url}" target="_blank" class="text-primary"><i class="fas fa-file-download me-1"></i>Ver soporte actual</a></div>` : ''}
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-uppercase">Detalle / Observación</label>
                            <textarea id="mov-detalle" class="form-control" rows="3" placeholder="Descripción detallada del egreso...">${item?.detalle || ''}</textarea>
                        </div>
                    </div>
                </div>
            `,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Guardar',
            cancelButtonText: 'Cerrar',
            didOpen: () => {
                MovimientosView.initCascadeDropdowns(item);
            },
            preConfirm: () => {
                const asignacion_id = document.getElementById('mov-asignacion').value;
                const tercero_id = document.getElementById('mov-tercero').value;
                const valor = parseFloat(document.getElementById('mov-valor').value) || 0;
                const fecha = document.getElementById('mov-fecha').value;

                // Resolve selected tipo_movimiento_id (leaf-most selection)
                const l1 = document.getElementById('mov-tipo-l1').value;
                const l2 = document.getElementById('mov-tipo-l2').value;
                const l3 = document.getElementById('mov-tipo-l3').value;
                const tipo_movimiento_id = l3 || l2 || l1;

                if (!asignacion_id || !tercero_id || valor <= 0 || !fecha || !tipo_movimiento_id) {
                    Swal.showValidationMessage('Complete todos los campos obligatorios (incluyendo clasificación) y asegure que el valor sea mayor a 0');
                    return false;
                }

                const selectEl = document.getElementById('mov-asignacion');
                const selectedOption = selectEl.options[selectEl.selectedIndex];
                const saldoDisponible = parseFloat(selectedOption.dataset.saldo) || 0;

                if (valor > saldoDisponible) {
                    Swal.showValidationMessage(`Saldo insuficiente. Disponible: ${Helper.formatCurrency(saldoDisponible)}`);
                    return false;
                }

                const formData = new FormData();
                formData.append('asignacion_id', asignacion_id);
                formData.append('tercero_id', tercero_id);
                formData.append('tipo_movimiento_id', tipo_movimiento_id);
                formData.append('valor', valor);
                formData.append('fecha', fecha);
                formData.append('numero_documento', document.getElementById('mov-documento').value);
                formData.append('detalle', document.getElementById('mov-detalle').value);

                const fileInput = document.getElementById('mov-soporte');
                if (fileInput.files[0]) formData.append('soporte', fileInput.files[0]);

                return formData;
            }
        });

        if (formValues) {
            this.save(formValues, editId);
        }
    },

    async save(formData, id = null) {
        Helper.loading(true, id ? 'Actualizando...' : 'Registrando...');
        try {
            const url = id ? `/movimientos/${id}` : '/movimientos';
            const res = await Helper.fetchAPI(url, {
                method: 'POST',
                body: formData
            });
            Helper.loading(false);
            if (res.success) {
                Helper.alert('success', 'Movimiento procesado correctamente');
                this.init();
            } else {
                Helper.alert('error', res.message || 'Error al procesar');
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
        if (await Helper.confirm('¿Deseas eliminar este movimiento? El saldo ejecutado del presupuesto se restaurará.')) {
            Helper.loading(true, 'Eliminando y restaurando presupuesto...');
            try {
                const res = await Helper.fetchAPI(`/movimientos/${id}`, { method: 'DELETE' });
                Helper.loading(false);
                if (res.success) {
                    Helper.alert('success', 'Movimiento eliminado');
                    this.init();
                } else {
                    Helper.alert('error', res.message || 'Error al eliminar');
                }
            } catch (e) {
                Helper.loading(false);
                Helper.alert('error', 'No se pudo conectar con el servidor');
            }
        }
    }
};

MovimientosView.init();

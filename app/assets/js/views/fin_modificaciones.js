/**
 * Modificaciones Contractuales View - Finance Module
 * Adiciones, Reducciones y Traslados Multirrubro con Partida Doble
 */

window.ModificacionesView = {
    modificaciones: [],
    allocations: [],
    rowCounter: 0,

    async init() {
        console.log('Initializing Modificaciones Contractuales Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [modificaciones, allocations] = await Promise.all([
                Helper.fetchAPI('/modificaciones'),
                Helper.fetchAPI('/modificaciones/allocations')
            ]);
            this.modificaciones = Array.isArray(modificaciones) ? modificaciones : [];
            this.allocations = Array.isArray(allocations) ? allocations : [];
        } catch (error) {
            console.error('Error loading data:', error);
        }
    },

    render() {
        const totalAdiciones = this.modificaciones.reduce((acc, m) => acc + parseFloat(m.total_adicion || 0), 0);
        const totalReducciones = this.modificaciones.reduce((acc, m) => acc + parseFloat(m.total_reduccion || 0), 0);

        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="text-primary-custom fw-bold mb-0">Modificaciones Contractuales</h2>
                        <p class="text-muted">Adiciones, Reducciones y Traslados Presupuestales</p>
                    </div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" onclick="ModificacionesView.openModal()">
                        <i class="fas fa-plus me-2"></i>Nueva Modificación
                    </button>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm p-3 h-100 border-start border-success border-4">
                            <h6 class="small text-uppercase mb-1 text-muted">Total Adicionado</h6>
                            <h3 class="mb-0 fw-bold text-success">${Helper.formatCurrency(totalAdiciones)}</h3>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm p-3 h-100 border-start border-danger border-4">
                            <h6 class="small text-uppercase mb-1 text-muted">Total Reducido</h6>
                            <h3 class="mb-0 fw-bold text-danger">${Helper.formatCurrency(totalReducciones)}</h3>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm p-3 h-100 border-start border-info border-4">
                            <h6 class="small text-uppercase mb-1 text-muted">Total Registros</h6>
                            <h3 class="mb-0 fw-bold text-info">${this.modificaciones.length}</h3>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="modTable" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th class="ps-4">Fecha</th>
                                        <th class="text-center">Tipo</th>
                                        <th>Rubros Afectados</th>
                                        <th class="text-end">Total Adición</th>
                                        <th class="text-end">Total Reducción</th>
                                        <th class="text-center pe-4" style="width: 110px;">Acciones</th>
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
            if (this.modificaciones.length > 0) {
                Helper.initDataTable('#modTable', { order: [[0, 'desc']] });
            }
        }
    },

    renderTableBody() {
        if (!this.modificaciones.length) {
            return `<tr>
                <td colspan="6" class="text-center text-muted py-5">
                    <i class="fas fa-inbox fa-2x d-block mb-2 text-light"></i>
                    Sin registros de modificaciones contractuales.
                </td>
            </tr>`;
        }
        return this.modificaciones.map(m => {
            const tipoMap = { ADICION: ['success', 'Adición'], REDUCCION: ['danger', 'Reducción'], TRASLADO: ['info', 'Traslado'] };
            const [color, label] = tipoMap[m.tipo_modificacion] || ['secondary', m.tipo_modificacion];

            const rubros = (m.detalles || []).slice(0, 3).map(d =>
                `<span class="badge bg-light text-dark border me-1" style="font-size:0.6rem;">${d.codigo}</span>`
            ).join('') + (m.detalles?.length > 3 ? `<span class="text-muted small">+${m.detalles.length - 3} más</span>` : '');

            return `
                <tr>
                    <td class="ps-4 fw-bold">${Helper.formatDate(m.fecha)}</td>
                    <td class="text-center">
                        <span class="badge bg-${color} rounded-pill px-3">${label}</span>
                    </td>
                    <td>
                        <div>${rubros}</div>
                        <div class="text-muted mt-1" style="font-size:0.68rem;">${(m.justificacion || '').substring(0, 60)}${(m.justificacion || '').length > 60 ? '...' : ''}</div>
                    </td>
                    <td class="text-end fw-bold text-success">${parseFloat(m.total_adicion) > 0 ? Helper.formatCurrency(m.total_adicion) : '-'}</td>
                    <td class="text-end fw-bold text-danger">${parseFloat(m.total_reduccion) > 0 ? Helper.formatCurrency(m.total_reduccion) : '-'}</td>
                    <td class="text-center pe-4">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-info border-0" onclick="ModificacionesView.showDetail(${m.id_modificacion})" title="Ver Detalle">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-danger border-0" onclick="ModificacionesView.deleteItem(${m.id_modificacion})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openModal() {
        const today = new Date().toISOString().split('T')[0];

        Swal.fire({
            title: '<strong>Nueva Modificación Contractual</strong>',
            width: '90vw',
            html: `
                <div class="text-start px-2 py-2">
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase">Fecha</label>
                            <input id="mod-fecha" type="date" class="form-control" value="${today}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase">Tipo de Modificación</label>
                            <select id="mod-tipo" class="form-select" onchange="ModificacionesView.onTipoChange()">
                                <option value="ADICION">ADICIÓN (Incrementar Rubros)</option>
                                <option value="REDUCCION">REDUCCIÓN (Disminuir Rubros)</option>
                                <option value="TRASLADO">TRASLADO (Mover entre Rubros)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Panel ADICION / REDUCCION -->
                    <div id="panel-simple">
                        <div class="card bg-light border-0 p-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="fw-bold text-secondary text-uppercase mb-0 small" id="panel-simple-label">
                                    <i class="fas fa-plus-circle text-success me-1"></i>Rubros a Adicionar
                                </h6>
                                <button type="button" class="btn btn-sm btn-outline-primary"
                                    onclick="ModificacionesView.addDetalleRow('lista-simple')">
                                    <i class="fas fa-plus me-1"></i>Agregar Rubro
                                </button>
                            </div>
                            <div id="lista-simple"></div>
                            <div class="text-end mt-2">
                                <strong>TOTAL: <span id="total-simple" class="text-primary fw-bold">$ 0</span></strong>
                            </div>
                        </div>
                    </div>

                    <!-- Panel TRASLADO -->
                    <div id="panel-traslado" class="d-none">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="card border-danger border-2 p-3 h-100">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="fw-bold text-danger text-uppercase mb-0 small">
                                            <i class="fas fa-minus-circle me-1"></i>Rubros de Origen (Se Reducen)
                                        </h6>
                                        <button type="button" class="btn btn-sm btn-outline-danger"
                                            onclick="ModificacionesView.addDetalleRow('lista-origen', 'REDUCCION')">
                                            <i class="fas fa-plus me-1"></i>Agregar
                                        </button>
                                    </div>
                                    <div id="lista-origen"></div>
                                    <div class="text-end mt-2 border-top pt-2">
                                        <strong>Total Disminución: <span id="total-origen" class="text-danger fw-bold">$ 0</span></strong>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card border-success border-2 p-3 h-100">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="fw-bold text-success text-uppercase mb-0 small">
                                            <i class="fas fa-plus-circle me-1"></i>Rubros de Destino (Se Adicionan)
                                        </h6>
                                        <button type="button" class="btn btn-sm btn-outline-success"
                                            onclick="ModificacionesView.addDetalleRow('lista-destino', 'ADICION')">
                                            <i class="fas fa-plus me-1"></i>Agregar
                                        </button>
                                    </div>
                                    <div id="lista-destino"></div>
                                    <div class="text-end mt-2 border-top pt-2">
                                        <strong>Total Adición: <span id="total-destino" class="text-success fw-bold">$ 0</span></strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id="balance-alert" class="alert mt-3 d-none" role="alert"></div>
                    </div>

                    <!-- Justificacion al final -->
                    <div class="mt-3">
                        <label class="form-label small fw-bold text-uppercase">Justificación / Motivo</label>
                        <textarea id="mod-justificacion" class="form-control" rows="3"
                            placeholder="Describa el motivo de esta modificación contractual..."></textarea>
                    </div>
                </div>
            `,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-check-circle me-1"></i> Guardar',
            cancelButtonText: 'Cerrar',
            didOpen: () => {
                // Add the first row automatically
                ModificacionesView.rowCounter = 0;
                ModificacionesView.addDetalleRow('lista-simple');
            },
            preConfirm: () => {
                return ModificacionesView.collectFormData();
            }
        }).then(result => {
            if (result.value) {
                ModificacionesView.save(result.value);
            }
        });
    },

    onTipoChange() {
        const tipo = document.getElementById('mod-tipo').value;
        const panelSimple = document.getElementById('panel-simple');
        const panelTraslado = document.getElementById('panel-traslado');
        const label = document.getElementById('panel-simple-label');

        if (tipo === 'TRASLADO') {
            panelSimple.classList.add('d-none');
            panelTraslado.classList.remove('d-none');
            // Add initial rows for traslado if empty
            if (!document.getElementById('lista-origen').children.length) {
                ModificacionesView.addDetalleRow('lista-origen', 'REDUCCION');
            }
            if (!document.getElementById('lista-destino').children.length) {
                ModificacionesView.addDetalleRow('lista-destino', 'ADICION');
            }
        } else {
            panelSimple.classList.remove('d-none');
            panelTraslado.classList.add('d-none');
            if (tipo === 'ADICION') {
                label.innerHTML = '<i class="fas fa-plus-circle text-success me-1"></i>Rubros a Adicionar';
            } else {
                label.innerHTML = '<i class="fas fa-minus-circle text-danger me-1"></i>Rubros a Reducir';
            }
        }
    },

    addDetalleRow(containerId, afectacion = 'ADICION') {
        const id = ++this.rowCounter;
        const container = document.getElementById(containerId);
        if (!container) return;

        // Build <select> from this.allocations (never pass HTML via attributes)
        const select = document.createElement('select');
        select.className = 'form-select form-select-sm rubro-select';
        select.onchange = () => ModificacionesView.recalcTotals();

        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Seleccione Rubro...';
        select.appendChild(defaultOpt);

        ModificacionesView.allocations.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id_asignacion;
            opt.dataset.saldo = b.saldo_disponible;
            opt.textContent = `${b.codigo} - ${b.item_nombre} (${b.school_name}) | Saldo: ${Helper.formatCurrency(b.saldo_disponible)}`;
            select.appendChild(opt);
        });

        // Number input
        const valorInput = document.createElement('input');
        valorInput.type = 'number';
        valorInput.className = 'form-control form-control-sm valor-input';
        valorInput.placeholder = 'Valor $';
        valorInput.step = 'any';
        valorInput.min = '0';
        valorInput.oninput = () => ModificacionesView.recalcTotals();

        // Delete button
        const btnDel = document.createElement('button');
        btnDel.type = 'button';
        btnDel.className = 'btn btn-sm btn-outline-danger p-1 border-0';
        btnDel.innerHTML = '<i class="fas fa-times"></i>';

        const row = document.createElement('div');
        row.className = 'row g-2 align-items-center mb-2';
        row.id = `row-${containerId}-${id}`;
        row.dataset.afectacion = afectacion;

        btnDel.onclick = () => { row.remove(); ModificacionesView.recalcTotals(); };

        const colSelect = document.createElement('div');
        colSelect.className = 'col-7';
        colSelect.appendChild(select);

        const colValor = document.createElement('div');
        colValor.className = 'col-4';
        colValor.appendChild(valorInput);

        const colBtn = document.createElement('div');
        colBtn.className = 'col-1 text-center';
        colBtn.appendChild(btnDel);

        row.appendChild(colSelect);
        row.appendChild(colValor);
        row.appendChild(colBtn);
        container.appendChild(row);
    },

    recalcTotals() {
        const fmt = v => `$ ${parseFloat(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;

        const getTotal = (containerId) => {
            const container = document.getElementById(containerId);
            if (!container) return 0;
            return Array.from(container.querySelectorAll('.valor-input'))
                .reduce((sum, inp) => sum + (parseFloat(inp.value) || 0), 0);
        };

        const tipo = document.getElementById('mod-tipo')?.value;

        if (tipo === 'TRASLADO') {
            const totalOrigen = getTotal('lista-origen');
            const totalDestino = getTotal('lista-destino');

            const spanOrigen = document.getElementById('total-origen');
            const spanDestino = document.getElementById('total-destino');
            const balanceAlert = document.getElementById('balance-alert');

            if (spanOrigen) spanOrigen.textContent = fmt(totalOrigen);
            if (spanDestino) spanDestino.textContent = fmt(totalDestino);

            if (totalOrigen > 0 || totalDestino > 0) {
                const diff = Math.abs(totalOrigen - totalDestino);
                if (diff > 0.01) {
                    balanceAlert.className = 'alert alert-danger mt-3';
                    balanceAlert.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i><strong>Descuadre de ${fmt(diff)}:</strong> Reducciones (${fmt(totalOrigen)}) ≠ Adiciones (${fmt(totalDestino)}).`;
                    balanceAlert.classList.remove('d-none');
                } else if (totalOrigen > 0) {
                    balanceAlert.className = 'alert alert-success mt-3';
                    balanceAlert.innerHTML = `<i class="fas fa-check-circle me-2"></i><strong>¡Cuadre Correcto!</strong> Partida doble verificada: ${fmt(totalOrigen)}.`;
                    balanceAlert.classList.remove('d-none');
                } else {
                    balanceAlert.classList.add('d-none');
                }
            } else {
                balanceAlert.classList.add('d-none');
            }
        } else {
            const totalSimple = getTotal('lista-simple');
            const spanSimple = document.getElementById('total-simple');
            if (spanSimple) spanSimple.textContent = fmt(totalSimple);
        }
    },

    collectFormData() {
        const tipo = document.getElementById('mod-tipo').value;
        const fecha = document.getElementById('mod-fecha').value;
        const justificacion = document.getElementById('mod-justificacion').value.trim();

        if (!fecha || !justificacion) {
            Swal.showValidationMessage('Fecha y justificación son obligatorias.');
            return false;
        }

        const detalles = [];

        const collectRows = (containerId, afectacion) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.querySelectorAll('[data-afectacion]').forEach(row => {
                const select = row.querySelector('.rubro-select');
                const input = row.querySelector('.valor-input');
                const af = row.dataset.afectacion || afectacion;
                const asig_id = parseInt(select?.value);
                const valor = parseFloat(input?.value);
                if (asig_id && valor > 0) {
                    detalles.push({ asignacion_id: asig_id, tipo_afectacion: af, valor });
                }
            });
        };

        if (tipo === 'TRASLADO') {
            collectRows('lista-origen', 'REDUCCION');
            collectRows('lista-destino', 'ADICION');

            const sumaOrigen = detalles.filter(d => d.tipo_afectacion === 'REDUCCION').reduce((s, d) => s + d.valor, 0);
            const sumaDestino = detalles.filter(d => d.tipo_afectacion === 'ADICION').reduce((s, d) => s + d.valor, 0);

            if (sumaOrigen <= 0 || sumaDestino <= 0) {
                Swal.showValidationMessage('Debe agregar al menos un rubro de origen y uno de destino con valor mayor a cero.');
                return false;
            }
            if (Math.abs(sumaOrigen - sumaDestino) > 0.01) {
                Swal.showValidationMessage(`Descuadre: Reducciones (${Helper.formatCurrency(sumaOrigen)}) ≠ Adiciones (${Helper.formatCurrency(sumaDestino)}). Verifique los valores.`);
                return false;
            }
        } else {
            const af = tipo === 'ADICION' ? 'ADICION' : 'REDUCCION';
            collectRows('lista-simple', af);
        }

        if (!detalles.length) {
            Swal.showValidationMessage('Debe agregar al menos un rubro con valor mayor a cero.');
            return false;
        }

        return { fecha, tipo_modificacion: tipo, justificacion, detalles };
    },

    async save(data) {
        Helper.loading(true, 'Registrando modificación...');
        try {
            const res = await Helper.fetchAPI('/modificaciones', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            Helper.loading(false);
            if (res.success) {
                Helper.alert('success', res.message || 'Modificación registrada correctamente.');
                this.init();
            } else {
                Helper.alert('error', res.message || 'Error al registrar.');
            }
        } catch (err) {
            Helper.loading(false);
            Helper.alert('error', 'Error de conexión con el servidor.');
        }
    },

    async showDetail(id) {
        Helper.loading(true);
        const mod = await Helper.fetchAPI(`/modificaciones/${id}`);
        Helper.loading(false);
        if (!mod) return;

        const tipoMap = { ADICION: ['success', 'Adición'], REDUCCION: ['danger', 'Reducción'], TRASLADO: ['info', 'Traslado'] };
        const [color, label] = tipoMap[mod.tipo_modificacion] || ['secondary', mod.tipo_modificacion];

        const detalleRows = (mod.detalles || []).map(d => {
            const isAd = d.tipo_afectacion === 'ADICION';
            return `
                <tr>
                    <td class="ps-3"><span class="badge bg-light text-dark border">${d.codigo}</span></td>
                    <td>${d.item_nombre}</td>
                    <td class="text-muted small">${d.school_name} - ${d.branch_name}</td>
                    <td class="text-center"><span class="badge bg-${isAd ? 'success' : 'danger'}">${isAd ? 'Adición' : 'Reducción'}</span></td>
                    <td class="text-end fw-bold text-${isAd ? 'success' : 'danger'}">${Helper.formatCurrency(d.valor)}</td>
                </tr>
            `;
        }).join('');

        const totalAd = (mod.detalles || []).filter(d => d.tipo_afectacion === 'ADICION').reduce((s, d) => s + parseFloat(d.valor), 0);
        const totalRed = (mod.detalles || []).filter(d => d.tipo_afectacion === 'REDUCCION').reduce((s, d) => s + parseFloat(d.valor), 0);

        await Swal.fire({
            title: `<span class="badge bg-${color} me-2">${label}</span> Detalle de Modificación`,
            width: '900px',
            html: `
                <div class="text-start px-2">
                    <div class="row mb-3">
                        <div class="col-md-4"><span class="small text-muted text-uppercase">Fecha</span><br><strong>${Helper.formatDate(mod.fecha)}</strong></div>
                        <div class="col-md-8"><span class="small text-muted text-uppercase">Justificación</span><br><em>${mod.justificacion}</em></div>
                    </div>
                    <table class="table table-sm table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th class="ps-3">Código</th>
                                <th>Rubro</th>
                                <th>Sede</th>
                                <th class="text-center">Afectación</th>
                                <th class="text-end pe-3">Valor</th>
                            </tr>
                        </thead>
                        <tbody>${detalleRows}</tbody>
                        <tfoot class="table-light fw-bold">
                            ${totalAd > 0 ? `<tr><td colspan="3" class="text-end pe-3">Total Adicionado</td><td colspan="2" class="text-end pe-3 text-success">${Helper.formatCurrency(totalAd)}</td></tr>` : ''}
                            ${totalRed > 0 ? `<tr><td colspan="3" class="text-end pe-3">Total Reducido</td><td colspan="2" class="text-end pe-3 text-danger">${Helper.formatCurrency(totalRed)}</td></tr>` : ''}
                        </tfoot>
                    </table>
                </div>
            `,
            confirmButtonText: 'Cerrar',
            showCancelButton: false
        });
    },

    async deleteItem(id) {
        if (await Helper.confirm('¿Deseas eliminar esta modificación? Todos los saldos afectados serán revertidos a su valor original.')) {
            Helper.loading(true, 'Eliminando y revirtiendo saldos...');
            try {
                const res = await Helper.fetchAPI(`/modificaciones/${id}`, { method: 'DELETE' });
                Helper.loading(false);
                if (res.success) {
                    Helper.alert('success', 'Modificación eliminada y saldos revertidos correctamente.');
                    this.init();
                } else {
                    Helper.alert('error', res.message || 'Error al eliminar.');
                }
            } catch (e) {
                Helper.loading(false);
                Helper.alert('error', 'Error de conexión con el servidor.');
            }
        }
    }
};

ModificacionesView.init();

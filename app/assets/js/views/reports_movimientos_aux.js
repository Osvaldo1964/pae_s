/**
 * Reports Movimientos Aux View - Finance Module
 * Libro Auxiliar de Movimientos Financieros
 */

window.ReportsMovimientosAuxView = {
    items: [],
    movimientoTipos: [],
    typesWithLevels: [],
    movimientos: [],
    agrupacion: '',
    programInfo: null,

    async init() {
        console.log('Initializing Reports Movimientos Aux Module...');
        this.renderConfigView();
        Helper.loading(true, 'Cargando filtros...');
        await this.loadFilters();
        Helper.loading(false);
    },

    async loadFilters() {
        try {
            const [items, movimientoTipos, programInfo] = await Promise.all([
                Helper.fetchAPI('/presupuesto'),
                Helper.fetchAPI('/movimientos-tipos'),
                Helper.fetchAPI('/presupuesto/active-program').catch(() => null)
            ]);
            
            this.items = Array.isArray(items) ? items : [];
            this.movimientoTipos = Array.isArray(movimientoTipos) ? movimientoTipos : [];
            this.typesWithLevels = this.buildTree(this.movimientoTipos);
            this.programInfo = programInfo;

            this.populateSelects();
        } catch (error) {
            console.error('Error loading filters data:', error);
            Helper.alert('error', 'Error al cargar filtros del reporte');
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
        
        list.forEach(item => {
            if (!sorted.find(x => x.id_tipo_movimiento == item.id_tipo_movimiento)) {
                item.nivel = 1;
                sorted.push(item);
            }
        });
        
        return sorted;
    },

    populateSelects() {
        const rubroSelect = document.getElementById('filtroRubro');
        const tipoSelect = document.getElementById('filtroTipo');

        if (rubroSelect) {
            const activeLeafs = this.items.filter(item => !item.isParent && item.estado == 1);
            activeLeafs.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id_item;
                option.textContent = `${cat.codigo} - ${cat.nombre}`;
                rubroSelect.appendChild(option);
            });
        }

        if (tipoSelect) {
            this.typesWithLevels.forEach(t => {
                const option = document.createElement('option');
                option.value = t.nombre;
                const indent = t.nivel === 2 ? '— ' : t.nivel === 3 ? '—— ' : '';
                option.textContent = `${indent}${t.nombre}`;
                tipoSelect.appendChild(option);
            });
        }
    },

    async generateReport(directExcel = false) {
        const item_id = document.getElementById('filtroRubro').value;
        const tipo = document.getElementById('filtroTipo').value;
        const start_date = document.getElementById('fechaInicio').value;
        const end_date = document.getElementById('fechaFin').value;
        this.agrupacion = document.getElementById('agruparPor').value;

        let url = '/movimientos?';
        if (item_id) url += `&item_id=${item_id}`;
        if (tipo) url += `&tipo=${encodeURIComponent(tipo)}`;
        if (start_date) url += `&start_date=${start_date}`;
        if (end_date) url += `&end_date=${end_date}`;

        Helper.loading(true, 'Consultando movimientos...');
        try {
            const result = await Helper.fetchAPI(url);
            this.movimientos = Array.isArray(result) ? result : [];
            Helper.loading(false);
            
            if (this.movimientos.length === 0) {
                Helper.alert('info', 'No se encontraron movimientos para los filtros seleccionados');
                return;
            }

            // Set groups for each movement
            this.movimientos.forEach(m => {
                let lvl1 = 'SIN CLASIFICACIÓN';
                let lvl2 = 'GENERAL';
                
                if (m.tipo_movimiento_nombre) {
                    if (m.tipo_movimiento_abuelo_nombre) {
                        lvl1 = m.tipo_movimiento_abuelo_nombre;
                        lvl2 = m.tipo_movimiento_padre_nombre;
                    } else if (m.tipo_movimiento_padre_nombre) {
                        lvl1 = m.tipo_movimiento_padre_nombre;
                        lvl2 = m.tipo_movimiento_nombre;
                    } else {
                        lvl1 = m.tipo_movimiento_nombre;
                        lvl2 = 'GENERAL';
                    }
                } else if (m.tipo_movimiento) {
                    lvl1 = m.tipo_movimiento;
                }
                m.grupoLvl1 = lvl1;
                m.grupoLvl2 = lvl2;
            });

            this.renderPrintView();

            if (directExcel) {
                this.exportExcel();
                this.closePrint();
            }
        } catch (error) {
            Helper.loading(false);
            console.error('Error fetching filtered movements:', error);
            Helper.alert('error', 'No se pudieron consultar los movimientos del servidor');
        }
    },

    renderPrintView() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-CO') + ' ' + now.toLocaleTimeString('es-CO', { hour12: false });
        const total = this.movimientos.reduce((acc, m) => acc + parseFloat(m.valor), 0);

        let printStyle = `
            <style>
                @media print {
                    @page { size: landscape; margin: 0; }
                    body, #wrapper, #main-content, #app, #app-container {
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    body * { visibility: hidden; }
                    #sidebar, #top-header, #reportConfigContainer { display: none !important; }
                    #printContainer, #printContainer * { visibility: visible; }
                    #printContainer { 
                        position: relative !important; 
                        display: block !important;
                        margin: 1.2cm !important;
                        padding: 0 !important;
                        width: auto !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    .print-btn-bar { display: none !important; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto }
                    .table-bordered th, .table-bordered td { border: 1px solid #dee2e6 !important; }
                }
                .report-table th { background-color: #f8f9fa !important; font-size: 0.65rem; text-align: center; }
                .report-table td { font-size: 0.65rem; vertical-align: middle; padding: 3px 5px; }
                .report-table .badge { font-size: 0.58rem; padding: 2px 4px; }
                .report-table td small, .report-table td .small { font-size: 0.6rem; }
                .report-table td .x-small { font-size: 0.55rem; }
                .group-header-1 { background-color: #2c3e50 !important; color: #ffffff !important; padding: 6px 12px; font-weight: bold; font-size: 0.75rem; border-radius: 4px; margin-top: 15px; margin-bottom: 5px; }
                .group-header-2 { background-color: #7f8c8d !important; color: #ffffff !important; padding: 4px 10px; font-weight: bold; font-size: 0.7rem; border-radius: 4px; margin-top: 12px; margin-bottom: 5px; }
            </style>
        `;

        let tableHtml = '';

        if (this.agrupacion === 'nivel1') {
            const groups = [...new Set(this.movimientos.map(m => m.grupoLvl1))];
            groups.sort();

            groups.forEach(grp => {
                const grpMovs = this.movimientos.filter(m => m.grupoLvl1 === grp);
                const subtotal = grpMovs.reduce((acc, m) => acc + parseFloat(m.valor), 0);

                tableHtml += `
                    <div class="mb-4">
                        <div class="group-header-1 text-uppercase">
                            <i class="fas fa-folder me-2"></i>GRUPO PRINCIPAL: ${grp}
                        </div>
                        <table class="table table-bordered table-sm report-table w-100">
                            <thead>
                                <tr class="align-middle">
                                    <th style="width: 10%">Fecha</th>
                                    <th style="width: 10%">Documento</th>
                                    <th style="width: 25%">Rubro / Centro de Costo</th>
                                    <th style="width: 20%">Tercero / Beneficiario</th>
                                    <th style="width: 15%">Subgrupo / Clasificación</th>
                                    <th style="width: 10%">Concepto / Detalle</th>
                                    <th style="width: 10%">Valor ($)</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                grpMovs.forEach(m => {
                    const subpath = m.tipo_movimiento_abuelo_nombre 
                        ? `${m.tipo_movimiento_padre_nombre} &gt; ${m.tipo_movimiento_nombre}`
                        : m.tipo_movimiento_nombre || m.tipo_movimiento;

                    tableHtml += `
                        <tr>
                            <td class="text-center">${Helper.formatDate(m.fecha)}</td>
                            <td class="text-center">${m.numero_documento || 'S/N'}</td>
                            <td>
                                <div class="fw-bold">${m.item_codigo} - ${m.item_nombre}</div>
                                <div class="x-small text-muted">${m.school_name} - ${m.branch_name}</div>
                            </td>
                            <td class="text-uppercase">${m.tercero_nombre}</td>
                            <td class="text-center"><span class="badge bg-light text-dark border">${subpath}</span></td>
                            <td class="text-muted small">${m.detalle || ''}</td>
                            <td class="text-end fw-bold">${Helper.formatCurrency(m.valor)}</td>
                        </tr>
                    `;
                });

                tableHtml += `
                            </tbody>
                            <tfoot>
                                <tr class="fw-bold bg-light align-middle text-dark" style="font-size: 0.7rem;">
                                    <td colspan="6" class="text-end pe-4 text-uppercase">SUBTOTAL ${grp}</td>
                                    <td class="text-end text-primary fw-bold">${Helper.formatCurrency(subtotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                `;
            });

        } else if (this.agrupacion === 'nivel2') {
            const grpKeys = [];
            this.movimientos.forEach(m => {
                const key = `${m.grupoLvl1} | ${m.grupoLvl2}`;
                if (!grpKeys.includes(key)) grpKeys.push(key);
            });
            grpKeys.sort();

            grpKeys.forEach(key => {
                const [grp, subgrp] = key.split(' | ');
                const grpMovs = this.movimientos.filter(m => m.grupoLvl1 === grp && m.grupoLvl2 === subgrp);
                const subtotal = grpMovs.reduce((acc, m) => acc + parseFloat(m.valor), 0);

                tableHtml += `
                    <div class="mb-4">
                        <div class="group-header-2 text-uppercase">
                            <i class="fas fa-folder-open me-2"></i>GRUPO: ${grp} &gt; SUBGRUPO: ${subgrp}
                        </div>
                        <table class="table table-bordered table-sm report-table w-100">
                            <thead>
                                <tr class="align-middle">
                                    <th style="width: 10%">Fecha</th>
                                    <th style="width: 10%">Documento</th>
                                    <th style="width: 25%">Rubro / Centro de Costo</th>
                                    <th style="width: 20%">Tercero / Beneficiario</th>
                                    <th style="width: 15%">Detalle Clasificación</th>
                                    <th style="width: 10%">Concepto / Detalle</th>
                                    <th style="width: 10%">Valor ($)</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                grpMovs.forEach(m => {
                    tableHtml += `
                        <tr>
                            <td class="text-center">${Helper.formatDate(m.fecha)}</td>
                            <td class="text-center">${m.numero_documento || 'S/N'}</td>
                            <td>
                                <div class="fw-bold">${m.item_codigo} - ${m.item_nombre}</div>
                                <div class="x-small text-muted">${m.school_name} - ${m.branch_name}</div>
                            </td>
                            <td class="text-uppercase">${m.tercero_nombre}</td>
                            <td class="text-center"><span class="badge bg-light text-dark border">${m.tipo_movimiento_nombre || m.tipo_movimiento}</span></td>
                            <td class="text-muted small">${m.detalle || ''}</td>
                            <td class="text-end fw-bold">${Helper.formatCurrency(m.valor)}</td>
                        </tr>
                    `;
                });

                tableHtml += `
                            </tbody>
                            <tfoot>
                                <tr class="fw-bold bg-light align-middle text-dark" style="font-size: 0.7rem;">
                                    <td colspan="6" class="text-end pe-4 text-uppercase">SUBTOTAL ${grp} &gt; ${subgrp}</td>
                                    <td class="text-end text-primary fw-bold">${Helper.formatCurrency(subtotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                `;
            });

        } else {
            tableHtml += `
                <table class="table table-bordered table-sm report-table w-100">
                    <thead>
                        <tr class="align-middle">
                            <th style="width: 10%">Fecha</th>
                            <th style="width: 10%">Documento</th>
                            <th style="width: 25%">Rubro / Centro de Costo</th>
                            <th style="width: 20%">Tercero / Beneficiario</th>
                            <th style="width: 15%">Categoría (Ruta)</th>
                            <th style="width: 10%">Concepto / Detalle</th>
                            <th style="width: 10%">Valor ($)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            this.movimientos.forEach(m => {
                let path = m.tipo_movimiento || 'Sin clasificación';
                if (m.tipo_movimiento_nombre) {
                    const parts = [];
                    if (m.tipo_movimiento_abuelo_nombre) parts.push(m.tipo_movimiento_abuelo_nombre);
                    if (m.tipo_movimiento_padre_nombre) parts.push(m.tipo_movimiento_padre_nombre);
                    parts.push(m.tipo_movimiento_nombre);
                    path = parts.join(' &gt; ');
                }

                tableHtml += `
                    <tr>
                        <td class="text-center">${Helper.formatDate(m.fecha)}</td>
                        <td class="text-center">${m.numero_documento || 'S/N'}</td>
                        <td>
                            <div class="fw-bold">${m.item_codigo} - ${m.item_nombre}</div>
                            <div class="x-small text-muted">${m.school_name} - ${m.branch_name}</div>
                        </td>
                        <td class="text-uppercase">${m.tercero_nombre}</td>
                        <td class="text-center"><span class="badge bg-light text-dark border">${path}</span></td>
                        <td class="text-muted small">${m.detalle || ''}</td>
                        <td class="text-end fw-bold">${Helper.formatCurrency(m.valor)}</td>
                    </tr>
                `;
            });

            tableHtml += `
                    </tbody>
                    <tfoot>
                        <tr class="fw-bold bg-light align-middle text-dark" style="font-size: 0.75rem;">
                            <td colspan="6" class="text-end pe-4">TOTAL ACUMULADO EJECUTADO</td>
                            <td class="text-end text-danger">${Helper.formatCurrency(total)}</td>
                        </tr>
                    </tfoot>
                </table>
            `;
        }

        // Final overall subtotal card for grouped views
        if (this.agrupacion) {
            tableHtml += `
                <div class="card border border-2 mt-4 p-3 bg-light rounded-3 shadow-sm">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fs-6 fw-bold text-uppercase text-secondary">Total General Acumulado Ejecutado</span>
                        <span class="fs-4 fw-bold text-danger">${Helper.formatCurrency(total)}</span>
                    </div>
                </div>
            `;
        }

        const defaultEntity = `${Config.BASE_URL}assets/img/logos/default_entity.png`;
        const defaultOperator = `${Config.BASE_URL}assets/img/logos/default_operator.png`;
        const entityLogoUrl = this.programInfo?.entity_logo_path ? `${Config.BASE_URL}${this.programInfo.entity_logo_path}` : defaultEntity;
        const operatorLogoUrl = this.programInfo?.operator_logo_path ? `${Config.BASE_URL}${this.programInfo.operator_logo_path}` : defaultOperator;

        const headerHtml = `
            <div class="row align-items-center mb-4 pb-3 border-bottom print-header w-100 mx-0">
                <div class="col-3 text-start px-0">
                    <img src="${entityLogoUrl}" alt="Logo Entidad" style="max-height: 55px; max-width: 100%; object-fit: contain;" onerror="this.src='${defaultEntity}'">
                </div>
                <div class="col-6 text-center px-0">
                    <h5 class="fw-bold text-uppercase mb-0 text-primary-custom" style="font-size: 0.9rem;">${this.programInfo?.entity_name || 'PROGRAMA DE ALIMENTACIÓN ESCOLAR'}</h5>
                    <h6 class="fw-bold text-muted text-uppercase mb-1" style="font-size: 0.75rem;">${this.programInfo?.name || 'PAE'}</h6>
                    ${this.programInfo?.contract_number ? `<div class="text-muted small" style="font-size: 0.65rem;">CONTRATO No: ${this.programInfo.contract_number}</div>` : ''}
                    <div class="fw-bold mt-2" style="font-size: 1rem; border-top: 1px solid #eee; padding-top: 4px; color: #111;">LIBRO AUXILIAR DE MOVIMIENTOS FINANCIEROS</div>
                    <div class="text-muted" style="font-size: 0.65rem;">Fecha Generación: ${dateStr}</div>
                </div>
                <div class="col-3 text-end px-0">
                    <img src="${operatorLogoUrl}" alt="Logo Operador" style="max-height: 55px; max-width: 100%; object-fit: contain;" onerror="this.src='${defaultOperator}'">
                </div>
            </div>
        `;

        const printHtml = `
            ${printStyle}
            <div class="w-100 p-0">
                <div class="print-btn-bar text-end mb-4 d-print-none">
                    <button class="btn btn-secondary me-2" onclick="ReportsMovimientosAuxView.closePrint()"><i class="fas fa-times me-1"></i> Cerrar</button>
                    <button class="btn btn-success me-2" onclick="ReportsMovimientosAuxView.exportExcel()"><i class="fas fa-file-excel me-1"></i> Excel</button>
                    <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print me-1"></i> Imprimir</button>
                </div>

                ${headerHtml}

                ${tableHtml}
            </div>
        `;

        document.getElementById('reportConfigContainer').classList.add('d-none');
        const printContainer = document.getElementById('printContainer');
        printContainer.innerHTML = printHtml;
        printContainer.classList.remove('d-none');
    },

    closePrint() {
        document.getElementById('printContainer').classList.add('d-none');
        document.getElementById('printContainer').innerHTML = '';
        document.getElementById('reportConfigContainer').classList.remove('d-none');
    },

    exportExcel() {
        const printContent = document.getElementById('printContainer');
        if (!printContent) return;

        const clone = printContent.cloneNode(true);
        const btnBar = clone.querySelector('.print-btn-bar');
        if (btnBar) btnBar.remove();

        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <style>
                    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                    th, td { border: 1px solid #000; padding: 5px; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .bg-light { background-color: #e9ecef !important; }
                    .fw-bold { font-weight: bold; }
                    .text-end { text-align: right; }
                    .text-center { text-align: center; }
                    .text-primary { color: #009688 !important; }
                    .text-danger { color: #dc3545 !important; }
                    .group-header-1 { background-color: #2c3e50 !important; color: #ffffff !important; font-weight: bold; }
                    .group-header-2 { background-color: #7f8c8d !important; color: #ffffff !important; font-weight: bold; }
                </style>
            </head>
            <body>
                ${clone.innerHTML}
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Auxiliar_Movimientos_${new Date().getTime()}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        Helper.alert('success', 'Excel generado exitosamente');
    },

    renderConfigView() {
        const html = `
            <div id="reportConfigContainer" class="container-fluid py-4 min-vh-100 bg-light d-print-none">
                <div class="d-flex align-items-center mb-4 border-bottom pb-3">
                    <div class="icon-circle bg-danger-light me-3" style="width: 50px; height: 50px;">
                        <i class="fas fa-clipboard-list text-danger"></i>
                    </div>
                    <div>
                        <h3 class="mb-0 text-primary-custom fw-bold">Auxiliar de Movimientos Financieros</h3>
                        <p class="text-muted mb-0">Listado analítico y detallado de egresos por rango de fecha, rubro o clasificación de gastos</p>
                    </div>
                </div>

                <div class="card shadow-sm border-0 rounded-3 mb-4">
                    <div class="card-body p-4">
                        <h5 class="text-primary-custom fw-bold mb-4">Filtros de Búsqueda</h5>
                        
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label text-uppercase small fw-bold text-muted">Filtrar por Rubro</label>
                                <select id="filtroRubro" class="form-select bg-light">
                                    <option value="">Todos los Rubros</option>
                                </select>
                            </div>

                            <div class="col-md-6">
                                <label class="form-label text-uppercase small fw-bold text-muted">Clasificación de Costo / Gasto</label>
                                <select id="filtroTipo" class="form-select bg-light">
                                    <option value="">Todas las Categorías</option>
                                </select>
                            </div>

                            <div class="col-md-6">
                                <label class="form-label text-uppercase small fw-bold text-muted">Fecha Desde</label>
                                <input id="fechaInicio" type="date" class="form-control bg-light">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-uppercase small fw-bold text-muted">Fecha Hasta</label>
                                <input id="fechaFin" type="date" class="form-control bg-light">
                            </div>

                            <div class="col-12 mt-3">
                                <label class="form-label text-uppercase small fw-bold text-muted">Agrupación del Reporte</label>
                                <select id="agruparPor" class="form-select bg-light">
                                    <option value="">Sin Agrupación (Listado Continuo)</option>
                                    <option value="nivel1">Agrupar por Nivel 1 (Grupo Principal)</option>
                                    <option value="nivel2">Agrupar por Nivel 2 (Subgrupo)</option>
                                </select>
                            </div>
                        </div>

                        <div class="text-center mt-5 d-flex justify-content-center gap-3">
                            <button class="btn btn-outline-success px-4 bg-white shadow-sm" onclick="ReportsMovimientosAuxView.generateReport(true)">
                                <i class="fas fa-file-excel me-2"></i>Exportar a Excel
                            </button>
                            <button class="btn btn-primary px-4 bg-teal shadow-sm border-0" onclick="ReportsMovimientosAuxView.generateReport()" style="background-color: #009688;">
                                <i class="fas fa-search me-2"></i>Buscar y Generar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="printContainer" class="d-none"></div>
        `;

        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = html;
        }
    }
};

ReportsMovimientosAuxView.init();

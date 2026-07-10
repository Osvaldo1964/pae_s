/**
 * Reports Movimientos Aux View - Finance Module
 * Libro Auxiliar de Movimientos Financieros
 */

window.ReportsMovimientosAuxView = {
    items: [],
    movimientoTipos: [],
    movimientos: [],

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
            this.programInfo = programInfo;

            this.populateSelects();
        } catch (error) {
            console.error('Error loading filters data:', error);
            Helper.alert('error', 'Error al cargar filtros del reporte');
        }
    },

    populateSelects() {
        const rubroSelect = document.getElementById('filtroRubro');
        const tipoSelect = document.getElementById('filtroTipo');

        if (rubroSelect) {
            // Populate active leaf items
            const activeLeafs = this.items.filter(item => !item.isParent && item.estado == 1);
            activeLeafs.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id_item;
                option.textContent = `${cat.codigo} - ${cat.nombre}`;
                rubroSelect.appendChild(option);
            });
        }

        if (tipoSelect) {
            this.movimientoTipos.forEach(t => {
                const option = document.createElement('option');
                option.value = t.nombre;
                option.textContent = t.nombre;
                tipoSelect.appendChild(option);
            });
        }
    },

    async generateReport(directExcel = false) {
        const item_id = document.getElementById('filtroRubro').value;
        const tipo = document.getElementById('filtroTipo').value;
        const start_date = document.getElementById('fechaInicio').value;
        const end_date = document.getElementById('fechaFin').value;

        // Build API URL with filters
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
            </style>
        `;

        let tableHtml = `
            <table class="table table-bordered table-sm report-table w-100">
                <thead>
                    <tr class="align-middle">
                        <th style="width: 10%">Fecha</th>
                        <th style="width: 10%">Documento</th>
                        <th style="width: 25%">Rubro / Centro de Costo</th>
                        <th style="width: 20%">Tercero / Beneficiario</th>
                        <th style="width: 10%">Categoría (Tipo)</th>
                        <th style="width: 15%">Concepto / Detalle</th>
                        <th style="width: 10%">Valor ($)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.movimientos.forEach(m => {
            tableHtml += `
                <tr>
                    <td class="text-center">${Helper.formatDate(m.fecha)}</td>
                    <td class="text-center">${m.numero_documento || 'S/N'}</td>
                    <td>
                        <div class="fw-bold">${m.item_codigo} - ${m.item_nombre}</div>
                        <div class="x-small text-muted">${m.school_name} - ${m.branch_name}</div>
                    </td>
                    <td class="text-uppercase">${m.tercero_nombre}</td>
                    <td class="text-center"><span class="badge bg-light text-dark border">${m.tipo_movimiento}</span></td>
                    <td class="text-muted small">${m.detalle || ''}</td>
                    <td class="text-end fw-bold">${Helper.formatCurrency(m.valor)}</td>
                </tr>
            `;
        });

        tableHtml += `
                </tbody>
                <tfoot>
                    <tr class="fw-bold bg-light align-middle text-dark" style="font-size: 0.8rem;">
                        <td colspan="6" class="text-end pe-4">TOTAL ACUMULADO EJECUTADO</td>
                        <td class="text-end text-danger">${Helper.formatCurrency(total)}</td>
                    </tr>
                </tfoot>
            </table>
        `;

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
        const table = document.querySelector('.report-table');
        if (!table) return;

        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
                <style>
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #000; padding: 5px; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .bg-light { background-color: #e9ecef !important; }
                    .fw-bold { font-weight: bold; }
                    .text-end { text-align: right; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                <h2 style="text-align: center;">LIBRO AUXILIAR DE MOVIMIENTOS FINANCIEROS</h2>
                <table>
                    ${table.innerHTML}
                </table>
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
                <!-- Header -->
                <div class="d-flex align-items-center mb-4 border-bottom pb-3">
                    <div class="icon-circle bg-danger-light me-3" style="width: 50px; height: 50px;">
                        <i class="fas fa-clipboard-list text-danger"></i>
                    </div>
                    <div>
                        <h3 class="mb-0 text-primary-custom fw-bold">Auxiliar de Movimientos Financieros</h3>
                        <p class="text-muted mb-0">Listado analítico y detallado de egresos por rango de fecha, rubro o categoría</p>
                    </div>
                </div>

                <!-- Config Card -->
                <div class="card shadow-sm border-0 rounded-3 mb-4">
                    <div class="card-body p-4">
                        <h5 class="text-primary-custom fw-bold mb-4">Filtros de Búsqueda</h5>
                        
                        <div class="row g-3">
                            <!-- Filtrar por Rubro Especial -->
                            <div class="col-md-6">
                                <label class="form-label text-uppercase small fw-bold text-muted">Filtrar por Rubro</label>
                                <select id="filtroRubro" class="form-select bg-light">
                                    <option value="">Todos los Rubros</option>
                                </select>
                            </div>

                            <!-- Filtrar por Tipo de Movimiento -->
                            <div class="col-md-6">
                                <label class="form-label text-uppercase small fw-bold text-muted">Categoría (Tipo de Movimiento)</label>
                                <select id="filtroTipo" class="form-select bg-light">
                                    <option value="">Todas las Categorías</option>
                                </select>
                            </div>

                            <!-- Rango de fechas -->
                            <div class="col-md-6">
                                <label class="form-label text-uppercase small fw-bold text-muted">Fecha Desde</label>
                                <input id="fechaInicio" type="date" class="form-control bg-light">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label text-uppercase small fw-bold text-muted">Fecha Hasta</label>
                                <input id="fechaFin" type="date" class="form-control bg-light">
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
            
            <!-- Print Container -->
            <div id="printContainer" class="d-none"></div>
        `;

        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = html;
        }
    }
};

ReportsMovimientosAuxView.init();

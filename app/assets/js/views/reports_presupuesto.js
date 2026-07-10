/**
 * Reports Presupuesto View - Finance Module
 * Generación de Reporte de Presupuesto Inicial
 */

window.ReportsPresupuestoView = {
    items: [],
    branches: [],
    config: {
        tipo: 'resumido', // 'resumido' or 'detallado'
        rubroId: '' // '' for 'Todos los Rubros'
    },

    async init() {
        console.log('Initializing Reports Presupuesto Module...');
        this.renderConfigView();
        Helper.loading(true, 'Cargando datos...');
        await this.loadData();
        this.fillRubrosSelect();
        Helper.loading(false);
    },

    async loadData() {
        try {
            const [items, branches, asignaciones, programInfo] = await Promise.all([
                Helper.fetchAPI('/presupuesto'),
                Helper.fetchAPI('/presupuesto/branches'),
                Helper.fetchAPI('/presupuesto/asignaciones'),
                Helper.fetchAPI('/presupuesto/active-program').catch(() => null)
            ]);

            this.programInfo = programInfo;

            // Assign distribution to items before formatting hierarchy
            const itemsWithDist = Array.isArray(items) ? items : [];
            const asigList = Array.isArray(asignaciones) ? asignaciones : [];

            itemsWithDist.forEach(item => {
                // Find all assignments for this item
                item.distribucion = asigList.filter(a => a.item_id == item.id_item);
            });

            // Format hierarchy
            this.items = this.calculateSummaries(itemsWithDist);
            this.branches = Array.isArray(branches) ? branches : [];
        } catch (error) {
            console.error('Error loading budget data for reports:', error);
            Helper.alert('error', 'Error al cargar los datos del presupuesto');
        }
    },

    calculateSummaries(items) {
        const hasChildren = new Set();
        items.forEach(item => {
            if (item.padre_id) hasChildren.add(parseInt(item.padre_id));
        });

        const map = {};
        items.forEach(item => {
            item.isParent = hasChildren.has(parseInt(item.id_item));
            
            // Set base values for leaf items from their assignments
            if (!item.isParent) {
                let inicial = 0;
                let adiciones = 0;
                let reducciones = 0;
                if (item.distribucion && item.distribucion.length > 0) {
                    item.distribucion.forEach(d => {
                        inicial += parseFloat(d.valor_inicial) || 0;
                        adiciones += parseFloat(d.valor_adiciones) || 0;
                        reducciones += parseFloat(d.valor_reducciones) || 0;
                    });
                } else {
                    inicial = parseFloat(item.valor_total_oficial) || 0;
                }
                item.valor_inicial = inicial;
                item.valor_adiciones = adiciones;
                item.valor_reducciones = reducciones;
                item.valor_definitivo = inicial + adiciones - reducciones;
            } else {
                // Initialize parent sums to 0
                item.valor_inicial = 0;
                item.valor_adiciones = 0;
                item.valor_reducciones = 0;
                item.valor_definitivo = 0;
            }
            map[item.id_item] = item;
        });

        // Bottom-up calc: sort by code length descending to process children first
        const sorted = [...items].sort((a, b) => b.codigo.length - a.codigo.length);

        sorted.forEach(item => {
            if (item.padre_id && map[item.padre_id]) {
                map[item.padre_id].valor_inicial += parseFloat(item.valor_inicial) || 0;
                map[item.padre_id].valor_adiciones += parseFloat(item.valor_adiciones) || 0;
                map[item.padre_id].valor_reducciones += parseFloat(item.valor_reducciones) || 0;
                map[item.padre_id].valor_definitivo += parseFloat(item.valor_definitivo) || 0;
                
                // Keep legacy field in sync just in case
                map[item.padre_id].valor_total_oficial = map[item.padre_id].valor_inicial;
            }
        });

        // Ensure legacy field is in sync for leaf items too
        items.forEach(item => {
            if (!item.isParent) {
                item.valor_total_oficial = item.valor_inicial;
            }
        });

        return items;
    },

    renderConfigView() {
        const html = `
            <div id="reportConfigContainer" class="container-fluid py-4 min-vh-100 bg-light d-print-none">
                <!-- Header -->
                <div class="d-flex align-items-center mb-4 border-bottom pb-3">
                    <div class="icon-circle bg-danger-light me-3" style="width: 50px; height: 50px;">
                        <i class="fas fa-money-bill-wave text-danger"></i>
                    </div>
                    <div>
                        <h3 class="mb-0 text-primary-custom fw-bold">Generar Reporte de Presupuesto</h3>
                        <p class="text-muted mb-0">Generar Reporte de Presupuesto Inicial</p>
                    </div>
                </div>

                <!-- Config Card -->
                <div class="card shadow-sm border-0 rounded-3 mb-4">
                    <div class="card-body p-4">
                        <h5 class="text-primary-custom fw-bold mb-4">Configuración del Reporte</h5>
                        
                        <div class="row g-4">
                            <!-- Tipo de Informe -->
                            <div class="col-md-12">
                                <label class="form-label text-uppercase small fw-bold text-muted">TIPO DE INFORME</label>
                                <div class="mt-2">
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="radio" name="tipoInforme" id="tipoResumido" value="resumido" checked onchange="ReportsPresupuestoView.updateConfig('tipo', this.value)">
                                        <label class="form-check-label fw-bold text-secondary" for="tipoResumido">
                                            RESUMIDO (SOLO RUBROS)
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="tipoInforme" id="tipoDetallado" value="detallado" onchange="ReportsPresupuestoView.updateConfig('tipo', this.value)">
                                        <label class="form-check-label fw-bold text-secondary" for="tipoDetallado">
                                            DETALLADO (INCLUIR CENTROS DE ATENCIÓN)
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- Filtrar por Rubro Especial -->
                            <div class="col-md-12">
                                <label class="form-label text-uppercase small fw-bold text-muted">FILTRAR POR RUBRO ESPECIAL</label>
                                <select id="filtroRubro" class="form-select bg-light" onchange="ReportsPresupuestoView.updateConfig('rubroId', this.value)">
                                    <option value="">Todos los Rubros</option>
                                    <!-- Options will be populated here -->
                                </select>
                                <div class="form-text small"><i class="fas fa-info-circle me-1"></i>Seleccione 'Todos' para ver el presupuesto completo o elija un rubro específico.</div>
                            </div>
                        </div>

                        <div class="text-center mt-5 d-flex justify-content-center gap-3">
                            <button class="btn btn-outline-success px-4 bg-white shadow-sm" onclick="ReportsPresupuestoView.generateReport(true)">
                                <i class="fas fa-file-excel me-2"></i>Exportar a Excel
                            </button>
                            <button class="btn btn-primary px-4 bg-teal shadow-sm border-0" onclick="ReportsPresupuestoView.generateReport()" style="background-color: #009688;">
                                <i class="fas fa-file-invoice-dollar me-2"></i>Generar en Pantalla
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Print Container (Hidden by default, shown when generating report) -->
            <div id="printContainer" class="d-none"></div>
        `;

        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = html;
        }
    },

    fillRubrosSelect() {
        const select = document.getElementById('filtroRubro');
        if (!select) return;

        // Get main categories (no parent) inside items
        const mainCategories = this.items.filter(item => !item.padre_id);

        mainCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id_item;
            option.textContent = `${cat.codigo} - ${cat.nombre}`;
            select.appendChild(option);
        });
    },

    updateConfig(key, value) {
        this.config[key] = value;
    },

    generateReport(directExcel = false) {
        if (this.items.length === 0) {
            Helper.alert('warning', 'No hay datos de presupuesto cargados para mostrar.');
            return;
        }

        // Filter by specific rubro and its descendants if selected
        let dataToShow = this.items;
        if (this.config.rubroId !== '') {
            dataToShow = this.getDescendants(this.config.rubroId);
        }

        // Sort items by asc code for printing
        dataToShow.sort((a, b) => {
            return a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' });
        });

        this.renderPrintView(dataToShow);

        if (directExcel) {
            this.exportExcel();
            this.closePrint();
        }
    },

    getDescendants(parentId) {
        const parentIdInt = parseInt(parentId);
        const result = [this.items.find(i => i.id_item == parentIdInt)];

        const fetchChildren = (pid) => {
            this.items.forEach(item => {
                if (item.padre_id == pid) {
                    result.push(item);
                    fetchChildren(item.id_item);
                }
            });
        };
        fetchChildren(parentIdInt);

        // Remove undefined if parent wasn't found somehow
        return result.filter(r => r);
    },

    renderPrintView(data) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-CO') + ' ' + now.toLocaleTimeString('es-CO', { hour12: false });

        let totalInicial = 0;
        let totalCreditos = 0;
        let totalCcreditos = 0;
        let totalDefinitivo = 0;

        if (this.config.rubroId !== '') {
            const parentItem = this.items.find(i => i.id_item == this.config.rubroId);
            if (parentItem) {
                totalInicial = parseFloat(parentItem.valor_inicial) || 0;
                totalCreditos = parseFloat(parentItem.valor_adiciones) || 0;
                totalCcreditos = parseFloat(parentItem.valor_reducciones) || 0;
                totalDefinitivo = parseFloat(parentItem.valor_definitivo) || 0;
            }
        } else {
            data.forEach(item => {
                if (!item.padre_id) {
                    totalInicial += parseFloat(item.valor_inicial) || 0;
                    totalCreditos += parseFloat(item.valor_adiciones) || 0;
                    totalCcreditos += parseFloat(item.valor_reducciones) || 0;
                    totalDefinitivo += parseFloat(item.valor_definitivo) || 0;
                }
            });
        }

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
                .report-table th { background-color: #f8f9fa !important; font-size: 0.8rem; }
                .report-table td { font-size: 0.8rem; vertical-align: middle; padding: 4px 8px; }
                .subrubro-indent { padding-left: 20px !important; color: #6c757d; font-style: italic; font-size: 0.75rem; }
            </style>
        `;

        let tableHtml = `
            <table class="table table-bordered table-sm report-table w-100">
                <thead>
                    <tr class="text-center">
                        <th style="width: 10%">Código</th>
                        <th style="width: 35%">Rubro Presupuestal</th>
                        <th style="width: 15%">Valor Inicial</th>
                        <th style="width: 12%">(+) Créditos</th>
                        <th style="width: 13%">(-) C.Créditos</th>
                        <th style="width: 15%">Definitivo</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach(item => {
            const isParent = item.isParent;
            const rowClass = isParent ? 'fw-bold bg-light' : '';
            const indent = (item.codigo.split('.').length - 1) * 15;

            const inicial = parseFloat(item.valor_inicial) || 0;
            const creditos = parseFloat(item.valor_adiciones) || 0;
            const ccreditos = parseFloat(item.valor_reducciones) || 0;
            const definitivo = parseFloat(item.valor_definitivo) || 0;

            tableHtml += `
                <tr class="${rowClass}">
                    <td>${item.codigo}</td>
                    <td style="padding-left: ${8 + indent}px !important;" class="text-uppercase">${item.nombre}</td>
                    <td class="text-end">${Helper.formatCurrency(inicial)}</td>
                    <td class="text-end text-success">${Helper.formatCurrency(creditos)}</td>
                    <td class="text-end text-danger">${Helper.formatCurrency(ccreditos)}</td>
                    <td class="text-end fw-bold">${Helper.formatCurrency(definitivo)}</td>
                </tr>
            `;

            // If Detallado, render distribution for leafs
            if (this.config.tipo === 'detallado' && !isParent && item.distribucion && item.distribucion.length > 0) {
                item.distribucion.forEach(d => {
                    const branch = this.branches.find(b => b.id == d.branch_id);
                    const branchName = branch ? `${branch.school_name} - ${branch.name}` : 'SEDE DESCONOCIDA';
                    
                    const d_inicial = parseFloat(d.valor_inicial) || 0;
                    const d_creditos = parseFloat(d.valor_adiciones) || 0;
                    const d_ccreditos = parseFloat(d.valor_reducciones) || 0;
                    const d_definitivo = d_inicial + d_creditos - d_ccreditos;

                    tableHtml += `
                        <tr>
                            <td></td>
                            <td class="subrubro-indent text-uppercase">↳ ${branchName}</td>
                            <td class="text-end text-muted">${Helper.formatCurrency(d_inicial)}</td>
                            <td class="text-end text-success text-muted">${Helper.formatCurrency(d_creditos)}</td>
                            <td class="text-end text-danger text-muted">${Helper.formatCurrency(d_ccreditos)}</td>
                            <td class="text-end text-muted">${Helper.formatCurrency(d_definitivo)}</td>
                        </tr>
                    `;
                });
            }
        });

        tableHtml += `
                </tbody>
                <tfoot>
                    <tr class="fw-bold bg-light">
                        <td colspan="2" class="text-end pe-4">TOTAL GENERAL</td>
                        <td class="text-end">${Helper.formatCurrency(totalInicial)}</td>
                        <td class="text-end text-success">${Helper.formatCurrency(totalCreditos)}</td>
                        <td class="text-end text-danger">${Helper.formatCurrency(totalCcreditos)}</td>
                        <td class="text-end">${Helper.formatCurrency(totalDefinitivo)}</td>
                    </tr>
                </tfoot>
            </table >
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
                    <div class="fw-bold mt-2" style="font-size: 1rem; border-top: 1px solid #eee; padding-top: 4px; color: #111;">PRESUPUESTO DE INGRESOS Y GASTOS (CONSOLIDADOS)</div>
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
                    <button class="btn btn-secondary me-2" onclick="ReportsPresupuestoView.closePrint()"><i class="fas fa-times me-1"></i> Cerrar</button>
                    <button class="btn btn-success me-2" onclick="ReportsPresupuestoView.exportExcel()"><i class="fas fa-file-excel me-1"></i> Excel</button>
                    <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print me-1"></i> Imprimir</button>
                </div>

                ${headerHtml}

                ${tableHtml}
            </div>
        `;

        // Hide config, show print
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
                    .subrubro-indent { padding-left: 20px; font-style: italic; color: #666; }
                </style>
            </head>
            <body>
                <h2 style="text-align: center;">PRESUPUESTO DE INGRESOS Y GASTOS (CONSOLIDADOS)</h2>
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
        a.download = `Presupuesto_Inicial_${new Date().getTime()}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        Helper.alert('success', 'Excel generado extosamente');
    }
};

ReportsPresupuestoView.init();

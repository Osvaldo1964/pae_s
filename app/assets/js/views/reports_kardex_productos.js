/**
 * Reporte: Kardex de Productos
 * Planilla oficial de requerimientos diarios y control de entrega por sede
 */
window.ReportsKardexProductosView = {
    cycles: [],
    schools: [],
    branches: [],
    currentData: null,

    async init() {
        Helper.loading(true, 'Cargando datos maestros...');
        await this.loadMasterData();
        this.render();
        this.attachEvents();
        Helper.loading(false);
    },

    async loadMasterData() {
        try {
            const [cycleRes, schoolRes, branchRes] = await Promise.all([
                Helper.fetchAPI('/menu-cycles'),
                Helper.fetchAPI('/schools'),
                Helper.fetchAPI('/branches')
            ]);

            this.cycles = Array.isArray(cycleRes) ? cycleRes : (cycleRes.success ? cycleRes.data : []);
            this.schools = Array.isArray(schoolRes) ? schoolRes : (schoolRes.success ? schoolRes.data : []);
            this.branches = Array.isArray(branchRes) ? branchRes : (branchRes.success ? branchRes.data : []);
        } catch (error) {
            console.error('Error cargando maestros para Kardex de Productos:', error);
            Helper.alert('error', 'No se pudieron cargar los datos maestros');
        }
    },

    render() {
        document.getElementById('app').innerHTML = `
            <div class="container-fluid fade-in py-3">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb mb-1">
                                <li class="breadcrumb-item"><a href="#group/5" class="text-decoration-none">Reportes</a></li>
                                <li class="breadcrumb-item"><a href="#module/reports-ali" class="text-decoration-none">Alimentación</a></li>
                                <li class="breadcrumb-item active" aria-current="page">Kardex de Productos</li>
                            </ol>
                        </nav>
                        <h2 class="mb-1 fw-bold text-success">
                            <i class="fas fa-clipboard-check me-2"></i>Kardex de Productos
                        </h2>
                        <p class="text-muted mb-0">Requerimientos diarios de alimentos y control semanal de entrega por sede</p>
                    </div>
                </div>

                <!-- Filtros de Consulta -->
                <div class="card shadow-sm border-0 mb-4 rounded-3">
                    <div class="card-header bg-white py-3 border-bottom">
                        <h6 class="mb-0 fw-bold text-secondary">
                            <i class="fas fa-filter me-2 text-success"></i>Filtros de Generación
                        </h6>
                    </div>
                    <div class="card-body bg-light">
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label small fw-bold text-uppercase">1. Ciclo de Menú <span class="text-danger">*</span></label>
                                <select id="kardex-filter-cycle" class="form-select border-2">
                                    <option value="">-- Seleccione Ciclo --</option>
                                    ${this.cycles.map(c => `
                                        <option value="${c.id}" data-start="${c.start_date}" data-end="${c.end_date}" data-branches="${c.branch_ids || ''}">
                                            ${c.name} (${c.start_date} al ${c.end_date}) [${c.status}]
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold text-uppercase">2. Centro Educativo (Colegio)</label>
                                <select id="kardex-filter-school" class="form-select border-2" disabled>
                                    <option value="">-- Primero seleccione un ciclo --</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold text-uppercase">3. Sede Educativa</label>
                                <select id="kardex-filter-branch" class="form-select border-2" disabled>
                                    <option value="">-- Todas las sedes del centro --</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <div class="p-2 bg-white rounded border small text-muted d-flex align-items-center">
                                    <i class="fas fa-info-circle text-primary me-2 fa-lg"></i>
                                    <span id="kardex-period-info">Seleccione un ciclo para ver el período y las sedes asignadas.</span>
                                </div>
                            </div>
                            <div class="col-md-6 d-flex align-items-center justify-content-end gap-2">
                                <button type="button" class="btn btn-primary fw-bold px-4" id="btn-kardex-preview">
                                    <i class="fas fa-eye me-2"></i> Consultar
                                </button>
                                <button type="button" class="btn btn-success fw-bold px-3" id="btn-kardex-print" disabled>
                                    <i class="fas fa-print me-2"></i> Imprimir Planilla Oficial
                                </button>
                                <button type="button" class="btn btn-outline-success fw-bold px-3" id="btn-kardex-excel" disabled>
                                    <i class="fas fa-file-excel me-2"></i> Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Contenedor de Vista Previa -->
                <div id="kardex-preview-container">
                    <div class="text-center py-5 text-muted bg-white rounded-3 border">
                        <i class="fas fa-clipboard-list fa-3x mb-3 opacity-25 text-success"></i>
                        <h5 class="fw-bold">Esperando parámetros</h5>
                        <p class="mb-0">Seleccione el ciclo, centro y sede para generar el kardex de alimentos.</p>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents() {
        const cycleSelect = document.getElementById('kardex-filter-cycle');
        const schoolSelect = document.getElementById('kardex-filter-school');
        const branchSelect = document.getElementById('kardex-filter-branch');
        const previewBtn = document.getElementById('btn-kardex-preview');
        const printBtn = document.getElementById('btn-kardex-print');
        const excelBtn = document.getElementById('btn-kardex-excel');
        const periodInfo = document.getElementById('kardex-period-info');

        cycleSelect.addEventListener('change', () => {
            const selectedOpt = cycleSelect.selectedOptions[0];
            const cycleId = cycleSelect.value;

            schoolSelect.innerHTML = '<option value="">-- Todos los colegios del ciclo --</option>';
            branchSelect.innerHTML = '<option value="">-- Todas las sedes --</option>';
            branchSelect.disabled = true;

            if (!cycleId) {
                schoolSelect.disabled = true;
                periodInfo.textContent = 'Seleccione un ciclo para ver el período y las sedes asignadas.';
                return;
            }

            const startDate = selectedOpt.getAttribute('data-start') || '';
            const endDate = selectedOpt.getAttribute('data-end') || '';
            const cycleBranchesStr = selectedOpt.getAttribute('data-branches') || '';
            const branchIdArray = cycleBranchesStr ? cycleBranchesStr.split(',').map(id => parseInt(id.trim())) : [];

            periodInfo.innerHTML = `<strong>Período del ciclo:</strong> ${startDate} al ${endDate} ${branchIdArray.length > 0 ? `(${branchIdArray.length} sedes vinculadas)` : '(Aplica a todas las sedes)'}`;

            // Filtrar colegios que tienen sedes asociadas a este ciclo
            let availableSchools = this.schools;
            if (branchIdArray.length > 0) {
                const schoolIdsWithBranches = this.branches
                    .filter(b => branchIdArray.includes(parseInt(b.id)))
                    .map(b => parseInt(b.school_id));
                availableSchools = this.schools.filter(s => schoolIdsWithBranches.includes(parseInt(s.id)));
            }

            availableSchools.forEach(s => {
                schoolSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
            schoolSelect.disabled = false;
        });

        schoolSelect.addEventListener('change', () => {
            const schoolId = schoolSelect.value;
            const cycleSelectOpt = cycleSelect.selectedOptions[0];
            const cycleBranchesStr = cycleSelectOpt ? cycleSelectOpt.getAttribute('data-branches') || '' : '';
            const branchIdArray = cycleBranchesStr ? cycleBranchesStr.split(',').map(id => parseInt(id.trim())) : [];

            branchSelect.innerHTML = '<option value="">-- Todas las sedes del centro --</option>';

            if (!schoolId) {
                branchSelect.disabled = true;
                return;
            }

            let filteredBranches = this.branches.filter(b => b.school_id == schoolId);
            if (branchIdArray.length > 0) {
                filteredBranches = filteredBranches.filter(b => branchIdArray.includes(parseInt(b.id)));
            }

            filteredBranches.forEach(b => {
                branchSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`;
            });
            branchSelect.disabled = false;
        });

        previewBtn.addEventListener('click', () => this.fetchData('preview'));
        printBtn.addEventListener('click', () => {
            if (this.currentData) this.printReport(this.currentData);
        });
        excelBtn.addEventListener('click', () => {
            if (this.currentData) this.exportExcel(this.currentData);
        });
    },

    async fetchData(targetAction = 'preview') {
        const cycleId = document.getElementById('kardex-filter-cycle').value;
        const schoolId = document.getElementById('kardex-filter-school').value;
        const branchId = document.getElementById('kardex-filter-branch').value;

        if (!cycleId) {
            Helper.alert('warning', 'Por favor seleccione al menos el Ciclo de Menú');
            return;
        }

        Helper.loading(true, 'Calculando requerimientos diarios de alimentos...');
        try {
            let url = `/reports/kardex-productos?cycle_id=${cycleId}`;
            if (schoolId) url += `&school_id=${schoolId}`;
            if (branchId) url += `&branch_id=${branchId}`;

            const res = await Helper.fetchAPI(url);
            Helper.loading(false);

            if (res && res.success) {
                this.currentData = res;
                document.getElementById('btn-kardex-print').disabled = false;
                document.getElementById('btn-kardex-excel').disabled = false;

                if (targetAction === 'preview') {
                    this.renderPreview(res);
                } else if (targetAction === 'print') {
                    this.printReport(res);
                } else if (targetAction === 'excel') {
                    this.exportExcel(res);
                }
            } else {
                Helper.alert('error', res.message || 'Error al calcular los requerimientos de alimentos.');
            }
        } catch (error) {
            Helper.loading(false);
            console.error('Error fetching kardex data:', error);
            Helper.alert('error', 'Ocurrió un error inesperado al consultar los datos');
        }
    },

    renderPreview(data) {
        const container = document.getElementById('kardex-preview-container');
        const reports = data.reports || [];
        const days = data.days || [];

        if (reports.length === 0) {
            container.innerHTML = `
                <div class="alert alert-warning text-center p-4 rounded-3">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2 text-warning"></i>
                    <h5>No se encontraron datos para los filtros seleccionados</h5>
                    <p class="mb-0">Verifique que el ciclo tenga menús con recetas e insumos, y que las sedes tengan beneficiarios activos con derechos de ración.</p>
                </div>
            `;
            return;
        }

        let tabsNavHtml = '';
        let tabsContentHtml = '';

        reports.forEach((rep, index) => {
            const isActive = index === 0 ? 'active' : '';
            const isShow = index === 0 ? 'show active' : '';
            const tabId = `sede-tab-${index}`;
            const paneId = `sede-pane-${index}`;

            tabsNavHtml += `
                <li class="nav-item" role="presentation">
                    <button class="nav-link ${isActive} fw-bold" id="${tabId}" data-bs-toggle="tab" data-bs-target="#${paneId}" type="button" role="tab">
                        <i class="fas fa-school me-1"></i> ${rep.branch.name} (${rep.census.total} niños)
                    </button>
                </li>
            `;

            // Construir tabla de ítems de la sede
            let rowsHtml = '';
            if (!rep.items || rep.items.length === 0) {
                rowsHtml = `<tr><td colspan="${4 + (days.length * 2) + 1}" class="text-center py-4 text-muted">Sin alimentos programados para esta sede</td></tr>`;
            } else {
                rep.items.forEach(it => {
                    let dailyCols = '';
                    days.forEach(d => {
                        const dayQty = it.daily_quantities[d.day_number];
                        const valStr = (dayQty !== undefined && dayQty !== null && dayQty > 0)
                            ? this.formatNumber(dayQty)
                            : '-';
                        dailyCols += `
                            <td class="text-end fw-bold bg-white text-dark">${valStr}</td>
                            <td class="bg-light text-center text-muted" style="width: 50px;"></td>
                        `;
                    });

                    rowsHtml += `
                        <tr>
                            <td class="text-center text-muted">${it.item_no}</td>
                            <td class="fw-bold text-uppercase">${it.name}</td>
                            <td class="text-end fw-bold text-success">${this.formatNumber(it.total_quantity)}</td>
                            <td class="text-center badge-unit">${it.unit}</td>
                            ${dailyCols}
                            <td class="bg-light" style="width: 60px;"></td>
                        </tr>
                    `;
                });
            }

            tabsContentHtml += `
                <div class="tab-pane fade ${isShow} p-3 bg-white border border-top-0 rounded-bottom" id="${paneId}" role="tabpanel">
                    <!-- Resumen de Encabezado de la Sede -->
                    <div class="row g-3 mb-3 p-3 bg-light rounded border">
                        <div class="col-md-6">
                            <h5 class="fw-bold mb-1 text-primary-custom">${rep.school.name}</h5>
                            <h6 class="text-secondary fw-bold mb-2"><i class="fas fa-map-marker-alt me-1"></i>SEDE: ${rep.branch.name}</h6>
                            <span class="badge bg-success"><i class="fas fa-utensils me-1"></i>${rep.modalities}</span>
                        </div>
                        <div class="col-md-6">
                            <div class="bg-white p-2 rounded border">
                                <div class="small fw-bold text-muted text-uppercase mb-1 border-bottom pb-1">Censo de Niveles Educativos (Total: ${rep.census.total} niños)</div>
                                <div class="d-flex justify-content-between text-center small">
                                    <div><span class="text-muted d-block">Preescolar</span><strong>${rep.census.preescolar}</strong></div>
                                    <div><span class="text-muted d-block">Primaria 1°-3°</span><strong>${rep.census.primaria_a}</strong></div>
                                    <div><span class="text-muted d-block">Primaria 4°-5°</span><strong>${rep.census.primaria_b}</strong></div>
                                    <div><span class="text-muted d-block">Secundaria 6°-9°</span><strong>${rep.census.secundaria}</strong></div>
                                    <div><span class="text-muted d-block">Media / Comp.</span><strong>${rep.census.media}</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tabla de Requerimientos Diarios -->
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover align-middle small mb-0" style="min-width: 900px;">
                            <thead class="table-dark text-center align-middle">
                                <tr>
                                    <th rowspan="2" style="width: 40px;">No.</th>
                                    <th rowspan="2" style="min-width: 180px;">ALIMENTOS</th>
                                    <th rowspan="2" style="width: 80px;">CANTIDAD</th>
                                    <th rowspan="2" style="width: 80px;">UNIDAD ENTREGA</th>
                                    ${days.map(d => `<th colspan="2" class="border-start">${d.name.toUpperCase()}</th>`).join('')}
                                    <th rowspan="2" style="width: 80px;">SALDO FINAL</th>
                                </tr>
                                <tr>
                                    ${days.map(() => `<th>REQUERIDO</th><th class="bg-secondary text-white" style="font-size: 0.75rem;">SALDO DÍA</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="card shadow-sm border-0 rounded-3">
                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
                    <div>
                        <span class="badge bg-primary me-2">${reports.length} Sedes Consultadas</span>
                        <span class="text-muted small">Mostrando matriz diaria de insumos</span>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-success fw-bold" onclick="ReportsKardexProductosView.printReport(ReportsKardexProductosView.currentData)">
                            <i class="fas fa-print me-1"></i> Imprimir Todas las Hojas (${reports.length})
                        </button>
                    </div>
                </div>
                <div class="card-body p-0">
                    <ul class="nav nav-tabs px-3 pt-3 bg-light border-bottom" id="kardexSedesTabs" role="tablist">
                        ${tabsNavHtml}
                    </ul>
                    <div class="tab-content" id="kardexSedesTabContent">
                        ${tabsContentHtml}
                    </div>
                </div>
            </div>
        `;
    },

    printReport(data) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            Helper.alert('warning', 'El navegador bloqueó la ventana emergente de impresión. Por favor habilite ventanas emergentes para este sitio.');
            return;
        }

        const prog = data.program || {};
        const cycle = data.cycle || {};
        const days = data.days || [];
        const reports = data.reports || [];

        const defaultEntity = `${Config.BASE_URL}assets/img/logos/default_entity.png`;
        const defaultOperator = `${Config.BASE_URL}assets/img/logos/default_operator.png`;
        const entityLogoUrl = prog.entity_logo_path ? `${Config.BASE_URL}${prog.entity_logo_path}` : defaultEntity;
        const operatorLogoUrl = prog.operator_logo_path ? `${Config.BASE_URL}${prog.operator_logo_path}` : defaultOperator;

        const dateStr = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

        let pagesHtml = '';

        const daysCount = days.length || 5;
        // Distribución porcentual sobre 100% de la página:
        // No: 3%, Alimentos: 23%, Cantidad: 6%, Unidad: 5%, Saldo Final: 5% => Total fijos = 42%
        // Espacio restante para columnas de días: 58% (cada día = 58 / daysCount)
        const baseTotalPct = 42;
        const daysTotalPct = 100 - baseTotalPct;
        const dayWidthPct = (daysTotalPct / daysCount).toFixed(2);
        const subDayWidthPct = (daysTotalPct / (daysCount * 2)).toFixed(2);

        const formatDayHeader = (name) => {
            if (!name) return '';
            const parts = name.split(/\s*-\s*/);
            if (parts.length >= 2) {
                return `<div class="fw-bold">${parts[0].toUpperCase()}</div><div style="font-size: 5pt; font-weight: 600;">${parts[1].toUpperCase()}</div>`;
            }
            return name.toUpperCase();
        };

        // 1. Filtrar sedes que tengan al menos 1 alimento asignado (no imprimir hojas vacías)
        const printableReports = reports.filter(rep => Array.isArray(rep.items) && rep.items.length > 0);

        if (printableReports.length === 0) {
            printWindow.close();
            Helper.alert('info', 'Ninguna de las sedes seleccionadas tiene alimentos programados para imprimir.');
            return;
        }

        // 2. Paginar ítems a máximo 43 por hoja
        const MAX_ITEMS_PER_PAGE = 43;
        let allPages = [];

        printableReports.forEach(rep => {
            const items = rep.items || [];
            const chunks = [];
            for (let i = 0; i < items.length; i += MAX_ITEMS_PER_PAGE) {
                chunks.push(items.slice(i, i + MAX_ITEMS_PER_PAGE));
            }
            if (chunks.length === 0) {
                chunks.push([]);
            }

            chunks.forEach((chunkItems, chunkIdx) => {
                allPages.push({
                    rep: rep,
                    items: chunkItems,
                    pageNumber: chunkIdx + 1,
                    totalPages: chunks.length,
                    isLastPageOfBranch: chunkIdx === chunks.length - 1
                });
            });
        });

        allPages.forEach((pageInfo, pageIdx) => {
            const isLastPage = pageIdx === allPages.length - 1;
            const pageBreakClass = isLastPage ? '' : 'page-break';
            const rep = pageInfo.rep;
            const items = pageInfo.items;

            // Filas de la tabla para esta página
            let tableRowsHtml = '';
            items.forEach(it => {
                let dailyCells = '';
                days.forEach(d => {
                    const qty = it.daily_quantities[d.day_number];
                    const val = (qty !== undefined && qty !== null && qty > 0) ? this.formatNumber(qty) : '';
                    dailyCells += `
                        <td class="text-end cell-req">${val}</td>
                        <td class="cell-saldo"></td>
                    `;
                });

                tableRowsHtml += `
                    <tr>
                        <td class="text-center cell-num">${it.item_no}</td>
                        <td class="text-start cell-name">${it.name}</td>
                        <td class="text-end cell-qty">${this.formatNumber(it.total_quantity)}</td>
                        <td class="text-center cell-unit">${it.unit}</td>
                        ${dailyCells}
                        <td class="cell-saldo-final"></td>
                    </tr>
                `;
            });

            // Si por alguna razón no hay items
            if (items.length === 0) {
                tableRowsHtml = `<tr><td colspan="${4 + (days.length * 2) + 1}" class="text-center py-3">SIN ALIMENTOS ASIGNADOS</td></tr>`;
            }

            const pageIndicator = pageInfo.totalPages > 1 
                ? `&nbsp;&nbsp;&nbsp;&nbsp; <strong>HOJA:</strong> ${pageInfo.pageNumber} de ${pageInfo.totalPages}` 
                : '';

            // Firmas solo en la última hoja de la sede
            let footerBlockHtml = '';
            if (pageInfo.isLastPageOfBranch) {
                footerBlockHtml = `
                    <table class="table-signatures w-100">
                        <tr>
                            <td style="width: 50%;">
                                <div class="sig-title">NOMBRE MANIPULADOR QUE RECIBE</div>
                                <div class="sig-line">FIRMA:</div>
                            </td>
                            <td style="width: 50%;">
                                <div class="sig-title">RESPONSABLE INSTITUCIÓN</div>
                                <div class="sig-line">FIRMA:</div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" class="obs-box">
                                <strong>OBSERVACIONES:</strong>
                            </td>
                        </tr>
                    </table>
                `;
            } else {
                footerBlockHtml = `
                    <div class="continua-aviso">
                        <span>(Continúa en la siguiente hoja...)</span>
                    </div>
                `;
            }

            pagesHtml += `
                <div class="kardex-page ${pageBreakClass}">
                    <!-- Encabezado con 2 Logos -->
                    <table class="w-100 mb-1 header-layout">
                        <tr>
                            <td style="width: 20%; text-align: left; vertical-align: middle;">
                                <img src="${entityLogoUrl}" alt="Alimentos para Aprender" class="logo-img" onerror="this.style.display='none'">
                            </td>
                            <td style="width: 60%; text-align: center; vertical-align: middle;">
                                <div class="fw-bold text-uppercase fs-title">${prog.operator_name || 'UT NUTRIMOS FACA - NUTRI-FACA'}</div>
                                <div class="fw-bold fs-sub">N.I.T.: ${prog.operator_nit || prog.nit || '900.000.000-0'}</div>
                                <div class="fw-bold text-uppercase fs-sub mt-1">
                                    KARDEX DE PRODUCTOS - MODALIDAD ${rep.modalities || 'Complemento AM/PM'}
                                </div>
                                <div class="fs-dates mt-1">
                                    <strong>FECHA INICIO:</strong> ${this.formatDateDMY(cycle.start_date)} &nbsp;&nbsp;&nbsp;&nbsp;
                                    <strong>FECHA FINAL:</strong> ${this.formatDateDMY(cycle.end_date)} &nbsp;&nbsp;&nbsp;&nbsp;
                                    <strong>FECHA:</strong> ${dateStr} ${pageIndicator}
                                </div>
                            </td>
                            <td style="width: 20%; text-align: right; vertical-align: middle;">
                                <img src="${operatorLogoUrl}" alt="Operador" class="logo-img" onerror="this.style.display='none'">
                            </td>
                        </tr>
                    </table>

                    <!-- Caja de Metadatos Institucionales -->
                    <table class="table-meta w-100 mb-1">
                        <tr>
                            <td style="width: 25%;"><strong>REGIONAL:</strong><br>${prog.department || 'CUNDINAMARCA'}</td>
                            <td style="width: 35%;"><strong>MUNICIPIO:</strong> ${prog.city || 'FACATATIVA'}</td>
                            <td style="width: 40%;"><strong>CICLO:</strong> ${cycle.name}</td>
                        </tr>
                        <tr>
                            <td><strong>OPERADOR:</strong><br>${prog.operator_name || 'NUTRI-FACA'}</td>
                            <td colspan="2"><strong>INSTITUCION EDUCATIVA:</strong> ${rep.school.name} - ${rep.branch.name}</td>
                        </tr>
                        <tr>
                            <td><strong>Periodo de compra y entrega :</strong><br>Semanal &nbsp;<u>&nbsp;X&nbsp;</u></td>
                            <td colspan="2">
                                <strong>COMPLEMENTO ALIMENTICIO:</strong> 
                                J.M ____ &nbsp; J.T ____ &nbsp;&nbsp;&nbsp;&nbsp; 
                                <strong>ALMUERZO:</strong> <u>&nbsp;X&nbsp;</u>
                            </td>
                        </tr>
                    </table>

                    <!-- Censo de Niños por Grupo de Nivel Educativo -->
                    <div class="table-census-container mb-1">
                        <div class="census-title">NUMERO DE NIÑOS POR GRUPOS DE NIVELES EDUCATIVOS</div>
                        <div class="census-groups">
                            <span>Preescolar ( <strong>${rep.census.preescolar}</strong> )</span>
                            <span>Primaria 1° - 2° - 3° ( <strong>${rep.census.primaria_a}</strong> )</span>
                            <span>Primaria 4° - 5° ( <strong>${rep.census.primaria_b}</strong> )</span>
                            <span>Secundaria 6° A 9° ( <strong>${rep.census.secundaria}</strong> )</span>
                            <span>Media y Ciclo Comp. ( <strong>${rep.census.media}</strong> )</span>
                        </div>
                        <div class="census-footer">
                            CANTIDAD DE ALIMENTOS POR No. <strong>${rep.census.total}</strong> DE NIÑOS EN UNIDAD DE MEDIDA
                        </div>
                    </div>

                    <!-- Tabla Principal de Kardex -->
                    <table class="table-kardex w-100 mb-2">
                        <thead>
                            <tr>
                                <th rowspan="2" style="width: 3%;" class="cell-num">No.</th>
                                <th rowspan="2" style="width: 22%;">ALIMENTOS</th>
                                <th rowspan="2" style="width: 6%;">CANTIDAD</th>
                                <th rowspan="2" style="width: 5.5%;">UNIDAD<br>ENTREGA</th>
                                ${days.map(d => `<th colspan="2" style="width: ${dayWidthPct}%;" class="th-day">${formatDayHeader(d.name)}</th>`).join('')}
                                <th rowspan="2" style="width: 5.5%;">SALDO<br>FINAL</th>
                            </tr>
                            <tr>
                                ${days.map(() => `<th style="width: ${subDayWidthPct}%;" class="th-sub-req">CANT</th><th style="width: ${subDayWidthPct}%;" class="th-sub-saldo">SALDO DIA</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHtml}
                        </tbody>
                    </table>

                    <!-- Bloque de Firmas y Observaciones -->
                    ${footerBlockHtml}
                </div>
            `;
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Kardex de Productos - ${cycle.name}</title>
                <style>
                    @page {
                        size: letter portrait;
                        margin: 0.6cm 0.6cm 0.6cm 0.6cm;
                    }
                    * {
                        box-sizing: border-box;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 8pt;
                        line-height: 1.15;
                        color: #000;
                        margin: 0;
                        padding: 0;
                        background: #fff;
                    }
                    .kardex-page {
                        width: 100%;
                        background: #fff;
                    }
                    .page-break {
                        page-break-after: always;
                        break-after: page;
                    }
                    .btn-print-bar {
                        position: fixed;
                        top: 15px;
                        right: 15px;
                        background: rgba(255,255,255,0.95);
                        padding: 10px 15px;
                        border-radius: 8px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                        z-index: 9999;
                    }
                    .btn-print-bar button {
                        padding: 8px 16px;
                        font-size: 14px;
                        font-weight: bold;
                        border-radius: 5px;
                        cursor: pointer;
                        border: none;
                        margin-left: 8px;
                    }
                    .btn-p-primary { background: #198754; color: white; }
                    .btn-p-secondary { background: #6c757d; color: white; }
                    @media print {
                        .btn-print-bar { display: none !important; }
                    }

                    /* Clases utilitarias indispensables */
                    .w-100 { width: 100% !important; }
                    .mb-1 { margin-bottom: 4px !important; }
                    .mb-2 { margin-bottom: 8px !important; }
                    .mt-1 { margin-top: 3px !important; }
                    .text-center { text-align: center !important; }
                    .text-start { text-align: left !important; }
                    .text-end { text-align: right !important; }
                    .fw-bold { font-weight: bold !important; }
                    .text-uppercase { text-transform: uppercase !important; }

                    /* Header Styles */
                    .header-layout {
                        width: 100% !important;
                        border-collapse: collapse;
                    }
                    .logo-img {
                        max-height: 50px;
                        max-width: 120px;
                        object-fit: contain;
                    }
                    .fs-title { font-size: 9.5pt; }
                    .fs-sub { font-size: 8pt; }
                    .fs-dates { font-size: 7.5pt; }

                    /* Metadata Table */
                    .table-meta {
                        width: 100% !important;
                        border: 1px solid #000;
                        border-collapse: collapse;
                        font-size: 7.5pt;
                        table-layout: fixed;
                    }
                    .table-meta td {
                        border: 1px solid #000;
                        padding: 2px 4px;
                        vertical-align: top;
                    }

                    /* Census Box */
                    .table-census-container {
                        width: 100% !important;
                        border: 1px solid #000;
                        border-top: none;
                        text-align: center;
                        font-size: 7pt;
                        box-sizing: border-box;
                    }
                    .census-title {
                        font-weight: bold;
                        border-bottom: 1px solid #000;
                        padding: 1px 0;
                        background: #f9f9f9;
                    }
                    .census-groups {
                        display: flex;
                        justify-content: space-around;
                        padding: 2px 4px;
                        border-bottom: 1px solid #000;
                    }
                    .census-footer {
                        padding: 1px 0;
                        font-weight: normal;
                    }

                    /* Main Kardex Table */
                    .table-kardex {
                        width: 100% !important;
                        border: 1px solid #000;
                        border-collapse: collapse;
                        font-size: 7pt;
                        table-layout: fixed;
                    }
                    .table-kardex th, .table-kardex td {
                        border: 1px solid #000;
                        padding: 1px 1px;
                        height: 12.5px;
                        box-sizing: border-box;
                    }
                    .table-kardex th {
                        background: #f0f0f0;
                        font-weight: bold;
                        text-align: center;
                        vertical-align: middle;
                        font-size: 5.5pt;
                        line-height: 1.15;
                    }
                    .th-day { font-size: 5.5pt; padding: 2px 1px; line-height: 1.1; background: #eaeaea; }
                    .th-sub-req { font-size: 5pt; padding: 1px 0; font-weight: bold; }
                    .th-sub-saldo { font-size: 5pt; background: #fff; padding: 1px 0; font-weight: bold; }
                    .cell-num { text-align: center; font-size: 6pt; }
                    .cell-name { font-size: 6pt; font-weight: normal; padding-left: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                    .cell-qty { font-weight: bold; padding-right: 3px; font-size: 6.5pt; }
                    .cell-unit { font-size: 6pt; text-align: center; }
                    .cell-req { font-weight: normal; padding-right: 3px; font-size: 6.5pt; }
                    .cell-saldo { background: #fff; }
                    .cell-saldo-final { background: #fff; }

                    /* Signatures Table */
                    .table-signatures {
                        width: 100% !important;
                        border: 1px solid #000;
                        border-collapse: collapse;
                        font-size: 7pt;
                        table-layout: fixed;
                    }
                    .table-signatures td {
                        border: 1px solid #000;
                        padding: 3px 6px;
                        height: 38px;
                        vertical-align: top;
                    }
                    .sig-title { font-weight: bold; margin-bottom: 20px; font-size: 7pt; }
                    .sig-line { font-size: 7pt; }
                    .obs-box { height: 28px; font-size: 7pt; }
                    .continua-aviso {
                        text-align: right;
                        font-size: 6.5pt;
                        font-style: italic;
                        padding: 4px 6px;
                        border: 1px dashed #777;
                        margin-top: 3px;
                    }
                </style>
            </head>
            <body>
                <div class="btn-print-bar">
                    <button class="btn-p-secondary" onclick="window.close()">Cerrar</button>
                    <button class="btn-p-primary" onclick="window.print()">Imprimir Planilla</button>
                </div>
                ${pagesHtml}
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    exportExcel(data) {
        const prog = data.program || {};
        const cycle = data.cycle || {};
        const days = data.days || [];
        const reports = data.reports || [];

        if (reports.length === 0) {
            Helper.alert('warning', 'No hay datos para exportar a Excel');
            return;
        }

        let excelContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Kardex de Productos</x:Name>
                                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    th { background-color: #d1e7dd; font-weight: bold; border: 1px solid #000; }
                    td { border: 1px solid #ccc; }
                </style>
            </head>
            <body>
        `;

        reports.forEach((rep, idx) => {
            excelContent += `
                <table border="1">
                    <tr>
                        <th colspan="${4 + (days.length * 2) + 1}" style="font-size: 14pt; background-color: #198754; color: white; text-align: center;">
                            KARDEX DE PRODUCTOS - ${prog.operator_name || 'PAE'}
                        </th>
                    </tr>
                    <tr>
                        <td colspan="2"><b>OPERADOR:</b> ${prog.operator_name || ''}</td>
                        <td colspan="2"><b>NIT:</b> ${prog.operator_nit || ''}</td>
                        <td colspan="${(days.length * 2) + 1}"><b>CICLO:</b> ${cycle.name} (${cycle.start_date} al ${cycle.end_date})</td>
                    </tr>
                    <tr>
                        <td colspan="2"><b>CENTRO EDUCATIVO:</b> ${rep.school.name}</td>
                        <td colspan="2"><b>SEDE:</b> ${rep.branch.name}</td>
                        <td colspan="${(days.length * 2) + 1}"><b>TOTAL BENEFICIARIOS:</b> ${rep.census.total}</td>
                    </tr>
                    <tr>
                        <td colspan="${4 + (days.length * 2) + 1}" style="background-color: #f8f9fa;">
                            <b>Censo por niveles:</b> Preescolar (${rep.census.preescolar}) | Primaria 1-3 (${rep.census.primaria_a}) | Primaria 4-5 (${rep.census.primaria_b}) | Secundaria 6-9 (${rep.census.secundaria}) | Media (${rep.census.media})
                        </td>
                    </tr>
                    <tr><td colspan="${4 + (days.length * 2) + 1}"></td></tr>
                    <tr style="background-color: #e2e3e5; font-weight: bold;">
                        <th rowspan="2">No.</th>
                        <th rowspan="2">ALIMENTO</th>
                        <th rowspan="2">CANTIDAD TOTAL</th>
                        <th rowspan="2">UNIDAD</th>
                        ${days.map(d => `<th colspan="2" style="text-align: center;">${d.name.toUpperCase()}</th>`).join('')}
                        <th rowspan="2">SALDO FINAL</th>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                        ${days.map(() => `<th>REQUERIDO</th><th>SALDO DÍA</th>`).join('')}
                    </tr>
            `;

            (rep.items || []).forEach(it => {
                let dailyCells = '';
                days.forEach(d => {
                    const qty = it.daily_quantities[d.day_number] || '';
                    dailyCells += `
                        <td style="text-align: right;">${qty ? this.formatNumber(qty) : ''}</td>
                        <td></td>
                    `;
                });

                excelContent += `
                    <tr>
                        <td style="text-align: center;">${it.item_no}</td>
                        <td>${it.name}</td>
                        <td style="text-align: right; font-weight: bold;">${this.formatNumber(it.total_quantity)}</td>
                        <td style="text-align: center;">${it.unit}</td>
                        ${dailyCells}
                        <td></td>
                    </tr>
                `;
            });

            excelContent += `
                    <tr><td colspan="${4 + (days.length * 2) + 1}"></td></tr>
                    <tr><td colspan="${4 + (days.length * 2) + 1}"></td></tr>
                </table>
            `;
        });

        excelContent += `</body></html>`;

        const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const link = document.createElement('a');
        const fileName = `Kardex_Productos_${cycle.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xls`;
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '0,0';
        return Number(num).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },

    formatDateDMY(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }
};

if (typeof ReportsKardexProductosView !== 'undefined') {
    ReportsKardexProductosView.init();
}

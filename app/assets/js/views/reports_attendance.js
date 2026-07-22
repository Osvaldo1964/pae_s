/**
 * Reporte: Control de Asistencia y Entrega de Raciones
 */
window.ReportsAttendanceView = {
    attendanceData: [],
    schools: [],
    branches: [],
    rationTypes: [],
    cycles: [],
    dataTable: null,

    async init() {
        Helper.loading(true, 'Cargando datos del reporte...');
        await this.loadMasterData();
        this.render();
        this.attachEvents();
        this.toggleFilters();
        await this.loadData();
        Helper.loading(false);

        // Evitar que el backdrop invisible de SweetAlert2 bloquee clics
        setTimeout(() => {
            if (typeof Swal !== 'undefined') {
                Swal.close();
            }
        }, 150);
    },

    async loadMasterData() {
        try {
            const [schools, branches, rationTypes, cycles] = await Promise.all([
                Helper.fetchAPI('/schools'),
                Helper.fetchAPI('/branches'),
                Helper.fetchAPI('/ration-types'),
                Helper.fetchAPI('/menu-cycles')
            ]);
            this.schools = Array.isArray(schools) ? schools : [];
            this.branches = Array.isArray(branches) ? branches : [];
            this.rationTypes = rationTypes.success ? rationTypes.data : [];
            this.cycles = cycles.success ? cycles.data : [];
        } catch (error) {
            console.error('Error loading master data:', error);
        }
    },

    async loadData() {
        try {
            const reportType = document.getElementById('filter-report-type')?.value || 'dia';
            const schoolId = document.getElementById('filter-school')?.value || '';
            const branchId = document.getElementById('filter-branch')?.value || '';
            
            let url = `/consumptions/report?`;
            
            if (reportType === 'dia') {
                const date = document.getElementById('filter-date')?.value || new Date().toISOString().split('T')[0];
                url += `date=${date}`;
            } else if (reportType === 'semana') {
                const cycleId = document.getElementById('filter-cycle')?.value;
                if (cycleId) {
                    const cycle = this.cycles.find(c => c.id == cycleId);
                    if (cycle) {
                        url += `start_date=${cycle.start_date}&end_date=${cycle.end_date}`;
                    }
                } else {
                    const today = new Date().toISOString().split('T')[0];
                    url += `date=${today}`; // Fallback if no cycle selected
                }
            } else if (reportType === 'rango') {
                const startDate = document.getElementById('filter-start-date')?.value || new Date().toISOString().split('T')[0];
                const endDate = document.getElementById('filter-end-date')?.value || new Date().toISOString().split('T')[0];
                url += `start_date=${startDate}&end_date=${endDate}`;
            }

            if (branchId) {
                url += `&branch_id=${branchId}`;
            }

            const res = await Helper.fetchAPI(url);
            
            if (res && res.success && Array.isArray(res.data)) {
                let data = res.data;
                if (schoolId && !branchId) {
                    const schoolBranchIds = this.branches
                        .filter(b => b.school_id == schoolId)
                        .map(b => b.id);
                    data = data.filter(item => {
                        const branch = this.branches.find(b => b.name === item.branch_name);
                        return branch && schoolBranchIds.includes(branch.id);
                    });
                }
                
                // Aggregate data for beneficiaries since we might have multiple rows per beneficiary in a range
                this.attendanceData = this.aggregateBeneficiaryData(data);
                
                // Only render UI table for single day to keep it simple, or we can just render the first consumption if it's a range.
                // We will render it grouped by beneficiary for simplicity in UI.
                this.renderTable(this.attendanceData);
            } else {
                console.error('API did not return an array for attendance report:', res);
                Helper.alert('error', 'No se pudo cargar el reporte de asistencia');
            }
        } catch (error) {
            console.error('Error loading attendance report:', error);
            Helper.alert('error', 'No se pudo cargar el reporte de asistencia');
        }
    },
    
    aggregateBeneficiaryData(rawData) {
        const grouped = {};
        rawData.forEach(row => {
            const key = row.document_number;
            if (!grouped[key]) {
                grouped[key] = {
                    document_number: row.document_number,
                    first_name: row.first_name,
                    last_name1: row.last_name1,
                    grade: row.grade,
                    group_name: row.group_name,
                    branch_name: row.branch_name,
                    school_name: row.school_name,
                    program_name: row.program_name,
                    entity_logo_path: row.entity_logo_path,
                    operator_logo_path: row.operator_logo_path,
                    consumptions: []
                };
            }
            if (row.consumption_id) {
                grouped[key].consumptions.push({
                    id: row.consumption_id,
                    date: row.consumption_date || row.time?.split(' ')[0],
                    time: row.time,
                    meal_type: row.meal_type
                });
            }
        });
        return Object.values(grouped);
    },

    render() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('app').innerHTML = `
            <div class="container-fluid fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-user-check me-2 text-primary"></i>Control de Asistencia y Planillas</h2>
                        <p class="text-muted mb-0">Reporte de asistencia y generación de planillas de firmas</p>
                    </div>
                    <div class="btn-group shadow-sm">
                        <button class="btn btn-outline-success" onclick="ReportsAttendanceView.exportExcel()">
                            <i class="fas fa-file-excel me-2"></i>Excel
                        </button>
                        <button class="btn btn-outline-danger" onclick="ReportsAttendanceView.exportPDF()">
                            <i class="fas fa-file-pdf me-2"></i>PDF / Imprimir Planilla
                        </button>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card shadow-sm mb-4 border-0">
                    <div class="card-body bg-light rounded">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Tipo de Reporte</label>
                                <select id="filter-report-type" class="form-select border-2">
                                    <option value="dia">Un solo Día</option>
                                    <option value="semana">Por Semana (Ciclo)</option>
                                    <option value="rango">Por Rango de Fechas</option>
                                </select>
                            </div>
                            
                            <div class="col-md-3 filter-group-dia">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Fecha</label>
                                <input type="date" id="filter-date" class="form-control border-2" value="${today}">
                            </div>
                            
                            <div class="col-md-3 filter-group-semana" style="display:none;">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Ciclo</label>
                                <select id="filter-cycle" class="form-select border-2">
                                    <option value="">-- Seleccione un ciclo --</option>
                                    ${this.cycles.map(c => `<option value="${c.id}">${c.name} (${c.start_date} al ${c.end_date})</option>`).join('')}
                                </select>
                            </div>
                            
                            <div class="col-md-3 filter-group-rango" style="display:none;">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Fecha Inicio</label>
                                <input type="date" id="filter-start-date" class="form-control border-2" value="${today}">
                            </div>
                            <div class="col-md-3 filter-group-rango" style="display:none;">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Fecha Fin</label>
                                <input type="date" id="filter-end-date" class="form-control border-2" value="${today}">
                            </div>

                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Institución</label>
                                <select id="filter-school" class="form-select border-2">
                                    <option value="">-- Todas las Instituciones --</option>
                                    ${this.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Sede</label>
                                <select id="filter-branch" class="form-select border-2" disabled>
                                    <option value="">-- Seleccione una institución --</option>
                                </select>
                            </div>
                            
                            <div class="col-md-3 mt-3">
                                <div class="form-check form-switch mt-2 filter-group-rango" style="display:none;">
                                    <input class="form-check-input" type="checkbox" id="filter-weekends">
                                    <label class="form-check-label small fw-bold" for="filter-weekends">Incluir fines de semana</label>
                                </div>
                                <div class="form-check form-switch mt-2 filter-group-pdf">
                                    <input class="form-check-input" type="checkbox" id="filter-verification">
                                    <label class="form-check-label small fw-bold text-primary" for="filter-verification" title="Imprimir con marcas de las entregas reales en vez de celdas en blanco">Planilla con verificación (Marcas de entrega)</label>
                                </div>
                            </div>

                            <div class="col-md-2 mt-3">
                                <button class="btn btn-outline-secondary w-100" onclick="ReportsAttendanceView.resetFilters()">
                                    <i class="fas fa-eraser me-2"></i>Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="card-header bg-white pt-3 pb-0 border-0">
                        <p class="text-muted small mb-0"><i class="fas fa-info-circle me-1"></i> La tabla inferior muestra el resumen por beneficiario. Para visualizar la planilla completa con días o comidas, utilice el botón "PDF / Imprimir Planilla".</p>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="reports-attendance-table" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th>Identificación</th>
                                        <th>Nombre Completo</th>
                                        <th>Institución / Sede</th>
                                        <th>Grado / Grupo</th>
                                        <th>Entregas (Rango)</th>
                                        <th>Estado General</th>
                                    </tr>
                                </thead>
                                <tbody id="reports-attendance-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents() {
        const filterReportType = document.getElementById('filter-report-type');
        const filterDate = document.getElementById('filter-date');
        const filterCycle = document.getElementById('filter-cycle');
        const filterStartDate = document.getElementById('filter-start-date');
        const filterEndDate = document.getElementById('filter-end-date');
        
        const filterSchool = document.getElementById('filter-school');
        const filterBranch = document.getElementById('filter-branch');

        if (filterReportType) {
            filterReportType.addEventListener('change', () => {
                this.toggleFilters();
                this.loadData();
            });
        }
        
        [filterDate, filterCycle, filterStartDate, filterEndDate].forEach(el => {
            if (el) el.addEventListener('change', () => this.loadData());
        });

        if (filterSchool) {
            filterSchool.addEventListener('change', () => {
                this.onSchoolFilterChange();
                this.loadData();
            });
        }

        if (filterBranch) {
            filterBranch.addEventListener('change', () => this.loadData());
        }
    },
    
    toggleFilters() {
        const type = document.getElementById('filter-report-type')?.value || 'dia';
        document.querySelectorAll('.filter-group-dia').forEach(el => el.style.display = (type === 'dia') ? 'block' : 'none');
        document.querySelectorAll('.filter-group-semana').forEach(el => el.style.display = (type === 'semana') ? 'block' : 'none');
        document.querySelectorAll('.filter-group-rango').forEach(el => el.style.display = (type === 'rango') ? 'block' : 'none');
    },

    onSchoolFilterChange() {
        const schoolId = document.getElementById('filter-school').value;
        const filterBranch = document.getElementById('filter-branch');
        if (!filterBranch) return;

        if (!schoolId) {
            filterBranch.innerHTML = '<option value="">-- Seleccione una institución --</option>';
            filterBranch.disabled = true;
            return;
        }

        const filtered = this.branches.filter(b => b.school_id == schoolId);
        let html = '<option value="">-- Todas las Sedes --</option>';
        filtered.forEach(b => {
            html += `<option value="${b.id}">${b.name}</option>`;
        });
        filterBranch.innerHTML = html;
        filterBranch.disabled = false;
    },

    resetFilters() {
        const type = document.getElementById('filter-report-type');
        const date = document.getElementById('filter-date');
        const cycle = document.getElementById('filter-cycle');
        const sDate = document.getElementById('filter-start-date');
        const eDate = document.getElementById('filter-end-date');
        const school = document.getElementById('filter-school');
        const branch = document.getElementById('filter-branch');
        const verif = document.getElementById('filter-verification');
        const wends = document.getElementById('filter-weekends');

        const today = new Date().toISOString().split('T')[0];
        
        if (type) type.value = 'dia';
        if (date) date.value = today;
        if (cycle) cycle.value = '';
        if (sDate) sDate.value = today;
        if (eDate) eDate.value = today;
        if (school) school.value = '';
        if (branch) {
            branch.innerHTML = '<option value="">-- Seleccione una institución --</option>';
            branch.disabled = true;
        }
        if (verif) verif.checked = false;
        if (wends) wends.checked = false;

        this.toggleFilters();
        this.loadData();
    },

    renderTable(data) {
        const tbody = document.getElementById('reports-attendance-body');
        if (!tbody) return;

        if (this.dataTable) {
            this.dataTable.destroy();
            this.dataTable = null;
        }

        tbody.innerHTML = data.map(row => {
            const fullName = `${row.last_name1} ${row.first_name}`.replace(/\s+/g, ' ').trim();
            const gradeGroup = `${row.grade || ''}° ${row.group_name || ''}`;
            const totalConsumptions = row.consumptions.length;
            const badgeClass = totalConsumptions > 0 ? 'bg-success' : 'bg-secondary';
            const badgeText = totalConsumptions > 0 ? 'Con Entregas' : 'Sin Entregas';

            return `
                <tr>
                    <td class="fw-bold text-dark">${row.document_number || ''}</td>
                    <td>${fullName}</td>
                    <td class="small">
                        <span class="d-block text-truncate" style="max-width: 200px;" title="${row.school_name || ''}">${row.school_name || ''}</span>
                        <small class="text-muted d-block text-truncate" style="max-width: 200px;" title="${row.branch_name || ''}">${row.branch_name || ''}</small>
                    </td>
                    <td><span class="badge bg-light text-dark border">${gradeGroup}</span></td>
                    <td class="fw-bold text-center">${totalConsumptions}</td>
                    <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                </tr>
            `;
        }).join('');

        this.dataTable = Helper.initDataTable('#reports-attendance-table');

        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 50);
    },

    exportExcel() {
        // ... (Keep existing simple export or adapt later if requested)
        Helper.alert('info', 'Exportar a Excel actualmente usa el formato base. Para las planillas use el botón PDF.');
    },
    
    getDatesInRange(startDate, endDate, includeWeekends) {
        const dates = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);
        // Ajuste de zona horaria básico
        currentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset());
        end.setMinutes(end.getTimezoneOffset());

        while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday
            if (includeWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
                dates.push(currentDate.toISOString().split('T')[0]);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    },

    exportPDF() {
        const type = document.getElementById('filter-report-type')?.value || 'dia';
        const withVerification = document.getElementById('filter-verification')?.checked;
        const includeWeekends = document.getElementById('filter-weekends')?.checked;
        
        const schoolId = document.getElementById('filter-school')?.value || '';
        const branchId = document.getElementById('filter-branch')?.value || '';

        let schoolNameText = "TODAS LAS INSTITUCIONES";
        if (schoolId) {
            const schoolObj = this.schools.find(s => s.id == schoolId);
            if (schoolObj) schoolNameText = schoolObj.name;
        }

        let branchNameText = "TODAS LAS SEDES";
        if (branchId) {
            const branchObj = this.branches.find(br => br.id == branchId);
            if (branchObj) branchNameText = branchObj.name;
        }
        
        let reportTitle = "";
        let columnsHtml = "";
        let daysToMap = []; // For date ranges
        let mealsToMap = []; // For week (cycle)

        if (type === 'semana') {
            const cycleId = document.getElementById('filter-cycle')?.value;
            const cycle = this.cycles.find(c => c.id == cycleId);
            reportTitle = cycle ? `Ciclo: ${cycle.name} (del ${cycle.start_date} al ${cycle.end_date})` : "Ciclo: [No seleccionado]";
            
            mealsToMap = ['DESAYUNO', 'MEDIA MAÑANA', 'ALMUERZO', 'MEDIA TARDE', 'CENA'];
            
            columnsHtml = `
                <th style="width: 5%">SECUENCIA</th>
                <th style="width: 10%">DOCUMENTO</th>
                <th style="width: 25%">NOMBRES Y APELLIDOS</th>
            `;
            mealsToMap.forEach(m => {
                columnsHtml += `<th style="width: 9%; text-align: center;">${m}</th>`;
            });
            columnsHtml += `<th style="width: 15%; text-align: center;">FIRMA/HUELLA</th>`;
            
        } else if (type === 'rango') {
            const sDate = document.getElementById('filter-start-date')?.value;
            const eDate = document.getElementById('filter-end-date')?.value;
            reportTitle = `Fechas: del ${sDate} al ${eDate}`;
            
            daysToMap = this.getDatesInRange(sDate, eDate, includeWeekends);
            
            columnsHtml = `
                <th style="width: 5%">SECUENCIA</th>
                <th style="width: 10%">DOCUMENTO</th>
                <th style="width: 25%">NOMBRES Y APELLIDOS</th>
            `;
            let colWidth = daysToMap.length > 0 ? (45 / daysToMap.length) : 10;
            daysToMap.forEach((d, index) => {
                columnsHtml += `<th style="width: ${colWidth}%; text-align: center;">DÍA ${index + 1}</th>`;
            });
            columnsHtml += `<th style="width: 15%; text-align: center;">FIRMA/HUELLA</th>`;
            
        } else {
            // Default "dia" (legacy format from original)
            const date = document.getElementById('filter-date')?.value;
            reportTitle = `Fecha: ${date}`;
            columnsHtml = `
                <th style="width: 15%">Identificación</th>
                <th style="width: 30%">Nombre Completo</th>
                <th style="width: 25%">Sede</th>
                <th style="width: 10%">Grado / Grupo</th>
                <th style="width: 10%">Ración</th>
                <th style="width: 10%">Estado</th>
            `;
        }

        const printWindow = window.open('', '_blank');
        
        let tbodyHtml = "";
        
        if (type === 'semana' || type === 'rango') {
            tbodyHtml = this.attendanceData.map((row, index) => {
                const fullName = `${row.last_name1} ${row.first_name}`.replace(/\s+/g, ' ').trim();
                let cellsHtml = `
                    <td style="text-align: center;">${index + 1}</td>
                    <td>${row.document_number || ''}</td>
                    <td>${fullName}</td>
                `;
                
                if (type === 'semana') {
                    mealsToMap.forEach(meal => {
                        let cellContent = "";
                        if (withVerification) {
                            const found = row.consumptions.find(c => c.meal_type && c.meal_type.toUpperCase() === meal);
                            if (found) cellContent = "X";
                        }
                        cellsHtml += `<td style="text-align: center; font-weight: bold;">${cellContent}</td>`;
                    });
                } else if (type === 'rango') {
                    daysToMap.forEach(dayDate => {
                        let cellContent = "";
                        if (withVerification) {
                            const found = row.consumptions.find(c => c.date === dayDate);
                            if (found) cellContent = "X";
                        }
                        cellsHtml += `<td style="text-align: center; font-weight: bold;">${cellContent}</td>`;
                    });
                }
                
                cellsHtml += `<td></td>`; // Firma/Huella
                return `<tr>${cellsHtml}</tr>`;
            }).join('');
        } else {
            // Legacy dia fallback (if they just want to print a single day list)
            tbodyHtml = this.attendanceData.map(row => {
                const fullName = `${row.last_name1} ${row.first_name}`.replace(/\s+/g, ' ').trim();
                // En modo legacy la agregación puede desvirtuar si hay muchas comidas, tomamos la primera si existe
                const badgeText = row.consumptions.length > 0 ? 'Entregado' : 'No Entregado';
                const mealText = row.consumptions.length > 0 ? row.consumptions[0].meal_type : '-';
                return `
                    <tr>
                        <td>${row.document_number || ''}</td>
                        <td>${fullName}</td>
                        <td>${row.branch_name || ''}</td>
                        <td>${row.grade || ''}° ${row.group_name || ''}</td>
                        <td>${mealText}</td>
                        <td>${badgeText}</td>
                    </tr>
                `;
            }).join('');
        }

        // Recuperar logos (tomando del primer registro si existe)
        let leftLogo = "";
        let rightLogo = "";
        const absoluteBaseUrl = window.location.origin + Config.BASE_URL;
        
        if (this.attendanceData.length > 0) {
            const ref = this.attendanceData[0];
            if (ref.entity_logo_path) {
                const entityPath = ref.entity_logo_path.startsWith('/') ? ref.entity_logo_path.substring(1) : ref.entity_logo_path;
                leftLogo = `<img src="${absoluteBaseUrl}${entityPath}" style="max-height: 40px;" onerror="this.style.display='none'" />`;
            }
            if (ref.operator_logo_path) {
                const operatorPath = ref.operator_logo_path.startsWith('/') ? ref.operator_logo_path.substring(1) : ref.operator_logo_path;
                rightLogo = `<img src="${absoluteBaseUrl}${operatorPath}" style="max-height: 40px;" onerror="this.style.display='none'" />`;
            }
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Planilla de Control</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @page { size: landscape; margin: 0; }
                        body { font-family: Arial, sans-serif; font-size: 6.5pt; color: #333; padding: 1.5cm; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background-color: #1B4F72 !important; color: white !important; font-weight: bold; text-align: center; font-size: 7pt; padding: 4px; border: 1px solid #dee2e6; }
                        td { padding: 4px; border: 1px solid #dee2e6; font-size: 6.5pt; height: 20px; }
                        tr:nth-child(even) { background-color: #f8f9fa; }
                        
                        /* Fix header layout */
                        .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                        .header-text { text-align: center; flex-grow: 1; text-transform: uppercase; }
                        .header-text h3 { margin: 0; font-size: 9pt; font-weight: bold; color: #1B4F72; }
                        .header-text p { margin: 0; font-size: 7.5pt; }
                    </style>
                </head>
                <body>
                    <div class="header-container">
                        <div style="width: 15%; text-align: left;">${leftLogo}</div>
                        <div class="header-text">
                            <h3>PLANILLA DE CONTROL DE ENTREGA DE RACIONES</h3>
                            <p>${reportTitle} | Institución: ${schoolNameText} | Sede: ${branchNameText}</p>
                        </div>
                        <div style="width: 15%; text-align: right;">${rightLogo}</div>
                    </div>
                    
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                ${columnsHtml}
                            </tr>
                        </thead>
                        <tbody>
                            ${tbodyHtml}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 800);
    }
};

if (typeof ReportsAttendanceView !== 'undefined') {
    ReportsAttendanceView.init();
}

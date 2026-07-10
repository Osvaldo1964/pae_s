/**
 * Reporte: Control de Asistencia y Entrega de Raciones
 */
window.ReportsAttendanceView = {
    attendanceData: [],
    schools: [],
    branches: [],
    rationTypes: [],
    dataTable: null,

    async init() {
        Helper.loading(true, 'Cargando datos del reporte...');
        await this.loadMasterData();
        this.render();
        this.attachEvents();
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
            const [schools, branches, rationTypes] = await Promise.all([
                Helper.fetchAPI('/schools'),
                Helper.fetchAPI('/branches'),
                Helper.fetchAPI('/ration-types')
            ]);
            this.schools = Array.isArray(schools) ? schools : [];
            this.branches = Array.isArray(branches) ? branches : [];
            this.rationTypes = rationTypes.success ? rationTypes.data : [];
        } catch (error) {
            console.error('Error loading master data:', error);
        }
    },

    async loadData() {
        try {
            const date = document.getElementById('filter-date')?.value || new Date().toISOString().split('T')[0];
            const schoolId = document.getElementById('filter-school')?.value || '';
            const branchId = document.getElementById('filter-branch')?.value || '';
            const mealType = document.getElementById('filter-meal-type')?.value || '';

            let url = `/consumptions/report?date=${date}`;
            if (branchId) {
                url += `&branch_id=${branchId}`;
            }
            if (mealType) {
                url += `&meal_type=${mealType}`;
            }

            const res = await Helper.fetchAPI(url);
            
            if (res && res.success && Array.isArray(res.data)) {
                // Si filtramos por colegio pero no por sede, hacemos el filtrado en el cliente 
                // ya que la API solo filtra por branch_id directamente.
                let data = res.data;
                if (schoolId && !branchId) {
                    // Obtener los ids de las sedes de este colegio
                    const schoolBranchIds = this.branches
                        .filter(b => b.school_id == schoolId)
                        .map(b => b.id);
                    data = data.filter(item => {
                        // Buscar el id de la sede para el beneficiario
                        const branch = this.branches.find(b => b.name === item.branch_name);
                        return branch && schoolBranchIds.includes(branch.id);
                    });
                }
                this.attendanceData = data;
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

    render() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('app').innerHTML = `
            <div class="container-fluid fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-user-check me-2 text-primary"></i>Control de Asistencia</h2>
                        <p class="text-muted mb-0">Reporte de asistencia y entrega de raciones diarias</p>
                    </div>
                    <div class="btn-group shadow-sm">
                        <button class="btn btn-outline-success" onclick="ReportsAttendanceView.exportExcel()">
                            <i class="fas fa-file-excel me-2"></i>Excel
                        </button>
                        <button class="btn btn-outline-danger" onclick="ReportsAttendanceView.exportPDF()">
                            <i class="fas fa-file-pdf me-2"></i>PDF / Imprimir
                        </button>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card shadow-sm mb-4 border-0">
                    <div class="card-body bg-light rounded">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-2">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Fecha</label>
                                <input type="date" id="filter-date" class="form-control border-2" value="${today}">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Institución / Centro Educativo</label>
                                <select id="filter-school" class="form-select border-2">
                                    <option value="">-- Todas las Instituciones --</option>
                                    ${this.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Sede / Punto de Atención</label>
                                <select id="filter-branch" class="form-select border-2" disabled>
                                    <option value="">-- Seleccione una institución primero --</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Tipo de Ración</label>
                                <select id="filter-meal-type" class="form-select border-2">
                                    <option value="">-- Todos los tipos --</option>
                                    ${this.rationTypes.map(rt => `<option value="${rt.id}">${rt.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-2">
                                <button class="btn btn-outline-secondary w-100" onclick="ReportsAttendanceView.resetFilters()">
                                    <i class="fas fa-eraser me-2"></i>Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="reports-attendance-table" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th>Identificación</th>
                                        <th>Nombre Completo</th>
                                        <th>Institución / Sede</th>
                                        <th>Grado / Grupo</th>
                                        <th>Tipo de Ración</th>
                                        <th>Hora de Entrega</th>
                                        <th>Estado</th>
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
        const filterDate = document.getElementById('filter-date');
        const filterSchool = document.getElementById('filter-school');
        const filterBranch = document.getElementById('filter-branch');
        const filterMealType = document.getElementById('filter-meal-type');

        if (filterDate) {
            filterDate.addEventListener('change', () => this.loadData());
        }

        if (filterSchool) {
            filterSchool.addEventListener('change', () => {
                this.onSchoolFilterChange();
                this.loadData();
            });
        }

        if (filterBranch) {
            filterBranch.addEventListener('change', () => this.loadData());
        }

        if (filterMealType) {
            filterMealType.addEventListener('change', () => this.loadData());
        }
    },

    onSchoolFilterChange() {
        const schoolId = document.getElementById('filter-school').value;
        const filterBranch = document.getElementById('filter-branch');
        if (!filterBranch) return;

        if (!schoolId) {
            filterBranch.innerHTML = '<option value="">-- Seleccione una institución primero --</option>';
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
        const filterDate = document.getElementById('filter-date');
        const filterSchool = document.getElementById('filter-school');
        const filterBranch = document.getElementById('filter-branch');
        const filterMealType = document.getElementById('filter-meal-type');

        if (filterDate) filterDate.value = new Date().toISOString().split('T')[0];
        if (filterSchool) filterSchool.value = '';
        if (filterBranch) {
            filterBranch.innerHTML = '<option value="">-- Seleccione una institución primero --</option>';
            filterBranch.disabled = true;
        }
        if (filterMealType) filterMealType.value = '';

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
            const isDelivered = !!row.consumption_id;
            const timeText = isDelivered ? new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
            
            const badgeClass = isDelivered ? 'bg-success' : 'bg-secondary';
            const badgeText = isDelivered ? 'Entregado' : 'No Entregado';

            return `
                <tr>
                    <td class="fw-bold text-dark">${row.document_number || ''}</td>
                    <td>${fullName}</td>
                    <td class="small">
                        <span class="d-block text-truncate" style="max-width: 200px;" title="${row.school_name || ''}">${row.school_name || ''}</span>
                        <small class="text-muted d-block text-truncate" style="max-width: 200px;" title="${row.branch_name || ''}">${row.branch_name || ''}</small>
                    </td>
                    <td><span class="badge bg-light text-dark border">${gradeGroup}</span></td>
                    <td>${row.meal_type || '-'}</td>
                    <td class="fw-bold">${timeText}</td>
                    <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                </tr>
            `;
        }).join('');

        this.dataTable = Helper.initDataTable('#reports-attendance-table');

        // Forzar recalculo de anchos de columnas de DataTables al cargar
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 50);
    },

    exportExcel() {
        const date = document.getElementById('filter-date')?.value || new Date().toISOString().split('T')[0];
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

        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"></head>
            <body>
                <table border="1">
                    <tr><th colspan="7" style="font-size:16pt; background:#1B4F72; color:white; font-weight:bold; text-align:center;">REPORTE DE CONTROL DE ASISTENCIA</th></tr>
                    <tr><th colspan="7" style="font-size:10pt; background:#f2f2f2; text-align:left;"><b>FECHA:</b> ${date} | <b>INSTITUCIÓN:</b> ${schoolNameText} | <b>SEDE:</b> ${branchNameText}</th></tr>
                    <tr style="background:#f2f2f2; font-weight:bold;">
                        <th>IDENTIFICACIÓN</th>
                        <th>NOMBRE COMPLETO</th>
                        <th>INSTITUCIÓN</th>
                        <th>SEDE</th>
                        <th>GRADO / GRUPO</th>
                        <th>TIPO DE RACIÓN</th>
                        <th>ESTADO</th>
                    </tr>
        `;

        this.attendanceData.forEach(row => {
            const fullName = `${row.last_name1} ${row.first_name}`.replace(/\s+/g, ' ').trim();
            const gradeGroup = `${row.grade || ''}° ${row.group_name || ''}`;
            const badgeText = row.consumption_id ? 'Entregado' : 'No Entregado';
            
            html += `
                <tr>
                    <td>${row.document_number || ''}</td>
                    <td>${fullName}</td>
                    <td>${row.school_name || ''}</td>
                    <td>${row.branch_name || ''}</td>
                    <td>${gradeGroup}</td>
                    <td>${row.meal_type || '-'}</td>
                    <td>${badgeText}</td>
                </tr>
            `;
        });

        html += `</table></body></html>`;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Asistencia_${date}.xls`;
        a.click();
    },

    exportPDF() {
        const date = document.getElementById('filter-date')?.value || new Date().toISOString().split('T')[0];
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

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title></title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @page { size: landscape; margin: 0; }
                        body { font-family: Arial, sans-serif; font-size: 6.5pt; color: #333; padding: 1.5cm; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background-color: #1B4F72 !important; color: white !important; font-weight: bold; text-align: left; font-size: 7.5pt; padding: 3px 5px; border: 1px solid #dee2e6; }
                        td { padding: 3px 5px; border: 1px solid #dee2e6; font-size: 6.5pt; }
                        tr:nth-child(even) { background-color: #f8f9fa; }
                    </style>
                </head>
                <body>
                    <table class="table">
                        <thead>
                            <tr style="border: 0 !important; background: transparent !important;">
                                <th colspan="6" style="border: 0 !important; background: transparent !important; color: inherit !important; padding: 0 0 15px 0; text-align: left;">
                                    <div style="border-bottom: 3px solid #1B4F72; margin-bottom: 10px; padding-bottom: 10px;">
                                        <h2 style="color: #1B4F72; font-weight: bold; margin-bottom: 5px; font-size: 13pt;">Reporte de Control de Asistencia</h2>
                                        <p class="mb-0" style="font-size: 8pt; color: #555; font-weight: normal;">
                                            <strong>Fecha:</strong> ${date} | <strong>Institución:</strong> ${schoolNameText} | <strong>Sede:</strong> ${branchNameText}
                                        </p>
                                    </div>
                                </th>
                            </tr>
                            <tr>
                                <th style="width: 15%">Identificación</th>
                                <th style="width: 30%">Nombre Completo</th>
                                <th style="width: 25%">Sede</th>
                                <th style="width: 10%">Grado / Grupo</th>
                                <th style="width: 10%">Ración</th>
                                <th style="width: 10%">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.attendanceData.map(row => {
                                const fullName = `${row.last_name1} ${row.first_name}`.replace(/\s+/g, ' ').trim();
                                const badgeText = row.consumption_id ? 'Entregado' : 'No Entregado';
                                return `
                                    <tr>
                                        <td>${row.document_number || ''}</td>
                                        <td>${fullName}</td>
                                        <td>${row.branch_name || ''}</td>
                                        <td>${row.grade || ''}° ${row.group_name || ''}</td>
                                        <td>${row.meal_type || '-'}</td>
                                        <td>${badgeText}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
};

if (typeof ReportsAttendanceView !== 'undefined') {
    ReportsAttendanceView.init();
}

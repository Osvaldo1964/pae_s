/**
 * Reporte: Listado de Beneficiarios
 */
window.ReportsBeneficiariosView = {
    beneficiaries: [],
    schools: [],
    branches: [],
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
            const schools = await Helper.fetchAPI('/schools');
            const branches = await Helper.fetchAPI('/branches');
            this.schools = Array.isArray(schools) ? schools : [];
            this.branches = Array.isArray(branches) ? branches : [];
        } catch (error) {
            console.error('Error loading master data:', error);
        }
    },

    async loadData() {
        try {
            const res = await Helper.fetchAPI('/beneficiarios');
            if (Array.isArray(res)) {
                this.beneficiaries = res;
                this.filterData();
            } else {
                console.error('API did not return an array for beneficiaries:', res);
                Helper.alert('error', 'No se pudieron cargar los beneficiarios');
            }
        } catch (error) {
            console.error('Error loading beneficiaries:', error);
            Helper.alert('error', 'No se pudieron cargar los beneficiarios');
        }
    },

    render() {
        document.getElementById('app').innerHTML = `
            <div class="container-fluid fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-users me-2 text-primary"></i>Reporte de Beneficiarios</h2>
                        <p class="text-muted mb-0">Listado consolidado de beneficiarios con datos básicos</p>
                    </div>
                    <div class="btn-group shadow-sm">
                        <button class="btn btn-outline-success" onclick="ReportsBeneficiariosView.exportExcel()">
                            <i class="fas fa-file-excel me-2"></i>Excel
                        </button>
                        <button class="btn btn-outline-danger" onclick="ReportsBeneficiariosView.exportPDF()">
                            <i class="fas fa-file-pdf me-2"></i>PDF / Imprimir
                        </button>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card shadow-sm mb-4 border-0">
                    <div class="card-body bg-light rounded">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-5">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Institución / Centro Educativo</label>
                                <select id="filter-school" class="form-select border-2">
                                    <option value="">-- Todas las Instituciones --</option>
                                    ${this.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-5">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Sede / Punto de Atención</label>
                                <select id="filter-branch" class="form-select border-2" disabled>
                                    <option value="">-- Seleccione una institución primero --</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <button class="btn btn-outline-secondary w-100" onclick="ReportsBeneficiariosView.resetFilters()">
                                    <i class="fas fa-eraser me-2"></i>Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="reports-beneficiaries-table" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th>Identificación</th>
                                        <th>Nombre Completo</th>
                                        <th>Fecha Nac.</th>
                                        <th>Etnia</th>
                                        <th>Institución</th>
                                        <th>Sede</th>
                                        <th>Grado/Grupo</th>
                                    </tr>
                                </thead>
                                <tbody id="reports-beneficiaries-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents() {
        const filterSchool = document.getElementById('filter-school');
        const filterBranch = document.getElementById('filter-branch');

        if (filterSchool) {
            filterSchool.addEventListener('change', () => {
                this.onSchoolFilterChange();
                this.filterData();
            });
        }

        if (filterBranch) {
            filterBranch.addEventListener('change', () => {
                this.filterData();
            });
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
        const filterSchool = document.getElementById('filter-school');
        const filterBranch = document.getElementById('filter-branch');

        if (filterSchool) filterSchool.value = '';
        if (filterBranch) {
            filterBranch.innerHTML = '<option value="">-- Seleccione una institución primero --</option>';
            filterBranch.disabled = true;
        }

        this.filterData();
    },

    filterData() {
        const schoolId = document.getElementById('filter-school') ? document.getElementById('filter-school').value : '';
        const branchId = document.getElementById('filter-branch') ? document.getElementById('filter-branch').value : '';

        let filtered = this.beneficiaries;

        if (schoolId) {
            filtered = filtered.filter(b => b.school_id == schoolId);
        }
        if (branchId) {
            filtered = filtered.filter(b => b.branch_id == branchId);
        }

        this.renderTable(filtered);
    },

    renderTable(data) {
        const tbody = document.getElementById('reports-beneficiaries-body');
        if (!tbody) return;

        if (this.dataTable) {
            this.dataTable.destroy();
            this.dataTable = null;
        }

        tbody.innerHTML = data.map(b => {
            const fullName = `${b.last_name1} ${b.last_name2 || ''} ${b.first_name} ${b.second_name || ''}`.replace(/\s+/g, ' ').trim();
            const docType = b.document_type_name || 'DOC';
            const gradeGroup = `${b.grade || ''}° ${b.group_name || ''}`;
            return `
                <tr>
                    <td class="fw-bold text-dark">
                        <small class="text-muted d-block">${docType}</small>
                        <span>${b.document_number || ''}</span>
                    </td>
                    <td>${fullName}</td>
                    <td>${b.birth_date || '-'}</td>
                    <td>${b.ethnic_group_name || 'Ninguno'}</td>
                    <td class="small">${b.school_name || ''}</td>
                    <td class="small text-muted">${b.branch_name || ''}</td>
                    <td><span class="badge bg-light text-dark border">${gradeGroup}</span></td>
                </tr>
            `;
        }).join('');

        this.dataTable = Helper.initDataTable('#reports-beneficiaries-table');

        // Forzar recalculo de anchos de columnas de DataTables al cargar
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 50);
    },

    exportExcel() {
        const schoolId = document.getElementById('filter-school') ? document.getElementById('filter-school').value : '';
        const branchId = document.getElementById('filter-branch') ? document.getElementById('filter-branch').value : '';

        let filtered = this.beneficiaries;
        if (schoolId) filtered = filtered.filter(b => b.school_id == schoolId);
        if (branchId) filtered = filtered.filter(b => b.branch_id == branchId);

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
                    <tr><th colspan="8" style="font-size:16pt; background:#1B4F72; color:white; font-weight:bold; text-align:center;">LISTADO DE BENEFICIARIOS</th></tr>
                    <tr><th colspan="8" style="font-size:10pt; background:#f2f2f2; text-align:left;"><b>INSTITUCIÓN:</b> ${schoolNameText} | <b>SEDE:</b> ${branchNameText}</th></tr>
                    <tr style="background:#f2f2f2; font-weight:bold;">
                        <th>TIPO DOC.</th>
                        <th>IDENTIFICACIÓN</th>
                        <th>NOMBRE COMPLETO</th>
                        <th>FECHA NACIMIENTO</th>
                        <th>GRUPO ÉTNICO</th>
                        <th>INSTITUCIÓN</th>
                        <th>SEDE</th>
                        <th>GRADO / GRUPO</th>
                    </tr>
        `;

        filtered.forEach(b => {
            const fullName = `${b.last_name1} ${b.last_name2 || ''} ${b.first_name} ${b.second_name || ''}`.replace(/\s+/g, ' ').trim();
            const gradeGroup = `${b.grade || ''}° ${b.group_name || ''}`;
            html += `
                <tr>
                    <td>${b.document_type_name || ''}</td>
                    <td>${b.document_number || ''}</td>
                    <td>${fullName}</td>
                    <td>${b.birth_date || ''}</td>
                    <td>${b.ethnic_group_name || 'Ninguno'}</td>
                    <td>${b.school_name || ''}</td>
                    <td>${b.branch_name || ''}</td>
                    <td>${gradeGroup}</td>
                </tr>
            `;
        });

        html += `</table></body></html>`;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Beneficiarios_${new Date().toISOString().split('T')[0]}.xls`;
        a.click();
    },

    exportPDF() {
        const schoolId = document.getElementById('filter-school') ? document.getElementById('filter-school').value : '';
        const branchId = document.getElementById('filter-branch') ? document.getElementById('filter-branch').value : '';

        let filtered = this.beneficiaries;
        if (schoolId) filtered = filtered.filter(b => b.school_id == schoolId);
        if (branchId) filtered = filtered.filter(b => b.branch_id == branchId);

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
                                <th colspan="4" style="border: 0 !important; background: transparent !important; color: inherit !important; padding: 0 0 15px 0; text-align: left;">
                                    <div style="border-bottom: 3px solid #1B4F72; margin-bottom: 10px; padding-bottom: 10px;">
                                        <h2 style="color: #1B4F72; font-weight: bold; margin-bottom: 5px; font-size: 13pt;">Listado de Beneficiarios</h2>
                                        <p class="mb-0" style="font-size: 8pt; color: #555; font-weight: normal;"><strong>Filtros aplicados:</strong> Institución: ${schoolNameText} | Sede: ${branchNameText}</p>
                                    </div>
                                </th>
                            </tr>
                            <tr>
                                <th style="width: 15%">Identificación</th>
                                <th style="width: 45%">Nombre Completo</th>
                                <th style="width: 15%">F. Nacimiento</th>
                                <th style="width: 25%">Grupo Étnico</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.map(b => {
            const fullName = `${b.last_name1} ${b.last_name2 || ''} ${b.first_name} ${b.second_name || ''}`.replace(/\s+/g, ' ').trim();
            return `
                                    <tr>
                                        <td>${b.document_number || ''}</td>
                                        <td>${fullName}</td>
                                        <td>${b.birth_date || '-'}</td>
                                        <td>${b.ethnic_group_name || 'Ninguno'}</td>
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

if (typeof ReportsBeneficiariosView !== 'undefined') {
    ReportsBeneficiariosView.init();
}

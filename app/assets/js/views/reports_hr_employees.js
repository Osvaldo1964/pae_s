/**
 * Reporte: Listado de Personal
 */
window.ReportsHREmployeesView = {
    employees: [],
    positions: [],
    dataTable: null,

    async init() {
        Helper.loading(true);
        await this.loadMasterData();
        this.render();
        this.attachEvents();
        await this.loadData();
        Helper.loading(false);
    },

    async loadMasterData() {
        try {
            const res = await App.api('/hr-positions');
            if (res.success) {
                this.positions = res.data;
            }
        } catch (error) {
            console.error('Error loading positions:', error);
        }
    },

    async loadData() {
        try {
            const res = await App.api('/hr-employees');
            if (res.success) {
                this.employees = res.data;
                this.filterData();
            }
        } catch (error) {
            console.error('Error loading employees:', error);
            Helper.alert('error', 'No se pudieron cargar los empleados');
        }
    },

    render() {
        document.getElementById('app').innerHTML = `
            <div class="container-fluid fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-id-card-alt me-2 text-info"></i>Reporte de Personal</h2>
                        <p class="text-muted mb-0">Directorio de empleados y fichas de contacto</p>
                    </div>
                    <div class="btn-group shadow-sm">
                        <button class="btn btn-outline-success" onclick="ReportsHREmployeesView.exportExcel()">
                            <i class="fas fa-file-excel me-2"></i>Excel
                        </button>
                        <button class="btn btn-outline-danger" onclick="ReportsHREmployeesView.exportPDF()">
                            <i class="fas fa-file-pdf me-2"></i>PDF / Imprimir
                        </button>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card shadow-sm mb-4 border-0">
                    <div class="card-body bg-light rounded">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-4">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Filtrar por Cargo</label>
                                <select id="filter-position" class="form-select border-2">
                                    <option value="">-- Todos los Cargos --</option>
                                    ${this.positions.map(p => `<option value="${p.id}">${p.description}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold text-uppercase text-secondary">Estado</label>
                                <select id="filter-status" class="form-select border-2">
                                    <option value="">-- Todos los Estados --</option>
                                    <option value="ACTIVO">ACTIVO</option>
                                    <option value="INACTIVO">INACTIVO</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="reports-hr-employees-table" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th>Identificación</th>
                                        <th>Nombre Completo</th>
                                        <th>Cargo</th>
                                        <th>Contacto</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody id="reports-hr-employees-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents() {
        document.getElementById('filter-position').addEventListener('change', () => this.filterData());
        document.getElementById('filter-status').addEventListener('change', () => this.filterData());
    },

    filterData() {
        const positionId = document.getElementById('filter-position').value;
        const status = document.getElementById('filter-status').value;

        let filtered = this.employees;

        if (positionId) {
            filtered = filtered.filter(e => e.position_id == positionId);
        }
        if (status) {
            filtered = filtered.filter(e => e.status == status);
        }

        this.renderTable(filtered);
    },

    renderTable(data) {
        const tbody = document.getElementById('reports-hr-employees-body');
        if (this.dataTable) this.dataTable.destroy();

        tbody.innerHTML = data.map(emp => {
            const fullName = `${emp.first_name} ${emp.last_name1} ${emp.last_name2 || ''}`;
            const contact = `
                <div class="small"><i class="fas fa-phone text-muted me-1"></i>${emp.phone || '-'}</div>
                <div class="small"><i class="fas fa-envelope text-muted me-1"></i>${emp.email || '-'}</div>
            `;
            const statusBadge = `
                <span class="badge ${emp.status === 'ACTIVO' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}">
                    ${emp.status}
                </span>
            `;

            return `
                <tr>
                    <td class="fw-bold text-dark">${emp.document_number}</td>
                    <td>${fullName}</td>
                    <td class="text-uppercase small">${emp.position_name || 'Sin Cargo'}</td>
                    <td>${contact}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');

        this.dataTable = Helper.initDataTable('#reports-hr-employees-table');
    },

    exportExcel() {
        const positionId = document.getElementById('filter-position').value;
        const status = document.getElementById('filter-status').value;

        let filtered = this.employees;
        if (positionId) filtered = filtered.filter(e => e.position_id == positionId);
        if (status) filtered = filtered.filter(e => e.status == status);

        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"></head>
            <body>
                <table border="1">
                    <tr><th colspan="5" style="font-size:16pt; background:#0D6EFD; color:white;">LISTADO DE PERSONAL</th></tr>
                    <tr style="background:#f2f2f2; font-weight:bold;">
                        <th>IDENTIFICACIÓN</th>
                        <th>NOMBRE COMPLETO</th>
                        <th>CARGO</th>
                        <th>CONTACTO</th>
                        <th>ESTADO</th>
                    </tr>
        `;

        filtered.forEach(emp => {
            const fullName = `${emp.first_name} ${emp.last_name1} ${emp.last_name2 || ''}`;
            html += `
                <tr>
                    <td>${emp.document_number}</td>
                    <td>${fullName}</td>
                    <td>${emp.position_name || ''}</td>
                    <td>${emp.phone || ''} / ${emp.email || ''}</td>
                    <td>${emp.status}</td>
                </tr>
            `;
        });

        html += `</table></body></html>`;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Personal_${new Date().toISOString().split('T')[0]}.xls`;
        a.click();
    },

    exportPDF() {
        const positionId = document.getElementById('filter-position').value;
        const status = document.getElementById('filter-status').value;

        let filtered = this.employees;
        if (positionId) filtered = filtered.filter(e => e.position_id == positionId);
        if (status) filtered = filtered.filter(e => e.status == status);

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte de Personal</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @page { size: landscape; margin: 1cm; }
                        body { font-family: Arial, sans-serif; font-size: 9pt; }
                        .header { border-bottom: 2px solid #0D6EFD; margin-bottom: 20px; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background-color: #f8f9fa; color: #333; }
                    </style>
                </head>
                <body>
                    <div class="header text-center">
                        <h2 class="text-primary">Listado de Personal</h2>
                        <p class="text-muted">Generado el: ${new Date().toLocaleString()}</p>
                    </div>
                    <table class="table table-bordered table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre Completo</th>
                                <th>Cargo</th>
                                <th>Teléfono</th>
                                <th>Email</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.map(emp => `
                                <tr>
                                    <td>${emp.document_number}</td>
                                    <td>${emp.first_name} ${emp.last_name1} ${emp.last_name2 || ''}</td>
                                    <td>${emp.position_name || ''}</td>
                                    <td>${emp.phone || ''}</td>
                                    <td>${emp.email || ''}</td>
                                    <td>${emp.status}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
};

if (typeof ReportsHREmployeesView !== 'undefined') {
    ReportsHREmployeesView.init();
}

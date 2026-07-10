/**
 * Reporte: Maestro de Cargos
 */
window.ReportsHRPositionsView = {
    positions: [],
    dataTable: null,

    async init() {
        Helper.loading(true);
        await this.loadData();
        this.render();
        this.renderTable(this.positions);
        Helper.loading(false);
    },

    async loadData() {
        try {
            const res = await App.api('/hr-positions');
            if (res.success) {
                this.positions = res.data;
            }
        } catch (error) {
            console.error('Error loading positions:', error);
            Helper.alert('error', 'No se pudieron cargar los cargos');
        }
    },

    render() {
        document.getElementById('app').innerHTML = `
            <div class="container-fluid fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-briefcase me-2 text-info"></i>Reporte Maestro de Cargos</h2>
                        <p class="text-muted mb-0">Listado técnico de roles organizacionales y riesgos ARL</p>
                    </div>
                    <div class="btn-group shadow-sm">
                        <button class="btn btn-outline-success" onclick="ReportsHRPositionsView.exportExcel()">
                            <i class="fas fa-file-excel me-2"></i>Excel
                        </button>
                        <button class="btn btn-outline-danger" onclick="ReportsHRPositionsView.exportPDF()">
                            <i class="fas fa-file-pdf me-2"></i>PDF / Imprimir
                        </button>
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="reports-hr-positions-table" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th>ID</th>
                                        <th>Nombre del Cargo</th>
                                        <th>Riesgo ARL (%)</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody id="reports-hr-positions-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderTable(data) {
        const tbody = document.getElementById('reports-hr-positions-body');
        if (this.dataTable) this.dataTable.destroy();

        tbody.innerHTML = data.map(pos => `
            <tr>
                <td class="small text-muted">#${pos.id}</td>
                <td class="fw-bold">${pos.description}</td>
                <td><span class="badge bg-secondary-light text-secondary">${pos.arl_risk_percent}%</span></td>
                <td>
                    <span class="badge ${pos.status === 'ACTIVO' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}">
                        ${pos.status}
                    </span>
                </td>
            </tr>
        `).join('');

        this.dataTable = Helper.initDataTable('#reports-hr-positions-table');
    },

    exportExcel() {
        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"></head>
            <body>
                <table border="1">
                    <tr><th colspan="4" style="font-size:16pt; background:#0D6EFD; color:white;">LISTADO MAESTRO DE CARGOS</th></tr>
                    <tr style="background:#f2f2f2; font-weight:bold;">
                        <th>ID</th>
                        <th>DESCRIPCIÓN</th>
                        <th>% RIESGO ARL</th>
                        <th>ESTADO</th>
                    </tr>
        `;

        this.positions.forEach(pos => {
            html += `
                <tr>
                    <td>${pos.id}</td>
                    <td>${pos.description}</td>
                    <td>${pos.arl_risk_percent}</td>
                    <td>${pos.status}</td>
                </tr>
            `;
        });

        html += `</table></body></html>`;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Cargos_${new Date().toISOString().split('T')[0]}.xls`;
        a.click();
    },

    exportPDF() {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte de Cargos</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @page { size: portrait; margin: 1cm; }
                        body { font-family: Arial, sans-serif; font-size: 10pt; }
                        .header { border-bottom: 2px solid #0D6EFD; margin-bottom: 20px; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background-color: #f8f9fa; color: #333; }
                    </style>
                </head>
                <body>
                    <div class="header text-center">
                        <h2 class="text-primary">Listado Maestro de Cargos</h2>
                        <p class="text-muted">Generado el: ${new Date().toLocaleString()}</p>
                    </div>
                    <table class="table table-bordered table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre del Cargo</th>
                                <th>Riesgo ARL (%)</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.positions.map(pos => `
                                <tr>
                                    <td>${pos.id}</td>
                                    <td>${pos.description}</td>
                                    <td>${pos.arl_risk_percent}%</td>
                                    <td>${pos.status}</td>
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

if (typeof ReportsHRPositionsView !== 'undefined') {
    ReportsHRPositionsView.init();
}

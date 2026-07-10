window.ReportsInsumosView = {
    foodGroups: [],
    items: [],
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
            const res = await Helper.fetchAPI('/items/food-groups');
            if (res.success) {
                this.foodGroups = res.data;
            }
        } catch (error) {
            console.error('Error loading food groups:', error);
        }
    },

    async loadData() {
        try {
            const res = await Helper.fetchAPI('/items');
            if (res.success) {
                this.items = res.data;
                this.renderTable(this.items);
            }
        } catch (error) {
            console.error('Error loading items:', error);
            Helper.alert('error', 'No se pudieron cargar los insumos');
        }
    },
    render() {
        document.getElementById('app').innerHTML = `
            <div class="container-fluid fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-carrot me-2 text-success"></i>Reporte Maestro de Insumos</h2>
                        <p class="text-muted mb-0">Listado técnico con información nutricional y logística</p>
                    </div>
                    <div class="btn-group shadow-sm">
                        <button class="btn btn-outline-success" onclick="ReportsInsumosView.exportExcel()">
                            <i class="fas fa-file-excel me-2"></i>Excel
                        </button>
                        <button class="btn btn-outline-danger" onclick="ReportsInsumosView.exportPDF()">
                            <i class="fas fa-file-pdf me-2"></i>PDF / Imprimir
                        </button>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card shadow-sm mb-4 border-0">
                    <div class="card-body bg-light rounded">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">FILTRAR POR GRUPO</label>
                                <select id="report-filter-group" class="form-select">
                                    <option value="">-- Todos los Grupos --</option>
                                    ${this.foodGroups.map(g => `<option value="${g.name}">${g.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">ESTADO</label>
                                <select id="report-filter-status" class="form-select">
                                    <option value="">-- Todos --</option>
                                    <option value="ACTIVO">Activos</option>
                                    <option value="INACTIVO">Inactivos</option>
                                </select>
                            </div>
                            <div class="col-md-4 d-flex gap-2">
                                <button class="btn btn-secondary w-100" onclick="ReportsInsumosView.clearFilters()">
                                    <i class="fas fa-sync-alt me-2"></i>Limpiar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="report-insumos-table" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th>Código</th>
                                        <th>Nombre Insumo</th>
                                        <th>Grupo</th>
                                        <th>Unidad</th>
                                        <th class="text-end">Peso Neto (g)</th>
                                        <th class="text-end">Calorías</th>
                                        <th class="text-end">Proteínas</th>
                                        <th class="text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents() {
        $('#report-filter-group, #report-filter-status').on('change', () => {
            this.applyFilters();
        });
    },

    renderTable(data) {
        this.dataTable = Helper.initDataTable('#report-insumos-table', {
            data: data,
            pageLength: 25,
            columns: [
                { data: 'code', render: d => d || '-' },
                { data: 'name', render: (d, t, r) => `<div class="fw-bold text-dark">${d}</div><small class="text-muted">${r.is_perishable == 1 ? '<i class="fas fa-clock text-danger me-1"></i>Perecedero' : ''}</small>` },
                { data: 'food_group_name', render: (d, t, r) => `<span class="badge" style="background-color: ${r.food_group_color || '#6c757d'}">${d}</span>` },
                { data: 'unit_abbr', render: d => `<span class="badge bg-light text-dark border">${d}</span>` },
                { data: 'net_weight', className: 'text-end', render: d => Helper.formatNumber(d, 2) },
                { data: 'calories', className: 'text-end', render: d => `${Helper.formatNumber(d, 1)} kcal` },
                { data: 'proteins', className: 'text-end', render: d => `${Helper.formatNumber(d, 2)}g` },
                { data: 'status', className: 'text-center', render: d => d === 'ACTIVO' ? '<span class="text-success fw-bold">ACTIVO</span>' : '<span class="text-danger">INACTIVO</span>' }
            ]
        });
    },

    applyFilters() {
        const group = $('#report-filter-group').val();
        const status = $('#report-filter-status').val();

        this.dataTable.column(2).search(group).draw();
        this.dataTable.column(7).search(status).draw();
    },

    clearFilters() {
        $('#report-filter-group, #report-filter-status').val('');
        this.dataTable.column(2).search('').column(7).search('').draw();
    },

    exportExcel() {
        const data = this.dataTable.rows({ search: 'applied' }).data().toArray();
        if (data.length === 0) {
            Helper.alert('warning', 'No hay datos para exportar');
            return;
        }

        let header = '<tr>' +
            '<th style="background:#1B4F72;color:white;">CÓDIGO</th>' +
            '<th style="background:#1B4F72;color:white;">INSUMO</th>' +
            '<th style="background:#1B4F72;color:white;">GRUPO</th>' +
            '<th style="background:#1B4F72;color:white;">UNIDAD</th>' +
            '<th style="background:#1B4F72;color:white;">PESO NETO (g)</th>' +
            '<th style="background:#1B4F72;color:white;">CALORÍAS (kcal)</th>' +
            '<th style="background:#1B4F72;color:white;">PROTEÍNAS (g)</th>' +
            '<th style="background:#1B4F72;color:white;">ESTADO</th>' +
            '</tr>';

        let body = '';
        data.forEach(item => {
            body += `<tr>
                <td>${item.code || '-'}</td>
                <td>${item.name}</td>
                <td>${item.food_group_name}</td>
                <td>${item.unit_abbr}</td>
                <td>${item.net_weight}</td>
                <td>${item.calories}</td>
                <td>${item.proteins}</td>
                <td>${item.status}</td>
            </tr>`;
        });

        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"></head>
            <body>
                <h3 style="text-align:center;">REPORTE MAESTRO DE INSUMOS - PAE</h3>
                <p>Fecha de generación: ${new Date().toLocaleString()}</p>
                <table border="1">${header}${body}</table>
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Insumos_${new Date().getTime()}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    exportPDF() {
        const data = this.dataTable.rows({ search: 'applied' }).data().toArray();
        if (data.length === 0) {
            Helper.alert('warning', 'No hay datos para imprimir');
            return;
        }

        const printWindow = window.open('', '_blank');
        let tableHtml = '<table class="table table-bordered table-sm">';
        tableHtml += '<thead class="bg-light"><tr><th>Código</th><th>Insumo</th><th>Grupo</th><th>Unidad</th><th>P.Neto</th><th>Kcal</th><th>Prot.</th><th>Estado</th></tr></thead>';
        tableHtml += '<tbody>';

        data.forEach(item => {
            tableHtml += `<tr>
                <td class="small">${item.code || '-'}</td>
                <td class="fw-bold">${item.name}</td>
                <td>${item.food_group_name}</td>
                <td class="text-center">${item.unit_abbr}</td>
                <td class="text-end">${item.net_weight}</td>
                <td class="text-end">${item.calories}</td>
                <td class="text-end">${item.proteins}</td>
                <td class="text-center small">${item.status}</td>
            </tr>`;
        });
        tableHtml += '</tbody></table>';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte de Insumos</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        body { font-size: 10px; padding: 20px; }
                        h2 { text-align: center; color: #1B4F72; }
                        .no-print { display: flex; justify-content: center; margin-bottom: 20px; gap: 10px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="no-print">
                        <button class="btn btn-primary btn-sm" onclick="window.print()">Imprimir</button>
                        <button class="btn btn-secondary btn-sm" onclick="window.close()">Cerrar</button>
                    </div>
                    <h2>REPORTE MAESTRO DE INSUMOS</h2>
                    <p class="text-center">Generado el: ${new Date().toLocaleString()}</p>
                    ${tableHtml}
                </body>
            </html>
        `);
        printWindow.document.close();
    }
};

if (typeof ReportsInsumosView !== 'undefined') {
    ReportsInsumosView.init();
}

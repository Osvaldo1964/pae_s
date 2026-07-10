/**
 * Reporte: Costos por Ciclo
 */
window.ReportsCostsView = {
    cycles: [],
    costsData: [],
    dataTable: null,

    async init() {
        Helper.loading(true, 'Cargando ciclos de menú...');
        await this.loadCycles();
        this.render();
        this.attachEvents();
        
        // Cargar automáticamente el primer ciclo si existe
        if (this.cycles && this.cycles.length > 0) {
            const activeCycle = this.cycles.find(c => c.status === 'ACTIVO') || this.cycles[0];
            document.getElementById('report-filter-cycle').value = activeCycle.id;
            await this.loadData(activeCycle.id);
        } else {
            this.renderTable([]);
        }
        Helper.loading(false);
    },

    async loadCycles() {
        try {
            const res = await Helper.fetchAPI('/menu-cycles');
            this.cycles = Array.isArray(res) ? res : (res.success ? res.data : []);
        } catch (error) {
            console.error('Error loading cycles:', error);
        }
    },

    async loadData(cycleId) {
        if (!cycleId) {
            this.costsData = [];
            this.renderTable([]);
            return;
        }

        Helper.loading(true, 'Cargando reporte de costos...');
        try {
            const res = await Helper.fetchAPI(`/inventory/cycle-cost-report/${cycleId}`);
            if (res && res.success && Array.isArray(res.data)) {
                this.costsData = res.data;
                this.renderTable(this.costsData);
            } else {
                console.error('API did not return success for cycle costs:', res);
                Helper.alert('error', 'No se pudo cargar el reporte de costos');
                this.costsData = [];
                this.renderTable([]);
            }
        } catch (error) {
            console.error('Error loading cycle cost report:', error);
            Helper.alert('error', 'No se pudo cargar el reporte de costos');
            this.costsData = [];
            this.renderTable([]);
        } finally {
            Helper.loading(false);
        }
    },

    render() {
        document.getElementById('app').innerHTML = `
            <div class="container-fluid fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-dollar-sign me-2 text-danger"></i>Costos por Ciclo</h2>
                        <p class="text-muted mb-0">Análisis de costos promedio ponderados, cantidades consumidas y valores totales por período</p>
                    </div>
                    <div class="btn-group shadow-sm">
                        <button class="btn btn-outline-success" onclick="ReportsCostsView.exportExcel()">
                            <i class="fas fa-file-excel me-2"></i>Excel
                        </button>
                        <button class="btn btn-outline-danger" onclick="ReportsCostsView.exportPDF()">
                            <i class="fas fa-file-pdf me-2"></i>PDF / Imprimir
                        </button>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card shadow-sm mb-4 border-0">
                    <div class="card-body bg-light rounded">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-8">
                                <label class="form-label small fw-bold text-uppercase text-secondary mb-2">Seleccionar Ciclo de Menú</label>
                                <select id="report-filter-cycle" class="form-select border-2">
                                    <option value="">-- Seleccionar Ciclo --</option>
                                    ${this.cycles.map(c => `<option value="${c.id}">${c.name || `Ciclo ${c.id}`} (${c.status})</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <button class="btn btn-outline-secondary w-100" onclick="ReportsCostsView.resetFilters()">
                                    <i class="fas fa-eraser me-2"></i>Limpiar Filtro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="card-body p-0">
                        <div class="table-responsive p-3">
                            <table id="reports-costs-table" class="table table-hover align-middle mb-0" style="width:100%">
                                <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                    <tr>
                                        <th>Código</th>
                                        <th>Insumo</th>
                                        <th>Grupo Alimenticio</th>
                                        <th>Unidad</th>
                                        <th class="text-end">Costo Promedio Ciclo</th>
                                        <th class="text-end">Cantidad Consumida</th>
                                        <th class="text-end">Valor Total Ciclo</th>
                                        <th class="text-center">Compras</th>
                                        <th class="text-end">Costo Global Ref</th>
                                        <th class="text-end">Stock Actual</th>
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
        $('#report-filter-cycle').on('change', (e) => {
            const cycleId = e.target.value;
            this.loadData(cycleId);
        });
    },

    renderTable(data) {
        this.dataTable = Helper.initDataTable('#reports-costs-table', {
            data: data,
            pageLength: 25,
            columns: [
                { data: 'code', render: d => d || '-' },
                { data: 'name', render: d => `<div class="fw-bold text-dark">${d}</div>` },
                { data: 'food_group', render: d => `<span class="badge bg-secondary">${d || 'Sin Grupo'}</span>` },
                { data: 'unit', render: d => `<span class="badge bg-light text-dark border">${d || '-'}</span>` },
                { 
                    data: 'cycle_avg_cost', 
                    className: 'text-end fw-bold text-danger', 
                    render: d => Helper.formatCurrency(parseFloat(d) || 0) 
                },
                { 
                    data: 'cycle_total_qty', 
                    className: 'text-end', 
                    render: d => Helper.formatNumber(parseFloat(d) || 0, 2) 
                },
                { 
                    data: 'cycle_total_value', 
                    className: 'text-end fw-bold text-dark', 
                    render: d => Helper.formatCurrency(parseFloat(d) || 0) 
                },
                { 
                    data: 'purchase_count', 
                    className: 'text-center', 
                    render: d => `<span class="badge bg-info">${parseInt(d) || 0}</span>` 
                },
                { 
                    data: 'global_avg_cost', 
                    className: 'text-end text-muted', 
                    render: d => Helper.formatCurrency(parseFloat(d) || 0) 
                },
                { 
                    data: 'current_stock', 
                    className: 'text-end', 
                    render: d => Helper.formatNumber(parseFloat(d) || 0, 2) 
                }
            ]
        });
    },

    resetFilters() {
        document.getElementById('report-filter-cycle').value = '';
        this.loadData('');
    },

    exportExcel() {
        if (!this.costsData || this.costsData.length === 0) {
            Helper.alert('warning', 'No hay datos para exportar');
            return;
        }

        const selectedCycleText = $('#report-filter-cycle option:selected').text() || 'N/A';

        let header = '<tr>' +
            '<th style="background:#1B4F72;color:white;">CÓDIGO</th>' +
            '<th style="background:#1B4F72;color:white;">INSUMO</th>' +
            '<th style="background:#1B4F72;color:white;">GRUPO ALIMENTICIO</th>' +
            '<th style="background:#1B4F72;color:white;">UNIDAD</th>' +
            '<th style="background:#1B4F72;color:white;text-align:right;">COSTO PROMEDIO CICLO</th>' +
            '<th style="background:#1B4F72;color:white;text-align:right;">CANTIDAD CONSUMIDA</th>' +
            '<th style="background:#1B4F72;color:white;text-align:right;">VALOR TOTAL CICLO</th>' +
            '<th style="background:#1B4F72;color:white;text-align:center;">COMPRAS</th>' +
            '<th style="background:#1B4F72;color:white;text-align:right;">COSTO GLOBAL REF</th>' +
            '<th style="background:#1B4F72;color:white;text-align:right;">STOCK ACTUAL</th>' +
            '</tr>';

        let body = '';
        this.costsData.forEach(item => {
            body += `<tr>
                <td>${item.code || '-'}</td>
                <td>${item.name}</td>
                <td>${item.food_group || 'Sin Grupo'}</td>
                <td>${item.unit || '-'}</td>
                <td style="text-align:right;">${item.cycle_avg_cost || 0}</td>
                <td style="text-align:right;">${item.cycle_total_qty || 0}</td>
                <td style="text-align:right;">${item.cycle_total_value || 0}</td>
                <td style="text-align:center;">${item.purchase_count || 0}</td>
                <td style="text-align:right;">${item.global_avg_cost || 0}</td>
                <td style="text-align:right;">${item.current_stock || 0}</td>
            </tr>`;
        });

        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"></head>
            <body>
                <h3 style="text-align:center;">REPORTE DE COSTOS POR CICLO - PAE</h3>
                <p><b>Ciclo:</b> ${selectedCycleText}</p>
                <p><b>Fecha de Emisión:</b> ${new Date().toLocaleString()}</p>
                <table border="1">
                    <thead>${header}</thead>
                    <tbody>${body}</tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Costos_por_Ciclo_${new Date().getTime()}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        Helper.alert('success', 'Excel generado exitosamente');
    },

    exportPDF() {
        window.print();
    }
};

if (typeof ReportsCostsView !== 'undefined') {
    ReportsCostsView.init();
}

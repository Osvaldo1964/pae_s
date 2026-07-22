/**
 * Reporte: Análisis de Ciclos
 */
window.ReportsCiclosAnalisisView = {
    cycles: [],
    analysisData: [],
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
            this.analysisData = [];
            this.renderTable([]);
            return;
        }

        Helper.loading(true, 'Cargando análisis de ciclo...');
        try {
            const res = await Helper.fetchAPI(`/inventory/cycle-analysis-report/${cycleId}`);
            if (res && res.success && Array.isArray(res.data)) {
                this.analysisData = res.data;
                this.renderTable(this.analysisData);
            } else {
                this.analysisData = [];
                this.renderTable([]);
            }
        } catch (error) {
            console.error('Error loading cycle analysis:', error);
            Helper.alert('error', 'Error de red al cargar el análisis');
        } finally {
            Helper.loading(false);
        }
    },

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <nav aria-label="breadcrumb">
                            <ol class="breadcrumb mb-1">
                                <li class="breadcrumb-item"><a href="#" onclick="App.renderSubHub('reports-ali', 'Reportes de Alimentación'); return false;" class="text-decoration-none">Reportes</a></li>
                                <li class="breadcrumb-item active" aria-current="page">Análisis de Ciclos</li>
                            </ol>
                        </nav>
                        <h2 class="mb-0 text-primary-custom fw-bold">
                            <i class="fas fa-chart-pie text-success me-2"></i> Análisis de Ciclos
                        </h2>
                        <p class="text-muted small mt-1 mb-0">Verificación de compras, ingresos a almacén y despachos a sedes</p>
                    </div>
                </div>

                <div class="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                    <div class="card-body p-4 bg-light">
                        <div class="row g-3">
                            <div class="col-md-9">
                                <label class="form-label small fw-bold text-muted text-uppercase">Seleccionar Ciclo de Menú</label>
                                <select class="form-select form-select-lg border-2" id="report-filter-cycle">
                                    <option value="">-- Seleccione un ciclo --</option>
                                    ${this.cycles.map(c => `<option value="${c.id}">${c.name} (${c.status})</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-3 d-flex align-items-end">
                                <button type="button" class="btn btn-outline-secondary w-100" id="btn-clear-filter">
                                    <i class="fas fa-eraser me-2"></i> Limpiar Filtro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0" id="cycle-analysis-table" style="width: 100%">
                                <thead class="bg-light">
                                    <tr class="text-muted small text-uppercase fw-bold">
                                        <th class="ps-4">Código</th>
                                        <th>Insumo</th>
                                        <th>Grupo Alimento</th>
                                        <th class="text-end">Proyectado</th>
                                        <th class="text-center" style="width: 15%">Comprado (OC)</th>
                                        <th class="text-center" style="width: 15%">Ingresado (Almacén)</th>
                                        <th class="text-center" style="width: 15%">Entregado (Sedes)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Dynamic Content -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = html;
        }
    },

    attachEvents() {
        const cycleSelect = document.getElementById('report-filter-cycle');
        if (cycleSelect) {
            cycleSelect.addEventListener('change', (e) => {
                this.loadData(e.target.value);
            });
        }

        const btnClear = document.getElementById('btn-clear-filter');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                if (cycleSelect) cycleSelect.value = '';
                this.loadData(null);
            });
        }
    },

    renderTable(data) {
        if (this.dataTable) {
            this.dataTable.destroy();
        }

        const tbody = document.querySelector('#cycle-analysis-table tbody');
        if (tbody) {
            tbody.innerHTML = data.map(item => {
                const projected = parseFloat(item.projected_qty) || 0;
                const ordered = parseFloat(item.ordered_qty) || 0;
                const received = parseFloat(item.received_qty) || 0;
                const delivered = parseFloat(item.delivered_qty) || 0;

                const getPct = (val) => projected > 0 ? Math.min(100, Math.round((val / projected) * 100)) : 0;
                const getColor = (p) => p >= 100 ? 'success' : (p >= 50 ? 'warning' : 'danger');
                
                const pctOrdered = getPct(ordered);
                const pctReceived = getPct(received);
                const pctDelivered = getPct(delivered);

                const progressBar = (val, pct) => `
                    <div class="d-flex flex-column">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="small fw-bold text-dark">${Helper.formatNumber(val, 3)}</span>
                            <span class="small text-muted fw-bold">${pct}%</span>
                        </div>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar bg-${getColor(pct)}" role="progressbar" style="width: ${pct}%"></div>
                        </div>
                    </div>
                `;

                return `
                    <tr>
                        <td class="ps-4 text-muted small">${item.code || '-'}</td>
                        <td class="fw-bold text-dark">${item.name} <span class="badge bg-light text-secondary ms-1 border">${item.unit}</span></td>
                        <td><span class="badge bg-light text-secondary border">${item.food_group}</span></td>
                        <td class="text-end fw-bold text-primary fs-6">${Helper.formatNumber(projected, 3)}</td>
                        <td class="px-3 border-start">${progressBar(ordered, pctOrdered)}</td>
                        <td class="px-3 border-start">${progressBar(received, pctReceived)}</td>
                        <td class="px-3 border-start">${progressBar(delivered, pctDelivered)}</td>
                    </tr>
                `;
            }).join('');
        }

        // Initialize DataTable
        this.dataTable = $('#cycle-analysis-table').DataTable({
            language: { url: 'https://cdn.datatables.net/plug-ins/1.10.25/i18n/Spanish.json' },
            pageLength: 25,
            ordering: true,
            dom: '<"row p-3"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>>rt<"row p-3"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            buttons: [
                { extend: 'excel', text: '<i class="fas fa-file-excel me-2"></i>Excel', className: 'btn btn-success btn-sm' },
                { extend: 'pdf', text: '<i class="fas fa-file-pdf me-2"></i>PDF', className: 'btn btn-danger btn-sm' },
                { extend: 'print', text: '<i class="fas fa-print me-2"></i>Imprimir', className: 'btn btn-secondary btn-sm' }
            ]
        });
    }
};

if (typeof ReportsCiclosAnalisisView !== 'undefined') {
    ReportsCiclosAnalisisView.init();
}

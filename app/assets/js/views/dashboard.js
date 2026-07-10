const DashboardView = {
    charts: {},

    init: async () => {
        // Wait for Chart.js if it's not yet loaded (async loading safety)
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not found, waiting...');
            await new Promise(resolve => {
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    if (typeof Chart !== 'undefined' || attempts > 20) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });
        }

        if (typeof Chart === 'undefined') {
            console.error('Chart.js failed to load after multiple attempts.');
            Helper.alert('error', 'Biblioteca de gráficos no disponible. Por favor, recarga la página.');
            return;
        }

        const appContainer = document.getElementById('app');
        appContainer.innerHTML = `
            <div class="container-fluid fade-in">
                <!-- Header -->
                <div class="row mb-4 align-items-center">
                    <div class="col-md-8">
                        <h3 class="text-primary-custom fw-bold mb-0">Tablero de Control</h3>
                        <p class="text-muted mb-0">Resumen operativo y financiero del día</p>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-outline-primary btn-sm rounded-pill px-3 shadow-sm" onclick="DashboardView.loadData()">
                            <i class="fas fa-sync-alt me-1"></i> Actualizar
                        </button>
                    </div>
                </div>

                <!-- KPIs Row -->
                <div class="row g-3 mb-4" id="dash-kpi-container">
                    <!-- Loaded via JS -->
                     <div class="col-12 text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando métricas...</span>
                        </div>
                    </div>
                </div>

                <!-- Charts Row -->
                <div class="row g-3 mb-4">
                    <div class="col-md-8">
                        <div class="card border-0 shadow-sm h-100 rounded-4">
                            <div class="card-body p-4">
                                <h6 class="fw-bold mb-3 text-secondary">Raciones Entregadas (Últimos 7 días)</h6>
                                <div style="height: 300px;">
                                    <canvas id="chart-consumptions"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm h-100 rounded-4">
                            <div class="card-body p-4">
                                <h6 class="fw-bold mb-3 text-secondary">Top Sedes por Beneficiarios</h6>
                                <div style="height: 300px; position:relative;" class="d-flex justify-content-center align-items-center">
                                    <canvas id="chart-distribution"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom Row: Alerts -->
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm rounded-4 border-start border-warning border-4">
                            <div class="card-body p-4">
                                <h6 class="fw-bold mb-3 text-secondary"><i class="fas fa-exclamation-triangle text-warning me-2"></i>Insumos Críticos (Bodega)</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm table-hover align-middle mb-0" id="dash-stock-table">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Ítem</th>
                                                <th class="text-end">Stock Actual</th>
                                                <th>Est.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <!-- Loaded via JS -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card border-0 shadow-sm rounded-4 border-start border-info border-4">
                            <div class="card-body p-4">
                                <h6 class="fw-bold mb-3 text-secondary"><i class="fas fa-calendar-day text-info me-2"></i>Ciclos Activos (Menú del Día)</h6>
                                <div id="dash-cycles-container">
                                    <!-- Loaded via JS -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await DashboardView.loadData();
    },

    loadData: async () => {
        Helper.loading(true);
        const res = await App.api('/dashboard');
        Helper.loading(false);

        if (res.success && res.data) {
            DashboardView.renderKPIs(res.data.kpis);
            DashboardView.renderCharts(res.data.charts);
            DashboardView.renderAlerts(res.data.alerts);
        } else {
            Helper.alert('error', 'No se pudo cargar el tablero', res.message);
            document.getElementById('dash-kpi-container').innerHTML = `<div class="alert alert-danger w-100">Error: ${res.message}</div>`;
        }
    },

    renderKPIs: (kpis) => {
        const container = document.getElementById('dash-kpi-container');

        let pptoPercent = 0;
        let pptoColorClass = 'bg-success';
        if (kpis.budget_total > 0) {
            pptoPercent = ((kpis.budget_used / kpis.budget_total) * 100).toFixed(1);
            if (pptoPercent > 85) pptoColorClass = 'bg-danger';
            else if (pptoPercent > 60) pptoColorClass = 'bg-warning';
        }

        container.innerHTML = `
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 shadow-sm rounded-4 h-100 hover-elevate">
                    <div class="card-body p-4 d-flex align-items-center">
                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                            <i class="fas fa-users fa-lg"></i>
                        </div>
                        <div>
                            <p class="text-muted small mb-0 fw-bold">BENEFICIARIOS</p>
                            <h3 class="mb-0 fw-black text-dark">${Helper.formatNumber(kpis.beneficiaries)}</h3>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 shadow-sm rounded-4 h-100 hover-elevate">
                    <div class="card-body p-4 d-flex align-items-center">
                        <div class="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                            <i class="fas fa-utensils fa-lg"></i>
                        </div>
                        <div>
                            <p class="text-muted small mb-0 fw-bold">RACIONES DE HOY</p>
                            <h3 class="mb-0 fw-black text-dark">${Helper.formatNumber(kpis.rations_today)}</h3>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 shadow-sm rounded-4 h-100 hover-elevate">
                    <div class="card-body p-4 d-flex align-items-center">
                        <div class="bg-info bg-opacity-10 text-info rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                            <i class="fas fa-school fa-lg"></i>
                        </div>
                        <div>
                            <p class="text-muted small mb-0 fw-bold">SEDES ACTIVAS</p>
                            <h3 class="mb-0 fw-black text-dark">${kpis.branches}</h3>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 shadow-sm rounded-4 h-100 hover-elevate">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <p class="text-muted small mb-0 fw-bold">PRESUPUESTO (SALDO)</p>
                            <div class="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center" style="width: 35px; height: 35px;">
                                <i class="fas fa-wallet"></i>
                            </div>
                        </div>
                        <h4 class="mb-2 fw-black text-dark" style="font-size:1.3rem;">${Helper.formatCurrency(kpis.budget_remaining)}</h4>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar ${pptoColorClass}" role="progressbar" style="width: ${pptoPercent}%" aria-valuenow="${pptoPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <small class="text-muted" style="font-size:0.7rem;">Ejecutado: ${pptoPercent}%</small>
                    </div>
                </div>
            </div>
        `;
    },

    renderCharts: (charts) => {
        // Destroy existing instances if refreshing
        if (DashboardView.charts.consumptions) DashboardView.charts.consumptions.destroy();
        if (DashboardView.charts.distribution) DashboardView.charts.distribution.destroy();

        // 1. Line Chart (Consumos 7 dias)
        const ctxCons = document.getElementById('chart-consumptions').getContext('2d');
        const consLabels = charts.consumptions.map(c => {
            const d = new Date(c.date + 'T12:00:00'); // Force local noon to avoid timezone shift
            return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
        });
        const consData = charts.consumptions.map(c => c.total);

        DashboardView.charts.consumptions = new Chart(ctxCons, {
            type: 'line',
            data: {
                labels: consLabels,
                datasets: [{
                    label: 'Entregas Diarias',
                    data: consData,
                    borderColor: '#27AE60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#27AE60',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(27, 79, 114, 0.9)',
                        padding: 10,
                        titleFont: { size: 13 },
                        bodyFont: { size: 14, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [5, 5], color: '#e9ecef' },
                        ticks: { stepSize: 50, color: '#adb5bd' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#adb5bd' }
                    }
                }
            }
        });

        // 2. Doughnut Chart (Distribucion Sedes)
        const ctxDist = document.getElementById('chart-distribution').getContext('2d');
        const distLabels = charts.distribution.map(d => d.label.substring(0, 20) + '...');
        const distData = charts.distribution.map(d => d.total);
        const palette = ['#1B4F72', '#2874A6', '#2E86C1', '#5DADE2', '#AED6F1'];

        if (distData.length === 0) {
            // Placeholder si no hay data
            distLabels.push("Sin datos");
            distData.push(1);
            palette[0] = '#e9ecef';
        }

        DashboardView.charts.distribution = new Chart(ctxDist, {
            type: 'doughnut',
            data: {
                labels: distLabels,
                datasets: [{
                    data: distData,
                    backgroundColor: palette,
                    borderWidth: 0,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 15, font: { size: 11 } }
                    }
                }
            }
        });
    },

    renderAlerts: (alerts) => {
        // Stock Table
        const tbody = document.querySelector('#dash-stock-table tbody');
        if (alerts.low_stock.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">Inventario en niveles óptimos</td></tr>`;
        } else {
            let html = '';
            alerts.low_stock.forEach(item => {
                const badge = item.stock_quantity <= 0 ? 'bg-danger' : 'bg-warning text-dark';
                const status = item.stock_quantity <= 0 ? 'Agotado' : 'Crítico';
                html += `
                    <tr>
                        <td>
                            <div class="fw-bold text-dark" style="font-size: 0.85rem;">${item.name}</div>
                            <small class="text-muted" style="font-size: 0.75rem;">${item.code}</small>
                        </td>
                        <td class="text-end fw-bold" style="font-size: 0.9rem;">
                            ${Helper.formatNumber(item.stock_quantity)} <small class="text-muted fw-normal">${item.unit}</small>
                        </td>
                        <td class="text-center">
                            <span class="badge ${badge} rounded-pill" style="font-size: 0.65rem;">${status}</span>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        // Active Cycles
        const cyclesDiv = document.getElementById('dash-cycles-container');
        if (alerts.cycles.length === 0) {
            cyclesDiv.innerHTML = `<div class="alert alert-light border border-dashed text-center mt-2"><i class="fas fa-bed d-block fs-3 mb-2 text-muted"></i> No hay ciclos programados para hoy.</div>`;
        } else {
            let html = '<div class="list-group list-group-flush mt-2">';
            alerts.cycles.forEach(cy => {
                const isAm = cy.type_id == 1; // Assuming 1 is Desayuno/Am
                const icon = isAm ? 'fa-sun text-warning' : 'fa-hamburger text-primary';
                let recipesHtml = '';
                if (cy.recipes && cy.recipes.length > 0) {
                    recipesHtml = '<div class="mt-2 pt-2 border-top border-secondary-subtle">';
                    cy.recipes.forEach(r => {
                        recipesHtml += `
                            <div class="mb-1">
                                <span class="fw-bold text-dark small"><i class="fas fa-utensils text-muted me-1"></i>${r.name}</span>
                                <div class="text-muted" style="font-size: 0.70rem; padding-left: 17px;">${r.description || ''}</div>
                            </div>
                        `;
                    });
                    recipesHtml += '</div>';
                }

                html += `
                    <div class="list-group-item px-0 border-0 mb-2">
                        <div class="d-flex align-items-start bg-light rounded-3 p-3">
                            <div class="me-3 fs-3 mt-1"><i class="fas ${icon}"></i></div>
                            <div class="flex-grow-1">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h6 class="mb-0 fw-bold text-dark">${cy.name}</h6>
                                    <span class="badge bg-primary-subtle text-primary rounded-pill" style="font-size: 0.65rem;">${cy.menu_name || 'Menú de Hoy'}</span>
                                </div>
                                <p class="mb-1 text-muted small"><i class="fas fa-clock me-1"></i>Vigente hoy</p>
                                ${recipesHtml}
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            cyclesDiv.innerHTML = html;
        }
    }
};

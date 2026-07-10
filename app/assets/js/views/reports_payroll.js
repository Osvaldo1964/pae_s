/**
 * Reportes de Talento Humano (Nómina)
 */
var ReportsPayrollView = {
    periods: [],

    init: async () => {
        Helper.loading(true);
        ReportsPayrollView.render();
        await ReportsPayrollView.loadPeriods();
        Helper.loading(false);
    },

    render: () => {
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div class="container-fluid fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-user-tie me-2 text-info"></i>Talento Humano</h2>
                        <p class="text-muted mb-0">Generación de soportes de pago y consolidados de nómina</p>
                    </div>
                </div>

                <div class="row g-4">
                    <!-- Nómina General -->
                    <div class="col-md-6">
                        <div class="card shadow-sm border-0 h-100">
                            <div class="card-body p-4">
                                <div class="icon-circle bg-info-light mb-3">
                                    <i class="fas fa-file-invoice-dollar text-info fa-2x"></i>
                                </div>
                                <h5 class="fw-bold mb-2">Nómina General</h5>
                                <p class="text-muted small mb-4">Genera un documento con el resumen de todos los pagos realizados en un periodo específico.</p>
                                
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">PERIODO DE PAGO</label>
                                    <select id="report-pay-period-gen" class="form-select select-periods-report">
                                        <option value="">-- Seleccione Periodo --</option>
                                    </select>
                                </div>
                                
                                <button class="btn btn-info text-white w-100 fw-bold rounded-pill" onclick="ReportsPayrollView.generate('general')">
                                    <i class="fas fa-print me-2"></i> Generar Nómina General
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Desprendibles Individuales -->
                    <div class="col-md-6">
                        <div class="card shadow-sm border-0 h-100">
                            <div class="card-body p-4">
                                <div class="icon-circle bg-primary-light mb-3">
                                    <i class="fas fa-id-card text-primary fa-2x"></i>
                                </div>
                                <h5 class="fw-bold mb-2">Desprendibles de Pago</h5>
                                <p class="text-muted small mb-4">Genera los soportes individuales de pago para entregar a cada uno de los empleados.</p>
                                
                                <div class="mb-3">
                                    <label class="form-label small fw-bold">PERIODO DE PAGO</label>
                                    <select id="report-pay-period-ind" class="form-select select-periods-report">
                                        <option value="">-- Seleccione Periodo --</option>
                                    </select>
                                </div>
                                
                                <button class="btn btn-primary w-100 fw-bold rounded-pill" onclick="ReportsPayrollView.generate('individual')">
                                    <i class="fas fa-print me-2"></i> Generar Desprendibles
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Nómina Integral (Costo Total) -->
                    <div class="col-md-12 mt-2">
                        <div class="card shadow-sm border-0">
                            <div class="card-body p-4 row align-items-center">
                                <div class="col-md-2 text-center">
                                    <div class="icon-circle bg-success-light mb-0 d-inline-flex mx-auto" style="width: 80px; height: 80px;">
                                        <i class="fas fa-chart-pie text-success fa-2x"></i>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <h5 class="fw-bold mb-2">Nómina Integral (Costo Empleador)</h5>
                                    <p class="text-muted small mb-0">Genera un documento detallado con todos los salarios, sumando provisiones (Cesantías, Vacaciones, Primas) y aportes a Seguridad Social (Salud, Pensión, ARL, Parafiscales) por empleado.</p>
                                </div>
                                <div class="col-md-4 text-end border-start ps-4">
                                    <label class="form-label small fw-bold text-start w-100">PERIODO DE PAGO</label>
                                    <select id="report-pay-period-int" class="form-select select-periods-report mb-3">
                                        <option value="">-- Seleccione Periodo --</option>
                                    </select>
                                    <button class="btn btn-success text-white w-100 fw-bold rounded-pill" onclick="ReportsPayrollView.generate('integral')">
                                        <i class="fas fa-chart-bar me-2"></i> Generar Nómina Integral
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    loadPeriods: async () => {
        const res = await App.api('/hr-payroll/periods');
        if (res.success && res.data) {
            ReportsPayrollView.periods = res.data;
            const selects = document.querySelectorAll('.select-periods-report');
            let options = '<option value="">-- Seleccione Periodo --</option>';
            res.data.forEach(p => {
                options += `<option value="${p.id}">${p.name} (${p.start_date} / ${p.end_date})</option>`;
            });
            selects.forEach(s => s.innerHTML = options);
        }
    },

    generate: async (type) => {
        let periodId = '';
        if (type === 'general') periodId = document.getElementById('report-pay-period-gen').value;
        else if (type === 'individual') periodId = document.getElementById('report-pay-period-ind').value;
        else if (type === 'integral') periodId = document.getElementById('report-pay-period-int').value;

        if (!periodId) {
            Helper.alert('warning', 'Seleccione un periodo');
            return;
        }

        Helper.loading(true);
        const res = await App.api(`/hr-payroll/report/${periodId}`);
        Helper.loading(false);

        if (res.success && res.data.length > 0) {
            const period = ReportsPayrollView.periods.find(p => p.id == periodId);
            if (type === 'general') {
                ReportsPayrollView.printGeneral(res.data, period);
            } else if (type === 'individual') {
                ReportsPayrollView.printIndividual(res.data, period);
            } else if (type === 'integral') {
                ReportsPayrollView.printIntegral(res.data, period, res.is_exonerated);
            }
        } else {
            Helper.alert('info', 'No hay datos liquidados en este periodo.');
        }
    },

    printGeneral: (data, period) => {
        const printWindow = window.open('', '_blank');
        let rowsHtml = '';
        let grandTotal = 0;

        data.forEach(r => {
            grandTotal += parseFloat(r.total_neto);
            rowsHtml += `
                <tr>
                    <td><b>${r.first_name} ${r.last_name1}</b><br><small>${r.document_number}</small></td>
                    <td>${r.position_name || 'N/A'}</td>
                    <td class="text-end">${Helper.formatCurrency(r.total_devengado)}</td>
                    <td class="text-end">${Helper.formatCurrency(r.total_deduccion)}</td>
                    <td class="text-end fw-bold">${Helper.formatCurrency(r.total_neto)}</td>
                </tr>
            `;
        });

        printWindow.document.write(`
            <html>
                <head>
                    <title>Nomina General - ${period.name}</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        body { padding: 40px; font-family: Arial, sans-serif; font-size: 10pt; }
                        .header-rep { border-bottom: 2px solid #1a1a1a; margin-bottom: 20px; padding-bottom: 10px; }
                        table th { background: #f8f9fa !important; border-top: 2px solid #000 !important; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="text-end no-print mb-4">
                        <button class="btn btn-primary" onclick="window.print()">Imprimir PDF</button>
                    </div>
                    <div class="header-rep d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-0 fw-bold">CONSOLIDADO DE NÓMINA</h2>
                            <h5 class="text-muted">${period.name.toUpperCase()} (${period.start_date} al ${period.end_date})</h5>
                        </div>
                    </div>
                    <table class="table table-bordered align-middle">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Cargo</th>
                                <th class="text-end">Devengados</th>
                                <th class="text-end">Deducciones</th>
                                <th class="text-end">Neto a Pagar</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                        <tfoot>
                            <tr class="table-light">
                                <td colspan="4" class="text-end fw-bold">TOTAL GENERAL:</td>
                                <td class="text-end fw-bold" style="font-size: 12pt">${Helper.formatCurrency(grandTotal)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
    },

    printIndividual: (data, period) => {
        const printWindow = window.open('', '_blank');
        let slipsHtml = '';

        data.forEach(r => {
            let detailsHtml = '';
            r.details.forEach(d => {
                const amount = parseFloat(d.amount);
                detailsHtml += `
                    <tr>
                        <td>${d.description}</td>
                        <td class="text-end">${amount > 0 ? Helper.formatCurrency(amount) : '-'}</td>
                        <td class="text-end">${amount < 0 ? Helper.formatCurrency(Math.abs(amount)) : '-'}</td>
                    </tr>
                `;
            });

            slipsHtml += `
                <div class="slip-container">
                    <div class="border p-4" style="height: 14cm; border: 1.5px solid #000 !important; border-radius: 8px;">
                        <div class="row mb-4 border-bottom pb-2">
                            <div class="col-8">
                                <h5 class="fw-bold mb-0">DESPRENDIBLE DE PAGO DE NÓMINA</h5>
                                <small>${period.name.toUpperCase()} | ${period.start_date} al ${period.end_date}</small>
                            </div>
                            <div class="col-4 text-end">
                                <small class="text-muted">PAE CONTROL</small>
                            </div>
                        </div>

                        <div class="row g-2 mb-4 bg-light p-2 rounded">
                            <div class="col-8">
                                <div class="small fw-bold">EMPLEADO:</div>
                                <div class="text-uppercase">${r.first_name} ${r.last_name1}</div>
                                <div class="small mt-1"><span class="fw-bold">ID:</span> ${r.document_number}</div>
                            </div>
                            <div class="col-4">
                                <div class="small fw-bold">CARGO:</div>
                                <div class="text-uppercase">${r.position_name || 'N/A'}</div>
                            </div>
                        </div>

                        <table class="table table-sm table-striped border">
                            <thead>
                                <tr class="small text-uppercase fw-bold">
                                    <th>Concepto</th>
                                    <th class="text-end">Devengados</th>
                                    <th class="text-end">Deducciones</th>
                                </tr>
                            </thead>
                            <tbody class="small">${detailsHtml}</tbody>
                            <tfoot>
                                <tr class="fw-bold">
                                    <td>TOTALES:</td>
                                    <td class="text-end">${Helper.formatCurrency(r.total_devengado)}</td>
                                    <td class="text-end">${Helper.formatCurrency(r.total_deduccion)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div class="mt-4 row align-items-end">
                            <div class="col-6">
                                <div class="border-top text-center pt-2 small mt-5" style="border-top: 1px solid #000 !important;">
                                    Firma del Empleado
                                </div>
                            </div>
                            <div class="col-6 text-end">
                                <div class="bg-dark text-white p-3 rounded d-inline-block">
                                    <div class="small">NETO RECIBIDO:</div>
                                    <div class="h5 mb-0 fw-bold">${Helper.formatCurrency(r.total_neto)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="page-break-after: always;"></div>
            `;
        });

        printWindow.document.write(`
            <html>
                <head>
                    <title>Desprendibles - ${period.name}</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        body { padding: 40px; font-family: Arial, sans-serif; }
                        .slip-container { padding: 10px; margin-bottom: 20px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="text-end no-print mb-4">
                        <button class="btn btn-primary" onclick="window.print()">Imprimir Todo</button>
                    </div>
                    ${slipsHtml}
                </body>
            </html>
        `);
        printWindow.document.close();
    },

    printIntegral: (data, period, is_exonerated) => {
        const printWindow = window.open('', '_blank');
        let rowsHtml = '';
        let sums = { devengado: 0, salud: 0, pension: 0, arl: 0, paraf: 0, cesantias: 0, intereses: 0, prima: 0, vacac: 0, total: 0 };

        data.forEach(r => {
            // Extraer auxilio de transporte para descontarlo de la base (las prestaciones y seg. soc. lo ignoran donde manda la norma)
            let auxTrans = 0;
            if (r.details) {
                const auxDet = r.details.find(d => d.description.toUpperCase().includes('AUXILIO') && d.description.toUpperCase().includes('TRANSPORTE'));
                if (auxDet) auxTrans = parseFloat(auxDet.amount);
            }

            const totalDev = parseFloat(r.total_devengado);
            const baseSinAux = totalDev - auxTrans;
            const arlPercent = r.arl_risk_percent ? (parseFloat(r.arl_risk_percent) / 100) : 0.00522; // Default Riesgo I

            // Calculos Empresariales
            const saludEmp = is_exonerated ? 0 : baseSinAux * 0.085;
            const pensionEmp = baseSinAux * 0.12;
            const arlEmp = baseSinAux * arlPercent;
            const parafiscales = is_exonerated ? (baseSinAux * 0.04) : (baseSinAux * 0.09); // CCF 4% (exonerated), CCF+SENA+ICBF 9% (non-exonerated)

            const cesantias = totalDev * 0.0833;
            const intereses = cesantias * 0.12;
            const prima = totalDev * 0.0833;
            // Vacaciones se provisionan sobre base salarial real sin subsidio de transporte
            const vacaciones = baseSinAux * 0.0417;

            const totalCosto = totalDev + saludEmp + pensionEmp + arlEmp + parafiscales + cesantias + intereses + prima + vacaciones;

            // acumular
            sums.devengado += totalDev;
            sums.salud += saludEmp;
            sums.pension += pensionEmp;
            sums.arl += arlEmp;
            sums.paraf += parafiscales;
            sums.cesantias += cesantias;
            sums.intereses += intereses;
            sums.prima += prima;
            sums.vacac += vacaciones;
            sums.total += totalCosto;

            rowsHtml += `
                <tr>
                    <td><b>${r.first_name} ${r.last_name1}</b><br><small class="text-muted">${r.document_number}</small></td>
                    <td><small>${r.position_name || 'N/A'}</small></td>
                    <td class="text-end">${Helper.formatCurrency(totalDev)}</td>
                    <td class="text-end text-danger">${Helper.formatCurrency(saludEmp)}</td>
                    <td class="text-end text-danger">${Helper.formatCurrency(pensionEmp)}</td>
                    <td class="text-end text-danger" title="Riesgo ARL: ${(arlPercent * 100).toFixed(3)}%">${Helper.formatCurrency(arlEmp)}</td>
                    <td class="text-end text-danger">${Helper.formatCurrency(parafiscales)}</td>
                    <td class="text-end text-warning">${Helper.formatCurrency(cesantias)}</td>
                    <td class="text-end text-warning">${Helper.formatCurrency(intereses)}</td>
                    <td class="text-end text-warning">${Helper.formatCurrency(prima)}</td>
                    <td class="text-end text-warning">${Helper.formatCurrency(vacaciones)}</td>
                    <td class="text-end fw-bold bg-light">${Helper.formatCurrency(totalCosto)}</td>
                </tr>
            `;
        });

        const excelScript = `
            function exportExcel() {
                var tableStr = document.getElementById('integral-table').outerHTML;
                var htmlStr = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>' + tableStr + '</body></html>';
                var defaultFileName = 'Nomina_Integral_${period.name.replace(/ /g, '_')}.xls';
                
                var blob = new Blob([htmlStr], { type: 'application/vnd.ms-excel' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = defaultFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Nómina Integral - ${period.name}</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        body { padding: 30px; font-family: Arial, sans-serif; font-size: 9pt; }
                        .header-rep { border-bottom: 2px solid #1a1a1a; margin-bottom: 20px; padding-bottom: 10px; }
                        table th { background: #f8f9fa !important; border-top: 2px solid #000 !important; font-size: 8.5pt; vertical-align: middle; text-align: center; }
                        table td { vertical-align: middle; padding: 4px 6px !important; }
                        @media print { 
                            @page { size: landscape; margin: 1cm; }
                            .no-print { display: none !important; } 
                        }
                    </style>
                    <script>${excelScript}</script>
                </head>
                <body>
                    <div class="text-end no-print mb-4">
                        <button class="btn btn-success me-2" onclick="exportExcel()">Exportar a Excel</button>
                        <button class="btn btn-primary" onclick="window.print()">Imprimir PDF</button>
                    </div>
                    <div class="header-rep d-flex justify-content-between align-items-center">
                        <div>
                            <h2 class="mb-0 fw-bold">NÓMINA INTEGRAL (COSTO TOTAL EMPLEADOR)</h2>
                            <h5 class="text-muted mb-0">${period.name.toUpperCase()} (${period.start_date} al ${period.end_date})</h5>
                        </div>
                        <div class="text-end">
                            ${is_exonerated ? '<span class="badge bg-info p-2">APLICA EXONERACIÓN LEY 1819</span>' : '<span class="badge bg-secondary p-2">NO APLICA EXONERACIÓN LEY 1819</span>'}
                        </div>
                    </div>
                    <table id="integral-table" class="table table-bordered table-sm align-middle mt-4 w-100">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Cargo</th>
                                <th>T. Devengado</th>
                                <th>Salud (Emp)</th>
                                <th>Pensión (Emp)</th>
                                <th>ARL (Emp)</th>
                                <th>Parafiscales</th>
                                <th>Cesantías</th>
                                <th>Int. Cesan</th>
                                <th>Prima</th>
                                <th>Vacaciones</th>
                                <th class="bg-light">COSTO TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                        <tfoot>
                            <tr class="table-dark">
                                <td colspan="2" class="text-end fw-bold">TOTALES GENERALES:</td>
                                <td class="text-end fw-bold">${Helper.formatCurrency(sums.devengado)}</td>
                                <td class="text-end fw-bold">${Helper.formatCurrency(sums.salud)}</td>
                                <td class="text-end fw-bold">${Helper.formatCurrency(sums.pension)}</td>
                                <td class="text-end fw-bold">${Helper.formatCurrency(sums.arl)}</td>
                                <td class="text-end fw-bold">${Helper.formatCurrency(sums.paraf)}</td>
                                <td class="text-end fw-bold">${Helper.formatCurrency(sums.cesantias)}</td>
                                <td class="text-end fw-bold">${Helper.formatCurrency(sums.intereses)}</td>
                                <td class="text-end fw-bold">${Helper.formatCurrency(sums.prima)}</td>
                                <td class="text-end fw-bold">${Helper.formatCurrency(sums.vacac)}</td>
                                <td class="text-end fw-bold fs-6">${Helper.formatCurrency(sums.total)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
};

ReportsPayrollView.init();

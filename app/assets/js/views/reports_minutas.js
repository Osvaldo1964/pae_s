/**
 * Reporte: Minutas x Ciclo x Sede
 */
window.ReportsMinutasView = {
    schools: [],
    branches: [],
    cycles: [],

    async init() {
        Helper.loading(true);
        await this.loadMasterData();
        this.render();
        this.attachEvents();
        Helper.loading(false);
    },

    async loadMasterData() {
        try {
            const [schoolRes, branchRes, cycleRes] = await Promise.all([
                Helper.fetchAPI('/schools'),
                Helper.fetchAPI('/branches'),
                Helper.fetchAPI('/menu-cycles')
            ]);

            this.schools = Array.isArray(schoolRes) ? schoolRes : (schoolRes.success ? schoolRes.data : []);
            this.branches = Array.isArray(branchRes) ? branchRes : (branchRes.success ? branchRes.data : []);
            this.cycles = Array.isArray(cycleRes) ? cycleRes : (cycleRes.success ? cycleRes.data : []);
        } catch (error) {
            console.error('Error loading master data for minutas report:', error);
        }
    },

    render() {
        document.getElementById('app').innerHTML = `
            <div class="container-fluid fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-calendar-alt me-2 text-success"></i>Minutas x Ciclo x Sede</h2>
                        <p class="text-muted mb-0">Generación de minutas semanales para publicación en sedes</p>
                    </div>
                </div>

                <div class="card shadow-sm border-0 mb-4">
                    <div class="card-body bg-light rounded">
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">INSTITUCIÓN (COLEGIO)</label>
                                <select id="report-minuta-school" class="form-select">
                                    <option value="">-- Seleccione Colegio --</option>
                                    ${this.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">SEDE</label>
                                <select id="report-minuta-branch" class="form-select" disabled>
                                    <option value="">-- Seleccione Sede --</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold">CICLO DE MENÚ</label>
                                <select id="report-minuta-cycle" class="form-select">
                                    <option value="">-- Seleccione Ciclo --</option>
                                    ${this.cycles.map(c => `<option value="${c.id}">${c.name} (${c.start_date} al ${c.end_date})</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold">FECHA INICIO</label>
                                <input type="date" id="report-minuta-start" class="form-control">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold">FECHA FIN</label>
                                <input type="date" id="report-minuta-end" class="form-control">
                            </div>
                            <div class="col-md-6 d-flex align-items-end gap-2">
                                <button class="btn btn-primary w-100 fw-bold" onclick="ReportsMinutasView.generateReport('print')">
                                    <i class="fas fa-print me-2"></i> Generar Vista de Impresión (PDF)
                                </button>
                                <button class="btn btn-success w-100 fw-bold" onclick="ReportsMinutasView.generateReport('excel')">
                                    <i class="fas fa-file-excel me-2"></i> Exportar a Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="minuta-report-preview" class="text-center py-5 text-muted">
                    <i class="fas fa-search fa-3x mb-3 opacity-25"></i>
                    <p>Seleccione los filtros para generar la minuta</p>
                </div>
            </div>
        `;
    },

    attachEvents() {
        const schoolSelect = document.getElementById('report-minuta-school');
        const branchSelect = document.getElementById('report-minuta-branch');
        const cycleSelect = document.getElementById('report-minuta-cycle');

        schoolSelect.addEventListener('change', () => {
            const schoolId = schoolSelect.value;
            branchSelect.innerHTML = '<option value="">-- Seleccione Sede --</option>';

            if (schoolId) {
                const filteredBranches = this.branches.filter(b => b.school_id == schoolId);
                filteredBranches.forEach(b => {
                    branchSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`;
                });
                branchSelect.disabled = false;
            } else {
                branchSelect.disabled = true;
            }
        });

        cycleSelect.addEventListener('change', () => {
            const cycleId = cycleSelect.value;
            if (cycleId) {
                const cycle = this.cycles.find(c => c.id == cycleId);
                document.getElementById('report-minuta-start').value = cycle.start_date;
                document.getElementById('report-minuta-end').value = cycle.end_date;
            }
        });
    },

    async generateReport(format) {
        const schoolId = document.getElementById('report-minuta-school').value;
        const branchId = document.getElementById('report-minuta-branch').value;
        const cycleId = document.getElementById('report-minuta-cycle').value;
        const startDate = document.getElementById('report-minuta-start').value;
        const endDate = document.getElementById('report-minuta-end').value;

        if (!schoolId || !branchId || !cycleId || !startDate || !endDate) {
            Helper.alert('warning', 'Por favor complete todos los filtros');
            return;
        }

        Helper.loading(true);
        try {
            // Obtenemos el detalle del ciclo que contiene los días y menús
            const res = await Helper.fetchAPI(`/menu-cycles/${cycleId}`);
            Helper.loading(false);

            if (res.success) {
                const school = this.schools.find(s => s.id == schoolId);
                const branch = this.branches.find(b => b.id == branchId);
                const cycle = this.cycles.find(c => c.id == cycleId);

                // Deducir automáticamente si el ciclo incluye fines de semana en base a los días reales versus hábiles en su rango
                const includeWeekends = this.detectIncludeWeekends(cycle.start_date, cycle.end_date, res.data);

                const filteredDays = this.filterDaysByDate(res.data, startDate, endDate, cycleId, includeWeekends);

                if (format === 'print') {
                    this.printMinuta(filteredDays, school, branch, cycle, startDate, endDate, includeWeekends);
                } else {
                    this.excelMinuta(filteredDays, school, branch, cycle, startDate, endDate, includeWeekends);
                }
            } else {
                Helper.alert('error', 'No se pudo obtener la información del ciclo');
            }
        } catch (error) {
            Helper.loading(false);
            console.error(error);
            Helper.alert('error', 'Error al generar el reporte');
        }
    },

    detectIncludeWeekends(startDateStr, endDateStr, days) {
        // Si hay algún día con "SÁBADO", "SABADO" o "DOMINGO" en el nombre, incluye fines de semana
        if (Array.isArray(days)) {
            const hasWeekendName = days.some(d => {
                const name = (d.name || '').toUpperCase();
                return name.includes('SÁBADO') || name.includes('SABADO') || name.includes('DOMINGO');
            });
            if (hasWeekendName) return true;
        }

        const totalDays = Array.isArray(days) ? days.length : 0;
        let start = new Date(startDateStr + 'T00:00:00');
        let end = new Date(endDateStr + 'T00:00:00');
        
        let businessDays = 0;
        let currentDate = new Date(start);
        while (currentDate <= end) {
            const day = currentDate.getDay();
            if (day !== 0 && day !== 6) {
                businessDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return totalDays > businessDays;
    },

    /**
     * Calcula la fecha real para el N-ésimo día de alimentación (saltando fines de semana)
     * O si viene con formato de fecha en el nombre del menú, parsea esa fecha.
     */
    getFeedingDate(startDateStr, dayNumber, dayName = '', includeWeekends = false) {
        if (dayName) {
            const match = dayName.match(/(\d{2})\/(\d{2})$/);
            if (match) {
                const day = match[1];
                const month = match[2];
                const startYear = parseInt(startDateStr.split('-')[0]);
                const startMonth = parseInt(startDateStr.split('-')[1]);
                
                let year = startYear;
                if (parseInt(month) < startMonth && startMonth === 12) {
                    year = startYear + 1;
                } else if (parseInt(month) > startMonth && startMonth === 1 && parseInt(month) === 12) {
                    year = startYear - 1;
                }
                
                const parsedDate = new Date(`${year}-${month}-${day}T00:00:00`);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate;
                }
            }
        }

        let date = new Date(startDateStr + 'T00:00:00');
        if (includeWeekends) {
            date.setDate(date.getDate() + (dayNumber - 1));
            return date;
        }

        // Asegurar que empezamos un día hábil
        while (date.getDay() === 0 || date.getDay() === 6) {
            date.setDate(date.getDate() + 1);
        }

        let currentCount = 1;
        while (currentCount < dayNumber) {
            date.setDate(date.getDate() + 1);
            if (date.getDay() !== 0 && date.getDay() !== 6) {
                currentCount++;
            }
        }
        return date;
    },

    filterDaysByDate(allDays, start, end, cycleId, includeWeekends = false) {
        const cycle = this.cycles.find(c => c.id == cycleId);
        const targetStart = new Date(start + 'T00:00:00');
        const targetEnd = new Date(end + 'T00:00:00');

        return allDays.filter(d => {
            const dayDate = this.getFeedingDate(cycle.start_date, d.day, d.name, includeWeekends);
            return dayDate >= targetStart && dayDate <= targetEnd;
        });
    },

    printMinuta(days, school, branch, cycle, start, end, includeWeekends = false) {
        const printWindow = window.open('', '_blank');

        let daysHtml = '';

        days.forEach(d => {
            const dayDate = this.getFeedingDate(cycle.start_date, d.day, d.name, includeWeekends);

            const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
            const dayNum = dayDate.getDate();
            const monthName = dayDate.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
            const fullDateStr = `${dayName} ${dayNum} DE ${monthName}`;

            const mealsHtml = d.meals.map(m => `
                <div class="meal-item text-start text-break">
                    <div class="meal-type">${m.meal_type}</div>
                    <div class="meal-name">${m.name}</div>
                    <div class="meal-desc">${m.description || ''}</div>
                </div>
            `).join('');

            daysHtml += `
                <div class="day-container">
                    <div class="card h-100 border-1 shadow-none">
                        <div class="card-header bg-success text-white text-center py-1">
                            <span class="fw-bold small">${fullDateStr}</span>
                        </div>
                        <div class="card-body p-2">
                            ${mealsHtml}
                        </div>
                    </div>
                </div>
            `;
        });

        printWindow.document.write(`
            <html>
                <head>
                    <title>Minuta PAE - ${branch.name}</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @page { size: portrait; margin: 1cm; }
                        body { padding: 0; background: white; font-family: 'Arial', sans-serif; font-size: 10pt; }
                        .header-box { border: 1.5px solid #198754; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
                        h1 { color: #198754; font-weight: 800; font-size: 16pt; margin-bottom: 5px; }
                        h4 { font-size: 12pt; margin-bottom: 10px; }
                        hr { margin: 10px 0; opacity: 0.15; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: left; font-size: 9pt; }
                        
                        .days-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
                        .day-container { break-inside: avoid-column; page-break-inside: avoid; margin-bottom: 10px; }
                        .card { border-radius: 4px !important; }
                        .card-header { padding: 4px !important; line-height: 1; }
                        
                        .meal-item { border-left: 3px solid #198754; padding-left: 8px; margin-bottom: 8px; background: #f8f9fa; padding-top: 4px; padding-bottom: 4px; }
                        .meal-type { font-size: 7.5pt; color: #198754; font-weight: bold; text-transform: uppercase; line-height: 1.1; }
                        .meal-name { font-size: 9.5pt; font-weight: bold; color: #333; line-height: 1.2; margin: 2px 0; }
                        .meal-desc { font-size: 8.5pt; color: #666; font-style: italic; line-height: 1.2; }
                        
                        .no-print { display: none; }
                        @media print {
                            .btn-float { display: none !important; }
                        }
                        .btn-float { position: fixed; bottom: 20px; right: 20px; z-index: 1000; }
                    </style>
                </head>
                <body>
                    <div class="btn-float">
                        <button class="btn btn-success btn-lg rounded-pill shadow-lg px-4" onclick="window.print()">
                            <i class="fas fa-print me-2"></i> IMPRIMIR AHORA
                        </button>
                    </div>

                    <div class="header-box text-center">
                        <h1 class="text-uppercase">Minuta Patrón de Alimentación</h1>
                        <h4 class="text-secondary">Programa de Alimentación ${App.state.user?.pae || 'PAE'}</h4>
                        <hr>
                        <div class="info-grid">
                            <div>
                                <strong>CENTRO:</strong> ${school.name.toUpperCase()}<br>
                                <strong>SEDE:</strong> ${branch.name.toUpperCase()}
                            </div>
                            <div class="text-end">
                                <strong>CICLO:</strong> ${cycle.name.toUpperCase()}<br>
                                <strong>PERIODO:</strong> ${start} AL ${end}
                            </div>
                        </div>
                    </div>

                    <div class="days-grid">
                        ${daysHtml}
                    </div>

                    <div class="mt-4 text-center x-small text-muted border-top pt-2" style="font-size: 8pt;">
                        Para uso exclusivo y publicación obligatoria en el comedor escolar conforme a la Resolución 0003 de 2026.
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    },

    excelMinuta(days, school, branch, cycle, start, end, includeWeekends = false) {
        const templateName = cycle.template_name || branch.name;
        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"></head>
            <body>
                <table border="1">
                    <tr><th colspan="3" style="font-size:18pt; background:#198754; color:white;">MINUTA PATRÓN - ${templateName}</th></tr>
                    <tr><td colspan="3"><b>CENTRO:</b> ${school.name}</td></tr>
                    <tr><td colspan="3"><b>PERIODO:</b> ${start} al ${end}</td></tr>
                    <tr><td colspan="3"></td></tr>
                    <tr style="background:#f2f2f2; font-weight:bold;">
                        <th>FECHA / DÍA</th>
                        <th>TIPO DE RACIÓN</th>
                        <th>MENÚ / PREPARACIÓN</th>
                    </tr>
        `;

        days.forEach(d => {
            const dayDate = this.getFeedingDate(cycle.start_date, d.day, d.name, includeWeekends);
            const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
            const dayNum = dayDate.getDate();
            const monthName = dayDate.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
            const fullDateStr = `${dayName}<br>${dayNum} DE ${monthName}`;

            d.meals.forEach((m, index) => {
                html += `
                    <tr>
                        ${index === 0 ? `<td rowspan="${d.meals.length}" align="center" valign="middle"><b>${fullDateStr}</b></td>` : ''}
                        <td>${m.meal_type}</td>
                        <td>
                            <b>${m.name}</b><br>
                            <small>${m.description || ''}</small>
                        </td>
                    </tr>
                `;
            });
        });

        html += `</table></body></html>`;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const cleanName = (str) => (str || '').trim().replace(/[\s/\\?%*:|"<>\.\-\(\)]+/g, '_').replace(/_+/g, '_');
        const cleanTemplate = cleanName(templateName);
        const cleanSchool = cleanName(school.name);
        const cleanBranch = cleanName(branch.name);
        
        a.download = `Minuta_Patron_${cleanTemplate}_${cleanSchool}_${cleanBranch}_${start}_${end}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};

if (typeof ReportsMinutasView !== 'undefined') {
    ReportsMinutasView.init();
}

/**
 * Print Weekly Attendance Sheet - PAE
 * Formato: ORDEN | ID | NOMBRES | [L-D: D,M,A,T,C] | FIRMA
 */
const PrintListView = {
    modalId: 'modalPrintList',

    RATION_TYPES: [
        { initial: 'D', name: 'Desayuno' },
        { initial: 'M', name: 'Media Mañana' },
        { initial: 'A', name: 'Almuerzo' },
        { initial: 'T', name: 'Media Tarde' },
        { initial: 'C', name: 'Cena' }
    ],

    DAY_NAMES: ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'],

    openModal: async () => {
        // Inyectar modal si aún no existe en el DOM
        if (!document.getElementById(PrintListView.modalId)) {
            PrintListView.injectModal();
        }

        // Mostrar el modal PRIMERO (con "Cargando..." en el select)
        const modal = new bootstrap.Modal(document.getElementById(PrintListView.modalId));
        modal.show();

        // Cargar sedes en segundo plano (sin bloquear la UI)
        await PrintListView.loadBranches();
    },

    injectModal: () => {
        const html = `
        <div class="modal fade" id="${PrintListView.modalId}" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="fas fa-calendar-week me-2"></i>Planilla Semanal de Asistencia</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="formPrintList">
                            <div class="mb-3">
                                <label class="form-label fw-bold">Sede Educativa *</label>
                                <select class="form-select" id="print-branch-id" required>
                                    <option value="">Cargando...</option>
                                </select>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Grado (Opcional)</label>
                                    <select class="form-select" id="print-grade">
                                        <option value="">Todos los Grados</option>
                                        <option value="TRANSICION">Transición</option>
                                        <option value="1">Primero</option>
                                        <option value="2">Segundo</option>
                                        <option value="3">Tercero</option>
                                        <option value="4">Cuarto</option>
                                        <option value="5">Quinto</option>
                                        <option value="6">Sexto</option>
                                        <option value="7">Séptimo</option>
                                        <option value="8">Octavo</option>
                                        <option value="9">Noveno</option>
                                        <option value="10">Décimo</option>
                                        <option value="11">Undécimo</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Grupo (Opcional)</label>
                                    <input type="text" class="form-control" id="print-group" placeholder="Ej: 01">
                                </div>
                            </div>

                            <label class="form-label fw-bold">Seleccionar Semana</label>
                            <div class="btn-group w-100 mb-2">
                                <button type="button" class="btn btn-outline-secondary btn-sm"
                                    onclick="PrintListView.setDateRange('week')">Esta Semana</button>
                                <button type="button" class="btn btn-outline-secondary btn-sm"
                                    onclick="PrintListView.setDateRange('prev-week')">Semana Anterior</button>
                            </div>
                            <div class="row">
                                <div class="col-6">
                                    <label class="form-label small text-muted">Inicio de Semana</label>
                                    <input type="date" class="form-control" id="print-start-date" required>
                                </div>
                                <div class="col-6">
                                    <label class="form-label small text-muted">Fin de Semana</label>
                                    <input type="date" class="form-control" id="print-end-date" required>
                                </div>
                            </div>
                            <div class="alert alert-info mt-2 py-1 px-2 mb-0">
                                <small><i class="fas fa-info-circle me-1"></i>
                                La planilla siempre muestra <strong>Lunes a Domingo</strong>. Las fechas aparecen en el encabezado de cada día.</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="PrintListView.generate()">
                            <i class="fas fa-print me-2"></i>Generar Planilla
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        PrintListView.setDateRange('week');
    },

    loadBranches: async () => {
        try {
            const select = document.getElementById('print-branch-id');
            select.innerHTML = '<option value="">Cargando sedes...</option>';

            // Obtener colegios y sedes en paralelo
            let schools = BeneficiariesView?.schools?.length ? BeneficiariesView.schools : await Helper.fetchAPI('/schools');
            let branches = BeneficiariesView?.branches?.length ? BeneficiariesView.branches : await Helper.fetchAPI('/branches');

            select.innerHTML = '<option value="">Seleccione Sede...</option>';

            if (!Array.isArray(schools) || !Array.isArray(branches)) return;

            schools.forEach(school => {
                // Filtrar las sedes de este colegio
                const schoolBranches = branches.filter(b => b.school_id == school.id);
                if (schoolBranches.length > 0) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = school.name;
                    schoolBranches.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.id;
                        opt.text = b.name;
                        optgroup.appendChild(opt);
                    });
                    select.appendChild(optgroup);
                }
            });
        } catch (e) {
            console.error('Error loading branches', e);
            Helper.alert('error', 'Error cargando sedes');
        }
    },

    setDateRange: (type) => {
        const today = new Date();
        const day = today.getDay() || 7; // 1=Lun ... 7=Dom

        const monday = new Date(today);
        monday.setDate(today.getDate() - (day - 1));

        if (type === 'prev-week') {
            monday.setDate(monday.getDate() - 7);
        }

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        document.getElementById('print-start-date').value = monday.toISOString().split('T')[0];
        document.getElementById('print-end-date').value = sunday.toISOString().split('T')[0];
    },

    generate: async () => {
        const branchId = document.getElementById('print-branch-id').value;
        const grade = document.getElementById('print-grade').value;
        const group = document.getElementById('print-group').value;
        const startDateStr = document.getElementById('print-start-date').value;
        const endDateStr = document.getElementById('print-end-date').value;

        if (!branchId || !startDateStr || !endDateStr) {
            Helper.alert('warning', 'Por favor complete los campos obligatorios');
            return;
        }

        try {
            const params = new URLSearchParams({ branch_id: branchId, grade, group_name: group });
            const res = await Helper.fetchAPI(`/beneficiarios/print-list?${params.toString()}`);

            if (!res.success) {
                Helper.alert('error', res.message || 'No se encontraron datos');
                return;
            }
            if (!res.data || res.data.length === 0) {
                Helper.alert('info', 'No hay beneficiarios que coincidan con los filtros.');
                return;
            }

            const html = PrintListView.buildHTML(res.data, res.branch, startDateStr, endDateStr);
            Helper.printHTML(html);
            bootstrap.Modal.getInstance(document.getElementById(PrintListView.modalId)).hide();

        } catch (e) {
            console.error(e);
            Helper.alert('error', 'Error generando la planilla');
        }
    },

    /** Obtiene el lunes de la semana que contiene la fecha dada */
    getMondayOf: (dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const dow = date.getDay() || 7; // 1=Lun, 7=Dom
        date.setDate(date.getDate() - (dow - 1));
        return date;
    },

    /** Formatea como DD/MM */
    fmtDMY: (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,

    buildHTML: (list, branchInfo, startDateStr, endDateStr) => {
        const RT = PrintListView.RATION_TYPES;
        const DAYS = PrintListView.DAY_NAMES;
        const fmt = PrintListView.fmtDMY;

        // Calcular el lunes de la semana del startDate
        const monday = PrintListView.getMondayOf(startDateStr);

        // Generar las 7 fechas (Lun-Dom)
        const weekDates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });

        const weekLabel = `${fmt(weekDates[0])} al ${fmt(weekDates[6])}/${weekDates[6].getFullYear()}`;

        // ── Fila 1 del encabezado ──
        let row1 = `
            <th rowspan="2" class="h-main" style="width:2%">ORDEN</th>
            <th rowspan="2" class="h-main" style="width:8%">IDENTIFICACIÓN</th>
            <th rowspan="2" class="h-main" style="width:14%">NOMBRES Y APELLIDOS</th>`;

        weekDates.forEach((d, i) => {
            row1 += `<th colspan="${RT.length}" class="h-day">${DAYS[i]}<br><span class="dsub">${fmt(d)}</span></th>`;
        });
        row1 += `<th rowspan="2" class="h-main" style="width:12%">FIRMA BENEFICIARIO</th>`;

        // ── Fila 2 del encabezado (iniciales de ración) ──
        let row2 = '';
        for (let i = 0; i < 7; i++) {
            RT.forEach(rt => { row2 += `<th class="h-rat">${rt.initial}</th>`; });
        }

        // ── Filas de datos ──
        let rows = '';
        list.forEach((b, idx) => {
            const fullName = [b.first_name, b.second_name, b.last_name1, b.last_name2]
                .filter(Boolean).join(' ');

            let cells = '';
            for (let d = 0; d < 7; d++) {
                for (let r = 0; r < RT.length; r++) {
                    cells += '<td class="c-empty"></td>';
                }
            }

            rows += `
            <tr>
                <td class="c-ctr">${idx + 1}</td>
                <td class="c-ctr">${b.document_number}</td>
                <td class="c-name">${fullName}</td>
                ${cells}
                <td class="c-firma"></td>
            </tr>`;
        });

        // ── Leyenda ──
        const legend = RT.map(rt => `<b>${rt.initial}</b> = ${rt.name}`).join(' &nbsp;·&nbsp; ');

        // ── HTML completo ──
        return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Planilla Semanal de Asistencia PAE</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:9px;color:#000}

/* ── ENCABEZADO ── */
.rep-header{display:flex;align-items:center;border:2px solid #003366;padding:6px 8px;margin-bottom:6px}
.rep-logo{width:55px;text-align:center}
.rep-logo img{max-height:48px}
.rep-info{flex:1;text-align:center;padding:0 8px}
.rep-info h2{font-size:11px;text-transform:uppercase;color:#003366;font-weight:bold;margin-bottom:2px}
.rep-info p{font-size:8px;margin:1px 0}
.week-badge{display:inline-block;background:#003366;color:#FFD700;padding:2px 8px;border-radius:3px;font-size:8px;margin-top:3px;font-weight:bold}

/* ── TABLA ── */
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #336699;padding:2px 1px;text-align:center;vertical-align:middle}

.h-main{background:#003366;color:#FFD700;font-size:8px;font-weight:bold;text-transform:uppercase}
.h-day{background:#FFD700;color:#003366;font-size:8px;font-weight:bold;text-transform:uppercase;white-space:nowrap}
.h-day .dsub{font-weight:normal;font-size:7px;color:#003366}
.h-rat{background:#D6E4F7;color:#003366;font-size:8px;font-weight:bold;width:1.8%}

.c-empty{width:1.8%;height:24px;background:#fff}
.c-ctr{font-size:8px}
.c-name{text-align:left;padding-left:3px;font-size:8px}
.c-firma{background:#f9f9f9;height:24px}

tbody tr:nth-child(even) td{background:#F0F5FF}
tbody tr:nth-child(even) .c-empty{background:#F0F5FF}
tbody tr:nth-child(even) .c-firma{background:#E8EFFE}

/* ── LEYENDA ── */
.legend{margin-top:5px;padding:3px 6px;border:1px solid #ccc;font-size:7.5px;color:#444;background:#f9f9f9}

/* ── PIE DE FIRMAS ── */
.sig-footer{margin-top:22px;display:flex;justify-content:space-around}
.sig-box{text-align:center}
.sig-line{border-top:1px solid #000;width:170px;margin:0 auto 3px}
.sig-box p{font-size:8px}

/* ── PRINT ── */
@media print{
  @page { size: legal landscape; margin: 7mm; }
  .h-main{background:#003366!important;color:#FFD700!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .h-day{background:#FFD700!important;color:#003366!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .h-rat{background:#D6E4F7!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  tbody tr:nth-child(even) td{background:#F0F5FF!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>

<!-- ENCABEZADO -->
<div class="rep-header">
    <div class="rep-logo"><!-- logo izq --></div>
    <div class="rep-info">
        <h2>Planilla de Control de Asistencia y Entrega de Raciones &mdash; PAE</h2>
        <p><strong>Institución:</strong> ${branchInfo.school_name || ''} &nbsp;|&nbsp; <strong>Sede:</strong> ${branchInfo.branch_name || ''}</p>
        <p><strong>Total beneficiarios:</strong> ${list.length}</p>
        <span class="week-badge">SEMANA: ${weekLabel}</span>
    </div>
    <div class="rep-logo"><!-- logo der --></div>
</div>

<!-- TABLA -->
<table>
    <thead>
        <tr>${row1}</tr>
        <tr>${row2}</tr>
    </thead>
    <tbody>${rows}</tbody>
</table>

<!-- LEYENDA -->
<div class="legend"><strong>Referencias:</strong> &nbsp; ${legend} &nbsp;&nbsp;&nbsp; <strong>Marque con X si recibió la ración</strong></div>

<!-- PIE DE FIRMAS -->
<div class="sig-footer">
    <div class="sig-box">
        <div class="sig-line"></div>
        <p>Docente / Responsable de Entrega</p>
    </div>
    <div class="sig-box">
        <div class="sig-line"></div>
        <p>Operador PAE</p>
    </div>
    <div class="sig-box">
        <div class="sig-line"></div>
        <p>Rector / Director</p>
    </div>
</div>

</body>
</html>`;
    }
};

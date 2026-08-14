/**
 * Reporte: Generación e Impresión de Carnets QR por Curso / Grupo
 * Permite generar carnets grupales con código QR para entrega masiva de alimentación.
 */
window.ReportsQrCoursesView = {
    schools: [],
    branches: [],
    beneficiaries: [],
    availableGroups: [],

    async init() {
        Helper.loading(true, 'Cargando instituciones y sedes...');
        await this.loadMasterData();
        this.render();
        this.attachEvents();
        Helper.loading(false);
    },

    async loadMasterData() {
        try {
            const [schoolRes, branchRes, benRes] = await Promise.all([
                Helper.fetchAPI('/schools'),
                Helper.fetchAPI('/branches'),
                Helper.fetchAPI('/beneficiarios')
            ]);

            this.schools = Array.isArray(schoolRes) ? schoolRes : (schoolRes.success ? schoolRes.data : []);
            this.branches = Array.isArray(branchRes) ? branchRes : (branchRes.success ? branchRes.data : []);
            const allBens = Array.isArray(benRes) ? benRes : (benRes.success ? benRes.data : []);
            // Filtrar beneficiarios activos
            this.beneficiaries = allBens.filter(b => b.status === 'ACTIVO' || !b.status);
        } catch (error) {
            console.error('Error loading master data for QR courses report:', error);
            Helper.alert('error', 'Error al cargar los datos');
        }
    },

    render() {
        const container = document.getElementById('app-container') || document.getElementById('app');
        if (!container) return;

        container.innerHTML = `
            <div class="container-fluid py-4 fade-in">
                <!-- Header -->
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1 text-primary fw-bold"><i class="fas fa-qrcode me-2"></i>Generar QR por Cursos</h2>
                        <p class="text-muted mb-0">Impresión de carnets QR grupales para el registro masivo de raciones por aula o curso</p>
                    </div>
                </div>

                <!-- Filtros de Selección -->
                <div class="card border-0 shadow-sm rounded-4 mb-4">
                    <div class="card-body p-4 bg-light rounded-4">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-5">
                                <label class="form-label small fw-bold text-secondary">INSTITUCIÓN EDUCATIVA (COLEGIO)</label>
                                <select id="qr-course-school" class="form-select border-2">
                                    <option value="">-- Seleccione Colegio --</option>
                                    ${this.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-5">
                                <label class="form-label small fw-bold text-secondary">SEDE EDUCATIVA</label>
                                <select id="qr-course-branch" class="form-select border-2" disabled>
                                    <option value="">-- Seleccione Sede --</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <button class="btn btn-primary w-100 fw-bold rounded-pill" onclick="ReportsQrCoursesView.loadGroups()">
                                    <i class="fas fa-search me-1"></i> Buscar Cursos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Contenedor de Cursos / Resultados -->
                <div id="qr-courses-container">
                    <div class="text-center py-5 text-muted card border-0 shadow-sm rounded-4">
                        <div class="card-body">
                            <i class="fas fa-school fa-3x mb-3 text-secondary opacity-50"></i>
                            <h5>Seleccione una Institución y Sede para visualizar los cursos</h5>
                            <p class="small text-muted mb-0">Podrá seleccionar uno o varios cursos para generar sus carnets de control QR en lote.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    attachEvents() {
        const schoolSelect = document.getElementById('qr-course-school');
        const branchSelect = document.getElementById('qr-course-branch');

        if (!schoolSelect || !branchSelect) return;

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
    },

    loadGroups() {
        const schoolId = document.getElementById('qr-course-school').value;
        const branchId = document.getElementById('qr-course-branch').value;
        const container = document.getElementById('qr-courses-container');

        if (!schoolId || !branchId) {
            Helper.alert('error', 'Por favor seleccione la Institución y la Sede');
            return;
        }

        const schoolObj = this.schools.find(s => s.id == schoolId);
        const branchObj = this.branches.find(b => b.id == branchId);

        // Filtrar beneficiarios de esa sede
        const branchBens = this.beneficiaries.filter(b => b.branch_id == branchId);

        if (branchBens.length === 0) {
            container.innerHTML = `
                <div class="card border-0 shadow-sm rounded-4 text-center py-5">
                    <div class="card-body text-muted">
                        <i class="fas fa-exclamation-circle fa-3x mb-3 text-warning"></i>
                        <h5>No hay beneficiarios activos registrados en esta sede</h5>
                    </div>
                </div>
            `;
            return;
        }

        // Agrupar por grado y grupo
        const groupsMap = {};
        branchBens.forEach(b => {
            const grade = b.grade || 'SIN GRADO';
            const groupName = b.group_name || b.group_letter || 'GENERAL';
            const key = `${grade}_${groupName}`;

            if (!groupsMap[key]) {
                groupsMap[key] = {
                    key: key,
                    grade: grade,
                    group_name: groupName,
                    school_id: schoolId,
                    branch_id: branchId,
                    school_name: schoolObj ? schoolObj.name : '',
                    branch_name: branchObj ? branchObj.name : '',
                    students: []
                };
            }
            groupsMap[key].students.push(b);
        });

        this.availableGroups = Object.values(groupsMap);

        // Ordenar por Grado y Grupo
        this.availableGroups.sort((a, b) => {
            if (a.grade === b.grade) return a.group_name.localeCompare(b.group_name);
            return a.grade.localeCompare(b.grade);
        });

        let html = `
            <div class="card border-0 shadow-sm rounded-4 mb-4">
                <div class="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
                    <div>
                        <h6 class="mb-0 fw-bold text-dark"><i class="fas fa-chalkboard-teacher me-2 text-primary"></i>Cursos Encontrados en: ${branchObj ? branchObj.name : ''}</h6>
                        <small class="text-muted">Total Cursos: ${this.availableGroups.length} | Estudiantes: ${branchBens.length}</small>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="ReportsQrCoursesView.selectAll(true)">
                            <i class="fas fa-check-square me-1"></i> Seleccionar Todos
                        </button>
                        <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="ReportsQrCoursesView.selectAll(false)">
                            <i class="fas fa-square me-1"></i> Desmarcar
                        </button>
                        <button class="btn btn-success btn-sm rounded-pill px-4 fw-bold shadow-sm" onclick="ReportsQrCoursesView.printSelected()">
                            <i class="fas fa-print me-1"></i> Generar Carnets QR (PDF)
                        </button>
                    </div>
                </div>
                <div class="card-body p-4">
                    <div class="row g-3">
        `;

        this.availableGroups.forEach((g, index) => {
            html += `
                <div class="col-md-4 col-lg-3">
                    <div class="card border-2 shadow-sm rounded-3 h-100 course-card">
                        <div class="card-body p-3">
                            <div class="form-check mb-2">
                                <input class="form-check-input course-checkbox" type="checkbox" value="${index}" id="group-chk-${index}" checked>
                                <label class="form-check-label fw-bold text-primary fs-6" for="group-chk-${index}">
                                    Grado ${g.grade} - Grupo ${g.group_name}
                                </label>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                                <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill px-3 py-2">
                                    <i class="fas fa-user-graduate me-1"></i> ${g.students.length} Estudiantes
                                </span>
                                <i class="fas fa-qrcode fa-2x text-muted opacity-50"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    },

    selectAll(status) {
        document.querySelectorAll('.course-checkbox').forEach(chk => chk.checked = status);
    },

    printSelected() {
        const selectedCheckboxes = document.querySelectorAll('.course-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            Helper.alert('error', 'Por favor seleccione al menos un curso para generar su carnet QR');
            return;
        }

        const selectedGroups = Array.from(selectedCheckboxes).map(chk => this.availableGroups[parseInt(chk.value)]);

        this.generatePrintView(selectedGroups);
    },

    generatePrintView(groups) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            Helper.alert('error', 'Por favor permita las ventanas emergentes en su navegador para imprimir');
            return;
        }

        const paeName = App.state.user?.pae || 'PAE CONTROL';

        const cardsHtml = groups.map(g => {
            // Estructura explícita del token para control total: PAE_GROUP:school_id:branch_id:grade:group_name
            const token = `PAE_GROUP:${g.school_id}:${g.branch_id}:${g.grade}:${g.group_name}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`;

            const studentsListHtml = g.students.slice(0, 30).map((s, idx) => `
                <tr>
                    <td style="width: 10%; text-align: center;">${idx + 1}</td>
                    <td style="width: 60%;">${s.first_name} ${s.last_name1} ${s.last_name2 || ''}</td>
                    <td style="width: 30%; text-align: right;">${s.document_number}</td>
                </tr>
            `).join('');

            return `
                <div class="qr-course-card">
                    <div class="card-header-bar">
                        <div class="program-title">${paeName}</div>
                        <div class="subtitle">CONTROL DE ALIMENTACIÓN POR CURSO</div>
                    </div>
                    
                    <div class="school-header">
                        <div class="school-name">${g.school_name}</div>
                        <div class="branch-name">Sede: ${g.branch_name}</div>
                    </div>

                    <div class="group-banner">
                        GRADO ${g.grade} — GRUPO ${g.group_name}
                    </div>

                    <div class="qr-section">
                        <img src="${qrUrl}" width="180" height="180" alt="QR Curso" class="qr-img">
                        <div class="qr-caption">ESCANEAR PARA ENTREGAR RACIONES</div>
                        <div class="qr-token-code">${token}</div>
                    </div>

                    <div class="students-summary">
                        <div class="summary-title"><i class="fas fa-users"></i> Lista de Beneficiarios Inscritos (${g.students.length})</div>
                        <table class="students-table">
                            <thead>
                                <tr>
                                    <th style="width: 10%;">#</th>
                                    <th style="width: 60%;">Estudiante</th>
                                    <th style="width: 30%; text-align: right;">Documento</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${studentsListHtml}
                            </tbody>
                        </table>
                        ${g.students.length > 30 ? `<div class="more-notice">+ ${g.students.length - 30} estudiantes adicionales registrados</div>` : ''}
                    </div>

                    <div class="card-footer-note">
                        Al escanear este código QR en el escáner de entregas, el sistema registrará como <strong>ALIMENTO SERVIDO</strong> a todos los estudiantes de este curso en el tiempo de comida seleccionado.
                    </div>
                </div>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Carnets QR de Cursos - PAE</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: #f8f9fa;
                        color: #212529;
                        padding: 10px;
                    }
                    .print-actions {
                        position: fixed;
                        top: 15px;
                        right: 15px;
                        z-index: 9999;
                        background: white;
                        padding: 10px 20px;
                        border-radius: 30px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                    }
                    .cards-container {
                        display: flex;
                        flex-direction: column;
                        gap: 25px;
                        align-items: center;
                    }
                    .qr-course-card {
                        width: 100%;
                        max-width: 700px;
                        background: #ffffff;
                        border: 2px solid #0d6efd;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                        page-break-after: always;
                    }
                    .card-header-bar {
                        background: #0d6efd;
                        color: white;
                        text-align: center;
                        padding: 12px;
                    }
                    .program-title {
                        font-size: 18px;
                        font-weight: 800;
                        letter-spacing: 1px;
                    }
                    .subtitle {
                        font-size: 11px;
                        opacity: 0.9;
                    }
                    .school-header {
                        text-align: center;
                        padding: 12px 15px 5px;
                    }
                    .school-name {
                        font-size: 16px;
                        font-weight: 700;
                        color: #1e293b;
                    }
                    .branch-name {
                        font-size: 13px;
                        color: #64748b;
                    }
                    .group-banner {
                        background: #dc3545;
                        color: white;
                        text-align: center;
                        font-size: 20px;
                        font-weight: 900;
                        padding: 8px;
                        letter-spacing: 1px;
                        margin: 10px 20px;
                        border-radius: 8px;
                    }
                    .qr-section {
                        text-align: center;
                        padding: 10px;
                    }
                    .qr-img {
                        border: 4px solid #f1f5f9;
                        border-radius: 12px;
                        padding: 5px;
                        background: white;
                    }
                    .qr-caption {
                        font-size: 11px;
                        font-weight: 700;
                        color: #dc3545;
                        margin-top: 6px;
                    }
                    .qr-token-code {
                        font-family: monospace;
                        font-size: 10px;
                        color: #94a3b8;
                    }
                    .students-summary {
                        padding: 10px 25px;
                    }
                    .summary-title {
                        font-size: 12px;
                        font-weight: 700;
                        color: #334155;
                        margin-bottom: 6px;
                    }
                    .students-table {
                        width: 100%;
                        font-size: 10px;
                        border-collapse: collapse;
                    }
                    .students-table th {
                        background: #f1f5f9;
                        padding: 4px 8px;
                        color: #475569;
                    }
                    .students-table td {
                        padding: 3px 8px;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .more-notice {
                        font-size: 9px;
                        text-align: center;
                        color: #64748b;
                        margin-top: 4px;
                    }
                    .card-footer-note {
                        background: #f8fafc;
                        border-top: 1px solid #e2e8f0;
                        padding: 10px 20px;
                        font-size: 10px;
                        color: #475569;
                        text-align: center;
                    }
                    @media print {
                        .print-actions { display: none !important; }
                        body { background: white; padding: 0; }
                        .qr-course-card { box-shadow: none; }
                    }
                </style>
            </head>
            <body>
                <div class="print-actions">
                    <button class="btn btn-primary btn-sm rounded-pill px-3" onclick="window.print()">
                        <i class="fas fa-print me-1"></i> Imprimir Carnets
                    </button>
                    <button class="btn btn-secondary btn-sm rounded-pill px-3 ms-2" onclick="window.close()">
                        Cerrar
                    </button>
                </div>

                <div class="cards-container">
                    ${cardsHtml}
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
    }
};

// Auto-inicializar cuando el script sea cargado por App.loadView
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.ReportsQrCoursesView.init());
} else {
    window.ReportsQrCoursesView.init();
}

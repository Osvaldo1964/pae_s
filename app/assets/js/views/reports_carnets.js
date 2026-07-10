/**
 * Reporte: Impresión Masiva de Carnets
 */
window.ReportsCarnetsView = {
    schools: [],
    branches: [],
    beneficiaries: [],
    filteredBranches: [],
    grades: ["TRANSICION", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "ADULTO_MAYOR", "MADRE_GESTANTE", "PRIMERA_INFANCIA"],

    async init() {
        Helper.loading(true);
        await this.loadMasterData();
        this.render();
        this.attachEvents();
        Helper.loading(false);
    },

    async loadMasterData() {
        try {
            const [schoolRes, branchRes] = await Promise.all([
                Helper.fetchAPI('/schools'),
                Helper.fetchAPI('/branches')
            ]);

            this.schools = Array.isArray(schoolRes) ? schoolRes : (schoolRes.success ? schoolRes.data : []);
            this.branches = Array.isArray(branchRes) ? branchRes : (branchRes.success ? branchRes.data : []);
        } catch (error) {
            console.error('Error loading master data for carnets report:', error);
        }
    },

    render() {
        document.getElementById('app').innerHTML = `
            <div class="container-fluid fade-in">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 class="mb-1"><i class="fas fa-id-badge me-2 text-primary"></i>Impresión Masiva de Carnets</h2>
                        <p class="text-muted mb-0">Genere carnets con códigos QR organizados por sede y grado para facilitar la entrega física.</p>
                    </div>
                </div>

                <div class="card shadow-sm border-0 mb-4">
                    <div class="card-body bg-light rounded">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-3">
                                <label class="form-label small fw-bold">INSTITUCIÓN (COLEGIO)</label>
                                <select id="report-carnet-school" class="form-select">
                                    <option value="">-- Todos los Colegios --</option>
                                    ${this.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold">SEDE / PUNTO</label>
                                <select id="report-carnet-branch" class="form-select" disabled>
                                    <option value="">-- Todas las Sedes --</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small fw-bold">GRADO</label>
                                <select id="report-carnet-grade" class="form-select">
                                    <option value="">-- Todos --</option>
                                    ${this.grades.map(g => `<option value="${g}">${g.replace('_', ' ')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-md-4 d-flex gap-2">
                                <button class="btn btn-primary w-100 fw-bold" onclick="ReportsCarnetsView.loadAndGenerate()">
                                    <i class="fas fa-print me-2"></i> Generar Carnets (PDF)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="carnet-report-preview" class="text-center py-5 text-muted">
                    <i class="fas fa-id-card fa-3x mb-3 opacity-25"></i>
                    <p>Seleccione los filtros para buscar beneficiarios y generar sus carnets</p>
                </div>
            </div>
        `;
    },

    attachEvents() {
        const schoolSelect = document.getElementById('report-carnet-school');
        const branchSelect = document.getElementById('report-carnet-branch');

        schoolSelect.addEventListener('change', () => {
            const schoolId = schoolSelect.value;
            branchSelect.innerHTML = '<option value="">-- Todas las Sedes --</option>';

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

    async loadAndGenerate() {
        const schoolId = document.getElementById('report-carnet-school').value;
        const branchId = document.getElementById('report-carnet-branch').value;
        const grade = document.getElementById('report-carnet-grade').value;

        Helper.loading(true, 'Buscando beneficiarios...');
        try {
            // Reutilizamos el endpoint de beneficiarios general que trae toda la info
            const res = await Helper.fetchAPI('/beneficiarios');
            Helper.loading(false);

            if (Array.isArray(res)) {
                let filtered = res.filter(b => b.status === 'ACTIVO'); // Solo activos por defecto

                if (schoolId) {
                    filtered = filtered.filter(b => b.school_id == schoolId);
                }
                if (branchId) {
                    filtered = filtered.filter(b => b.branch_id == branchId);
                }
                if (grade) {
                    filtered = filtered.filter(b => b.grade == grade);
                }

                if (filtered.length === 0) {
                    Helper.alert('info', 'No se encontraron beneficiarios activos con los filtros seleccionados.');
                    return;
                }

                Helper.alert('success', `Se generarán ${filtered.length} carnets. Bloquea las ventanas emergentes si no se abre la impresión.`);
                this.printCarnets(filtered);
            } else {
                Helper.alert('error', 'No se pudo obtener la lista de beneficiarios');
            }
        } catch (error) {
            Helper.loading(false);
            console.error(error);
            Helper.alert('error', 'Error al consultar beneficiarios');
        }
    },

    printCarnets(beneficiariesList) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            Helper.alert('error', 'Por favor permita las ventanas emergentes (pop-ups) en su navegador.');
            return;
        }

        const paeName = App.state.user?.pae || 'PAE';

        // Generar cards
        const cardsHtml = beneficiariesList.map(b => {
            const token = `PAE:${b.id}:${b.document_number}:${b.first_name} ${b.last_name1}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(token)}`;

            return `
                <div class="carnet-card">
                    <div class="header">
                        <div class="logo-text">${paeName}</div>
                        <div class="sub-header">Identificación del Beneficiario</div>
                    </div>
                    <div class="content">
                        <div class="avatar-container">
                            <span>${b.first_name.charAt(0)}${b.last_name1.charAt(0)}</span>
                        </div>
                        <div class="student-name">${b.first_name} <br> ${b.last_name1}</div>
                        <div class="student-doc">${b.document_type_name || 'DOC'}: ${b.document_number}</div>
                        
                        <div class="grade-badge">
                            ${b.beneficiary_type === 'ESTUDIANTE' ? `Grado ${b.grade || 'N/A'} ${b.group_name ? '- ' + b.group_name : ''}` : (b.population_name || b.beneficiary_type || 'Otra Población')}
                        </div>

                        <div class="school-info"><strong>${b.school_name || ''}</strong></div>
                        <div class="school-info">${b.branch_name || ''}</div>
                        
                        <div class="qr-container">
                            <img src="${qrUrl}" width="100" height="100" alt="QR Code" loading="lazy">
                        </div>
                    </div>
                    <div class="footer">
                        Este documento es personal e intransferible
                    </div>
                </div>
            `;
        }).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Lote de Carnets ${paeName}</title>
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        -webkit-print-color-adjust: exact; 
                        padding: 0; 
                        background-color: #fff;
                        margin: 0;
                    }
                    
                    /* Grid para organizar varios carnets en una misma página */
                    .carnet-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 20px; /* Separación para recortar con tijeras */
                        padding: 20px;
                        justify-items: center;
                    }

                    /* Carnet individual basado en el diseño original */
                    .carnet-card {
                        width: 330px;
                        height: 520px;
                        border-radius: 15px;
                        padding: 0;
                        margin: 0;
                        position: relative;
                        background: #fff;
                        overflow: visible;
                        border: 1px dashed #ccc; /* Guía de recorte */
                        page-break-inside: avoid;
                        display: flex;
                        flex-direction: column;
                    }

                    .header {
                        background: linear-gradient(135deg, #1B4F72 0%, #2980b9 100%);
                        color: white;
                        padding: 12px;
                        text-align: center;
                        border-bottom: 4px solid #F4D03F;
                        border-radius: 15px 15px 0 0;
                    }
                    .logo-text { font-size: 20px; font-weight: 900; letter-spacing: 1px; }
                    .sub-header { font-size: 10px; opacity: 0.9; text-transform: uppercase; margin-top: 2px; }
                    
                    .content { 
                        flex-grow: 1;
                        padding: 10px;
                        text-align: center; 
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    
                    .avatar-container {
                        width: 80px;
                        height: 80px;
                        background-color: #ecf0f1;
                        border-radius: 50%;
                        margin-top: 5px;
                        margin-bottom: 10px;
                        border: 3px solid #F4D03F;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 32px;
                        color: #1B4F72;
                    }
                    
                    .student-name { 
                        font-size: 18px; 
                        font-weight: 700; 
                        color: #2c3e50; 
                        margin-bottom: 5px; 
                        line-height: 1.2;
                    }
                    
                    .student-doc {
                        font-family: monospace;
                        font-size: 14px;
                        background-color: #f8f9fa;
                        padding: 2px 10px;
                        border-radius: 10px;
                        color: #555;
                        margin-bottom: 8px;
                        border: 1px solid #ddd;
                        font-weight: bold;
                    }
                    
                    .school-info {
                        font-size: 11px;
                        color: #7f8c8d;
                        margin-bottom: 2px;
                        width: 100%;
                        text-transform: uppercase;
                    }
                    
                    .grade-badge {
                        background-color: #1B4F72;
                        color: white;
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: bold;
                        margin: 8px 0;
                        display: inline-block;
                    }
                    
                    .qr-container { 
                        margin-top: auto; 
                        padding: 8px;
                        background: white;
                        border: 1px solid #eee;
                        border-radius: 8px;
                    }
                    
                    .footer {
                        background-color: #f8f9fa;
                        color: #7f8c8d;
                        padding: 8px;
                        text-align: center;
                        border-top: 1px solid #eee;
                        border-radius: 0 0 15px 15px;
                        font-size: 9px;
                        font-weight: 600;
                        text-transform: uppercase;
                    }
                    
                    @media print {
                        body { background: white; }
                        .carnet-grid { padding: 20px; gap: 10px; }
                        .btn-print { display: none !important; }
                        @page { margin: 0; }
                    }

                    .btn-print { 
                        position: fixed; 
                        bottom: 20px; 
                        right: 20px; 
                        background: #27ae60; 
                        color: white; 
                        border: none; 
                        padding: 15px 25px; 
                        border-radius: 30px; 
                        font-size: 16px; 
                        font-weight: bold; 
                        box-shadow: 0 4px 10px rgba(0,0,0,0.2); 
                        cursor: pointer; 
                        z-index: 1000;
                    }
                    .btn-print:hover { background: #219a52; }
                </style>
            </head>
            <body>
                <button class="btn-print" onclick="window.print()">
                    <i class="fas fa-print"></i> IMPRIMIR AHORA
                </button>

                <div class="carnet-grid">
                    ${cardsHtml}
                </div>
                
                <script>
                    window.onload = function() {
                        // Optionally trigger print slightly delayed
                        // setTimeout(function() { window.print(); }, 1500); 
                    }
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
};

if (typeof ReportsCarnetsView !== 'undefined') {
    ReportsCarnetsView.init();
}

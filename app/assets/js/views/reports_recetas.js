window.ReportsRecetasView = {
    rationTypes: [],

    async init() {
        Helper.loading(true);
        await this.loadMasterData();
        this.render();
        Helper.loading(false);
    },

    async loadMasterData() {
        try {
            const res = await Helper.fetchAPI('/ration-types');
            if (res.success) {
                this.rationTypes = res.data;
            }
        } catch (error) {
            console.error('Error loading ration types:', error);
        }
    },

    render() {
        document.getElementById('app').innerHTML = `
            <div class="container-fluid fade-in">
                <div class="d-flex justify-content-center align-items-center" style="min-height: 60vh;">
                    <div class="card shadow-lg border-0" style="width: 100%; max-width: 600px; overflow: hidden;">
                        <!-- Header inspired by the image -->
                        <div class="card-header bg-success text-white d-flex justify-content-between align-items-center py-3">
                            <h4 class="mb-0 fw-bold"><i class="fas fa-file-alt me-2"></i>Reporte del Recetario</h4>
                            <a href="#module/reports-ali" class="text-white opacity-75 hover-opacity-100"><i class="fas fa-times fa-lg"></i></a>
                        </div>
                        
                        <div class="card-body p-4 bg-white">
                            <div class="mb-4">
                                <label class="form-label small fw-bold text-secondary text-uppercase mb-2">Filtrar por Tipo de Ración</label>
                                <select id="report-filter-ration" class="form-select form-select-lg border-2">
                                    <option value="">Todos los tipos...</option>
                                    ${this.rationTypes.map(rt => `<option value="${rt.id}">${rt.name}</option>`).join('')}
                                </select>
                            </div>

                            <div class="alert alert-light border d-flex align-items-center mb-4 py-3">
                                <i class="fas fa-info-circle fa-lg text-secondary me-3"></i>
                                <div class="small text-muted">
                                    Seleccione el formato de salida para el listado de recetas seleccionadas.
                                </div>
                            </div>

                            <div class="d-grid gap-3">
                                <button class="btn btn-outline-primary btn-lg fw-bold py-3 d-flex align-items-center justify-content-center" onclick="ReportsRecetasView.exportPDF()">
                                    <i class="fas fa-print me-3"></i> Vista de Impresión (PDF)
                                </button>
                                <button class="btn btn-outline-success btn-lg fw-bold py-3 d-flex align-items-center justify-content-center" onclick="ReportsRecetasView.exportExcel()">
                                    <i class="fas fa-file-excel me-3"></i> Exportar a Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .hover-opacity-100:hover { opacity: 1 !important; transition: 0.3s; }
                .border-2 { border-width: 2px !important; }
            </style>
        `;
    },

    async fetchFilteredData() {
        const rationTypeId = document.getElementById('report-filter-ration').value;
        const endpoint = `/recipes?include_items=1${rationTypeId ? `&ration_type_id=${rationTypeId}` : ''}`;

        Helper.loading(true);
        try {
            const res = await Helper.fetchAPI(endpoint);
            Helper.loading(false);
            if (res.success && res.data.length > 0) {
                return res.data;
            } else {
                Helper.alert('warning', 'No se encontraron recetas con el filtro seleccionado');
                return null;
            }
        } catch (error) {
            Helper.loading(false);
            Helper.alert('error', 'Error al consultar las recetas');
            return null;
        }
    },

    async exportExcel() {
        const data = await this.fetchFilteredData();
        if (!data) return;

        let html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"></head>
            <body>
                <h3 style="text-align:center;">REPORTE TÉCNICO DE RECETARIO - PAE</h3>
                <p>Fecha: ${new Date().toLocaleString()}</p>
        `;

        data.forEach(recipe => {
            html += `
                <table border="1" style="margin-bottom: 20px;">
                    <tr style="background:#1B4F72; color:white;">
                        <th colspan="8">${recipe.name.toUpperCase()} - ${recipe.ration_type_name}</th>
                    </tr>
                    <tr style="background:#f2f2f2; font-weight:bold;">
                        <th>Ingrediente</th>
                        <th>Unidad</th>
                        <th>Preparación</th>
                        <th>Preescolar</th>
                        <th>Primaria A</th>
                        <th>Primaria B</th>
                        <th>Secundaria</th>
                        <th>GENERAL</th>
                    </tr>
            `;

            if (recipe.items && recipe.items.length > 0) {
                recipe.items.forEach(item => {
                    html += `
                        <tr>
                            <td>${item.item_name}</td>
                            <td>${item.unit}</td>
                            <td>${item.preparation || '-'}</td>
                            <td>${item.quantities.PREESCOLAR}</td>
                            <td>${item.quantities.PRIMARIA_A}</td>
                            <td>${item.quantities.PRIMARIA_B}</td>
                            <td>${item.quantities.SECUNDARIA}</td>
                            <td>${item.quantities.GENERAL || 0}</td>
                        </tr>
                    `;
                });
            } else {
                html += '<tr><td colspan="8">Sin ingredientes registrados</td></tr>';
            }
            html += '</table><br>';
        });

        html += '</body></html>';

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Recetario_PAE_${new Date().getTime()}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    async exportPDF() {
        const data = await this.fetchFilteredData();
        if (!data) return;

        const printWindow = window.open('', '_blank');

        let recipesHtml = '';
        data.forEach(recipe => {
            let itemsRows = '';
            if (recipe.items && recipe.items.length > 0) {
                recipe.items.forEach(item => {
                    itemsRows += `
                        <tr>
                            <td>${item.item_name}</td>
                            <td class="text-center">${item.unit}</td>
                            <td class="text-end">${item.quantities.PREESCOLAR}</td>
                            <td class="text-end">${item.quantities.PRIMARIA_A}</td>
                            <td class="text-end">${item.quantities.PRIMARIA_B}</td>
                            <td class="text-end">${item.quantities.SECUNDARIA}</td>
                            <td class="text-end fw-bold">${item.quantities.GENERAL || 0}</td>
                        </tr>
                    `;
                });
            } else {
                itemsRows = '<tr><td colspan="7" class="text-center text-muted">No hay ingredientes vinculados</td></tr>';
            }

            recipesHtml += `
                <div class="recipe-card mb-5 border p-4 bg-white shadow-sm">
                    <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                        <h4 class="mb-0 text-primary-custom fw-bold">${recipe.name}</h4>
                        <span class="badge bg-success">${recipe.ration_type_name}</span>
                    </div>
                    <p class="text-muted small mb-3">${recipe.description || 'Sin descripción disponible'}</p>
                    
                    <h6 class="fw-bold mb-2">GRAMAJES SEGÚN GRUPO ETÁREO (Resolución 0003 de 2026)</h6>
                    <table class="table table-bordered table-sm align-middle">
                        <thead class="bg-light text-center small uppercase">
                            <tr>
                                <th style="width: 35%">Ingrediente</th>
                                <th>Und</th>
                                <th>Pre-esc</th>
                                <th>Prim A</th>
                                <th>Prim B</th>
                                <th>Secun</th>
                                <th>GENERAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                </div>
                <div class="page-break"></div>
            `;
        });

        printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte de Recetario - PAE</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        body { background: #f8f9fa; padding: 40px; font-size: 11px; }
                        .text-primary-custom { color: #1B4F72; }
                        .recipe-card { border-radius: 8px; page-break-inside: avoid; }
                        h2 { text-align: center; color: #1B4F72; margin-bottom: 30px; }
                        .no-print { display: flex; justify-content: center; gap: 10px; margin-bottom: 30px; }
                        @media print { 
                            .no-print { display: none !important; }
                            body { padding: 0; background: white; }
                            .page-break { page-break-after: always; }
                        }
                    </style>
                </head>
                <body>
                    <div class="no-print">
                        <button class="btn btn-primary d-flex align-items-center" onclick="window.print()">
                            <i class="fas fa-print me-2"></i> Imprimir Reporte Completo
                        </button>
                        <button class="btn btn-secondary d-flex align-items-center" onclick="window.close()">
                            <i class="fas fa-times me-2"></i> Cerrar
                        </button>
                    </div>
                    <h2>REPORTE MAESTRO DE RECETARIO</h2>
                    <p class="text-center text-muted mb-4">Generado el: ${new Date().toLocaleString()}</p>
                    ${recipesHtml}
                </body>
            </html>
        `);
        printWindow.document.close();
    }
};

if (typeof ReportsRecetasView !== 'undefined') {
    ReportsRecetasView.init();
}

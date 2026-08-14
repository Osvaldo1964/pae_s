/**
 * Consumos - Registro de Asistencia QR
 */
var ConsumosView = {
    schools: [],
    branches: [],
    dataTable: null,

    init: async () => {
        ConsumosView.render();
        await ConsumosView.loadFilters();
        ConsumosView.attachEvents();
        // Load today's report by default if possible or wait for filter
    },

    render: () => {
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div class="row mb-4 fade-in">
                <div class="col-md-8">
                    <h2 class="text-primary-custom fw-bold mb-0">Planilla de Consumo</h2>
                    <p class="text-muted">Planilla de asistencia con listado completo de estudiantes y estado de entrega.</p>
                </div>
                <div class="col-md-4 text-end d-flex justify-content-end gap-2">
                    <button class="btn btn-success rounded-pill px-4 shadow-sm fw-bold" onclick="ConsumosView.openScannerModal()">
                        <i class="fas fa-qrcode me-2"></i>Escanear QR / Entrega
                    </button>
                    <button class="btn btn-outline-primary rounded-pill px-4 shadow-sm" onclick="ConsumosView.printCurrent()">
                        <i class="fas fa-print me-2"></i>Imprimir Planilla
                    </button>
                </div>
            </div>

            <div class="card shadow-sm border-0 rounded-3 mb-4">
                <div class="card-body bg-light rounded-3 p-4">
                    <form id="filter-form" class="row g-3 align-items-end">
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-uppercase">Institución</label>
                            <select id="filter-school" class="form-select border-0 shadow-sm">
                                <option value="">Todas las Instituciones</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-uppercase">Sede Educativa</label>
                            <select id="filter-branch" class="form-select border-0 shadow-sm">
                                <option value="">Todas las Sedes</option>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small fw-bold text-uppercase">Fecha</label>
                            <input type="date" id="filter-date" class="form-control border-0 shadow-sm" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small fw-bold text-uppercase">Momento de Consumo</label>
                            <select id="filter-meal" class="form-select border-0 shadow-sm">
                                <option value="">Todos</option>
                            </select>
                        </div>

                        <div class="col-md-2">
                            <button type="submit" class="btn btn-secondary w-100 rounded-3 shadow-sm">
                                <i class="fas fa-search me-2"></i>Filtrar
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                <div class="card-body p-0">
                    <div class="table-responsive p-4">
                        <table id="consumosTable" class="table table-hover align-middle mb-0" style="width:100%">
                            <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                <tr>
                                    <th class="ps-4">Hora</th>
                                    <th>Estudiante</th>
                                    <th>Documento</th>
                                    <th>Grado/Grupo</th>
                                    <th>Sede</th>
                                    <th>Tipo</th>
                                    <th class="text-center pe-4">Estado</th>
                                </tr>
                            </thead>
                            <tbody id="consumos-table-body">
                                <tr>
                                    <td colspan="7" class="text-center py-5">
                                        <i class="fas fa-search fa-3x text-muted opacity-25 mb-3 d-block"></i>
                                        <p class="text-muted">Use los filtros arriba para ver los datos de consumo.</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    loadFilters: async () => {
        try {
            const schools = await Helper.fetchAPI('/schools');
            const schoolSelect = document.getElementById('filter-school');
            schools.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name;
                schoolSelect.appendChild(opt);
            });

            // Load Ration Types
            const rationRes = await Helper.fetchAPI('/ration-types');
            const rationSelect = document.getElementById('filter-meal');
            if (rationRes.success) {
                rationRes.data.forEach(rt => {
                    const opt = document.createElement('option');
                    opt.value = rt.id;
                    opt.textContent = rt.name;
                    rationSelect.appendChild(opt);
                });
            }

            schoolSelect.onchange = async () => {
                const schoolId = schoolSelect.value;
                const branchSelect = document.getElementById('filter-branch');
                branchSelect.innerHTML = '<option value="">Todas las Sedes</option>';

                if (schoolId) {
                    const branches = await Helper.fetchAPI(`/branches?school_id=${schoolId}`);
                    branches.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.id;
                        opt.textContent = b.name;
                        branchSelect.appendChild(opt);
                    });
                }
            };
        } catch (e) {
            console.error("Error loading filters", e);
        }
    },

    attachEvents: () => {
        document.getElementById('filter-form').onsubmit = (e) => {
            e.preventDefault();
            ConsumosView.loadData();
        };
    },

    loadData: async () => {
        const schoolId = document.getElementById('filter-school').value;
        const branchId = document.getElementById('filter-branch').value;
        const date = document.getElementById('filter-date').value;
        const meal = document.getElementById('filter-meal').value;

        if (!date) {
            Helper.alert('warning', 'La fecha es obligatoria');
            return;
        }

        Helper.loading(true);
        try {
            const params = new URLSearchParams({ date });
            if (branchId) params.append('branch_id', branchId);
            if (meal) params.append('meal_type', meal);

            const res = await Helper.fetchAPI(`/consumptions/report?${params.toString()}`);
            Helper.loading(false);

            if (res.success) {
                ConsumosView.renderTable(res.data);
            }
        } catch (e) {
            Helper.loading(false);
            console.error(e);
            Helper.alert('error', 'Error cargando datos');
        }
    },

    renderTable: (data) => {
        const tbody = document.getElementById('consumos-table-body');

        if (ConsumosView.dataTable) {
            ConsumosView.dataTable.destroy();
        }

        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5 text-muted">No se encontraron registros para los filtros seleccionados.</td></tr>';
            return;
        }

        data.forEach(row => {
            let timeStr = '<span class="text-muted opacity-50">-</span>';
            let statusBadge = ''; // Left it blank when pending
            
            // Check if consumption ID exists instead of just row.time to be safer
            let printTime = row.service_time ? row.service_time.substring(0, 5) : '___:___';

            if (row.consumption_id) {
                timeStr = new Date(row.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                statusBadge = '<span class="badge rounded-pill bg-success px-3"><i class="fas fa-check-circle me-1"></i>ENTREGADO (QR)</span>';
                printTime = timeStr;
            } else if (row.service_time) {
                timeStr = `<span class="text-muted opacity-50">${row.service_time.substring(0, 5)}</span>`;
            }

            tbody.innerHTML += `
                <tr data-consumption="${row.consumption_id ? 'yes' : 'no'}" 
                    data-print-time="${printTime}"
                    data-entity-logo="${row.entity_logo_path || ''}"
                    data-operator-logo="${row.operator_logo_path || ''}"
                    data-program-name="${row.program_name || ''}">
                    <td class="ps-4 fw-bold text-primary-custom">${timeStr}</td>
                    <td>
                        <div class="fw-bold text-dark">${row.last_name1} ${row.first_name}</div>
                    </td>
                    <td><code class="text-muted">${row.document_number}</code></td>
                    <td><span class="small">${row.grade} - ${row.group_name || ''}</span></td>
                    <td class="small">${row.school_name} - ${row.branch_name}</td>
                    <td><span class="badge bg-light text-dark border">${row.meal_type || '-'}</span></td>
                    <td class="text-center pe-4">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        });

        ConsumosView.dataTable = Helper.initDataTable('#consumosTable', {
            order: [[1, 'asc']],
            pageLength: 50
        });
    },

    printCurrent: () => {
        const date = document.getElementById('filter-date').value;
        const branchSelect = document.getElementById('filter-branch');
        const branchName = branchSelect.options[branchSelect.selectedIndex].text;
        const mealMode = document.getElementById('filter-meal').options[document.getElementById('filter-meal').selectedIndex].text || 'GENERAL';

        if (!ConsumosView.dataTable || ConsumosView.dataTable.rows().count() === 0) {
            Helper.alert('warning', 'No hay datos para imprimir. Realice una búsqueda primero.');
            return;
        }

        // Gather data from visible items in table (or current loaded list)
        let programName = 'Programa PAE';
        let entityLogo = '';
        let opLogo = '';

        const data = [];
        const rows = document.querySelectorAll('#consumos-table-body tr');
        rows.forEach((tr, index) => {
            if (index === 0 && tr.hasAttribute('data-program-name')) {
                programName = tr.getAttribute('data-program-name') || programName;
                entityLogo = tr.getAttribute('data-entity-logo') || '';
                opLogo = tr.getAttribute('data-operator-logo') || '';
            }

            const tds = tr.querySelectorAll('td');
            if (tds.length < 7) return;

            data.push({
                time: tr.getAttribute('data-print-time') || tds[0].innerText,
                consumed: tr.getAttribute('data-consumption') === 'yes',
                name: tds[1].innerText,
                doc: tds[2].innerText,
                grade: tds[3].innerText,
                branch: tds[4].innerText, // The UI now has schoolName - branchName
                type: tds[5].innerText
            });
        });

        // Use absolute URL resolution taking advantage of core Config
        const getLogoHtml = (path) => {
            if (!path) return '';
            const absoluteBaseUrl = window.location.origin + Config.BASE_URL;
            // Config.BASE_URL always ends with '/'
            return `<img src="${absoluteBaseUrl}${path.replace(/^app\//, '')}" style="max-height: 55px; object-fit: contain;">`;
        };

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reporte para Imprimir</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; margin: 0; padding: 25px; }
                    .top-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1B4F72; padding-bottom: 15px; margin-bottom: 20px; }
                    .header-center { text-align: center; flex: 1; padding: 0 10px; }
                    .header-center h2 { margin: 0; color: #1B4F72; font-size: 16px; font-weight: bold; }
                    .header-center p { margin: 4px 0 0 0; color: #666; font-size: 11px; }
                    .table-meta { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 11px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
                    th { background-color: #f8f9fa; font-weight: bold; color: #333; text-transform: uppercase; font-size: 9px; }
                    .footer { margin-top: 40px; display: flex; justify-content: space-around; }
                    .sig-box { border-top: 1px solid #000; width: 250px; text-align: center; padding-top: 5px; font-size: 10px; }
                    @page { size: landscape; margin: 0; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="top-header">
                    <div style="width: 150px; text-align: left;">
                        ${getLogoHtml(entityLogo)}
                    </div>
                    <div class="header-center">
                        <h2>PLANILLA DE CONSUMO</h2>
                        <p><strong>PROGRAMA:</strong> ${programName.toUpperCase()}</p>
                    </div>
                    <div style="width: 150px; text-align: right;">
                        ${getLogoHtml(opLogo)}
                    </div>
                </div>

                <div class="table-meta">
                    <div>
                        <strong>SEDE:</strong> ${branchName !== 'Todas las Sedes' ? (data.length > 0 ? data[0].branch : branchName) : 'VARIAS SEDES'}
                    </div>
                    <div style="text-align: right">
                        <strong>FECHA:</strong> ${Helper.formatDate(date)} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>FILTRO:</strong> ${mealMode}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 30px; text-align: center;">NO.</th>
                            <th style="width: 60px; text-align: center;">HORA</th>
                            <th>APELLIDOS Y NOMBRES</th>
                            <th style="width: 100px;">DOCUMENTO</th>
                            <th style="width: 90px;">GRADO</th>
                            <th style="width: 90px;">TIPO</th>
                            <th style="width: 110px; text-align: center;">FIRMA ESTUDIANTE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((r, i) => {
                            const renderSig = r.consumed ? '<span style="color: #27AE60; font-weight: bold; font-size: 8px;">ENTREGADO (QR)</span>' : '';
                            return `
                                <tr>
                                    <td style="text-align: center;">${i + 1}</td>
                                    <td style="text-align: center; color: ${r.consumed ? '#000' : '#888'};">${r.time}</td>
                                    <td style="font-weight: bold">${r.name}</td>
                                    <td>${r.doc}</td>
                                    <td>${r.grade}</td>
                                    <td>${r.type === '-' ? '' : r.type}</td>
                                    <td style="text-align: center; height: 18px; vertical-align: middle;">${renderSig}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <div class="sig-box">Responsable de Entrega (Nombre y Firma)</div>
                    <div class="sig-box">Veedor / Delegado (Nombre y Firma)</div>
                </div>
            </body>
            </html>
        `;

        Helper.printHTML(html);
    },

    openScannerModal: () => {
        const activeBranch = document.getElementById('filter-branch')?.value || '';
        
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'qrScannerModal';
        modalDiv.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header bg-success text-white rounded-top-4 p-3">
                        <h5 class="modal-title fw-bold"><i class="fas fa-qrcode me-2"></i>Escanear Código QR (Individual o Grupo)</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-secondary">TIEMPO DE COMIDA / RACIÓN <span class="text-danger">*</span></label>
                            <select id="scanner-meal-type" class="form-select border-2 fw-bold">
                                <option value="ALMUERZO">ALMUERZO</option>
                                <option value="DESAYUNO">DESAYUNO</option>
                                <option value="REFRIGERIO">REFRIGERIO</option>
                                <option value="COMPLEMENTO ALIMENTARIO">COMPLEMENTO ALIMENTARIO</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-secondary">CÓDIGO QR ESCANEADO <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <span class="input-group-text bg-light"><i class="fas fa-barcode text-muted"></i></span>
                                <input type="text" id="scanner-qr-input" class="form-control border-2 font-monospace" 
                                       placeholder="Escanee o pegue el código del QR aquí..." autofocus>
                            </div>
                            <small class="text-muted mt-1 d-block">Soporta carnets individuales de estudiante y carnets grupales por curso.</small>
                        </div>

                        <div id="scanner-result-area" class="mt-3"></div>
                    </div>
                    <div class="modal-footer bg-light p-3 rounded-bottom-4">
                        <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-success rounded-pill px-4 fw-bold" onclick="ConsumosView.processQrCode()">
                            <i class="fas fa-check me-1"></i> Procesar Código
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        const inputEl = document.getElementById('scanner-qr-input');
        if (inputEl) {
            setTimeout(() => inputEl.focus(), 500);
            inputEl.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    ConsumosView.processQrCode();
                }
            });
        }

        modalDiv.addEventListener('hidden.bs.modal', () => modalDiv.remove());
    },

    processQrCode: async () => {
        const inputEl = document.getElementById('scanner-qr-input');
        const mealType = document.getElementById('scanner-meal-type').value;
        const activeBranch = document.getElementById('filter-branch')?.value || '';
        const token = inputEl ? inputEl.value.trim() : '';

        if (!token) {
            Helper.alert('error', 'Por favor escanee o ingrese un código QR válido');
            return;
        }

        Helper.loading(true, 'Procesando código QR...');

        try {
            // Caso 1: QR Grupal (PAE_GROUP:school_id:branch_id:grade:group_name)
            if (token.startsWith('PAE_GROUP:')) {
                const parts = token.split(':');
                const schoolId = parts[1] || null;
                const branchId = parts[2] || activeBranch;
                const grade = parts[3] || null;
                const groupName = parts[4] || null;

                if (!branchId) {
                    Helper.loading(false);
                    Helper.alert('error', 'El código QR no contiene el ID de la sede y no ha seleccionado una sede en los filtros.');
                    return;
                }

                const res = await Helper.fetchAPI('/deliveries/group', {
                    method: 'POST',
                    body: JSON.stringify({
                        school_id: schoolId,
                        branch_id: branchId,
                        grade: grade,
                        group_name: groupName,
                        meal_type: mealType
                    })
                });

                Helper.loading(false);

                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: '¡Entrega Masiva Exitosa!',
                        html: `
                            <div class="text-start">
                                <p class="fw-bold mb-1">${res.message}</p>
                                <hr>
                                <small><strong>Total Estudiantes:</strong> ${res.total_students}</small><br>
                                <small class="text-success"><strong>Registrados Hoy:</strong> ${res.registered}</small><br>
                                ${res.skipped_already_served > 0 ? `<small class="text-warning"><strong>Ya Atendidos Antes:</strong> ${res.skipped_already_served}</small>` : ''}
                            </div>
                        `
                    });
                    inputEl.value = '';
                    inputEl.focus();
                    ConsumosView.loadData();
                } else {
                    Helper.alert('error', res.message || 'Error al procesar la entrega masiva');
                }

            } else if (token.startsWith('PAE:')) {
                // Caso 2: QR Individual de Beneficiario (PAE:beneficiary_id:doc:name)
                const parts = token.split(':');
                const beneficiaryId = parts[1];

                if (!beneficiaryId || !activeBranch) {
                    Helper.loading(false);
                    Helper.alert('error', 'Para entregar carnets individuales, por favor seleccione una Sede en los filtros arriba.');
                    return;
                }

                const res = await Helper.fetchAPI('/deliveries', {
                    method: 'POST',
                    body: JSON.stringify({
                        beneficiary_id: beneficiaryId,
                        branch_id: activeBranch,
                        meal_type: mealType
                    })
                });

                Helper.loading(false);

                if (res.id || res.message.includes('exitosamente')) {
                    Helper.alert('success', res.message || 'Entrega registrada exitosamente');
                    inputEl.value = '';
                    inputEl.focus();
                    ConsumosView.loadData();
                } else {
                    Helper.alert('error', res.message || 'Error al registrar entrega');
                }
            } else {
                Helper.loading(false);
                Helper.alert('error', 'Formato de código QR no reconocido');
            }
        } catch (e) {
            Helper.loading(false);
            console.error('Error processing QR:', e);
            Helper.alert('error', 'Error de comunicación con el servidor');
        }
    }
};

// Auto-init
ConsumosView.init();

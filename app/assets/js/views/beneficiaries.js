/**
 * Beneficiaries (Students) View
 * Manage student registration for the PAE program
 */

var BeneficiariesView = {
    beneficiaries: [],
    schools: [],
    branches: [],
    documentTypes: [],
    ethnicGroups: [],
    rationTypes: [],
    filteredBranches: [],
    selectedSchoolId: null,

    /**
     * Render the view
     */
    /**
     * Render the main module dashboard
     */
    render() {
        // Direct render of the list (flat hierarchy)
        this.renderList();

        // Check for specific actions in URL (e.g. #module/beneficiaries?action=upload)
        const hash = window.location.hash;
        if (hash.includes('action=upload')) {
            setTimeout(() => this.openBulkUploadModal(true), 500);
        } else if (hash.includes('action=download')) {
            this.downloadTemplate();
        }
    },

    /**
     * Render the beneficiaries list (Table)
     */
    async renderList() {
        let branchText = '';
        if (BeneficiariesView.currentBranchName) {
            branchText = ` - <small class="text-white">${BeneficiariesView.currentBranchName}</small>`;
        }

        const html = `
            <div class="container-fluid py-4">
                <div class="row mb-4 align-items-center">
                    <div class="col-md-6">
                         <h2 class="text-primary-custom fw-bold">
                            <!-- Back Button -->
                            <button class="btn btn-link text-decoration-none text-muted me-2 p-0" onclick="BeneficiariesView.render()">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <i class="fas fa-user-graduate me-2"></i>Gestión de Beneficiarios${branchText}
                         </h2>
                    </div>
                    <div class="col-md-6 text-end d-flex justify-content-end gap-2">
                         <button class="btn btn-outline-success rounded-pill px-3" onclick="PrintListView.openModal()" title="Generar planilla semanal de asistencia">
                            <i class="fas fa-calendar-week me-2"></i>Planilla Semanal
                         </button>
                         <button class="btn btn-primary rounded-pill px-4" onclick="BeneficiariesView.openModal()">
                            <i class="fas fa-plus me-2"></i>Nuevo Beneficiario
                         </button>
                    </div>
                </div>

                <div class="card shadow-sm">
                    <div class="card-header bg-white py-3 border-bottom">
                        <h6 class="mb-3 text-secondary"><i class="fas fa-filter me-2"></i>Filtros de Búsqueda</h6>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <div class="input-group">
                                    <span class="input-group-text bg-light border-end-0"><i class="fas fa-search text-muted"></i></span>
                                    <input type="text" class="form-control border-start-0 ps-0" id="searchBeneficiary" placeholder="Buscar por documento o nombre...">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <select class="form-select" id="filterSchool" onchange="BeneficiariesView.filterTable()">
                                    <option value="">Todos los Centros</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select class="form-select" id="filterGrade" onchange="BeneficiariesView.filterTable()">
                                    <option value="">Todos los Grados</option>
                                </select>
                            </div>
                            <div class="col-md-2 text-end">
                                <button class="btn btn-outline-secondary w-100" onclick="BeneficiariesView.loadBeneficiaries()">
                                    <i class="fas fa-sync-alt me-2"></i>Refrescar
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table id="beneficiariesTable" class="table table-hover align-middle mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>Identificación</th>
                                        <th>Nombre Completo</th>
                                        <th>Centro / Punto</th>
                                        <th>Grado / Grupo</th>
                                        <th>Estado</th>
                                        <th class="text-end">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="beneficiaries-table-body">
                                    <!-- Data will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>


            <div class="modal fade" id="modalBeneficiary" data-bs-backdrop="static" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog" style="max-width: 1200px;">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="modalBeneficiaryTitle">Registro de Beneficiario</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-0">
                            <!-- Custom Tabs -->
                            <ul class="nav nav-tabs nav-fill bg-light px-3 pt-3" id="beneficiaryTabs" role="tablist">
                                <li class="nav-item">
                                    <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-personal" type="button">
                                        <i class="fas fa-id-card me-2"></i>Identificación
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-enrollment" type="button">
                                        <i class="fas fa-graduation-cap me-2"></i>Vinculación
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-contact" type="button">
                                        <i class="fas fa-home me-2"></i>Contacto
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-health" type="button">
                                        <i class="fas fa-heartbeat me-2"></i>Salud y Otros
                                    </button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-docs" type="button">
                                        <i class="fas fa-file-pdf me-2"></i>Documentos
                                    </button>
                                </li>
                            </ul>
                            
                            <form id="formBeneficiary" class="p-4">
                                <input type="hidden" id="beneficiary-id">
                                <div class="tab-content">
                                    <!-- Tab 1: Personal Data -->
                                    <div class="tab-pane fade show active" id="tab-personal">
                                        <div class="row g-3">
                                            <div class="col-md-3">
                                                <label class="form-label fw-bold">Tipo de Documento *</label>
                                                <select class="form-select" id="doc-type" required></select>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label fw-bold">Número de Documento *</label>
                                                <input type="text" class="form-control" id="doc-number" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label fw-bold">ID Externo (Opcional)</label>
                                                <input type="text" class="form-control" id="simat-id">
                                            </div>
                                            
                                            <div class="col-md-3">
                                                <label class="form-label">Primer Apellido *</label>
                                                <input type="text" class="form-control" id="last-name1" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Segundo Apellido</label>
                                                <input type="text" class="form-control" id="last-name2">
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Primer Nombre *</label>
                                                <input type="text" class="form-control" id="first-name" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Segundo Nombre</label>
                                                <input type="text" class="form-control" id="second-name">
                                            </div>
                                            
                                            <div class="col-md-3">
                                                <label class="form-label">Fecha de Nacimiento *</label>
                                                <input type="date" class="form-control" id="birth-date" required>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Género *</label>
                                                <select class="form-select" id="gender" required>
                                                    <option value="MASCULINO">Masculino</option>
                                                    <option value="FEMENINO">Femenino</option>
                                                    <option value="OTRO">Otro</option>
                                                </select>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Etnia *</label>
                                                <select class="form-select" id="ethnic-group" required></select>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Categorización (SISBEN)</label>
                                                <input type="text" class="form-control" id="sisben" placeholder="Ej: A1, B2">
                                            </div>
                                            <div class="col-md-4">
                                                <div class="form-check mt-1">
                                                    <input class="form-check-input" type="checkbox" id="is-overage">
                                                    <label class="form-check-label fw-bold text-danger" for="is-overage">
                                                        ¿Es Beneficiario Adulto?
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-8">
                                                <div class="form-check mt-1">
                                                    <input class="form-check-input" type="checkbox" id="data-authorization" required>
                                                    <label class="form-check-label fw-bold text-primary" for="data-authorization">
                                                        Autorización de Tratamiento de Datos Personales (Habeas Data) *
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Tab 2: Enrollment -->
                                    <div class="tab-pane fade" id="tab-enrollment">
                                        <div class="row g-3">
                                        <!-- Tipo de Población -->
                                        <div class="col-md-12 mb-2">
                                            <label class="form-label d-block fw-bold">Tipo de Beneficiario *</label>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="radio" name="beneficiaryType" id="type-student" value="student" checked onchange="BeneficiariesView.toggleBeneficiaryType()">
                                                <label class="form-check-label" for="type-student"><i class="fas fa-user-graduate me-1"></i>Estudiante (Grados)</label>
                                            </div>
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="radio" name="beneficiaryType" id="type-other" value="other" onchange="BeneficiariesView.toggleBeneficiaryType()">
                                                <label class="form-check-label" for="type-other"><i class="fas fa-users me-1"></i>Otra Población (Adulto Mayor, Gestantes, etc.)</label>
                                            </div>
                                        </div>

                                        <div class="col-md-12" id="population-name-container" style="display:none;">
                                            <label class="form-label fw-bold text-primary">Descripción de la Población *</label>
                                            <input type="text" class="form-control" id="population-name" placeholder="Ej: Madres Gestantes, Adulto Mayor, Docentes...">
                                            <div class="form-text">Esta descripción agrupará a los beneficiarios en los reportes (Nutricionalmente usan la columna GENERAL).</div>
                                        </div>

                                        <div class="col-md-4">
                                            <label class="form-label fw-bold">Centro / Institución *</label>
                                            <select class="form-select" id="school-id" onchange="BeneficiariesView.onSchoolChange(this.value)" required></select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label fw-bold">Punto de Atención *</label>
                                                <select class="form-select" id="branch-id" required disabled>
                                                    <option value="">Seleccione primero un centro</option>
                                                </select>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Nivel / Grado *</label>
                                                <select class="form-select" id="grade" required>
                                                    <option value="TRANSICION">Transición / Nivel 1</option>
                                                    <option value="1">Primero / Nivel 2</option>
                                                    <option value="2">Segundo / Nivel 3</option>
                                                    <option value="3">Tercero</option>
                                                    <option value="4">Cuarto</option>
                                                    <option value="5">Quinto</option>
                                                    <option value="6">Sexto</option>
                                                    <option value="7">Séptimo</option>
                                                    <option value="8">Octavo</option>
                                                    <option value="9">Noveno</option>
                                                    <option value="10">Décimo</option>
                                                    <option value="11">Undécimo</option>
                                                    <option value="ADULTO_MAYOR">Adulto Mayor</option>
                                                    <option value="MADRE_GESTANTE">Madre Gestante</option>
                                                    <option value="PRIMERA_INFANCIA">Primera Infancia</option>
                                                </select>
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Grupo / Curso</label>
                                                <input type="text" class="form-control" id="group" placeholder="Ej: 01, A">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Jornada *</label>
                                                <select class="form-select" id="shift" required>
                                                    <option value="MAÑANA">Mañana</option>
                                                    <option value="TARDE">Tarde</option>
                                                    <option value="UNICA">Única</option>
                                                    <option value="NOCTURNA">Nocturna</option>
                                                    <option value="COMPLETA">Completa</option>
                                                </select>
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Fecha de Vinculación</label>
                                                <input type="date" class="form-control" id="enrollment-date">
                                            </div>
                                            <div class="col-md-3">
                                                <label class="form-label">Modalidad Atención *</label>
                                                <select class="form-select" id="modality" required>
                                                    <option value="RACION PREPARADA EN SITIO">Preparada en Sitio</option>
                                                    <option value="RACION INDUSTRIALIZADA">Industrializada</option>
                                                    <option value="BONO ALIMENTARIO">Bono Alimentario</option>
                                                </select>
                                            </div>

                                            <!-- Servicios Autorizados -->
                                            <div class="col-md-12">
                                                <label class="form-label fw-bold"><i class="fas fa-check-double me-2"></i>Servicios Autorizados para el Beneficiario *</label>
                                                <div id="beneficiary-services-container" class="d-flex flex-wrap gap-3 p-3 bg-light rounded border">
                                                    <!-- Services will be loaded here -->
                                                    <div class="text-muted small">Cargando servicios del programa...</div>
                                                </div>
                                                <div class="form-text">Si no selecciona "ALIMENTACIÓN", no podrá asignar tipos de ración.</div>
                                            </div>

                                            <div class="col-md-12" id="ration-rights-section">
                                                <label class="form-label fw-bold">Tipos de Ración Asignados *</label>
                                                <div id="ration-types-container" class="border rounded p-3 bg-white" style="max-height: 150px; overflow-y: auto;">
                                                    <!-- Checkboxes will be loaded here -->
                                                </div>
                                                <div class="form-text text-muted">Seleccione una o más raciones permitidas.</div>
                                            </div>



                                            <div class="col-md-3">
                                                <label class="form-label">Estado *</label>
                                                <select class="form-select" id="status" required>
                                                    <option value="ACTIVO">Activo</option>
                                                    <option value="INACTIVO">Inactivo</option>
                                                    <option value="DESERTADO">Desertado</option>
                                                    <option value="TRASLADADO">Trasladado</option>
                                                </select>
                                            </div>
                                            <div class="col-md-9" id="age-group-suggestion-container" style="display: none;">
                                                <label class="form-label d-none d-md-block">&nbsp;</label>
                                                <div class="alert alert-info d-flex align-items-center mb-0 p-2 border border-info rounded">
                                                    <i class="fas fa-info-circle me-2"></i>
                                                    <div>
                                                        Grupo Etario sugerido según edad: <strong id="suggested-age-group">-</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Tab 3: Contact -->
                                    <div class="tab-pane fade" id="tab-contact">
                                        <div class="row g-3">
                                            <div class="col-md-8">
                                                <label class="form-label">Dirección de Residencia</label>
                                                <input type="text" class="form-control" id="address">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Teléfono de Contacto</label>
                                                <input type="text" class="form-control" id="phone">
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label">Correo Electrónico</label>
                                                <input type="email" class="form-control" id="email">
                                            </div>
                                            <div class="col-12"><hr></div>
                                            <h6 class="mb-0">Información del Acudiente / Contacto</h6>
                                            <div class="col-md-8">
                                                <label class="form-label">Nombre del Acudiente</label>
                                                <input type="text" class="form-control" id="guardian-name">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Relación</label>
                                                <input type="text" class="form-control" id="guardian-relationship" placeholder="Ej: Madre, Padre, Hijo">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Teléfono Acudiente</label>
                                                <input type="text" class="form-control" id="guardian-phone">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Tab 4: Health and Others -->
                                    <div class="tab-pane fade" id="tab-health">
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <label class="form-label">Tipo de Discapacidad</label>
                                                <select class="form-select" id="disability">
                                                    <option value="NINGUNA">Ninguna</option>
                                                    <option value="FISICA">Física</option>
                                                    <option value="AUDITIVA">Auditiva</option>
                                                    <option value="VISUAL">Visual</option>
                                                    <option value="INTELECTUAL">Intelectual</option>
                                                    <option value="MULTIPLE">Múltiple</option>
                                                </select>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="form-check mt-4">
                                                    <input class="form-check-input" type="checkbox" id="is-victim">
                                                    <label class="form-check-label" for="is-victim">Población Víctima</label>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="form-check mt-4">
                                                    <input class="form-check-input" type="checkbox" id="is-migrant">
                                                    <label class="form-check-label" for="is-migrant">Población Migrante</label>
                                                </div>
                                            </div>
                                            <div class="col-md-12">
                                                <label class="form-label text-danger fw-bold">Restricciones Médicas / Alergias</label>
                                                <textarea class="form-control" id="medical-restrictions" rows="2" placeholder="Especifique alergias o condiciones médicas..."></textarea>
                                            </div>
                                            <div class="col-md-12">
                                                <label class="form-label">Observaciones Generales</label>
                                                <textarea class="form-control" id="observations" rows="2"></textarea>
                                            </div>
                                            <div class="col-12"><hr></div>
                                            <h6 class="mb-0">Tallas / Dotación</h6>
                                            <div class="col-md-4">
                                                <label class="form-label">Talla Zapato</label>
                                                <input type="text" class="form-control" id="talla-zapato" placeholder="Ej: 38">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Talla Camisa</label>
                                                <input type="text" class="form-control" id="talla-camisa" placeholder="Ej: M o 12">
                                            </div>
                                            <div class="col-md-4">
                                                <label class="form-label">Talla Pantalón</label>
                                                <input type="text" class="form-control" id="talla-pantalon" placeholder="Ej: 14">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Tab 5: Documents -->
                                    <div class="tab-pane fade" id="tab-docs">
                                        <div class="alert alert-info py-2 mb-3">
                                            <small><i class="fas fa-info-circle me-1"></i>Los documentos no son obligatorios para guardar el registro inicial. Podrán ser cargados o reemplazados posteriormente.</small>
                                        </div>
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <label class="form-label fw-bold">Documento de Identidad (PDF/IMG)</label>
                                                <div class="d-flex align-items-center mb-1">
                                                    <div class="me-2 border rounded d-flex justify-content-center align-items-center bg-white shadow-sm" style="width: 50px; height: 60px; overflow: hidden;" id="preview-box-doc-identidad">
                                                        <i class="fas fa-file-alt fa-2x text-muted" id="preview-icon-doc-identidad"></i>
                                                        <img src="" id="preview-img-doc-identidad" style="display:none; width: 100%; height: 100%; object-fit: cover;" />
                                                    </div>
                                                    <div class="flex-grow-1">
                                                        <input type="file" class="form-control form-control-sm" id="doc-identidad" accept=".pdf,image/*" onchange="BeneficiariesView.previewLocalFile(this, 'doc-identidad')">
                                                        <div id="link-doc-identidad" class="mt-1 small"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label fw-bold">Certificado SISBEN (PDF/IMG)</label>
                                                <div class="d-flex align-items-center mb-1">
                                                    <div class="me-2 border rounded d-flex justify-content-center align-items-center bg-white shadow-sm" style="width: 50px; height: 60px; overflow: hidden;" id="preview-box-doc-sisben">
                                                        <i class="fas fa-file-alt fa-2x text-muted" id="preview-icon-doc-sisben"></i>
                                                        <img src="" id="preview-img-doc-sisben" style="display:none; width: 100%; height: 100%; object-fit: cover;" />
                                                    </div>
                                                    <div class="flex-grow-1">
                                                        <input type="file" class="form-control form-control-sm" id="doc-sisben" accept=".pdf,image/*" onchange="BeneficiariesView.previewLocalFile(this, 'doc-sisben')">
                                                        <div id="link-doc-sisben" class="mt-1 small"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label fw-bold">Historia Clínica (PDF/IMG)</label>
                                                <div class="d-flex align-items-center mb-1">
                                                    <div class="me-2 border rounded d-flex justify-content-center align-items-center bg-white shadow-sm" style="width: 50px; height: 60px; overflow: hidden;" id="preview-box-historia-clinica">
                                                        <i class="fas fa-file-alt fa-2x text-muted" id="preview-icon-historia-clinica"></i>
                                                        <img src="" id="preview-img-historia-clinica" style="display:none; width: 100%; height: 100%; object-fit: cover;" />
                                                    </div>
                                                    <div class="flex-grow-1">
                                                        <input type="file" class="form-control form-control-sm" id="historia-clinica" accept=".pdf,image/*" onchange="BeneficiariesView.previewLocalFile(this, 'historia-clinica')">
                                                        <div id="link-historia-clinica" class="mt-1 small"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label fw-bold">Fotografía (IMG)</label>
                                                <div class="d-flex align-items-center mb-1">
                                                    <div class="me-2 border rounded d-flex justify-content-center align-items-center bg-white shadow-sm" style="width: 50px; height: 60px; overflow: hidden;" id="preview-box-fotografia">
                                                        <i class="fas fa-file-alt fa-2x text-muted" id="preview-icon-fotografia"></i>
                                                        <img src="" id="preview-img-fotografia" style="display:none; width: 100%; height: 100%; object-fit: cover;" />
                                                    </div>
                                                    <div class="flex-grow-1">
                                                        <input type="file" class="form-control form-control-sm" id="fotografia" accept="image/*" onchange="BeneficiariesView.previewLocalFile(this, 'fotografia')">
                                                        <div id="link-fotografia" class="mt-1 small"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer bg-light">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary px-4" onclick="BeneficiariesView.save()">
                                <i class="fas fa-save me-2"></i>Guardar Beneficiario
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-container').innerHTML = html;
        this.addEventListeners();
        await this.init();
    },

    addEventListeners() {
        const birthDateInput = document.getElementById('birth-date');
        if (birthDateInput) {
            birthDateInput.addEventListener('change', () => this.calculateSuggestedAgeGroup());
        }
    },

    toggleBeneficiaryType() {
        const isStudent = document.getElementById('type-student').checked;
        const gradeSelect = document.getElementById('grade');
        const popContainer = document.getElementById('population-name-container');
        const popInput = document.getElementById('population-name');

        if (isStudent) {
            popContainer.style.display = 'none';
            popInput.required = false;
            popInput.value = ''; // Limpiar si vuelve a estudiante

            gradeSelect.disabled = false;
            gradeSelect.required = true;
            // Restore visual required check if needed
        } else {
            popContainer.style.display = 'block';
            popInput.required = true;

            gradeSelect.value = '';
            gradeSelect.disabled = true;
            gradeSelect.required = false;
        }
    },

    calculateSuggestedAgeGroup() {
        const birthDate = document.getElementById('birth-date').value;
        if (!birthDate) return;

        const age = Helper.calculateAge(birthDate); // Assuming Helper has this, if not I'll add it or do it here
        const container = document.getElementById('age-group-suggestion-container');
        const span = document.getElementById('suggested-age-group');

        let group = '';
        if (age >= 3 && age <= 5) group = 'PREESCOLAR/INFANCIA';
        else if (age >= 6 && age <= 7) group = 'PRIMARIA A';
        else if (age >= 8 && age <= 12) group = 'PRIMARIA B';
        else if (age >= 13 && age <= 17) group = 'SECUNDARIA';
        else if (age > 17) group = 'ADULTO';

        if (group) {
            span.innerText = group;
            container.style.display = 'block';
            if (age > 17) document.getElementById('is-overage').checked = true;
        } else {
            container.style.display = 'none';
        }
    },

    async init() {
        Helper.loading(true, 'Cargando beneficiarios...');
        try {
            // Reset cached arrays to avoid stale data from previous PAE
            this.schools = [];
            this.branches = [];
            this.rationTypes = [];
            this.populationTypes = [];
            this.beneficiaries = [];

            await Promise.all([
                this.loadBeneficiaries(),
                this.loadMasterData()
            ]);
            this.renderFilters();
        } catch (err) {
            console.error("Error initializing view:", err);
            Helper.alert('error', 'Error al inicializar la vista');
        } finally {
            Helper.loading(false);
        }
    },

    async loadMasterData() {
        try {
            const [schools, branches, docTypes, ethnicGroups, rationTypes, populationTypes] = await Promise.all([
                Helper.fetchAPI('/schools'),
                Helper.fetchAPI('/branches'),
                Helper.fetchAPI('/beneficiarios/document_types'),
                Helper.fetchAPI('/beneficiarios/ethnic_groups'),
                Helper.fetchAPI('/ration-types'),
                Helper.fetchAPI('/population-types')
            ]);

            this.schools = schools || [];
            this.branches = branches || [];
            this.documentTypes = docTypes || [];
            this.ethnicGroups = ethnicGroups || [];
            this.rationTypes = rationTypes.success ? rationTypes.data : [];
            this.populationTypes = populationTypes.success ? populationTypes.data : (Array.isArray(populationTypes) ? populationTypes : []);

            this.populateSelect('school-id', this.schools, 'Seleccione Centro');
            this.populateSelect('doc-type', this.documentTypes, 'Seleccione Tipo');
            this.populateSelect('ethnic-group', this.ethnicGroups, 'Seleccione Etnia');

            // Populate Ration Checkboxes
            this.populateRationCheckboxes();

            // Populate Program Services
            this.populateProgramServices();

            // Filters
            this.populateSelect('filterSchool', this.schools, 'Todos los Centros');
        } catch (err) {
            console.error("Error loading master data:", err);
        }
    },

    populateRationCheckboxes() {
        const container = document.getElementById('ration-types-container');
        if (!container) return;

        if (this.rationTypes.length === 0) {
            container.innerHTML = '<div class="text-muted small">No hay tipos de ración activos.</div>';
            return;
        }

        const html = this.rationTypes.map(rt => `
            <div class="form-check">
                <input class="form-check-input ration-checkbox" type="checkbox" value="${rt.id}" id="ration-${rt.id}">
                <label class="form-check-label" for="ration-${rt.id}">
                    ${rt.name} ${rt.population_name ? `<span class="badge bg-light text-dark border ms-1">${rt.population_name}</span>` : ''}
                </label>
            </div>
        `).join('');
        container.innerHTML = html;
    },

    async populateProgramServices() {
        const container = document.getElementById('beneficiary-services-container');
        if (!container) return;

        try {
            // Get services from program (current PAE in token)
            const services = await Helper.fetchAPI('/services');
            if (services && Array.isArray(services)) {
                if (services.length === 0) {
                    container.innerHTML = '<div class="text-muted small">El programa no tiene servicios asociados.</div>';
                    return;
                }

                container.innerHTML = services.map(s => `
                    <div class="form-check">
                        <input class="form-check-input service-checkbox" type="checkbox" value="${s.id}" id="service-b-${s.id}" 
                            ${s.name.toUpperCase() === 'ALIMENTACIÓN' ? 'data-is-food="true"' : ''} onchange="BeneficiariesView.toggleRationsVisibility()">
                        <label class="form-check-label" for="service-b-${s.id}">
                            ${s.name}
                        </label>
                    </div>
                `).join('');

                // Initial check
                this.toggleRationsVisibility();
            }
        } catch (err) {
            console.error("Error loading program services:", err);
            container.innerHTML = '<div class="text-danger small">Error al cargar servicios.</div>';
        }
    },

    toggleRationsVisibility() {
        const foodCheckboxes = document.querySelectorAll('.service-checkbox[data-is-food="true"]');
        const rationSection = document.getElementById('ration-rights-section');
        if (!rationSection) return;

        const isFoodEnabled = Array.from(foodCheckboxes).some(cb => cb.checked);

        if (isFoodEnabled) {
            rationSection.style.display = 'block';
        } else {
            rationSection.style.display = 'none';
            // Uncheck all rations if food is disabled
            document.querySelectorAll('.ration-checkbox').forEach(cb => cb.checked = false);
        }
    },

    populateSelect(elementId, data, emptyText) {
        const select = document.getElementById(elementId);
        if (!select) return;

        let html = `<option value="">${emptyText}</option>`;
        data.forEach(item => {
            html += `<option value="${item.id}">${item.name}</option>`;
        });
        select.innerHTML = html;
    },

    async onSchoolChange(schoolId) {
        const branchSelect = document.getElementById('branch-id');
        if (!schoolId) {
            branchSelect.innerHTML = '<option value="">Seleccione primero un centro</option>';
            branchSelect.disabled = true;
            return;
        }

        try {
            const branches = await Helper.fetchAPI(`/branches?school_id=${schoolId}`);
            this.filteredBranches = branches || [];
            this.populateSelect('branch-id', this.filteredBranches, 'Seleccione Punto');
            branchSelect.disabled = false;
        } catch (err) {
            console.error("Error loading branches:", err);
            Helper.alert('error', 'No se pudieron cargar los puntos de atención');
        }
    },

    async loadBeneficiaries() {
        this.renderTable();
    },

    renderTable() {
        if ($.fn.DataTable.isDataTable('#beneficiariesTable')) {
            $('#beneficiariesTable').DataTable().ajax.reload(null, false);
            return;
        }

        $('#beneficiariesTable').DataTable({
            serverSide: true,
            processing: true,
            ajax: {
                url: Config.API_URL + '/beneficiarios/datatable',
                type: 'POST',
                beforeSend: function (request) {
                    request.setRequestHeader("Authorization", "Bearer " + Config.getToken());
                },
                data: function(d) {
                    d.school_id = document.getElementById('filterSchool') ? document.getElementById('filterSchool').value : '';
                    d.grade = document.getElementById('filterGrade') ? document.getElementById('filterGrade').value : '';
                    d.search.value = document.getElementById('searchBeneficiary') ? document.getElementById('searchBeneficiary').value : '';
                }
            },
            dom: '<"row"<"col-sm-12"t>><"row mt-3"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            searching: true,
            autoWidth: false,
            columns: [
                {
                    data: null,
                    width: '15%',
                    render: function(data, type, row) {
                        return `<small class="text-muted d-block">${row.document_type_name || 'DOC'}</small>
                                <span class="fw-bold">${row.document_number}</span>`;
                    }
                },
                {
                    data: null,
                    width: '20%',
                    render: function(data, type, row) {
                        const fullName = `${row.last_name1} ${row.last_name2 || ''}`.trim();
                        const firstNames = `${row.first_name} ${row.second_name || ''}`.trim();
                        return `<div class="fw-bold text-primary">${fullName}</div><div>${firstNames}</div>`;
                    }
                },
                {
                    data: null,
                    width: '25%',
                    render: function(data, type, row) {
                        return `<div class="text-truncate" style="max-width: 250px;">
                                    <i class="fas fa-university me-1 text-muted small"></i><strong>${row.school_name || 'N/A'}</strong><br>
                                    <span class="text-muted small"><i class="fas fa-map-marker-alt me-1"></i>${row.branch_name || 'N/A'}</span>
                                </div>`;
                    }
                },
                {
                    data: null,
                    width: '15%',
                    render: function(data, type, row) {
                        return `<span class="badge bg-light text-dark border">${row.grade || ''}°</span>
                                <span class="badge bg-light text-dark border">${row.group_name || 'N/A'}</span>
                                <br><small class="text-muted">${row.shift || ''}</small>
                                <br><span class="badge bg-primary-light text-primary border" style="font-size: 0.65rem; white-space: normal; text-align: left;">${row.ration_rights_names || row.ration_type_name || 'Sin Asignar'}</span>`;
                    }
                },
                {
                    data: 'status',
                    width: '10%',
                    render: function(data) {
                        const statusClass = data === 'ACTIVO' ? 'bg-success' : 'bg-danger';
                        return `<span class="badge ${statusClass}">${data || 'ACTIVO'}</span>`;
                    }
                },
                {
                    data: null,
                    className: 'text-end text-nowrap',
                    orderable: false,
                    width: '15%',
                    render: function(data, type, row) {
                        return `<div class="btn-group" style="min-width: 100px;">
                                    <button class="btn btn-sm btn-outline-info" title="Generar Carnet" onclick="BeneficiariesView.generateCarnet(${row.id})">
                                        <i class="fas fa-id-badge"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary" title="Editar" onclick="BeneficiariesView.openModal(${row.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" title="Eliminar" onclick="BeneficiariesView.delete(${row.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>`;
                    }
                }
            ],
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json',
                processing: '<i class="fas fa-spinner fa-spin fa-2x fa-fw text-primary"></i><span class="sr-only">Cargando...</span>'
            }
        });
    },

    filterTable() {
        if ($.fn.DataTable.isDataTable('#beneficiariesTable')) {
            $('#beneficiariesTable').DataTable().ajax.reload();
        }
    },

    async openModal(beneficiaryOrId = null) {
        let b = null;
        if (typeof beneficiaryOrId === 'number') {
            try {
                const response = await Helper.fetchAPI(`/beneficiarios/${beneficiaryOrId}`);
                if (response && response.success !== false) {
                    b = response;
                } else {
                    Helper.alert('error', 'Error al cargar beneficiario');
                    return;
                }
            } catch (err) {
                console.error("Error loading beneficiary", err);
                Helper.alert('error', 'Error de red');
                return;
            }
        } else {
            b = beneficiaryOrId;
        }

        const isEdit = !!b;
        document.getElementById('formBeneficiary').reset();
        document.getElementById('beneficiary-id').value = isEdit ? b.id : '';
        document.getElementById('modalBeneficiaryTitle').innerText = isEdit ? 'Editar Beneficiario' : 'Nuevo Beneficiario';

        // Reset tabs to first
        const firstTab = document.querySelector('#beneficiaryTabs button[data-bs-target="#tab-personal"]');
        bootstrap.Tab.getOrCreateInstance(firstTab).show();

        // Reset checkboxes
        document.querySelectorAll('.ration-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.service-checkbox').forEach(cb => cb.checked = false);

        // Reset file inputs and links
        const docFields = ['doc-identidad', 'doc-sisben', 'historia-clinica', 'fotografia'];
        docFields.forEach(field => {
            const input = document.getElementById(field);
            if (input) input.value = '';
            const linkDiv = document.getElementById(`link-${field}`);
            if (linkDiv) linkDiv.innerHTML = '';

            const iconEl = document.getElementById(`preview-icon-${field}`);
            const imgEl = document.getElementById(`preview-img-${field}`);
            if (iconEl && imgEl) {
                iconEl.className = 'fas fa-file-alt fa-2x text-muted';
                iconEl.style.display = 'block';
                imgEl.style.display = 'none';
                imgEl.src = '';
            }
        });

        if (isEdit) {
            document.getElementById('doc-type').value = b.document_type_id;
            document.getElementById('doc-number').value = b.document_number;
            document.getElementById('simat-id').value = b.simat_id || '';
            document.getElementById('first-name').value = b.first_name;
            document.getElementById('second-name').value = b.second_name || '';
            document.getElementById('last-name1').value = b.last_name1;
            document.getElementById('last-name2').value = b.last_name2 || '';
            document.getElementById('birth-date').value = b.birth_date;
            document.getElementById('gender').value = b.gender;
            document.getElementById('ethnic-group').value = b.ethnic_group_id;
            document.getElementById('sisben').value = b.sisben_category || '';
            document.getElementById('data-authorization').checked = !!b.data_authorization;
            document.getElementById('is-overage').checked = !!b.is_overage;
            this.calculateSuggestedAgeGroup(); // Auto-calculate on open if birth_date exists

            // Location
            document.getElementById('school-id').value = b.school_id || '';
            // Load branches for this school
            this.onSchoolChange(b.school_id).then(() => {
                document.getElementById('branch-id').value = b.branch_id;
            });

            // Set Beneficiary Type Logic
            const bType = b.beneficiary_type || 'student';
            if (bType === 'other') {
                document.getElementById('type-other').checked = true;
            } else {
                document.getElementById('type-student').checked = true;
            }
            document.getElementById('population-name').value = b.population_name || '';
            this.toggleBeneficiaryType(); // Aplica visibilidad

            document.getElementById('grade').value = b.grade;
            document.getElementById('group').value = b.group_name || '';
            document.getElementById('shift').value = b.shift;
            document.getElementById('enrollment-date').value = b.enrollment_date || '';
            document.getElementById('modality').value = b.modality;

            // Set Ration Checkboxes
            if (b.ration_rights_ids && Array.isArray(b.ration_rights_ids)) {
                b.ration_rights_ids.forEach(id => {
                    const cb = document.getElementById(`ration-${id}`);
                    if (cb) cb.checked = true;
                });
            } else if (b.ration_type_id) {
                const cb = document.getElementById(`ration-${b.ration_type_id}`);
                if (cb) cb.checked = true;
            }

            // Set Service Checkboxes
            if (b.service_ids && Array.isArray(b.service_ids)) {
                b.service_ids.forEach(id => {
                    const cb = document.getElementById(`service-b-${id}`);
                    if (cb) cb.checked = true;
                });
            }

            document.getElementById('status').value = b.status;
            document.getElementById('address').value = b.address || '';
            document.getElementById('phone').value = b.phone || '';
            document.getElementById('email').value = b.email || '';
            document.getElementById('guardian-name').value = b.guardian_name || '';
            document.getElementById('guardian-relationship').value = b.guardian_relationship || '';
            document.getElementById('guardian-phone').value = b.guardian_phone || '';

            document.getElementById('disability').value = b.disability_type || 'NINGUNA';
            document.getElementById('is-victim').checked = !!b.is_victim;
            document.getElementById('is-migrant').checked = !!b.is_migrant;
            document.getElementById('medical-restrictions').value = b.medical_restrictions || '';
            document.getElementById('observations').value = b.observations || '';

            document.getElementById('talla-zapato').value = b.talla_zapato || '';
            document.getElementById('talla-camisa').value = b.talla_camisa || '';
            document.getElementById('talla-pantalon').value = b.talla_pantalon || '';

            // Set document links
            const baseUrl = Config.API_URL.replace(/\/api\/?$/, '');
            const setRemotePreview = (path, fieldId) => {
                if (!path) return;
                const url = `${baseUrl}/${path}`;
                const isPdf = path.toLowerCase().endsWith('.pdf');
                const linkDiv = document.getElementById(`link-${fieldId}`);
                if (linkDiv) linkDiv.innerHTML = `<a href="${url}" target="_blank" class="text-primary"><i class="fas fa-external-link-alt me-1"></i>Ver actual</a>`;

                const iconEl = document.getElementById(`preview-icon-${fieldId}`);
                const imgEl = document.getElementById(`preview-img-${fieldId}`);
                if (iconEl && imgEl) {
                    if (isPdf) {
                        iconEl.className = 'fas fa-file-pdf fa-2x text-danger';
                        iconEl.style.display = 'block';
                        imgEl.style.display = 'none';
                    } else {
                        imgEl.src = url;
                        imgEl.style.display = 'block';
                        iconEl.style.display = 'none';
                    }
                }
            };

            setRemotePreview(b.doc_identidad_path, 'doc-identidad');
            setRemotePreview(b.doc_sisben_path, 'doc-sisben');
            setRemotePreview(b.historia_clinica_path, 'historia-clinica');
            setRemotePreview(b.fotografia_path, 'fotografia');
        }

        this.toggleRationsVisibility();
        new bootstrap.Modal(document.getElementById('modalBeneficiary')).show();
    },

    async save() {
        const id = document.getElementById('beneficiary-id').value;
        const form = document.getElementById('formBeneficiary');

        // Custom validation to handle hidden tabs
        const invalidField = form.querySelector(':invalid');
        if (invalidField) {
            // Find which tab this field belongs to
            const tabPane = invalidField.closest('.tab-pane');
            if (tabPane) {
                const tabId = tabPane.id;
                const tabTrigger = document.querySelector(`button[data-bs-target="#${tabId}"]`);
                if (tabTrigger) {
                    bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
                    // Small delay to allow tab transition before reporting validity
                    setTimeout(() => {
                        invalidField.focus();
                        form.reportValidity();
                    }, 150);
                    return;
                }
            }
            form.reportValidity();
            return;
        }

        const data = {
            document_type_id: document.getElementById('doc-type').value,
            document_number: document.getElementById('doc-number').value,
            simat_id: document.getElementById('simat-id').value,
            first_name: document.getElementById('first-name').value,
            second_name: document.getElementById('second-name').value,
            last_name1: document.getElementById('last-name1').value,
            last_name2: document.getElementById('last-name2').value,
            birth_date: document.getElementById('birth-date').value,
            gender: document.getElementById('gender').value,
            ethnic_group_id: document.getElementById('ethnic-group').value,
            sisben_category: document.getElementById('sisben').value,
            data_authorization: document.getElementById('data-authorization').checked,
            is_overage: document.getElementById('is-overage').checked ? 1 : 0,

            beneficiary_type: document.querySelector('input[name="beneficiaryType"]:checked').value,
            population_name: document.getElementById('population-name').value,

            branch_id: document.getElementById('branch-id').value,
            grade: document.getElementById('grade').value,
            group_name: document.getElementById('group').value,
            shift: document.getElementById('shift').value,
            enrollment_date: document.getElementById('enrollment-date').value,
            modality: document.getElementById('modality').value,
            ration_rights: Array.from(document.querySelectorAll('.ration-checkbox:checked')).map(cb => cb.value),
            service_ids: Array.from(document.querySelectorAll('.service-checkbox:checked')).map(cb => cb.value),
            status: document.getElementById('status').value,

            address: document.getElementById('address').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            guardian_name: document.getElementById('guardian-name').value,
            guardian_relationship: document.getElementById('guardian-relationship').value,
            guardian_phone: document.getElementById('guardian-phone').value,

            disability_type: document.getElementById('disability').value,
            is_victim: document.getElementById('is-victim').checked,
            is_migrant: document.getElementById('is-migrant').checked,
            medical_restrictions: document.getElementById('medical-restrictions').value,
            observations: document.getElementById('observations').value,
            talla_zapato: document.getElementById('talla-zapato').value,
            talla_camisa: document.getElementById('talla-camisa').value,
            talla_pantalon: document.getElementById('talla-pantalon').value
        };

        try {
            const endpoint = id ? `/beneficiarios/${id}` : '/beneficiarios';
            const method = id ? 'PUT' : 'POST';

            const res = await Helper.fetchAPI(endpoint, {
                method,
                body: JSON.stringify(data)
            });

            if (res.message) {
                const beneficiaryId = res.id || id;

                // Upload documents if any
                const filesToUpload = new FormData();
                let hasFiles = false;

                const dId = document.getElementById('doc-identidad').files[0];
                if (dId) { filesToUpload.append('doc_identidad', dId); hasFiles = true; }

                const dSis = document.getElementById('doc-sisben').files[0];
                if (dSis) { filesToUpload.append('doc_sisben', dSis); hasFiles = true; }

                const hCli = document.getElementById('historia-clinica').files[0];
                if (hCli) { filesToUpload.append('historia_clinica', hCli); hasFiles = true; }

                const foto = document.getElementById('fotografia').files[0];
                if (foto) { filesToUpload.append('fotografia', foto); hasFiles = true; }

                if (hasFiles && beneficiaryId) {
                    try {
                        let token = Config.getToken();
                        const uploadRes = await fetch(`${Config.API_URL}/beneficiarios/upload/${beneficiaryId}`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: filesToUpload
                        });
                        if (!uploadRes.ok) {
                            console.warn("Error uploading docs");
                        }
                    } catch (e) {
                        console.error('File upload error:', e);
                    }
                }

                Helper.alert('success', res.message);
                bootstrap.Modal.getInstance(document.getElementById('modalBeneficiary')).hide();
                await this.loadBeneficiaries();
            }
        } catch (err) {
            console.error(err);
            Helper.alert('error', err.message || 'Error al guardar beneficiario');
        }
    },

    async delete(id) {
        if (!await Helper.confirm('¿Seguro que desea eliminar este beneficiario? Esta acción no se puede deshacer.')) return;

        try {
            const res = await Helper.fetchAPI(`/beneficiarios/${id}`, { method: 'DELETE' });
            if (res.message) {
                Helper.alert('success', res.message);
                await this.loadBeneficiaries();
            }
        } catch (err) {
            console.error(err);
        }
    },

    async generateCarnet(id) {
        let b = null;
        try {
            const response = await Helper.fetchAPI(`/beneficiarios/${id}`);
            if (response && response.success !== false) {
                b = response;
            } else {
                Helper.alert('error', 'No se pudo cargar el beneficiario para el carnet.');
                return;
            }
        } catch (e) {
            Helper.alert('error', 'Error de red');
            return;
        }

        // Token format for QR
        const token = `PAE:${b.id}:${b.document_number}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`;
        const paeName = App.state.user?.pae || 'PAE';

        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            Helper.alert('error', 'Por favor permita las ventanas emergentes para generar el carnet.');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Carnet - ${b.first_name} ${b.last_name1}</title>
                <!-- FontAwesome for the avatar icon -->
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        -webkit-print-color-adjust: exact; 
                        padding: 40px; 
                        background-color: #f0f0f0;
                        display: flex;
                        justify-content: center;
                        align-items: flex-start;
                        min-height: 100vh;
                        margin: 0;
                    }
                    .carnet-card {
                        width: 350px;
                        height: 560px; /* Increased height */
                        border-radius: 20px;
                        padding: 0;
                        margin: 0;
                        position: relative;
                        background: #fff;
                        overflow: visible; /* Changed from hidden to avoid clipping */
                        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                        display: flex;
                        flex-direction: column;
                    }
                    .header {
                        background: linear-gradient(135deg, #1B4F72 0%, #2980b9 100%);
                        color: white;
                        padding: 15px; /* Reduced padding */
                        text-align: center;
                        border-bottom: 5px solid #F4D03F;
                    }
                    .content { 
                        flex-grow: 1;
                        padding: 15px; /* Reduced padding */
                        text-align: center; 
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    
                    .avatar-container {
                        width: 100px;
                        height: 100px;
                        background-color: #ecf0f1;
                        border-radius: 50%;
                        margin-bottom: 15px;
                        border: 4px solid #F4D03F;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 40px;
                        color: #1B4F72;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    
                    .student-name { 
                        font-size: 22px; 
                        font-weight: 700; 
                        color: #2c3e50; 
                        margin-bottom: 5px; 
                        line-height: 1.2;
                    }
                    
                    .student-doc {
                        font-family: monospace;
                        font-size: 16px;
                        background-color: #f8f9fa;
                        padding: 4px 12px;
                        border-radius: 12px;
                        color: #555;
                        margin-bottom: 10px;
                        display: inline-block;
                        border: 1px solid #ddd;
                        font-weight: bold;
                    }
                    
                    .school-info {
                        font-size: 13px;
                        color: #7f8c8d;
                        margin-bottom: 2px;
                        width: 100%;
                    }
                    
                    .grade-badge {
                        background-color: #1B4F72;
                        color: white;
                        padding: 5px 15px;
                        border-radius: 15px;
                        font-size: 14px;
                        font-weight: bold;
                        margin: 10px 0;
                        display: inline-block;
                    }
                    
                    .qr-container { 
                        margin-top: auto; 
                        padding: 10px;
                        background: white;
                        border: 1px dashed #ccc;
                        border-radius: 10px;
                    }
                    
                    .footer {
                        background-color: #f8f9fa;
                        color: #7f8c8d;
                        padding: 10px;
                        text-align: center;
                        border-top: 1px solid #eee;
                        font-size: 10px;
                        font-weight: 600;
                        text-transform: uppercase;
                    }
                    
                    @media print {
                        @page { margin: 0; }
                        body { 
                            background: none; 
                            padding: 20px; 
                            display: block;
                        }
                        .carnet-card {
                            box-shadow: none;
                            border: 1px solid #ddd;
                            margin: 10px;
                            page-break-inside: avoid;
                        }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
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
                        <div class="student-doc">${b.document_type_name}: ${b.document_number}</div>
                        <div class="grade-badge">
                            ${b.beneficiary_type === 'ESTUDIANTE' ? `Grado ${b.grade || 'N/A'} - ${b.group_name || 'N/A'}` : (b.population_name || b.beneficiary_type || 'Otra Población')}
                        </div>                        <div class="school-info"><strong>${b.school_name}</strong></div>
                        <div class="school-info">${b.branch_name}</div>
                        
                        <div class="qr-container">
                            <img src="${qrUrl}" width="110" height="110" alt="QR Code">
                        </div>
                    </div>
                    <div class="footer">
                        Este documento es personal e intransferible
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        // Attempt to close after print, but offer manual close too
                        setTimeout(function() {
                            window.print();
                        }, 500); // Give image a moment to render
                    }
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    filterTable() {
        const schoolId = document.getElementById('filterSchool').value;
        const grade = document.getElementById('filterGrade').value;
        const searchText = document.getElementById('searchBeneficiary').value.toLowerCase();

        // Custom search logic for DataTable or just re-render with filters
        // For now, let's use DataTable's built-in search for the text and manual for selects
        const table = $('#beneficiariesTable').DataTable();

        // This is a simple implementation, a better one would use table.column().search()
        table.search(searchText);

        if (schoolId) {
            // Find school name to filter
            const school = this.schools.find(s => s.id == schoolId);
            table.column(2).search(school ? school.name : '').draw();
        } else {
            table.column(2).search('').draw();
        }

        if (grade) {
            // Use regex: Starts with Grade followed by a non-digit character (like the degree symbol, space, or separator) or end of string
            // This avoids hardcoding '°' which can cause encoding issues on some servers (Linux/Hostinger)
            // It also ensures "1" doesn't match "10" or "11"
            table.column(3).search('^' + grade + '([^0-9]|$)', true, false).draw();
        } else {
            table.column(3).search('').draw();
        }
    },

    /**
     * Download CSV Template
     */
    async downloadTemplate() {
        try {
            Helper.loading(true, "Generando plantilla...");
            const response = await fetch(Config.apiEndpoint('/beneficiarios/template'), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${Config.getToken()}`
                }
            });

            if (!response.ok) throw new Error('Error al descargar la plantilla');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'plantilla_carga_beneficiarios.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            Helper.loading(false);
        } catch (error) {
            console.error(error);
            Helper.loading(false);
            Helper.alert('error', 'No se pudo descargar la plantilla. Verifique su sesión.');
        }
    },

    /**
     * Open Bulk Upload Modal
     */
    async openBulkUploadModal(showUploadTab = false) {
        // Always destroy and recreate so the data dictionary reflects current data
        const existing = document.getElementById('modalBulkUpload');
        if (existing) {
            const bsInstance = bootstrap.Modal.getInstance(existing);
            if (bsInstance) bsInstance.dispose();
            existing.remove();
        }

        // Refresh ration types and population types to ensure we have the latest data
        try {
            const [rationTypes, populationTypes] = await Promise.all([
                Helper.fetchAPI('/ration-types'),
                Helper.fetchAPI('/population-types')
            ]);
            this.rationTypes = rationTypes.success ? rationTypes.data : (Array.isArray(rationTypes) ? rationTypes : []);
            this.populationTypes = populationTypes.success ? populationTypes.data : (Array.isArray(populationTypes) ? populationTypes : []);
        } catch (e) {
            console.warn('No se pudieron refrescar tipos de ración/población:', e);
        }

        const modalHtml = `
            <div class="modal fade" id="modalBulkUpload" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title"><i class="fas fa-file-csv me-2"></i>Carga Masiva de Beneficiarios</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Para realizar la carga masiva, primero descargue la plantilla, llene los datos y luego suba el archivo.
                            </div>
                            
                            <ul class="nav nav-tabs" id="bulkTabs" role="tablist">
                                <li class="nav-item">
                                    <button class="nav-link active" id="tab-instructions-btn" data-bs-toggle="tab" data-bs-target="#tab-instructions" type="button">Instrucciones</button>
                                </li>
                                <li class="nav-item">
                                    <button class="nav-link" id="tab-upload-btn" data-bs-toggle="tab" data-bs-target="#tab-upload" type="button">Subir Archivo</button>
                                </li>
                            </ul>
                            
                            <div class="tab-content p-3 border border-top-0 rounded-bottom">
                                <div class="tab-pane fade show active" id="tab-instructions">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h6>Pasos para la carga:</h6>
                                            <ol>
                                                <li>Descargue la plantilla CSV: <button class="btn btn-sm btn-outline-primary ms-2" onclick="BeneficiariesView.downloadTemplate()">Descargar Plantilla</button></li>
                                                <li>Llene los datos obligatorios.</li>
                                                <li>Guarde el archivo como CSV (Delimitado por comas).</li>
                                                <li>Suba el archivo en la pestaña "Subir Archivo".</li>
                                            </ol>
                                            <div class="alert alert-warning small">
                                                <strong>Nota:</strong> Use los <b>Nombres Exactos</b> y <b>Códigos</b> listados a continuación.
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <h6 class="text-primary"><i class="fas fa-book me-2"></i>Diccionario de Datos</h6>
                                            <div class="accordion" id="accordionReference">
                                                
                                                <!-- Sedes -->
                                                <div class="accordion-item">
                                                    <h2 class="accordion-header" id="headingOne">
                                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="false" aria-controls="collapseOne">
                                                            Puntos de Atención (Copiar Nombre Exacto)
                                                        </button>
                                                    </h2>
                                                    <div id="collapseOne" class="accordion-collapse collapse" aria-labelledby="headingOne" data-bs-parent="#accordionReference">
                                                        <div class="accordion-body p-0" style="max-height: 200px; overflow-y: auto;">
                                                            <table class="table table-sm table-striped mb-0 small">
                                                                <thead class="table-light sticky-top"><tr><th>Nombre Punto</th><th>Centro / Institución</th></tr></thead>
                                                                <tbody>
                                                                     ${(this.branches && this.branches.length > 0)
                ? this.branches.map(b => `<tr><td>${b.name}</td><td class="text-muted">${b.school_name}</td></tr>`).join('')
                : '<tr><td colspan="2" class="text-center text-muted py-3">No hay sedes registradas para este programa PAE</td></tr>'
            }
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Etnias -->
                                                <div class="accordion-item">
                                                    <h2 class="accordion-header" id="headingTwo">
                                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                                                            Grupos Étnicos SIMAT (Usar Código)
                                                        </button>
                                                    </h2>
                                                    <div id="collapseTwo" class="accordion-collapse collapse" aria-labelledby="headingTwo" data-bs-parent="#accordionReference">
                                                        <div class="accordion-body p-0" style="max-height: 200px; overflow-y: auto;">
                                                            <table class="table table-sm table-striped mb-0 small">
                                                                <thead class="table-light sticky-top"><tr><th>Cód</th><th>Nombre</th></tr></thead>
                                                                <tbody>
                                                                    ${(this.ethnicGroups || []).map(e => `<tr><td>${e.code}</td><td>${e.name}</td></tr>`).join('')}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Población del Programa -->
                                                <div class="accordion-item">
                                                    <h2 class="accordion-header" id="headingPop">
                                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapsePop" aria-expanded="false" aria-controls="collapsePop">
                                                            Tipos de Población del Programa
                                                        </button>
                                                    </h2>
                                                    <div id="collapsePop" class="accordion-collapse collapse" aria-labelledby="headingPop" data-bs-parent="#accordionReference">
                                                        <div class="accordion-body p-0" style="max-height: 200px; overflow-y: auto;">
                                                            <table class="table table-sm table-striped mb-0 small">
                                                                <thead class="table-light sticky-top"><tr><th>Tipo Población / Enfoque</th></tr></thead>
                                                                <tbody>
                                                                    ${(Array.isArray(this.populationTypes) && this.populationTypes.length > 0)
                ? this.populationTypes.map(p => `<tr><td>${p.name}</td></tr>`).join('')
                : '<tr><td class="text-center text-muted py-3">No hay tipos de población registrados para este programa PAE</td></tr>'
            }
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Raciones -->
                                                <div class="accordion-item">
                                                    <h2 class="accordion-header" id="headingThree">
                                                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                                                            Tipos de Ración (Copiar Nombre Exacto)
                                                        </button>
                                                    </h2>
                                                    <div id="collapseThree" class="accordion-collapse collapse" aria-labelledby="headingThree" data-bs-parent="#accordionReference">
                                                        <div class="accordion-body p-0" style="max-height: 200px; overflow-y: auto;">
                                                            <table class="table table-sm table-striped mb-0 small">
                                                                <thead class="table-light sticky-top"><tr><th>Nombre Ración</th></tr></thead>
                                                                <tbody>
                                                                    ${(Array.isArray(this.rationTypes) && this.rationTypes.length > 0)
                ? this.rationTypes.map(r => `<tr><td>${r.name}</td></tr>`).join('')
                : '<tr><td class="text-center text-muted py-3">No hay tipos de ración registrados para este programa PAE</td></tr>'
            }
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="tab-pane fade" id="tab-upload">
                                    <div class="mb-3">
                                        <label for="bulkFile" class="form-label">Seleccionar Archivo CSV</label>
                                        <input class="form-control" type="file" id="bulkFile" accept=".csv">
                                    </div>
                                    <div id="uploadResult" class="d-none"></div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-success" onclick="BeneficiariesView.uploadBulkFile()">
                                <i class="fas fa-upload me-2"></i>Procesar Carga
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = new bootstrap.Modal(document.getElementById('modalBulkUpload'));
        modal.show();

        if (showUploadTab) {
            const triggerEl = document.querySelector('#tab-upload-btn');
            bootstrap.Tab.getInstance(triggerEl) || new bootstrap.Tab(triggerEl).show();

            // Allow Bootstrap tab transition then show
            setTimeout(() => {
                const tab = new bootstrap.Tab(triggerEl);
                tab.show();
            }, 200);
        }
    },

    /**
     * Upload Bulk File
     */
    async uploadBulkFile() {
        const fileInput = document.getElementById('bulkFile');
        const file = fileInput.files[0];

        if (!file) {
            Helper.alert('warning', 'Por favor seleccione un archivo CSV');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        Helper.loading(true, 'Procesando archivo, esto puede tomar unos momentos...');

        try {
            const response = await fetch(Config.apiEndpoint('/beneficiarios/import'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Config.getToken()}`
                },
                body: formData
            });

            const rawText = await response.text();
            Helper.loading(false);

            let res;
            try {
                res = JSON.parse(rawText);
            } catch (jsonErr) {
                console.error('Respuesta del servidor (no JSON):', rawText);
                Helper.alert('error', 'El servidor devolvió una respuesta inesperada:\n\n' + rawText.substring(0, 400));
                return;
            }

            if (response.ok && (res.status === 'success' || !res.error)) {
                const results = res.details || {};
                let msg = `Proceso finalizado.\nCreados: ${results.created || 0}\nActualizados: ${results.updated || 0}\nErrores: ${results.errors || 0}`;

                if (results.error_list && results.error_list.length > 0) {
                    // Create a text file with errors? Or just show summary
                    console.error("Errores de importación:", results.error_list);
                    msg += '\n\nRevise la consola para detalles de errores.';
                }

                Swal.fire({
                    title: 'Carga Completada',
                    text: msg,
                    icon: (results.errors > 0 ? 'warning' : 'success')
                }).then(() => {
                    // Close modal first
                    const modalEl = document.getElementById('modalBulkUpload');
                    if (modalEl) {
                        const modal = bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();
                    }
                    // Redirect to dashboard or group
                    let targetHash = '#dashboard';
                    if (App.state.menu) {
                        const group = App.state.menu.find(g => (g.modules || []).some(m => m.route === 'beneficiarios'));
                        if (group) {
                            targetHash = `#group/${group.id}`;
                        } else {
                            // Fallback: Check if group name is Beneficiarios/Estudiantes directly
                            const g2 = App.state.menu.find(g => g.name === 'Beneficiarios' || g.name === 'Estudiantes');
                            if (g2) targetHash = `#group/${g2.id}`;
                        }
                    }

                    window.location.hash = '#'; // Hack to force reload to dashboard first
                    setTimeout(() => {
                        window.location.hash = targetHash;
                    }, 100);
                });

                // Reload list
                this.loadBeneficiaries();
            } else {
                Helper.alert('error', res.message || 'Error en la carga');
            }
        } catch (err) {
            console.error(err);
            Helper.loading(false);
            Helper.alert('error', 'Error de red al subir el archivo');
        }
    },

    renderFilters() {
        // Optional: populate grade filter
        const grades = ["TRANSICION", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
        const select = document.getElementById('filterGrade');
        grades.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.innerText = `Grado ${g}`;
            select.appendChild(opt);
        });

        // Search event
        document.getElementById('searchBeneficiary').addEventListener('keyup', () => this.filterTable());
    },

    previewLocalFile(inputElement, fieldId) {
        const file = inputElement.files[0];
        const iconEl = document.getElementById(`preview-icon-${fieldId}`);
        const imgEl = document.getElementById(`preview-img-${fieldId}`);

        if (!iconEl || !imgEl) return;

        if (!file) {
            iconEl.className = 'fas fa-file-alt fa-2x text-muted';
            iconEl.style.display = 'block';
            imgEl.style.display = 'none';
            imgEl.src = '';
            return;
        }

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imgEl.src = e.target.result;
                imgEl.style.display = 'block';
                iconEl.style.display = 'none';
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            iconEl.className = 'fas fa-file-pdf fa-2x text-danger';
            iconEl.style.display = 'block';
            imgEl.style.display = 'none';
            imgEl.src = '';
        } else {
            iconEl.className = 'fas fa-file fa-2x text-info';
            iconEl.style.display = 'block';
            imgEl.style.display = 'none';
            imgEl.src = '';
        }
    }
};

// Auto-render when loaded
BeneficiariesView.render();

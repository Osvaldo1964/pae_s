<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inscripción Adulto Mayor | Program Control</title>
    <link href="assets/plugins/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <link href="assets/plugins/fontawesome/css/all.min.css" rel="stylesheet">
    <link href="assets/plugins/sweetalert2/sweetalert2.min.css" rel="stylesheet">
    <style>
        body { background-color: #f8f9fa; }
        .hero { background: #1B4F72; color: #fff; padding: 40px 0; border-bottom: 5px solid #F1C40F; }
        .form-section { background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: -30px; margin-bottom: 50px; }
        .step-title { color: #1B4F72; border-bottom: 2px solid #27AE60; padding-bottom: 10px; margin-bottom: 20px; margin-top: 30px; }
        .required::after { content: " *"; color: red; }
    </style>
</head>
<body>
    <div class="hero text-center">
        <div class="container">
            <h1 class="fw-bold"><i class="fas fa-bus-alt me-2"></i>Convocatoria Viajes Recreativos Adulto Mayor</h1>
            <p class="lead">Programa especial de turismo para adultos mayores en el departamento del Magdalena</p>
            <div class="alert alert-warning d-inline-block text-start border-0">
                <strong><i class="fas fa-exclamation-triangle me-2"></i>Condiciones de la inscripción:</strong>
                <ul class="mb-0 mt-2">
                    <li>Cupos limitados a <strong>2,160</strong> personas.</li>
                    <li>Tener mínimo <strong>60 años</strong> de edad.</li>
                    <li>Ser ciudadano colombiano o residente por al menos 10 años.</li>
                    <li>Pertenecer al <strong>SISBEN IV</strong> (Grupos A, B o C).</li>
                    <li>Esta inscripción <strong>NO GARANTIZA</strong> la aceptación inmediata y está sujeta a revisión.</li>
                </ul>
            </div>
        </div>
    </div>

    <div class="container relative">
        <div class="row justify-content-center">
            <div class="col-lg-10">
                <div class="form-section">
                    <form id="adultoMayorForm">
                        <input type="hidden" name="pae_id" value="1"> 
                        <!-- IDENTIFICACIÓN -->
                        <h4 class="step-title"><i class="fas fa-id-card me-2"></i>1. Identificación</h4>
                        <div class="row g-3">
                            <div class="col-md-3">
                                <label class="form-label required">Tipo de Documento</label>
                                <select class="form-select" name="document_type" required>
                                    <option value="">Seleccione...</option>
                                    <option value="CÉDULA DE CIUDADANÍA">CÉDULA DE CIUDADANÍA</option>
                                    <option value="CÉDULA DE EXTRANJERÍA">CÉDULA DE EXTRANJERÍA</option>
                                    <option value="PASAPORTE">PASAPORTE</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label required">Número de Documento</label>
                                <input type="text" class="form-control" name="document_number" required>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">ID Externo</label>
                                <input type="text" class="form-control" name="external_id">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label required">Fecha de Nacimiento</label>
                                <input type="date" class="form-control" name="birth_date" required id="birthDateInput">
                            </div>
                        </div>
                        <div class="row g-3 mt-1">
                            <div class="col-md-3">
                                <label class="form-label required">Primer Nombre</label>
                                <input type="text" class="form-control" name="first_name" required>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Segundo Nombre</label>
                                <input type="text" class="form-control" name="second_name">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label required">Primer Apellido</label>
                                <input type="text" class="form-control" name="last_name" required>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label">Segundo Apellido</label>
                                <input type="text" class="form-control" name="second_last_name">
                            </div>
                        </div>
                        <div class="row g-3 mt-1">
                            <div class="col-md-3">
                                <label class="form-label required">Género</label>
                                <select class="form-select" name="gender" required>
                                    <option value="">Seleccione...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Femenino">Femenino</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label required">Etnia</label>
                                <select class="form-select" name="ethnicity" required>
                                    <option value="SIN PERTENENCIA ÉTNICA">SIN PERTENENCIA ÉTNICA</option>
                                    <option value="INDÍGENA">INDÍGENA</option>
                                    <option value="AFROCOLOMBIANO">AFROCOLOMBIANO / NEGRO</option>
                                    <option value="RAIZAL">RAIZAL</option>
                                    <option value="PALENQUERO">PALENQUERO</option>
                                    <option value="ROM">ROM</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="form-label required">SISBEN IV</label>
                                <select class="form-select" name="sisben_group" id="sisbenSelect" required>
                                    <option value="">Seleccione Grupo...</option>
                                    <optgroup label="Grupos Permitidos">
                                        <option value="A">Grupo A (Pobreza Extrema)</option>
                                        <option value="B">Grupo B (Pobreza Moderada)</option>
                                        <option value="C">Grupo C (Vulnerable)</option>
                                    </optgroup>
                                    <optgroup label="No Permitidos">
                                        <option value="D">Grupo D (No Pobre)</option>
                                    </optgroup>
                                </select>
                            </div>
                        </div>

                        <!-- VINCULACIÓN -->
                        <h4 class="step-title"><i class="fas fa-building me-2"></i>2. Vinculación (Sedes)</h4>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label required">Centro / Institución</label>
                                <select class="form-select" name="school_id" id="schoolSelect" required onchange="loadBranches()">
                                    <option value="">Cargando Instituciones...</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label required">Punto de Atención / Municipio</label>
                                <select class="form-select" name="branch_id" id="branchSelect" required disabled>
                                    <option value="">Seleccione Sede...</option>
                                </select>
                            </div>
                        </div>

                        <!-- CONTACTO -->
                        <h4 class="step-title"><i class="fas fa-address-book me-2"></i>3. Contacto</h4>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label required">Dirección de Residencia</label>
                                <input type="text" class="form-control" name="address" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label required">Teléfono de Contacto</label>
                                <input type="text" class="form-control" name="phone" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Correo Electrónico (Opcional)</label>
                                <input type="email" class="form-control" name="email">
                            </div>
                        </div>
                        <h6 class="mt-4"><i class="fas fa-user-friends me-2"></i>Contacto de Emergencia / Acudiente</h6>
                        <div class="row g-3 mt-1">
                            <div class="col-md-4">
                                <label class="form-label required">Nombre del Acudiente</label>
                                <input type="text" class="form-control" name="guardian_name" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label required">Teléfono Acudiente</label>
                                <input type="text" class="form-control" name="guardian_phone" required>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label required">Relación / Parentesco</label>
                                <input type="text" class="form-control" name="guardian_relationship" placeholder="Ej: Hijo, Hermano" required>
                            </div>
                        </div>

                        <!-- SALUD -->
                        <h4 class="step-title"><i class="fas fa-heartbeat me-2"></i>4. Salud y Dotación</h4>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Discapacidad (Opcional)</label>
                                <input type="text" class="form-control" name="disability">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Patología / Alergias (Opcional)</label>
                                <input type="text" class="form-control" name="pathology">
                            </div>
                            <div class="col-12">
                                <label class="form-label">Observaciones de Salud</label>
                                <textarea class="form-control" name="observation" rows="2"></textarea>
                            </div>
                        </div>
                        <div class="row g-3 mt-1">
                            <div class="col-md-6">
                                <label class="form-label required">Talla de Camisa</label>
                                <input type="text" class="form-control" name="talla_camisa" placeholder="Ej: M, L" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label required">Talla de Pantalón</label>
                                <input type="text" class="form-control" name="talla_pantalon" placeholder="Ej: 32" required>
                            </div>
                        </div>

                        <!-- DOCUMENTOS -->
                        <h4 class="step-title"><i class="fas fa-file-upload me-2"></i>5. Documentación Adjunta</h4>
                        <p class="small text-muted mb-3">Formatos permitidos: PDF, JPG, PNG (Max. 5MB por archivo).</p>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label required">1. Documento de Identidad (Copia)</label>
                                <input type="file" class="form-control" name="doc_identidad" accept=".pdf,image/*" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label required">2. Certificado SISBEN IV</label>
                                <input type="file" class="form-control" name="doc_sisben" accept=".pdf,image/*" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label required">3. Historia Clínica Reciente</label>
                                <input type="file" class="form-control" name="historia_clinica" accept=".pdf,image/*" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label required">4. Fotografía de Frente</label>
                                <input type="file" class="form-control" name="fotografia" accept="image/*" required>
                            </div>
                        </div>

                        <!-- LEGALES -->
                        <h4 class="step-title"><i class="fas fa-gavel me-2"></i>6. Declaraciones y Condiciones</h4>
                        <div class="form-check mt-3">
                            <input class="form-check-input" type="checkbox" name="is_colombian_or_resident" value="1" id="checkCitizen" required>
                            <label class="form-check-label required" for="checkCitizen">
                                <strong>Declaro bajo juramento</strong> que soy ciudadano colombiano o he residido en Colombia por al menos 10 años.
                            </label>
                        </div>
                        <div class="form-check mt-3">
                            <input class="form-check-input" type="checkbox" name="habeas_data" value="1" id="checkHabeas" required>
                            <label class="form-check-label required" for="checkHabeas">
                                Acepto la política de tratamiento de datos personales y autorizo a utilizar mi información para la verificación de esta convocatoria.
                            </label>
                        </div>

                        <hr class="mt-5 mb-4">
                        <div class="d-grid mt-4">
                            <button type="button" class="btn btn-primary btn-lg fw-bold p-3" onclick="submitRegistration()">
                                <i class="fas fa-paper-plane me-2"></i> ENVIAR SOLICITUD DE INSCRIPCIÓN
                            </button>
                        </div>
                        <div class="text-center mt-3">
                            <a href="../" class="text-muted"><i class="fas fa-arrow-left me-1"></i> Volver al inicio</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="assets/plugins/bootstrap/js/bootstrap.bundle.min.js"></script>
    <script src="assets/plugins/sweetalert2/sweetalert2.all.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            loadSchools();
        });

        async function loadSchools() {
            try {
                const res = await fetch('../api/adulto_mayor/schools');
                const result = await res.json();
                const schoolSelect = document.getElementById('schoolSelect');
                schoolSelect.innerHTML = '<option value="">Seleccione Institución...</option>';
                if (result.success && result.data) {
                    result.data.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.id;
                        opt.textContent = s.name;
                        schoolSelect.appendChild(opt);
                    });
                }
            } catch(e) { console.error('Error loading schools', e); }
        }

        async function loadBranches() {
            const schoolId = document.getElementById('schoolSelect').value;
            const branchSelect = document.getElementById('branchSelect');
            branchSelect.innerHTML = '<option value="">Seleccione Sede...</option>';
            branchSelect.disabled = true;

            if (!schoolId) return;

            try {
                const res = await fetch('../api/adulto_mayor/branches?school_id=' + schoolId);
                const result = await res.json();
                if (result.success && result.data && result.data.length > 0) {
                    result.data.forEach(b => {
                        const opt = document.createElement('option');
                        opt.value = b.id;
                        opt.textContent = b.name;
                        branchSelect.appendChild(opt);
                    });
                    branchSelect.disabled = false;
                }
            } catch(e) { console.error('Error loading branches', e); }
        }

        async function submitRegistration() {
            const form = document.getElementById('adultoMayorForm');
            
            // Native form validation check
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            // Age validation manual check
            const birthDate = new Date(document.getElementById('birthDateInput').value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 60) {
                Swal.fire('Atención', 'Debe tener al menos 60 años para poder inscribirse.', 'warning');
                return;
            }

            // SISBEN constraint
            const sisben = document.getElementById('sisbenSelect').value;
            if (sisben === 'D') {
                Swal.fire('Atención', 'Usted pertenece al Grupo D del SISBEN y la convocatoria es exclusiva para los grupos A, B y C.', 'error');
                return;
            }

            const formData = new FormData(form);

            Swal.fire({
                title: 'Enviando Inscripción...',
                text: 'Por favor espere, estamos cargando sus documentos...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                // Determine API URL relative to landing (which is inside landing folder)
                const apiURL = '../api/adulto_mayor/register';
                
                const response = await fetch(apiURL, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    Swal.fire({
                        title: '¡Inscripción Recibida!',
                        html: 'Su solicitud ha sido radicada correctamente con el <b>ID #' + result.id + '</b>.<br><br>Su información y documentos serán evaluados por nuestro equipo. Gracias por participar.',
                        icon: 'success',
                        confirmButtonText: 'Volver al Inicio'
                    }).then(() => {
                        window.location.href = '../';
                    });
                } else {
                    Swal.fire('Error en la inscripción', result.message || 'Complete todos los campos obligatorios y documentos.', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Error de Conexión', 'No se pudo registrar la inscripción. Revise su conexión a internet y el tamaño de los documentos e intente de nuevo.', 'error');
            }
        }
    </script>
</body>
</html>

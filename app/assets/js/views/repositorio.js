var RepositorioView = {
    currentFolderId: null,
    folders: [],
    categories: [],
    schools: [],
    branches: [],
    table: null,

    init: async () => {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="row h-100">
                <!-- Sidebar Carpetas -->
                <div class="col-md-3 border-end bg-white p-3 d-flex flex-column" style="min-height: 80vh;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold text-primary-custom m-0"><i class="fas fa-folder-tree me-2"></i>Carpetas</h5>
                        <button class="btn btn-sm btn-outline-primary" onclick="RepositorioView.newFolderModal()"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="list-group list-group-flush flex-grow-1 overflow-auto" id="folder-list">
                        <div class="text-center text-muted py-3 spinner-border spinner-border-sm mx-auto d-block"></div>
                    </div>
                    <hr>
                    <button class="btn btn-sm btn-outline-secondary mt-auto" onclick="RepositorioView.manageCategoriesModal()"><i class="fas fa-tags me-2"></i>Gestionar Categorías</button>
                </div>

                <!-- Main Content Documentos -->
                <div class="col-md-9 p-4 bg-light">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3 class="fw-bold text-dark m-0" id="current-folder-title">Todos los Documentos</h3>
                        <button class="btn btn-primary" onclick="RepositorioView.uploadModal()"><i class="fas fa-cloud-upload-alt me-2"></i>Subir Documento</button>
                    </div>

                    <!-- Panel de Búsqueda Avanzada -->
                    <div class="card shadow-sm border-0 mb-4">
                        <div class="card-body">
                            <form id="search-form" class="row g-3">
                                <div class="col-md-3">
                                    <input type="text" class="form-control" id="search-keyword" placeholder="Buscar por título, palabra clave...">
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="search-category">
                                        <option value="">Todas las categorías</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="search-school">
                                        <option value="">Todos los Centros</option>
                                    </select>
                                </div>
                                <div class="col-md-3 d-flex">
                                    <button type="submit" class="btn btn-primary w-100 me-2"><i class="fas fa-search"></i> Buscar</button>
                                    <button type="button" class="btn btn-light w-100" onclick="RepositorioView.resetSearch()"><i class="fas fa-undo"></i> Limpiar</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Tabla de Documentos -->
                    <div class="card shadow-sm border-0">
                        <div class="card-body p-0">
                            <div class="table-responsive p-3">
                                <table id="documentsTable" class="table table-hover align-middle" style="width:100%">
                                    <thead class="bg-light text-secondary small fw-bold text-uppercase">
                                        <tr>
                                            <th>Documento</th>
                                            <th>Carpeta</th>
                                            <th>Categoría</th>
                                            <th>Vinculación</th>
                                            <th>Fecha</th>
                                            <th class="text-end">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="documents-tbody"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await RepositorioView.loadInitialData();
        RepositorioView.renderFolderTree();
        RepositorioView.initTable();
        
        document.getElementById('search-form').addEventListener('submit', (e) => {
            e.preventDefault();
            RepositorioView.loadDocuments();
        });
    },

    loadInitialData: async () => {
        try {
            const [foldersRes, catsRes, schoolsRes] = await Promise.all([
                App.api('/deliverables/folders'),
                App.api('/deliverables/categories'),
                App.api('/schools')
            ]);
            
            if (foldersRes.success) RepositorioView.folders = foldersRes.data;
            if (catsRes.success) {
                RepositorioView.categories = catsRes.data;
                const catSelect = document.getElementById('search-category');
                RepositorioView.categories.forEach(c => {
                    catSelect.add(new Option(c.name, c.id));
                });
            }
            if (schoolsRes && !schoolsRes.error) {
                RepositorioView.schools = schoolsRes;
                const schoolSelect = document.getElementById('search-school');
                RepositorioView.schools.forEach(s => {
                    schoolSelect.add(new Option(s.name, s.id));
                });
            }
        } catch (e) {
            console.error("Error loading initial data", e);
        }
    },

    renderFolderTree: () => {
        const list = document.getElementById('folder-list');
        list.innerHTML = '';

        // "Todos" item
        const allItem = document.createElement('a');
        allItem.href = '#';
        allItem.className = `list-group-item list-group-item-action d-flex align-items-center ${RepositorioView.currentFolderId === null ? 'active bg-primary text-white border-primary' : 'border-0'}`;
        allItem.innerHTML = '<i class="fas fa-globe me-3"></i>Todos los documentos';
        allItem.onclick = (e) => { e.preventDefault(); RepositorioView.selectFolder(null, 'Todos los Documentos'); };
        list.appendChild(allItem);

        // Organize folders
        const topFolders = RepositorioView.folders.filter(f => !f.parent_id);
        const childFolders = RepositorioView.folders.filter(f => f.parent_id);

        const renderItem = (f, level = 0) => {
            const isActive = RepositorioView.currentFolderId == f.id;
            const item = document.createElement('div');
            item.className = `list-group-item list-group-item-action d-flex align-items-center justify-content-between ${isActive ? 'active bg-primary text-white border-primary' : 'border-0'}`;
            item.style.cursor = 'pointer';
            if (level > 0) {
                // Sangría visual para subcarpetas
                item.style.paddingLeft = (level * 1.5 + 1) + 'rem';
                if (!isActive) item.classList.add('bg-light'); // Solo si no está activa
            }
            
            const content = document.createElement('div');
            content.className = 'd-flex align-items-center flex-grow-1 text-truncate';
            
            // Si es subcarpeta usamos un icono un poco distinto o más pequeño
            const iconClass = level > 0 ? 'fa-folder-open text-secondary' : 'fa-folder text-warning';
            content.innerHTML = `<i class="fas ${iconClass} ${isActive ? 'text-white' : ''} me-3"></i><span class="text-truncate">${f.name}</span>`;
            content.onclick = () => RepositorioView.selectFolder(f.id, f.name);
            
            const delBtn = document.createElement('button');
            delBtn.className = `btn btn-sm p-0 m-0 ${isActive ? 'text-white' : 'text-danger'}`;
            delBtn.innerHTML = '<i class="fas fa-trash"></i>';
            delBtn.onclick = (e) => { 
                e.stopPropagation(); 
                RepositorioView.deleteFolder(f.id, f.name); 
            };

            item.appendChild(content);
            item.appendChild(delBtn);
            list.appendChild(item);

            // Buscar y renderizar hijos recursivamente
            const children = childFolders.filter(c => c.parent_id == f.id);
            children.forEach(c => renderItem(c, level + 1));
        };

        topFolders.forEach(f => renderItem(f, 0));
    },

    selectFolder: (id, name) => {
        RepositorioView.currentFolderId = id;
        document.getElementById('current-folder-title').textContent = name;
        RepositorioView.renderFolderTree();
        RepositorioView.loadDocuments();
    },

    resetSearch: () => {
        document.getElementById('search-keyword').value = '';
        document.getElementById('search-category').value = '';
        document.getElementById('search-school').value = '';
        RepositorioView.loadDocuments();
    },

    initTable: () => {
        RepositorioView.loadDocuments();
    },

    loadDocuments: async () => {
        const keyword = document.getElementById('search-keyword').value;
        const cat = document.getElementById('search-category').value;
        const school = document.getElementById('search-school').value;
        const folder = RepositorioView.currentFolderId;

        let query = '?';
        if (keyword) query += `keyword=${encodeURIComponent(keyword)}&`;
        if (cat) query += `category_id=${cat}&`;
        if (school) query += `school_id=${school}&`;
        if (folder) query += `folder_id=${folder}&`;

        try {
            if ($.fn.DataTable.isDataTable('#documentsTable')) {
                $('#documentsTable').DataTable().destroy();
            }
            
            const tbody = document.getElementById('documents-tbody');
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';

            const res = await App.api(`/deliverables/search${query}`);
            tbody.innerHTML = '';

            if (res.success && res.data.length > 0) {
                res.data.forEach(d => {
                    const icon = d.file_type.includes('pdf') ? 'fa-file-pdf text-danger' : 
                                 d.file_type.includes('image') ? 'fa-file-image text-success' : 'fa-file-alt text-primary';
                    
                    const date = new Date(d.created_at).toLocaleDateString();
                    const size = (d.file_size / 1024).toFixed(1) + ' KB';
                    
                    tbody.innerHTML += `
                        <tr>
                            <td>
                                <div class="d-flex align-items-center">
                                    <i class="fas ${icon} fa-2x me-3"></i>
                                    <div>
                                        <div class="fw-bold text-dark">${d.title}</div>
                                        <div class="small text-muted">${size} - <span class="badge bg-light text-dark border">${d.status}</span></div>
                                    </div>
                                </div>
                            </td>
                            <td>${d.folder_name}</td>
                            <td><span class="badge bg-info bg-opacity-10 text-info border border-info">${d.category_name}</span></td>
                            <td>
                                ${d.school_name ? `<div class="small"><i class="fas fa-school text-primary me-1"></i>${d.school_name}</div>` : '<span class="text-muted">-</span>'}
                                ${d.branch_name ? `<div class="small text-muted"><i class="fas fa-map-marker-alt me-1"></i>${d.branch_name}</div>` : ''}
                            </td>
                            <td>${date}</td>
                            <td class="text-end">
                                <a href="${App.apiBase}/deliverables/download/${d.id}?token=${App.state.token}" target="_blank" class="btn btn-sm btn-light text-primary me-1" title="Descargar">
                                    <i class="fas fa-download"></i>
                                </a>
                                <button class="btn btn-sm btn-light text-danger" onclick="RepositorioView.deleteDocument(${d.id})" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
                Helper.initDataTable('#documentsTable');
            } else if (res.success) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-5 text-muted">
                            <i class="fas fa-folder-open fa-3x mb-3 d-block opacity-25"></i>
                            No hay documentos en esta vista.
                        </td>
                    </tr>`;
            } else {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">${res.message}</td></tr>`;
            }
        } catch (e) {
            console.error(e);
            document.getElementById('documents-tbody').innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Error de conexión al cargar documentos.</td></tr>';
        }
    },

    newFolderModal: async () => {
        let parentOptions = '<option value="">-- Ninguna (Carpeta Principal) --</option>';
        RepositorioView.folders.forEach(f => {
            // Permitir anidar en cualquier carpeta
            parentOptions += `<option value="${f.id}">${f.name}</option>`;
        });

        const { value: formValues, isConfirmed } = await Swal.fire({
            title: 'Nueva Carpeta',
            html: `
                <div class="mb-3 text-start">
                    <label class="form-label fw-bold">Nombre de la carpeta</label>
                    <input id="swal-folder-name" class="form-control" placeholder="Ej. Informes 2026">
                </div>
                <div class="mb-3 text-start">
                    <label class="form-label fw-bold">Ubicación (Opcional)</label>
                    <select id="swal-folder-parent" class="form-select">
                        ${parentOptions}
                    </select>
                    <div class="form-text">Si seleccionas una carpeta, se creará como subcarpeta de esta.</div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Crear',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const name = document.getElementById('swal-folder-name').value;
                const parent_id = document.getElementById('swal-folder-parent').value;
                if (!name) {
                    Swal.showValidationMessage('El nombre de la carpeta es obligatorio');
                    return false;
                }
                return { name, parent_id: parent_id ? parent_id : null };
            }
        });

        if (isConfirmed && formValues) {
            const res = await App.api('/deliverables/folders', 'POST', formValues);
            if (res.success) {
                await RepositorioView.loadInitialData();
                RepositorioView.renderFolderTree();
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        }
    },

    deleteFolder: async (id, name) => {
        const { isConfirmed } = await Swal.fire({
            title: `¿Eliminar carpeta?`,
            text: `Se eliminará la carpeta "${name}". Esta acción no se puede deshacer. (Solo posible si está vacía)`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonText: 'Cancelar',
            confirmButtonText: 'Sí, eliminar'
        });

        if (isConfirmed) {
            const res = await App.api(`/deliverables/folders/${id}`, 'DELETE');
            if (res.success) {
                Swal.fire('Eliminada', 'La carpeta fue eliminada', 'success');
                if (RepositorioView.currentFolderId == id) {
                    RepositorioView.currentFolderId = null;
                    document.getElementById('current-folder-title').textContent = 'Todos los Documentos';
                }
                await RepositorioView.loadInitialData();
                RepositorioView.renderFolderTree();
                RepositorioView.loadDocuments();
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        }
    },

    manageCategoriesModal: async () => {
        let catsHtml = RepositorioView.categories.map(c => `<li class="list-group-item">${c.name}</li>`).join('');
        if(!catsHtml) catsHtml = '<li class="list-group-item text-muted">Sin categorías</li>';

        Swal.fire({
            title: 'Categorías',
            html: `
                <ul class="list-group mb-3 text-start">${catsHtml}</ul>
                <input type="text" id="new-cat-name" class="form-control" placeholder="Nueva categoría...">
            `,
            showCancelButton: true,
            confirmButtonText: 'Añadir',
            cancelButtonText: 'Cerrar',
            preConfirm: () => document.getElementById('new-cat-name').value
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                const res = await App.api('/deliverables/categories', 'POST', { name: result.value });
                if (res.success) {
                    await RepositorioView.loadInitialData();
                    RepositorioView.manageCategoriesModal(); // Reload modal
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            }
        });
    },

    uploadModal: async () => {
        if (RepositorioView.folders.length === 0 || RepositorioView.categories.length === 0) {
            Swal.fire('Atención', 'Debes crear al menos una Carpeta y una Categoría primero.', 'warning');
            return;
        }

        let folderOptions = RepositorioView.folders.map(f => `<option value="${f.id}" ${RepositorioView.currentFolderId == f.id ? 'selected':''}>${f.name}</option>`).join('');
        let catOptions = RepositorioView.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        let schoolOptions = RepositorioView.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        const { value: formValues, isConfirmed } = await Swal.fire({
            title: 'Subir Documento',
            width: '700px',
            html: `
                <form id="uploadForm" class="text-start px-2">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Archivo (PDF, JPG, PNG)</label>
                        <input type="file" class="form-control" id="up-file" accept=".pdf,image/*" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">Título del Documento (Opcional)</label>
                        <input type="text" class="form-control" id="up-title" placeholder="Si se deja en blanco, se usará el nombre del archivo">
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Carpeta Destino</label>
                            <select class="form-select" id="up-folder">${folderOptions}</select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Categoría</label>
                            <select class="form-select" id="up-category">${catOptions}</select>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Centro de Atención</label>
                            <select class="form-select" id="up-school">
                                <option value="">-- No vincular --</option>
                                ${schoolOptions}
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Estado</label>
                            <select class="form-select" id="up-status">
                                <option value="Borrador">Borrador</option>
                                <option value="Finalizado">Finalizado</option>
                                <option value="Aprobado">Aprobado</option>
                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">Descripción Corta</label>
                        <textarea class="form-control" id="up-desc" rows="2"></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">Palabras Clave</label>
                        <input type="text" class="form-control" id="up-keys" placeholder="Ej: contrato, auditoria, 2026">
                        <small class="text-muted">Separadas por comas. Mejoran la búsqueda.</small>
                    </div>
                </form>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Subir Archivo',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const fileInput = document.getElementById('up-file');
                if (!fileInput.files.length) {
                    Swal.showValidationMessage('Debes seleccionar un archivo');
                    return false;
                }
                
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                formData.append('title', document.getElementById('up-title').value);
                formData.append('folder_id', document.getElementById('up-folder').value);
                formData.append('deliverable_category_id', document.getElementById('up-category').value);
                formData.append('school_id', document.getElementById('up-school').value);
                formData.append('status', document.getElementById('up-status').value);
                formData.append('description', document.getElementById('up-desc').value);
                formData.append('keywords', document.getElementById('up-keys').value);
                
                return formData;
            }
        });

        if (isConfirmed && formValues) {
            Swal.fire({
                title: 'Subiendo...',
                text: 'Por favor espera',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const res = await fetch(App.apiBase + '/deliverables/upload', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + App.state.token },
                    body: formValues
                }).then(r => r.json());

                if (res.success) {
                    Swal.fire('¡Éxito!', 'Documento subido correctamente', 'success');
                    RepositorioView.loadDocuments();
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Fallo de red al subir el archivo', 'error');
            }
        }
    },

    deleteDocument: async (id) => {
        const { isConfirmed } = await Swal.fire({
            title: '¿Eliminar documento?',
            text: "El archivo físico también será borrado y no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonText: 'Cancelar',
            confirmButtonText: 'Sí, eliminar'
        });

        if (isConfirmed) {
            const res = await App.api(`/deliverables/${id}`, 'DELETE');
            if (res.success) {
                Swal.fire('Eliminado', 'El documento ha sido borrado', 'success');
                RepositorioView.loadDocuments();
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        }
    }
};

// Auto-init
if (document.getElementById('app-container')) {
    RepositorioView.init();
}

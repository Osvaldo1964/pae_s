/**
 * Recetario View - Master Recipe Book Module
 */

window.RecetarioView = {
    recipes: [],
    items: [],
    rationTypes: [],

    async init() {
        console.log('Initializing Recetario Module...');
        await this.loadData();
        this.render();
    },

    async loadData() {
        try {
            const [recipeRes, itemRes, rationRes] = await Promise.all([
                Helper.fetchAPI('/recipes'),
                Helper.fetchAPI('/items'),
                Helper.fetchAPI('/ration-types')
            ]);
            this.recipes = recipeRes.success ? recipeRes.data : [];
            this.items = itemRes.success ? itemRes.data : [];
            this.rationTypes = rationRes.success ? rationRes.data : [];
        } catch (error) {
            console.error('Error loading recipes data:', error);
        }
    },

    render() {
        const html = `
            <div class="container-fluid py-4">
                <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                    <div>
                        <h2 class="mb-1 text-primary-custom fw-bold"><i class="fas fa-utensils me-2"></i>Recetario Maestro</h2>
                        <p class="text-muted mb-0">Estandarización de minutas y platos base para planeación rápida</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-success fw-bold px-3" onclick="RecetarioView.showReportModal()">
                            <i class="fas fa-file-export me-2"></i>Generar Reporte
                        </button>
                        <button class="btn btn-primary fw-bold px-4" onclick="RecetarioView.openRecipeModal()">
                            <i class="fas fa-plus-circle me-2"></i>Nueva Receta Maestra
                        </button>
                    </div>
                </div>

                <div class="recipe-container custom-scrollbar px-2" style="max-height: calc(100vh - 200px); overflow-y: auto; overflow-x: hidden;">
                    <div class="row g-3">
                        ${this.renderRecipeCards()}
                    </div>
                </div>
            </div>
            <style>
                .recipe-container { scroll-behavior: smooth; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #bbb; }
            </style>
        `;

        document.getElementById('app').innerHTML = html;
    },

    renderRecipeCards() {
        if (this.recipes.length === 0) {
            return `
                <div class="col-12">
                    <div class="text-center p-5 bg-white rounded shadow-sm border">
                        <i class="fas fa-concierge-bell fa-4x text-muted opacity-25 mb-3"></i>
                        <h5 class="fw-bold">No hay recetas configuradas</h5>
                        <p class="text-muted">Crea platos maestros para que la planeación de ciclos sea automática y sin errores.</p>
                        <button class="btn btn-outline-primary mt-2" onclick="RecetarioView.openRecipeModal()">Crear mi primera receta</button>
                    </div>
                </div>
            `;
        }

        return this.recipes.map(r => `
            <div class="col-md-3">
                <div class="card h-100 border-0 shadow-sm recipe-card position-relative overflow-hidden">
                    <div class="meal-type-badge ${r.ration_type_name === 'ALMUERZO' ? 'bg-primary' : 'bg-info'} text-white px-2 py-0 small fw-bold" style="font-size: 0.6rem;">
                        ${r.ration_type_name || r.meal_type}
                    </div>
                    <div class="card-body pt-4 p-2">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <h6 class="card-title fw-bold text-dark mb-0 text-truncate" style="font-size: 0.85rem;" title="${r.name}">${r.name}</h6>
                            <div class="dropdown">
                                <button class="btn btn-link text-muted p-0" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                    <li><a class="dropdown-item" href="javascript:void(0)" onclick="RecetarioView.editRecipe(${r.id})"><i class="fas fa-edit me-2 text-primary"></i>Editar</a></li>
                                    <li><a class="dropdown-item" href="javascript:void(0)" onclick="RecetarioView.exportRecipe(${r.id}, 'print')"><i class="fas fa-print me-2 text-secondary"></i>Imprimir</a></li>
                                    <li><a class="dropdown-item" href="javascript:void(0)" onclick="RecetarioView.exportRecipe(${r.id}, 'excel')"><i class="fas fa-file-excel me-2 text-success"></i>Enviar a Excel</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="RecetarioView.deleteRecipe(${r.id})"><i class="fas fa-trash me-2"></i>Eliminar</a></li>
                                </ul>
                            </div>
                        </div>
                        <p class="card-text text-muted mb-2 line-clamp-2" style="font-size: 0.75rem; min-height: 2.2em;">${r.description || 'Sin descripción'}</p>
                        
                        <div class="row g-0 text-center bg-light rounded p-2 mb-3 border">
                            <div class="col-4 border-end">
                                <div class="text-xs text-uppercase fw-bold text-muted" style="font-size: 0.6rem;">Calorías</div>
                                <div class="fw-bold mb-0 text-primary small">${Math.round(r.total_calories)} <small style="font-size: 0.5rem;">kcal</small></div>
                            </div>
                            <div class="col-4 border-end">
                                <div class="text-xs text-uppercase fw-bold text-muted" style="font-size: 0.6rem;">Proteínas</div>
                                <div class="fw-bold mb-0 text-success small">${parseFloat(r.total_proteins).toFixed(1)} <small style="font-size: 0.5rem;">g</small></div>
                            </div>
                            <div class="col-4">
                                <div class="text-xs text-uppercase fw-bold text-muted" style="font-size: 0.6rem;">Carbos</div>
                                <div class="fw-bold mb-0 text-info small">${parseFloat(r.total_carbohydrates).toFixed(1)} <small style="font-size: 0.5rem;">g</small></div>
                            </div>
                        </div>

                        <button class="btn btn-outline-primary btn-xs w-100 fw-bold rounded-pill" style="font-size: 0.7rem; padding: 0.25rem;" onclick="RecetarioView.viewRecipe(${r.id})">
                            <i class="fas fa-eye me-1"></i> Ver Composición
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    async viewRecipe(id) {
        try {
            const res = await Helper.fetchAPI(`/recipes/${id}`);
            if (res.success) {
                const r = res.data;
                const modalDiv = document.createElement('div');
                modalDiv.className = 'modal fade';
                modalDiv.id = 'viewRecipeModal';
                modalDiv.innerHTML = `
                    <div class="modal-dialog">
                        <div class="modal-content border-0 shadow-lg">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title fw-bold"><i class="fas fa-list me-2"></i>Composición: ${r.name}</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-0">
                                <div class="p-3 bg-light border-bottom d-flex justify-content-around text-center">
                                    <div><small class="text-muted d-block">Calorías</small><strong>${Math.round(r.total_calories)} kcal</strong></div>
                                    <div><small class="text-muted d-block">Proteínas</small><strong>${r.total_proteins}g</strong></div>
                                    <div><small class="text-muted d-block">Carbohidratos</small><strong>${r.total_carbohydrates}g</strong></div>
                                </div>
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0" style="font-size: 0.85rem;">
                                        <thead class="bg-light small fw-bold text-muted">
                                            <tr>
                                                <th class="ps-3 text-uppercase">Ingrediente</th>
                                                <th class="text-center text-uppercase">Prees.</th>
                                                <th class="text-center text-uppercase">Pri A</th>
                                                <th class="text-center text-uppercase">Pri B</th>
                                                <th class="text-center text-uppercase">Secu.</th>
                                                <th class="text-center text-uppercase text-primary">Gral.</th>
                                                <th class="text-center text-uppercase text-danger">Costo (G)</th>
                                                <th class="pe-3 text-uppercase">Notas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${r.items.map(i => `
                                                <tr>
                                                    <td class="ps-3 fw-medium">${i.item_name}</td>
                                                    <td class="text-end"><span class="badge bg-light text-dark border">${Helper.formatNumber(i.quantities.PREESCOLAR, 3)}</span></td>
                                                    <td class="text-end"><span class="badge bg-light text-dark border">${Helper.formatNumber(i.quantities.PRIMARIA_A, 3)}</span></td>
                                                    <td class="text-end"><span class="badge bg-light text-dark border">${Helper.formatNumber(i.quantities.PRIMARIA_B, 3)}</span></td>
                                                    <td class="text-end"><span class="badge bg-light text-dark border">${Helper.formatNumber(i.quantities.SECUNDARIA, 3)}</span></td>
                                                    <td class="text-end"><span class="badge bg-primary-light text-primary border">${Helper.formatNumber(i.quantities.GENERAL, 3)}</span></td>
                                                    <td class="text-end fw-bold text-danger">${Helper.formatCurrency(this._calculateItemCost(i.quantities.GENERAL, i.unit, i.unit_cost))}</td>
                                                    <td class="pe-3 small text-muted">${i.preparation || '-'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                                <button type="button" class="btn btn-primary" onclick="RecetarioView.editRecipe(${r.id})">
                                    <i class="fas fa-edit me-1"></i> Editar Receta
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modalDiv);
                const modal = new bootstrap.Modal(modalDiv);
                modal.show();
                modalDiv.addEventListener('hidden.bs.modal', () => modalDiv.remove());
            }
        } catch (error) {
            Helper.alert('error', 'No se pudo cargar el detalle de la receta');
        }
    },

    async editRecipe(id) {
        try {
            const res = await Helper.fetchAPI(`/recipes/${id}`);
            if (res.success) {
                // Cerrar modal de visualización si está abierto
                const viewModal = document.getElementById('viewRecipeModal');
                if (viewModal) {
                    const inst = bootstrap.Modal.getInstance(viewModal);
                    if (inst) inst.hide();
                }
                this.openRecipeModal(res.data);
            }
        } catch (error) {
            Helper.alert('error', 'Error al cargar los datos para editar');
        }
    },

    async deleteRecipe(id) {
        const confirm = await Swal.fire({
            title: '¿Eliminar receta?',
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            try {
                const res = await Helper.fetchAPI(`/recipes/${id}`, { method: 'DELETE' });
                if (res.success) {
                    Helper.alert('success', 'Receta eliminada correctamente');
                    this.init();
                } else {
                    Helper.alert('error', res.message);
                }
            } catch (error) {
                Helper.alert('error', 'Error al eliminar la receta');
            }
        }
    },

    openRecipeModal(recipe = null) {
        const isEdit = !!recipe;
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'recipeModal';
        modalDiv.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title fw-bold">
                            <i class="fas ${isEdit ? 'fa-edit' : 'fa-plus-circle'} me-2"></i>
                            ${isEdit ? 'Editar Receta Maestra' : 'Nueva Receta Maestra'}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form id="recipe-form" data-id="${isEdit ? recipe.id : ''}">
                            <div class="row g-3 mb-4">
                                <div class="col-md-8">
                                    <label class="form-label fw-bold small text-muted text-uppercase">Nombre del Plato</label>
                                    <input type="text" class="form-control" name="name" value="${isEdit ? recipe.name : ''}" placeholder="Ej: Arroz con Pollo..." required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fw-bold small text-muted text-uppercase">Tipo de Ración / Entrega</label>
                                    <select class="form-select" name="ration_type_id" required>
                                        <option value="">Seleccione...</option>
                                        ${this.rationTypes.map(rt => `<option value="${rt.id}" ${isEdit && recipe.ration_type_id == rt.id ? 'selected' : ''}>${rt.name}</option>`).join('')}
                                    </select>


                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-bold small text-muted text-uppercase">Descripción / Observaciones</label>
                                    <textarea class="form-control" name="description" rows="2" placeholder="Notas sobre la preparación...">${isEdit ? recipe.description || '' : ''}</textarea>
                                </div>
                            </div>

                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="mb-0 fw-bold text-primary small text-uppercase"><i class="fas fa-flask me-1"></i>Composición Patrón (Fórmula)</h6>
                                <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="RecetarioView.addIngredientRow()">
                                    <i class="fas fa-plus me-1"></i> Añadir Insumo
                                </button>
                            </div>
                            <div class="table-responsive border rounded bg-light">
                                <table class="table table-sm align-middle mb-0">
                                    <thead class="bg-white small text-muted text-uppercase">
                                        <tr>
                                            <th class="ps-3" style="width: 30%">Ingrediente</th>
                                            <th class="text-center" style="width: 12%">Preesc.</th>
                                            <th class="text-center" style="width: 12%">Prim. A</th>
                                            <th class="text-center" style="width: 11%">Prim. B</th>
                                            <th class="text-center" style="width: 11%">Secund.</th>
                                            <th class="text-center text-primary" style="width: 11%">General</th>
                                            <th>Preparación</th>
                                            <th style="width: 5%"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="recipe-items-body">
                                        <!-- Dynamic rows -->
                                    </tbody>
                                </table>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer bg-light">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary fw-bold px-4" onclick="RecetarioView.saveRecipe()">
                            <i class="fas fa-save me-1"></i> ${isEdit ? 'Actualizar Receta' : 'Guardar Receta'}
                        </button>
                    </div>
                </div>
            </div>
            <style>
                .meal-type-badge { position: absolute; top: 0; left: 0; border-bottom-right-radius: 15px; }
                .recipe-card:hover { transform: translateY(-5px); transition: all 0.3s; }
                .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            </style>
        `;
        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();

        if (isEdit && recipe.items && recipe.items.length > 0) {
            recipe.items.forEach(item => this.addIngredientRow(item));
        } else {
            this.addIngredientRow();
        }

        modalDiv.addEventListener('hidden.bs.modal', function () { modalDiv.remove(); });
    },

    addIngredientRow(data = null) {
        const tbody = document.getElementById('recipe-items-body');
        const tr = document.createElement('tr');
        tr.className = 'ingredient-row bg-white';

        const q = data ? data.quantities : { PREESCOLAR: '', PRIMARIA_A: '', PRIMARIA_B: '', SECUNDARIA: '', GENERAL: '' };

        tr.innerHTML = `
            <td class="ps-2">
                <select class="form-select form-select-sm border-0 bg-transparent" name="item_id" required>
                    <option value="">Ingrediente...</option>
                    ${this.items.map(i => `<option value="${i.id}" ${data && data.item_id == i.id ? 'selected' : ''}>${i.name}</option>`).join('')}
                </select>
            </td>
            <td><input type="number" step="0.001" class="form-control form-control-sm text-end border-0 bg-transparent" name="qty_pre" value="${q.PREESCOLAR}" placeholder="0" title="Preescolar"></td>
            <td><input type="number" step="0.001" class="form-control form-control-sm text-end border-0 bg-transparent" name="qty_pria" value="${q.PRIMARIA_A}" placeholder="0" title="Primaria A"></td>
            <td><input type="number" step="0.001" class="form-control form-control-sm text-end border-0 bg-transparent" name="qty_prib" value="${q.PRIMARIA_B}" placeholder="0" title="Primaria B"></td>
            <td><input type="number" step="0.001" class="form-control form-control-sm text-end border-0 bg-transparent" name="qty_sec" value="${q.SECUNDARIA}" placeholder="0" title="Secundaria"></td>
            <td><input type="number" step="0.001" class="form-control form-control-sm text-end border-0 bg-transparent fw-bold text-primary" name="qty_gen" value="${q.GENERAL}" placeholder="0" title="General / Adulto Mayor"></td>
            <td><input type="text" class="form-control form-control-sm border-0 bg-transparent" name="preparation" value="${data ? data.preparation || '' : ''}" placeholder="Picar..."></td>
            <td class="text-center"><button type="button" class="btn btn-link text-danger p-0" onclick="this.closest('tr').remove()"><i class="fas fa-minus-circle"></i></button></td>
        `;
        tbody.appendChild(tr);
    },

    async saveRecipe() {
        // ... (existing saveRecipe code)
    },

    showReportModal() {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal fade';
        modalDiv.id = 'reportModal';
        modalDiv.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title fw-bold"><i class="fas fa-file-export me-2"></i>Reporte del Recetario</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted text-uppercase">Filtrar por Tipo de Ración</label>
                            <select class="form-select" id="report-ration-type">
                                <option value="">Todos los tipos...</option>
                                ${this.rationTypes.map(rt => `<option value="${rt.id}">${rt.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="bg-light p-3 rounded border mb-3">
                            <p class="small text-muted mb-0"><i class="fas fa-info-circle me-1"></i> Seleccione el formato de salida para el listado de recetas seleccionadas.</p>
                        </div>
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary fw-bold" onclick="RecetarioView.exportRecipes('print')">
                                <i class="fas fa-print me-2"></i>Vista de Impresión (PDF)
                            </button>
                            <button class="btn btn-outline-success fw-bold" onclick="RecetarioView.exportRecipes('excel')">
                                <i class="fas fa-file-excel me-2"></i>Exportar a Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
        const modal = new bootstrap.Modal(modalDiv);
        modal.show();
        modalDiv.addEventListener('hidden.bs.modal', () => modalDiv.remove());
    },

    async exportRecipes(type) {
        const rationTypeId = document.getElementById('report-ration-type')?.value;
        try {
            Helper.loading();
            const url = `/recipes?include_items=1${rationTypeId ? `&ration_type_id=${rationTypeId}` : ''}`;
            const res = await Helper.fetchAPI(url);

            if (res.success) {
                const recipes = res.data;
                if (recipes.length === 0) {
                    Helper.alert('warning', 'No hay recetas que coincidan con el filtro');
                    return;
                }

                if (type === 'excel') {
                    this._generateRecipesExcel(recipes);
                } else {
                    this._generateRecipesPrintView(recipes);
                }
            }
            Swal.close();
        } catch (error) {
            Helper.alert('error', 'Error al generar el reporte');
        }
    },

    async exportRecipe(id, type) {
        try {
            Helper.loading();
            const res = await Helper.fetchAPI(`/recipes/${id}`);
            if (res.success) {
                const recipe = res.data;
                if (type === 'excel') {
                    this._generateSingleRecipeExcel(recipe);
                } else {
                    this._generateSingleRecipePrintView(recipe);
                }
            }
            Swal.close();
        } catch (error) {
            Helper.alert('error', 'Error al obtener datos de la receta');
        }
    },

    _getDisplayUnit(unit) {
        if (!unit) return '';
        const u = unit.toUpperCase();
        if (u === 'KG' || u === 'KILOGRAMO' || u === 'KILOS') return 'g';
        if (u === 'L' || u === 'LT' || u === 'LITRO' || u === 'LITROS') return 'cc';
        return unit;
    },

    _calculateItemCost(qty, unit, unitCost) {
        if (!unitCost) return 0;
        const quantity = parseFloat(qty) || 0;
        const u = (unit || '').toUpperCase();
        const cost = parseFloat(unitCost) || 0;

        if (['KG', 'KILOGRAMO', 'KILOS', 'L', 'LT', 'LITRO', 'LITROS'].includes(u)) {
            return (quantity / 1000) * cost;
        }
        return quantity * cost;
    },

    _generateRecipesExcel(recipes) {
        let rows = '';
        recipes.forEach(r => {
            // First row for the recipe basic info
            rows += `
                <tr style="background:#f9f9f9; font-weight:bold;">
                    <td colspan="2">${r.name}</td>
                    <td>${r.ration_type_name || r.meal_type}</td>
                    <td>${Math.round(r.total_calories)}</td>
                    <td>${parseFloat(r.total_proteins).toFixed(1)}</td>
                    <td>${parseFloat(r.total_carbohydrates).toFixed(1)}</td>
                    <td>${parseFloat(r.total_fats).toFixed(1)}</td>
                    <td style="color:#d9534f;">${Helper.formatCurrency(r.items.reduce((acc, i) => acc + this._calculateItemCost(i.quantities.GENERAL, i.unit, i.unit_cost), 0))}</td>
                    <td>RECETA PADRE</td>
                </tr>
            `;

            // Sub-header for ingredients
            rows += `
                <tr style="font-size: 0.8em; background:#eeeeee;">
                    <th style="width: 250px;">Ingrediente</th>
                    <th>Unid</th>
                    <th>Preesc.</th>
                    <th>Prim. A</th>
                    <th>Prim. B</th>
                    <th>Secund.</th>
                    <th>General</th>
                    <th>Costo (G)</th>
                    <th colspan="2">Observaciones</th>
                </tr>
            `;

            // Ingredient rows
            r.items.forEach(i => {
                rows += `
                    <tr>
                        <td>${i.item_name}</td>
                        <td style="text-align:center;">${this._getDisplayUnit(i.unit)}</td>
                        <td>${Helper.formatNumber(i.quantities.PREESCOLAR, 3)}</td>
                        <td>${Helper.formatNumber(i.quantities.PRIMARIA_A, 3)}</td>
                        <td>${Helper.formatNumber(i.quantities.PRIMARIA_B, 3)}</td>
                        <td>${Helper.formatNumber(i.quantities.SECUNDARIA, 3)}</td>
                        <td>${Helper.formatNumber(i.quantities.GENERAL, 3)}</td>
                        <td style="text-align:right;">${Helper.formatCurrency(this._calculateItemCost(i.quantities.GENERAL, i.unit, i.unit_cost))}</td>
                        <td colspan="2">${i.preparation || '-'}</td>
                    </tr>
                `;
            });
            // Spacer
            rows += `<tr><td colspan="9" style="background:#ffffff; border:none; height:15px;"></td></tr>`;
        });

        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"></head>
            <body>
                <h3>CONSOLIDADO DE RECETAS CON COMPOSICIÓN</h3>
                <table border="1" cellspacing="0" cellpadding="5">
                    <tr style="background:#333; color:white; font-weight:bold;">
                        <th colspan="2">NOMBRE RECETA / INGREDIENTE</th>
                        <th>TIPO</th>
                        <th>KCAL</th>
                        <th>PROT</th>
                        <th>HC</th>
                        <th>GRAS</th>
                        <th>COSTO TOT.</th>
                        <th>NOTAS</th>
                    </tr>
                    ${rows}
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Recetario_Detallado_${new Date().toISOString().split('T')[0]}.xls`;
        a.click();
        Helper.alert('success', 'Excel generado');
    },

    _generateRecipesPrintView(recipes) {
        const printWindow = window.open('', '_blank');
        let tablesHtml = recipes.map(r => {
            let itemRows = r.items.map(i => `
                <tr class="small">
                    <td>${i.item_name}</td>
                    <td class="text-center">${this._getDisplayUnit(i.unit)}</td>
                    <td class="text-end">${Helper.formatNumber(i.quantities.PREESCOLAR, 3)}</td>
                    <td class="text-end">${Helper.formatNumber(i.quantities.PRIMARIA_A, 3)}</td>
                    <td class="text-end">${Helper.formatNumber(i.quantities.PRIMARIA_B, 3)}</td>
                    <td class="text-end">${Helper.formatNumber(i.quantities.SECUNDARIA, 3)}</td>
                    <td class="text-end">${Helper.formatNumber(i.quantities.GENERAL, 3)}</td>
                    <td class="text-end fw-bold text-danger">${Helper.formatCurrency(this._calculateItemCost(i.quantities.GENERAL, i.unit, i.unit_cost))}</td>
                </tr>
            `).join('');

            return `
                <div class="recipe-block mb-4" style="break-inside: avoid;">
                    <div class="d-flex justify-content-between align-items-center mb-2 bg-light p-2 border">
                        <h5 class="mb-0 fw-bold">${r.name}</h5>
                        <span class="badge bg-primary">${r.ration_type_name || r.meal_type}</span>
                    </div>
                    <table class="table table-sm table-bordered">
                        <thead class="bg-light small">
                            <tr>
                                <th>Ingrediente</th>
                                <th>Unid</th>
                                <th>Preesc</th>
                                <th>Prim A</th>
                                <th>Prim B</th>
                                <th>Secund</th>
                                <th>General</th>
                                <th>Costo (G)</th>
                            </tr>
                        </thead>
                        <tbody>${itemRows}</tbody>
                        <tfoot class="bg-light fw-bold">
                            <tr>
                                <td colspan="7" class="text-end">COSTO TOTAL RECETA (GENERAL):</td>
                                <td class="text-end text-danger">${Helper.formatCurrency(r.items.reduce((acc, i) => acc + this._calculateItemCost(i.quantities.GENERAL, i.unit, i.unit_cost), 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        }).join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>Consolidado de Recetas</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    @media print { .no-print { display: none; } .recipe-block { page-break-inside: avoid; } }
                </style>
            </head>
            <body>
                <div class="no-print mb-3 text-center">
                    <button class="btn btn-primary" onclick="window.print()">Imprimir PDF</button>
                    <button class="btn btn-secondary" onclick="window.close()">Cerrar</button>
                </div>
                <div class="header">
                    <h2>CONSOLIDADO DE RECETAS MAESTRAS</h2>
                    <p>Reporte detallado de insumos por grupo etario</p>
                </div>
                ${tablesHtml}
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    _generateSingleRecipeExcel(r) {
        let itemRows = r.items.map(i => `
            <tr>
                <td>${i.item_name}</td>
                <td style="text-align:center;">${this._getDisplayUnit(i.unit)}</td>
                <td>${Helper.formatNumber(i.quantities.PREESCOLAR, 3)}</td>
                <td>${Helper.formatNumber(i.quantities.PRIMARIA_A, 3)}</td>
                <td>${Helper.formatNumber(i.quantities.PRIMARIA_B, 3)}</td>
                <td>${Helper.formatNumber(i.quantities.SECUNDARIA, 3)}</td>
                <td>${Helper.formatNumber(i.quantities.GENERAL, 3)}</td>
                <td style="text-align:right;">${Helper.formatCurrency(this._calculateItemCost(i.quantities.GENERAL, i.unit, i.unit_cost))}</td>
                <td>${i.preparation || '-'}</td>
            </tr>
        `).join('');

        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"></head>
            <body>
                <h3>RECETA: ${r.name}</h3>
                <p><b>Tipo:</b> ${r.ration_type_name || r.meal_type}</p>
                <p><b>Descripción:</b> ${r.description || '-'}</p>
                <table border="1" cellspacing="0" cellpadding="5">
                    <tr style="background:#f0f0f0; font-weight:bold;">
                        <th>INGREDIENTE</th>
                        <th>UNID</th>
                        <th>PREESCOLAR</th>
                        <th>PRIMARIA A</th>
                        <th>PRIMARIA B</th>
                        <th>SECUNDARIA</th>
                        <th>GENERAL</th>
                        <th>COSTO (G)</th>
                        <th>OBSERVACIONES</th>
                    </tr>
                    ${itemRows}
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receta_${r.name.replace(/\s+/g, '_')}.xls`;
        a.click();
        Helper.alert('success', 'Excel generado');
    },

    _generateSingleRecipePrintView(r) {
        const printWindow = window.open('', '_blank');
        let itemRows = r.items.map(i => `
            <tr>
                <td class="fw-bold">${i.item_name}</td>
                <td class="text-center">${this._getDisplayUnit(i.unit)}</td>
                <td class="text-end">${Helper.formatNumber(i.quantities.PREESCOLAR, 3)}</td>
                <td class="text-end">${Helper.formatNumber(i.quantities.PRIMARIA_A, 3)}</td>
                <td class="text-end">${Helper.formatNumber(i.quantities.PRIMARIA_B, 3)}</td>
                <td class="text-end">${Helper.formatNumber(i.quantities.SECUNDARIA, 3)}</td>
                <td class="text-end">${Helper.formatNumber(i.quantities.GENERAL, 3)}</td>
                <td class="text-end text-danger fw-bold">${Helper.formatCurrency(this._calculateItemCost(i.quantities.GENERAL, i.unit, i.unit_cost))}</td>
                <td>${i.preparation || '-'}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
            <head>
                <title>Ficha Técnica: ${r.name}</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; font-size: 13px; }
                    .header { border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
                    .title { font-weight: bold; font-size: 20px; text-transform: uppercase; }
                    .meta-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #ddd; }
                    @media print { .no-print { display: none; } @page { margin: 1cm; } }
                </style>
            </head>
            <body>
                <div class="no-print text-center mb-4">
                    <button class="btn btn-primary px-5" onclick="window.print()">IMPRIMIR FICHA</button>
                    <button class="btn btn-secondary" onclick="window.close()">CERRAR</button>
                </div>
                <div class="header d-flex justify-content-between align-items-center">
                    <div>
                        <div class="title">${r.name}</div>
                        <div class="text-muted">Ficha Técnica de Receta Estándar</div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-primary text-uppercase">${r.ration_type_name || r.meal_type}</div>
                    </div>
                </div>

                <div class="meta-box">
                    <div class="row">
                        <div class="col-8">
                            <label class="small fw-bold text-muted text-uppercase d-block">Descripción / Preparación</label>
                            <p class="mb-0">${r.description || 'Sin descripción adicional'}</p>
                        </div>
                        <div class="col-4 border-start">
                            <label class="small fw-bold text-muted text-uppercase d-block">Aporte Nutricional (Secundaria)</label>
                            <div class="d-flex justify-content-between small">
                                <span>Calorías:</span> <b>${Math.round(r.total_calories)} kcal</b>
                            </div>
                            <div class="d-flex justify-content-between small">
                                <span>Proteínas:</span> <b>${r.total_proteins}g</b>
                            </div>
                            <div class="d-flex justify-content-between small">
                                <span>Carbos:</span> <b>${r.total_carbohydrates}g</b>
                            </div>
                        </div>
                    </div>
                </div>

                <h6 class="fw-bold mb-3 text-uppercase"><i class="fas fa-list me-2"></i>Composición por Grupo Etario (Gramos/Unid)</h6>
                <table class="table table-bordered align-middle">
                    <thead class="table-light text-center small">
                        <tr>
                            <th rowspan="2" class="align-middle">INGREDIENTE</th>
                            <th rowspan="2" class="align-middle">UNID</th>
                            <th colspan="5">GRAMAJE SEGÚN GRUPO</th>
                            <th rowspan="2" class="align-middle">OBSERVACIONES</th>
                        </tr>
                        <tr>
                            <th>PREESC.</th>
                            <th>PRIM. A</th>
                            <th>PRIM. B</th>
                            <th>SECUND.</th>
                            <th>GENERAL</th>
                            <th>COSTO (G)</th>
                        </tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                    <tfoot class="bg-light fw-bold">
                        <tr>
                            <td colspan="7" class="text-end">COSTO TOTAL RECETA (GENERAL):</td>
                            <td class="text-end text-danger">${Helper.formatCurrency(r.items.reduce((acc, i) => acc + this._calculateItemCost(i.quantities.GENERAL, i.unit, i.unit_cost), 0))}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="mt-5 pt-5 row">
                    <div class="col-6 text-center">
                        <div style="border-top: 1px solid #000; width: 200px; margin: 0 auto;"></div>
                        <p class="small">Responsable de Nutrición</p>
                    </div>
                    <div class="col-6 text-center">
                        <div style="border-top: 1px solid #000; width: 200px; margin: 0 auto;"></div>
                        <p class="small">Control de Calidad</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    async saveRecipe() {
        const form = document.getElementById('recipe-form');
        if (!form.checkValidity()) { form.reportValidity(); return; }

        const recipeId = form.dataset.id;
        const formData = new FormData(form);
        const items = [];
        document.querySelectorAll('.ingredient-row').forEach(row => {
            const id = row.querySelector('[name="item_id"]').value;
            if (id) {
                items.push({
                    item_id: id,
                    quantities: {
                        PREESCOLAR: row.querySelector('[name="qty_pre"]').value || 0,
                        PRIMARIA_A: row.querySelector('[name="qty_pria"]').value || 0,
                        PRIMARIA_B: row.querySelector('[name="qty_prib"]').value || 0,
                        SECUNDARIA: row.querySelector('[name="qty_sec"]').value || 0,
                        GENERAL: row.querySelector('[name="qty_gen"]').value || 0
                    },
                    preparation: row.querySelector('[name="preparation"]').value
                });
            }
        });

        if (items.length === 0) { Helper.alert('warning', 'Debe añadir al menos un ingrediente'); return; }

        const data = {
            name: formData.get('name'),
            ration_type_id: formData.get('ration_type_id'),
            meal_type: this.rationTypes.find(rt => rt.id == formData.get('ration_type_id'))?.name || '',
            description: formData.get('description'),
            items: items
        };

        try {
            const method = recipeId ? 'PUT' : 'POST';
            const url = recipeId ? `/recipes/${recipeId}` : '/recipes';

            const response = await Helper.fetchAPI(url, {
                method: method,
                body: JSON.stringify(data)
            });

            if (response.success) {
                bootstrap.Modal.getInstance(document.getElementById('recipeModal')).hide();
                Helper.alert('success', recipeId ? 'Receta actualizada' : 'Receta guardada');
                await this.init();
            } else {
                Helper.alert('error', response.message);
            }
        } catch (error) {
            Helper.alert('error', 'Error al procesar la receta');
        }
    }
};

// Initialize
if (typeof RecetarioView !== 'undefined') {
    RecetarioView.init();
}

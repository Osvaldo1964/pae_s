const App = {
    apiBase: Config.API_URL,
    state: {
        user: null,
        token: localStorage.getItem('pae_token') || null,
        menu: [],
        version: window.APP_VERSION || '1.0.0'
    },

    restoreUserFromToken: () => {
        if (!App.state.token) return;
        try {
            const base64Url = App.state.token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const payload = JSON.parse(jsonPayload);

            // Client-side expiration check
            if (payload.exp && payload.exp < (Date.now() / 1000)) {
                console.warn("Client-side: Token expired");
                localStorage.removeItem('pae_token');
                App.state.token = null;
                return;
            }

            if (payload.data) {
                App.state.user = {
                    ...payload.data,
                    pae: payload.data.pae_name // Ensure compatibility
                };
            }
        } catch (e) {
            console.error("Error restoring user state", e);
            localStorage.removeItem('pae_token');
            App.state.token = null;
        }
    },

    init: async () => {
        if (App.state.token) {
            // Restore User State from Token
            App.restoreUserFromToken();

            // Validate token or just load menu
            await App.loadMenu();
            if (window.location.hash === '' || window.location.hash === '#login') {
                window.location.hash = '#dashboard';
            }

            // Start PQR notification polling
            App.startNotificationsPolling();
        } else {
            window.location.hash = '#login';
        }

        window.addEventListener('hashchange', App.router);
        App.router();
    },

    updateHeaderUI: () => {
        if (!App.state.user) return;

        // User Info
        document.getElementById('header-user-name').textContent = App.state.user.full_name;
        document.getElementById('header-user-avatar').src = `https://ui-avatars.com/api/?name=${App.state.user.full_name}&background=1B4F72&color=fff`;

        // Program Branding
        const user = App.state.user;
        const entityLogo = user.entity_logo;
        const operatorLogo = user.operator_logo;
        const paeName = user.pae && user.pae !== 'Global' ? user.pae : 'SUPER ADMINISTRADOR';

        const headerInfo = document.getElementById('program-header-info');
        if (headerInfo) {
            let brandingHtml = '';
            brandingHtml += '<div class="d-flex align-items-center justify-content-center">';

            // Use Config for base paths
            const defaultEntity = `${Config.BASE_URL}assets/img/logos/default_entity.png`;
            const defaultOperator = `${Config.BASE_URL}assets/img/logos/default_operator.png`;

            // Entity Logo
            const entityUrl = entityLogo ? `${Config.BASE_URL}${entityLogo}` : `${Config.BASE_URL}assets/img/logos/default_entity.png`;
            brandingHtml += `<img src="${entityUrl}" alt="Entidad" class="me-3" style="height: 45px; width: auto; object-fit: contain;" onerror="this.onerror=null; this.src='${Config.BASE_URL}assets/img/logos/default_entity.png'">`;

            brandingHtml += `<h5 class="mb-0 text-primary-custom fw-bold text-uppercase" style="letter-spacing: 0.5px;">${paeName}</h5>`;

            // Operator Logo
            const operatorUrl = operatorLogo ? `${Config.BASE_URL}${operatorLogo}` : `${Config.BASE_URL}assets/img/logos/default_operator.png`;
            brandingHtml += `<img src="${operatorUrl}" alt="Operador" class="ms-3 d-none d-md-block" style="height: 45px; width: auto; object-fit: contain;" onerror="this.onerror=null; this.src='${Config.BASE_URL}assets/img/logos/default_operator.png'">`;

            brandingHtml += '</div>';
            headerInfo.innerHTML = brandingHtml;
        }
    },

    updateBreadcrumbs: (hash) => {
        const container = document.getElementById('breadcrumb-container');
        if (!container) return;

        if (hash === 'login' || hash === 'dashboard') {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        let html = '<ol class="breadcrumb mb-0">';
        html += '<li class="breadcrumb-item"><a href="#dashboard" class="text-decoration-none text-muted"><i class="fas fa-home me-1"></i>Dashboard</a></li>';

        if (hash.startsWith('group/')) {
            const groupId = hash.split('/')[1];
            const group = App.state.menu.find(g => g.id == groupId);
            if (group) {
                html += `<li class="breadcrumb-item active" aria-current="page">${group.name}</li>`;
            }
        } else if (hash.startsWith('module/')) {
            const route = hash.split('/')[1];
            let foundGroup = null;
            let foundModule = null;

            App.state.menu.forEach(group => {
                const mod = group.modules.find(m => m.route === route);
                if (mod) {
                    foundGroup = group;
                    foundModule = mod;
                }
            });

            // Special cases for injected cards
            if (!foundModule) {
                const reportNames = {
                    'reports-insumos': 'Impresión de Insumos',
                    'reports-recetas': 'Impresión de Recetas',
                    'reports-minutas': 'Minutas x Ciclo x Sede',
                    'reports-costs': 'Costos por Ciclo',
                    'reports-presupuesto': 'Presupuesto Inicial',
                    'reports-ejecucion': 'Ejecución Presupuestal',
                    'reports-movimientos-aux': 'Auxiliar de Movimientos',
                    'reports-pay': 'Nómina y Pagos',
                    'reports-hr-positions': 'Listado de Cargos',
                    'reports-hr-employees': 'Listado de Personal',
                    'reports-beneficiarios': 'Listado de Beneficiarios',
                    'reports-attendance': 'Control de Asistencia',
                    'reports-carnets': 'Impresión de Carnets'
                };

                if (reportNames[route]) {
                    foundGroup = App.state.menu.find(g => g.id == 5) || { id: 5, name: 'Reportes' };
                    foundModule = { name: reportNames[route] };
                } else if (route === 'pae-programs') {
                    foundGroup = App.state.menu.find(g => g.name === 'Configuración');
                    foundModule = { name: 'Crear Programa' };
                } else if (route === 'team') {
                    foundGroup = App.state.menu.find(g => g.name === 'Configuración');
                    foundModule = { name: 'Mi Equipo' };
                } else if (route === 'devoluciones') {
                    foundGroup = App.state.menu.find(g => g.id == 6 || g.name === 'Inventarios') || { id: 6, name: 'Inventarios' };
                    foundModule = { name: 'Devoluciones de Sede' };
                } else if (route === 'population-types') {
                    foundGroup = App.state.menu.find(g => g.name === 'Alimentación');
                    foundModule = { name: 'Raciones y Población' };
                } else if (route.startsWith('fin-')) {
                    foundGroup = { id: 99, name: 'Financiero' };
                    const finNames = {
                        'fin-terceros': 'Terceros',
                        'fin-presupuesto': 'Creación Presupuesto',
                        'fin-movimientos': 'Registro Costos y Gastos',
                        'fin-traslados': 'Modificaciones Contractuales',
                        'fin-ajustes': 'Modificaciones Contractuales',
                        'fin-modificaciones': 'Modificaciones Contractuales',
                        'fin-movimiento-tipos': 'Definición Costos y Gastos'
                    };
                    foundModule = { name: finNames[route] };
                } else if (route === 'repositorio') {
                    foundGroup = { id: 98, name: 'Repositorio' };
                    foundModule = { name: 'Documentos' };
                } else if (route === 'reports-ali') {
                    foundGroup = App.state.menu.find(g => g.id == 5) || { id: 5, name: 'Reportes' };
                    foundModule = { name: 'Alimentación' };
                } else if (route === 'reports-fin') {
                    foundGroup = App.state.menu.find(g => g.id == 5) || { id: 5, name: 'Reportes' };
                    foundModule = { name: 'Financiero' };
                } else if (route === 'reports-adm') {
                    foundGroup = App.state.menu.find(g => g.id == 5) || { id: 5, name: 'Reportes' };
                    foundModule = { name: 'Administrativo' };
                } else if (route === 'reports-rh') {
                    foundGroup = App.state.menu.find(g => g.id == 5) || { id: 5, name: 'Reportes' };
                    foundModule = { name: 'Talento Humano' };
                }
            }

            if (foundGroup) {
                html += `<li class="breadcrumb-item"><a href="#group/${foundGroup.id}" class="text-decoration-none">${foundGroup.name}</a></li>`;

                // Add intermediate Hub for Reports
                if (foundGroup.id == 5 && foundModule) {
                    const hubMap = {
                        'reports-insumos': { name: 'Alimentación', route: 'reports-ali' },
                        'reports-recetas': { name: 'Alimentación', route: 'reports-ali' },
                        'reports-minutas': { name: 'Alimentación', route: 'reports-ali' },
                        'reports-ciclos-analisis': { name: 'Alimentación', route: 'reports-ali' },
                        'reports-presupuesto': { name: 'Financiero', route: 'reports-fin' },
                        'reports-costs': { name: 'Financiero', route: 'reports-fin' },
                        'reports-ejecucion': { name: 'Financiero', route: 'reports-fin' },
                        'reports-movimientos-aux': { name: 'Financiero', route: 'reports-fin' },
                        'reports-attendance': { name: 'Administrativo', route: 'reports-adm' },
                        'reports-carnets': { name: 'Administrativo', route: 'reports-adm' },
                        'reports-beneficiarios': { name: 'Administrativo', route: 'reports-adm' },
                        'reports-pay': { name: 'Talento Humano', route: 'reports-rh' },
                        'reports-hr-employees': { name: 'Talento Humano', route: 'reports-rh' },
                        'reports-hr-positions': { name: 'Talento Humano', route: 'reports-rh' }
                    };
                    const hub = hubMap[route];
                    if (hub && route !== hub.route) {
                        html += `<li class="breadcrumb-item"><a href="#module/${hub.route}" class="text-decoration-none">${hub.name}</a></li>`;
                    }
                }
            }
            if (foundModule) {
                html += `<li class="breadcrumb-item active" aria-current="page">${foundModule.name}</li>`;
            }
        } else if (hash === 'users') {
            const configGroup = App.state.menu.find(g => g.name === 'Configuración');
            if (configGroup) {
                html += `<li class="breadcrumb-item"><a href="#group/${configGroup.id}" class="text-decoration-none">${configGroup.name}</a></li>`;
            }
            html += `<li class="breadcrumb-item active" aria-current="page">Usuarios</li>`;
        }

        html += '</ol>';
        container.innerHTML = html;
    },

    router: async () => {
        const hash = window.location.hash.slice(1) || 'login';
        const appContainer = document.getElementById('app');

        // Update Breadcrumbs
        App.updateBreadcrumbs(hash);

        // Layout handling
        if (hash === 'login') {
            document.getElementById('sidebar').classList.add('d-none');
            document.getElementById('top-header').style.display = 'none'; // Hide Header
            document.getElementById('main-content').classList.remove('col-md-9', 'col-lg-10');
            document.getElementById('main-content').classList.add('col-12', 'p-0'); // Full width
            App.renderLogin();
        } else {
            if (!App.state.token) {
                window.location.hash = '#login';
                return;
            }

            // Ensure user state is loaded
            if (!App.state.user) {
                App.restoreUserFromToken();
            }

            document.getElementById('sidebar').classList.remove('d-none');
            document.getElementById('top-header').style.display = 'block'; // Show Header
            document.getElementById('main-content').classList.remove('p-0');
            document.getElementById('main-content').classList.remove('col-12');
            document.getElementById('main-content').classList.add('col-md-9', 'col-lg-10');

            // Update Header UI (Double render to catch layout shifts)
            App.updateHeaderUI();
            setTimeout(() => {
                App.updateHeaderUI();
            }, 100);

            // Render basic layout parts if needed
            App.renderSidebar();

            if (hash === 'dashboard') {
                App.renderSidebar();
                const v = `${Config.BASE_URL}assets/js/views/dashboard.js?v=${App.state.version}`;
                Helper.loadScript(v, () => {
                    if (typeof DashboardView !== 'undefined') DashboardView.init();
                });
            } else if (hash.startsWith('group/')) {
                const groupId = hash.split('/')[1];
                App.renderGroupHub(groupId);
            } else if (hash.startsWith('module/')) {
                // Fix: Split by '?' to handle query params like module/beneficiaries?action=download
                let route = hash.split('/')[1];
                if (route.includes('?')) {
                    route = route.split('?')[0];
                }
                console.log("Loading Module:", route);

                // Map specific routes to view files if name differs
                const viewMap = {
                    'sedes': 'schools',
                    'sedes_educativas': 'schools',
                    'pae-programs': 'pae-programs',
                    'roles': 'roles',
                    'proveedores': 'suppliers',
                    'beneficiarios': 'beneficiaries',
                    'items': 'items',
                    'almacen': 'almacen',
                    'devoluciones': 'devoluciones',
                    'compras': 'compras',
                    'cotizaciones': 'cotizaciones',
                    'salidas': 'salidas',
                    'remisiones': 'remisiones_entradas',
                    'recetario': 'recetario',
                    'minutas': 'minutas',
                    'team': 'team',
                    'consumos': 'consumos',
                    'hr-positions': 'hr_positions',
                    'hr-employees': 'hr_employees',
                    'hr-payroll-config': 'hr_payroll_config',
                    'hr-payroll-concepts': 'hr_payroll_concepts',
                    'hr-payrolls': 'hr_payrolls',
                    'ration-types': 'ration_types',
                    'population-types': 'ration_types',
                    'reports-insumos': 'reports_insumos',
                    'reports-recetas': 'reports_recetas',
                    'reports-minutas': 'reports_minutas',
                    'reports-ciclos-analisis': 'reports_ciclos_analisis',
                    'reports-costs': 'reports_costs',
                    'reports-carnets': 'reports_carnets',
                    'reports-beneficiarios': 'reports_beneficiarios',
                    'reports-attendance': 'reports_attendance',
                    'fin-terceros': 'fin_terceros',
                    'fin-presupuesto': 'fin_presupuesto',
                    'fin-movimientos': 'fin_movimientos',
                    'fin-traslados': 'fin_modificaciones',
                    'fin-ajustes': 'fin_modificaciones',
                    'fin-modificaciones': 'fin_modificaciones',
                    'fin-movimiento-tipos': 'fin_movimiento_tipos',
                    'reports-pay': 'reports_payroll',
                    'reports-presupuesto': 'reports_presupuesto',
                    'reports-ejecucion': 'reports_ejecucion',
                    'reports-movimientos-aux': 'reports_movimientos_aux',
                    'reports-hr-positions': 'reports_hr_positions',
                    'reports-hr-employees': 'reports_hr_employees',
                    'repositorio': 'repositorio',
                    'pqrs': 'pqrs'
                };

                const reportCategories = ['reports-ali', 'reports-fin', 'reports-adm', 'reports-rh'];
                if (reportCategories.includes(route)) {
                    App.renderReportsSubHub(route);
                } else {
                    App.loadView(viewMap[route] || route);
                }
            } else if (hash === 'users') {
                App.renderUsers();
            } else {
                console.warn("Unknown Hash:", hash);
                appContainer.innerHTML = `
                    <div class="text-center mt-5">
                        <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                        <h2>Módulo no encontrado</h2>
                        <p class="text-muted">El recurso "${hash}" no está disponible o sigue en construcción.</p>
                        <a href="#dashboard" class="btn btn-primary mt-3">Volver al Dashboard</a>
                    </div>
                `;
            }
        }
    },

    api: async (endpoint, method = 'GET', body = null) => {
        const options = { method };
        if (body) {
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        try {
            return await Helper.fetchAPI(endpoint, options);
        } catch (err) {
            console.error(err);
            return { error: true, message: 'Network Error' };
        }
    },

    login: async (username, password) => {
        const res = await App.api('/auth/login', 'POST', { username, password });

        if (res.select_tenant) {
            // Global Admin Case - Show Selector
            App.renderTenantSelector(res.global_user_id, res.full_name, res.programs);
        } else if (res.token) {
            // Regular Login
            App.state.token = res.token;
            App.restoreUserFromToken();
            localStorage.setItem('pae_token', res.token);
            await App.loadMenu();
            App.startNotificationsPolling();
            window.location.hash = '#dashboard';
        } else {
            Swal.fire('Error', res.message || 'Login fallido', 'error');
        }
    },

    selectTenant: async (userId, paeId) => {
        const res = await App.api('/auth/select_tenant', 'POST', {
            user_id: userId,
            target_pae_id: paeId
        });

        if (res.token) {
            App.state.token = res.token;
            App.restoreUserFromToken();
            localStorage.setItem('pae_token', res.token);
            await App.loadMenu();
            App.startNotificationsPolling();
            window.location.hash = '#dashboard';

            // Close modal if open (manually remove backdrop if needed, usually simple re-render handles it)
        } else {
            Swal.fire('Error', res.message || 'No se pudo ingresar al PAE', 'error');
        }
    },

    logout: () => {
        App.state.token = null;
        App.state.user = null;
        localStorage.removeItem('pae_token');
        window.location.hash = '#login';
    },

    loadMenu: async () => {
        const menu = await App.api('/auth/menu');
        if (Array.isArray(menu)) {
            App.state.menu = menu;
        }
    },

    renderLogin: () => {
        document.getElementById('app').innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="min-height: 85vh;">
                <div class="col-12 col-md-5 col-lg-4">
                    <div class="card shadow">
                        <div class="card-header bg-white text-center py-3 border-bottom-0">
                            <h4 class="text-primary-custom mb-3"><i class="fas fa-lock me-2"></i>Acceso Seguro</h4>
                            <img src="${Config.BASE_URL}assets/img/logos/logo_ovc.png" alt="OVCSYSTEMS" class="img-fluid mb-2" style="max-height: 120px;">
                        </div>
                        <div class="card-body p-4">
                            <form id="loginForm">
                                <div class="mb-3">
                                    <label>Usuario</label>
                                    <input type="text" id="username" class="form-control" placeholder="admin" required>
                                </div>
                                <div class="mb-3">
                                    <label>Contraseña</label>
                                    <input type="password" id="password" class="form-control" placeholder="admin" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Ingresar</button>
                            </form>
                        </div>
                        <div class="card-footer text-center">
                            <small class="text-muted">PAE Control v1.7.5</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('loginForm').onsubmit = (e) => {
            e.preventDefault();
            App.login(
                document.getElementById('username').value,
                document.getElementById('password').value
            );
        };
    },

    renderTenantSelector: async (userId, fullName, programs = []) => {
        // We now use the programs list provided during login to avoid 401 errors
        // since /tenant/list is now protected by JWT.
        if (!programs || !Array.isArray(programs) || programs.length === 0) {
            Swal.fire('Error', 'No se pudieron cargar los programas o no tiene permisos', 'error');
            return;
        }

        let listHtml = '';
        programs.forEach(p => {
            listHtml += `
                <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
                        onclick="App.selectTenant(${userId}, ${p.id})">
                    <div>
                        <i class="fas fa-building text-primary me-2"></i><strong>${p.name}</strong>
                    </div>
                    <span class="badge bg-primary rounded-pill"><i class="fas fa-arrow-right"></i></span>
                </button>
            `;
        });

        document.getElementById('app').innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="min-height: 85vh;">
                <div class="col-12 col-md-6 col-lg-5">
                    <div class="card shadow">
                        <div class="card-header bg-primary text-white text-center">
                            <h4><i class="fas fa-user-shield me-2"></i>Bienvenido, ${fullName}</h4>
                            <p class="mb-0 small">Seleccione el Programa PAE que desea administrar</p>
                        </div>
                        <div class="card-body p-0">
                            <div class="list-group list-group-flush">
                                ${listHtml}
                            </div>
                        </div>
                        <div class="card-footer text-center">
                            <button class="btn btn-link text-muted" onclick="window.location.reload()">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderUsers: async () => {
        const appContainer = document.getElementById('app');
        appContainer.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="text-primary-custom fw-bold">Gestión de Usuarios</h2>
                <button class="btn btn-success rounded-pill px-4 shadow-sm" onclick="App.openUserModal()">
                    <i class="fas fa-plus me-2"></i>Nuevo Usuario
                </button>
            </div>
            <div class="card shadow-sm border-0 rounded-3 overflow-hidden">
                <div class="card-body p-0">
                    <div class="table-responsive p-3">
                        <table id="usersTable" class="table table-hover align-middle mb-0" style="width:100%">
                            <thead class="bg-light text-secondary text-uppercase small fw-bold">
                                <tr>
                                    <th class="ps-4">Nombre Completo</th>
                                    <th>Contacto</th>
                                    <th>Credenciales</th>
                                    <th>Rol</th>
                                    <th class="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="users-table-body">
                                
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        try {
            const users = await App.api('/users');
            const tbody = document.getElementById('users-table-body');
            tbody.innerHTML = '';

            if (users.error || !Array.isArray(users)) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Error: ${users.message || 'Respuesta inválida del servidor'}</td></tr>`;
                console.error("API Error:", users);
                return;
            }



            if (users.length === 0) {
                // No initialization needed if empty, or render empty table
            }

            users.forEach(u => {
                tbody.innerHTML += `
                    <tr>
                        <td class="ps-4">
                            <div class="fw-bold text-dark">${u.full_name}</div>
                            <small class="text-muted"><i class="fas fa-id-badge me-1"></i>ID: ${u.id}</small>
                        </td>
                        <td>
                            ${u.address ? `<div class="small"><i class="fas fa-map-marker-alt text-danger me-1"></i>${u.address}</div>` : ''}
                            ${u.phone ? `<div class="small text-muted"><i class="fas fa-phone text-success me-1"></i>${u.phone}</div>` : '<span class="small text-muted">-</span>'}
                        </td>
                        <td>
                            <div class="fw-medium text-dark"><i class="fas fa-user-circle me-1 text-muted"></i>${u.username}</div>
                            <small class="text-muted">************</small>
                        </td>
                        <td><span class="badge rounded-pill bg-light text-primary border border-primary text-uppercase">${u.role_name || 'N/A'}</span></td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-light text-primary me-2" onclick='App.openUserModal(${JSON.stringify(u)})' title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${u.id != App.state.user.id ? `
                            <button class="btn btn-sm btn-light text-danger" onclick="App.deleteUser(${u.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>` : ''}
                        </td>
                    </tr>
                `;
            });

            // Initialize DataTable using Helper
            Helper.initDataTable('#usersTable');

        } catch (e) {
            console.error(e);
            document.getElementById('users-table-body').innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error cargando usuarios.</td></tr>';
        }
    },

    openUserModal: async (user = null) => {
        // Fetch Roles
        let rolesHtml = '';
        try {
            const roles = await App.api('/roles');
            // Filter roles: Exclude Super Admin (id=1)
            roles.filter(r => r.id != 1).forEach(r => {
                const selected = user && user.role_id == r.id ? 'selected' : '';
                rolesHtml += `<option value="${r.id}" ${selected}>${r.name}</option>`;
            });
        } catch (e) {
            console.error("Error fetching roles", e);
            rolesHtml = '<option value="">Error cargando roles</option>';
        }

        const isEdit = !!user;
        const title = isEdit ? 'Editar Usuario' : 'Nuevo Usuario';
        // Colors from image intuition: Green for New, Blue for Edit
        const headerColor = isEdit ? '#3498db' : '#27ae60';
        const btnColor = isEdit ? '#3498db' : '#27ae60';

        const { value: formValues } = await Swal.fire({
            title: `<span style="color: white">${title}</span>`,
            background: '#fff',
            width: '600px',
            padding: '0',
            customClass: {
                title: 'py-3 m-0 w-100'
            },
            showCloseButton: true,
            html: `
                <style>
                    .swal2-title { background-color: ${headerColor}; border-radius: 5px 5px 0 0; display: flex !important; margin: 0 !important; width: 100%; }
                    .swal2-close { color: white !important; }
                    .form-label-custom { text-transform: uppercase; font-size: 0.75rem; font-weight: 700; color: #555; margin-bottom: 4px; display: block; text-align: left; }
                </style>
                <div class="px-4 py-3 text-start">
                    <div class="mb-3">
                        <label class="form-label-custom">Nombre Completo</label>
                        <input id="swal-fullname" class="form-control" placeholder="Ej: Juan Pérez" value="${user ? user.full_name : ''}">
                    </div>
                    
                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label-custom">Dirección</label>
                            <input id="swal-address" class="form-control" placeholder="Ej: Calle 123" value="${user && user.address ? user.address : ''}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label-custom">Teléfono</label>
                            <input id="swal-phone" class="form-control" placeholder="Ej: 300 123 4567" value="${user && user.phone ? user.phone : ''}">
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-md-6">
                            <label class="form-label-custom">Usuario / Correo</label>
                            <input id="swal-username" class="form-control" placeholder="juan.perez" value="${user ? user.username : ''}" ${isEdit ? 'readonly' : ''}>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label-custom">Contraseña ${isEdit ? '<small class="text-muted fw-normal">(Opcional)</small>' : ''}</label>
                            <input id="swal-password" type="password" class="form-control" placeholder="******">
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label-custom">Rol Asignado</label>
                        <select id="swal-role" class="form-select">${rolesHtml}</select>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: btnColor,
            cancelButtonColor: '#6c757d',
            preConfirm: () => {
                return {
                    full_name: document.getElementById('swal-fullname').value,
                    address: document.getElementById('swal-address').value,
                    phone: document.getElementById('swal-phone').value,
                    username: document.getElementById('swal-username').value,
                    role_id: document.getElementById('swal-role').value,
                    password: document.getElementById('swal-password').value
                }
            }
        });

        if (formValues) {
            if (!formValues.full_name || !formValues.username || (!isEdit && !formValues.password)) {
                Swal.fire('Error', 'Por favor complete los campos obligatorios.', 'warning');
                return;
            }

            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit ? `/users/${user.id}` : '/users';

            const res = await App.api(url, method, formValues);

            if (res.message) {
                Swal.fire({
                    icon: 'success',
                    title: 'Guardado',
                    text: res.message,
                    timer: 1500,
                    showConfirmButton: false
                });
                App.renderUsers();
            } else {
                Swal.fire('Error', 'No se pudo guardar.', 'error');
            }
        }
    },

    deleteUser: async (id) => {
        const result = await Swal.fire({
            title: '¿Eliminar usuario?',
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const res = await App.api(`/users/${id}`, 'DELETE');
            if (res.message) {
                Swal.fire('Eliminado', res.message, 'success');
                App.renderUsers();
            }
        }
    },

    renderSidebar: () => {
        const sidebarList = document.getElementById('sidebar-list');
        sidebarList.innerHTML = '';

        App.state.menu.forEach(group => {
            // Check if we need to inject Financiero before Reports
            if (group.name === 'Reportes' || group.id == 5) {
                const finLi = document.createElement('li');
                finLi.className = 'nav-item mb-2';
                finLi.innerHTML = `
                    <a href="#group/99" class="nav-link text-white">
                        <i class="fas fa-hand-holding-usd me-2"></i> Financiero
                    </a>
                `;
                sidebarList.appendChild(finLi);

                const repoLi = document.createElement('li');
                repoLi.className = 'nav-item mb-2';
                repoLi.innerHTML = `
                    <a href="#module/repositorio" class="nav-link text-white">
                        <i class="fas fa-folder-open me-2"></i> Repositorio
                    </a>
                `;
                sidebarList.appendChild(repoLi);
            }

            const li = document.createElement('li');
            li.className = 'nav-item mb-2';
            li.innerHTML = `
                <a href="#group/${group.id}" class="nav-link text-white">
                    <i class="${group.icon} me-2"></i> ${group.name}
                </a>
            `;
            sidebarList.appendChild(li);
        });

        // Add Logout
        const logoutLi = document.createElement('li');
        logoutLi.className = 'nav-item mt-5 pt-3 border-top border-secondary';
        logoutLi.innerHTML = `
            <a href="#" class="nav-link text-danger" onclick="App.logout()">
                <i class="fas fa-sign-out-alt me-2"></i> Cerrar Sesión
            </a>
        `;
        sidebarList.appendChild(logoutLi);
    },

    renderGroupHub: (groupId) => {
        let group = App.state.menu.find(g => g.id == groupId);

        // Virtual group Financiero
        if (groupId == 99) {
            group = {
                id: 99,
                name: 'Financiero',
                icon: 'fas fa-hand-holding-usd',
                modules: []
            };
        }

        // Virtual group Entregables
        if (groupId == 98) {
            group = {
                id: 98,
                name: 'Entregables',
                icon: 'fas fa-box-open',
                modules: []
            };
        }

        if (!group) return;

        let cardsHtml = '';
        const modulesToRender = [];

        // 1. Add base modules from database
        group.modules.forEach(mod => {
            if (mod.route === 'users' && App.state.user && App.state.user.role_id !== 1) return;
            modulesToRender.push(mod);
        });

        // 2. Inject Virtual Modules based on Group
        if (group.name === 'Configuración') {
            if (App.state.user && App.state.user.role_id === 1) {
                modulesToRender.push({ name: 'Crear Programa', route: 'pae-programs', icon: 'fas fa-building', description: 'Gestión de entidades', virtual: true, color: 'primary' });
            }
            if (App.state.user && App.state.user.role_id !== 1 && App.state.user.pae_id) {
                modulesToRender.push({ name: 'Mi Equipo', route: 'team', icon: 'fas fa-users', description: 'Gestión de miembros', virtual: true, color: 'success' });
            }
        }

        if (group.name === 'Alimentación') {
            modulesToRender.push({ name: 'Raciones y Población', route: 'population-types', icon: 'fas fa-users', description: 'Configuracion', virtual: true, color: 'info' });
        }

        if (group.id == 99 || group.name === 'Financiero') {
            modulesToRender.push({ name: 'Terceros', route: 'fin-terceros', icon: 'fas fa-id-card', description: 'Proveedores y Clientes', virtual: true, color: 'primary' });
            modulesToRender.push({ name: 'Creación Presupuesto', route: 'fin-presupuesto', icon: 'fas fa-calculator', description: 'Registro Oferta Económica', virtual: true, color: 'warning' });
            modulesToRender.push({ name: 'Modificaciones Contractuales', route: 'fin-modificaciones', icon: 'fas fa-file-contract', description: 'Adiciones, Reducciones y Traslados Presupuestales', virtual: true, color: 'danger' });
            modulesToRender.push({ name: 'Definición Costos y Gastos', route: 'fin-movimiento-tipos', icon: 'fas fa-tags', description: 'Categorización de Egresos', virtual: true, color: 'dark' });
            modulesToRender.push({ name: 'Registro Costos y Gastos', route: 'fin-movimientos', icon: 'fas fa-exchange-alt', description: 'Registro de Movimientos de Costos y Gastos', virtual: true, color: 'success' });
        }

        if (group.id == 6 || group.name === 'Inventarios') {
            if (!modulesToRender.find(m => m.route === 'devoluciones')) {
                modulesToRender.push({ 
                    name: 'Devoluciones de Sede', 
                    route: 'devoluciones', 
                    icon: 'fas fa-undo', 
                    description: 'Reingreso de ítems desde sedes educativas', 
                    virtual: true, 
                    color: 'danger' 
                });
            }
        }

        if (group.id == 98 || group.name === 'Repositorio' || group.name === 'Entregables') {
            modulesToRender.push({ name: 'Documentos', route: 'repositorio', icon: 'fas fa-folder-open', description: 'Gestión documental y soportes', virtual: true, color: 'primary' });
        }

        if (group.id == 5 || group.name === 'Reportes') {
            // Level 1: Main Categories
            modulesToRender.length = 0; // Clear existing if any (like the default dashboard)
            modulesToRender.push({ name: 'Financieros', route: 'reports-fin', icon: 'fas fa-file-invoice-dollar', description: 'Balances, costos y presupuestos', virtual: true, color: 'danger' });
            modulesToRender.push({ name: 'Alimentación', route: 'reports-ali', icon: 'fas fa-utensils', description: 'Insumos, recetas y minutas', virtual: true, color: 'success' });
            modulesToRender.push({ name: 'Administrativos', route: 'reports-adm', icon: 'fas fa-clipboard-list', description: 'Asistencia, personal y gestión', virtual: true, color: 'primary' });
            modulesToRender.push({ name: 'Talento Humano', route: 'reports-rh', icon: 'fas fa-user-tie', description: 'Nómina general y desprendibles', virtual: true, color: 'info' });
        }

        // 3. APPLY MANUAL ORDERING AND CUSTOM GROUPS
        // ALIMENTACIÓN: items, ration-types, recetario, minutas (ciclos)
        if (group.name === 'Alimentación') {
            const order = ['items', 'population-types', 'recetario', 'minutas'];
            modulesToRender.sort((a, b) => {
                let idxA = order.indexOf(a.route);
                let idxB = order.indexOf(b.route);
                if (idxA === -1) idxA = 99;
                if (idxB === -1) idxB = 99;
                return idxA - idxB;
            });
        }

        // BENEFICIARIOS GROUP - Custom 5-Card Dashboard
        if (group.name === 'Beneficiarios') {
            // 1. Rename/Map existing modules
            const benefModule = modulesToRender.find(m => m.name === 'Estudiantes' || m.name === 'Beneficiarios' || m.route === 'beneficiarios');
            if (benefModule) {
                benefModule.name = 'Beneficiarios';
                benefModule.description = 'Gestión de estudiantes y matrícula';
                benefModule.icon = 'fas fa-users';
                benefModule.route = 'beneficiarios'; // Ensure route is clean
            }

            // 2. Add Virtual Modules with Actions
            // Check if they don't already exist to avoid dupes on re-render

            if (!modulesToRender.find(m => m.name === 'Carga Masiva')) {
                modulesToRender.push({
                    name: 'Carga Masiva',
                    route: 'beneficiaries-upload', // Dummy route
                    action: "window.location.hash='#module/beneficiaries?action=upload'",
                    icon: 'fas fa-file-upload',
                    description: 'Subir archivo de beneficiarios',
                    virtual: true,
                    color: 'success'
                });
            }

            // 3. Sort
            const order = ['beneficiarios', 'beneficiaries-upload', 'novedades', 'reporte-asistencia'];
            modulesToRender.sort((a, b) => {
                let routeA = a.route === 'beneficiaries' ? 'beneficiarios' : a.route; // Normalize
                let routeB = b.route === 'beneficiaries' ? 'beneficiarios' : b.route;

                // Partial match for report/news if needed
                if (a.name === 'Novedades') routeA = 'novedades';
                if (b.name === 'Novedades') routeB = 'novedades';
                if (a.name.includes('Asistencia')) routeA = 'reporte-asistencia';
                if (b.name.includes('Asistencia')) routeB = 'reporte-asistencia';

                let idxA = order.indexOf(routeA);
                let idxB = order.indexOf(routeB);

                // Fallback for known virtuals
                if (a.route === 'beneficiaries-upload') idxA = 1;
                if (b.route === 'beneficiaries-upload') idxB = 1;

                if (idxA === -1) idxA = 99;
                if (idxB === -1) idxB = 99;
                return idxA - idxB;
            });
        }

        // 4. Generate HTML
        modulesToRender.forEach(mod => {
            const isVirtual = !!mod.virtual;
            const borderClass = isVirtual ? `border-${mod.color || 'primary'}` : '';
            const bgClass = isVirtual && mod.color === 'warning' ? 'style="background-color: #fff3cd;"' :
                isVirtual && mod.color === 'success' ? 'style="background-color: #d4edda;"' : '';
            const iconColor = isVirtual ? `text-${mod.color || 'primary'}` : 'text-primary';

            // Custom Action Limit
            let linkHtml = '';
            if (mod.action) {
                linkHtml = `<a href="#" onclick="${mod.action}; return false;" class="btn btn-outline-${mod.color || 'primary'} btn-sm stretched-link">Ingresar</a>`;
            } else {
                linkHtml = `<a href="#module/${mod.route}" class="btn btn-outline-${mod.color || 'primary'} btn-sm stretched-link">
                                ${mod.route === 'ration-types' ? 'Configurar' : 'Ingresar'}
                            </a>`;
            }

            cardsHtml += `
                <div class="col-md-4 mb-4 fade-in">
                    <div class="card h-100 shadow-sm hover-card ${borderClass}">
                        <div class="card-body text-center">
                            <div class="icon-circle mb-3 mx-auto" ${bgClass}>
                                <i class="${mod.icon} fa-2x ${iconColor}"></i>
                            </div>
                            <h5 class="card-title fw-bold">${mod.name}</h5>
                            <p class="card-text small text-muted">${mod.description || 'Acceso al módulo'}</p>
                            ${linkHtml}
                        </div>
                    </div>
                </div>
            `;
        });

        document.getElementById('app').innerHTML = `
            <div class="d-flex align-items-center mb-4 border-bottom pb-2">
                <div class="icon-circle bg-primary-light me-3" style="width: 50px; height: 50px;">
                    <i class="${group.icon} text-primary"></i>
                </div>
                <h3 class="mb-0 text-primary-custom fw-bold">${group.name}</h3>
            </div>
            <div class="row">
                ${cardsHtml}
            </div>
        `;
    },

    renderReportsSubHub: (category) => {
        let title = '';
        let icon = '';
        let color = '';
        let modules = [];

        if (category === 'reports-ali') {
            title = 'Reportes de Alimentación';
            icon = 'fas fa-utensils';
            color = 'success';
            modules = [
                { name: 'Impresión de Insumos', route: 'reports-insumos', icon: 'fas fa-carrot', description: 'Listado maestro de insumos y nutrientes', color: 'success' },
                { name: 'Impresión de Recetas', route: 'reports-recetas', icon: 'fas fa-book-open', description: 'Fichas técnicas de preparación', color: 'success' },
                { name: 'Minutas x Ciclo x Sede', route: 'reports-minutas', icon: 'fas fa-calendar-alt', description: 'Programación detallada por institución', color: 'success' },
                { name: 'Análisis de Ciclos', route: 'reports-ciclos-analisis', icon: 'fas fa-chart-pie', description: 'Verificar cumplimiento de compras, entradas y salidas por ciclo', color: 'success' }
            ];
        } else if (category === 'reports-fin') {
            title = 'Reportes Financieros';
            icon = 'fas fa-file-invoice-dollar';
            color = 'danger';
            modules = [
                { name: 'Costos por Ciclo', route: 'reports-costs', icon: 'fas fa-dollar-sign', description: 'Análisis de inversión por período' },
                { name: 'Presupuesto Inicial', route: 'reports-presupuesto', icon: 'fas fa-money-bill-wave', description: 'Generar reporte de presupuesto inicial' },
                { name: 'Ejecución Presupuestal', route: 'reports-ejecucion', icon: 'fas fa-chart-line', description: 'Generar reporte de ejecución presupuestal' },
                { name: 'Auxiliar de Movimientos', route: 'reports-movimientos-aux', icon: 'fas fa-clipboard-list', description: 'Libro auxiliar de movimientos financieros' }
            ];
        } else if (category === 'reports-adm') {
            title = 'Reportes Administrativos';
            icon = 'fas fa-clipboard-list';
            color = 'primary';
            modules = [
                { name: 'Control de Asistencia', route: 'reports-attendance', icon: 'fas fa-user-check', description: 'Reporte de raciones entregadas' },
                { name: 'Impresión de Carnets', route: 'reports-carnets', icon: 'fas fa-id-badge', description: 'Generación masiva de carnets con QR para beneficiarios' },
                { name: 'Listado de Beneficiarios', route: 'reports-beneficiarios', icon: 'fas fa-users', description: 'Generar listado de beneficiarios con filtros de institución y sede para Excel o PDF' },
                { name: 'Bandeja de PQRs', route: 'pqrs', icon: 'fas fa-envelope-open-text', description: 'Gestión y resolución de solicitudes ciudadanas' }
            ];
        } else if (category === 'reports-rh') {
            title = 'Reportes de Talento Humano';
            icon = 'fas fa-users-cog';
            color = 'info';
            modules = [
                { name: 'Nómina y Pagos', route: 'reports-pay', icon: 'fas fa-file-invoice-dollar', description: 'Consolidados y desprendibles de nómina' },
                { name: 'Listado de Cargos', route: 'reports-hr-positions', icon: 'fas fa-briefcase', description: 'Listado maestro de cargos y riesgos ARL' },
                { name: 'Listado de Personal', route: 'reports-hr-employees', icon: 'fas fa-id-card-alt', description: 'Fichas de personal y datos de contacto' }
            ];
        }

        let cardsHtml = '';
        modules.forEach(mod => {
            cardsHtml += `
                <div class="col-md-4 mb-4 fade-in">
                    <div class="card h-100 shadow-sm hover-card border-${color}">
                        <div class="card-body text-center">
                            <div class="icon-circle mb-3 mx-auto">
                                <i class="${mod.icon} fa-2x text-${color}"></i>
                            </div>
                            <h5 class="card-title fw-bold">${mod.name}</h5>
                            <p class="card-text small text-muted">${mod.description || 'Generar reporte'}</p>
                            <a href="#module/${mod.route}" class="btn btn-outline-${color} btn-sm stretched-link">
                                Abrir
                            </a>
                        </div>
                    </div>
                </div>
            `;
        });

        document.getElementById('app').innerHTML = `
            <div class="d-flex align-items-center mb-4 border-bottom pb-2">
                <div class="icon-circle bg-${color}-light me-3" style="width: 50px; height: 50px;">
                    <i class="${icon} text-${color}"></i>
                </div>
                <h3 class="mb-0 text-${color} fw-bold">${title}</h3>
            </div>
            <div class="row">
                ${cardsHtml}
            </div>
        `;
    },

    /**
     * Load external view dynamically
     */
    loadView: async (viewName) => {
        const appContainer = document.getElementById('app');

        // Create container for the view
        appContainer.innerHTML = '<div id="app-container"></div>';

        // Remove previous script instances for this view to avoid accumulation (optional but cleaner)
        const oldScript = document.getElementById(`script-view-${viewName}`);
        if (oldScript) oldScript.remove();

        // Usar timestamp para evitar caché entre navegaciones de módulo.
        // Los scripts de vista se recargan dinámicamente; el caché fijo causa
        // re-ejecución del archivo antiguo aunque el servidor tenga uno nuevo.
        const cacheBust = `${Config.VERSION}.${new Date().getTime()}`;
        const script = document.createElement('script');
        script.id = `script-view-${viewName}`;
        script.src = `${Config.BASE_URL}assets/js/views/${viewName}.js?v=${cacheBust}`;

        script.onerror = () => {
            appContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h4>Error</h4>
                    <p>No se pudo cargar la vista: ${viewName}</p>
                </div>
            `;
        };
        document.body.appendChild(script);
    },

    // ─── Notificaciones PQR ─────────────────────────────────────────────
    loadNotifications: async () => {
        if (!App.state.token) return;

        try {
            const resp = await fetch(`${App.apiBase}/public/notifications`, {
                headers: { 'Authorization': `Bearer ${App.state.token}` }
            });

            if (!resp.ok) return;

            const data = await resp.json();
            const count = data.count || 0;

            // Actualizar badge
            const badge = document.getElementById('pqr-badge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            }

            // Actualizar dropdown
            const list = document.getElementById('notifications-list');
            if (list) {
                if (count > 0) {
                    list.innerHTML = `
                        <li>
                            <a class="dropdown-item small d-flex align-items-center gap-2" href="#" onclick="window.location.hash='#module/pqrs'; return false;">
                                <i class="fas fa-envelope-open-text text-danger"></i>
                                <span><strong>${count}</strong> PQR${count > 1 ? 's' : ''} pendiente${count > 1 ? 's' : ''}</span>
                            </a>
                        </li>`;
                } else {
                    list.innerHTML = '<li><span class="dropdown-item small text-muted">Sin notificaciones</span></li>';
                }
            }
        } catch (e) {
            // Silently fail — don't disturb UX if endpoint is unreachable
        }
    },

    startNotificationsPolling: () => {
        // Load immediately and then every 60 s
        App.loadNotifications();
        if (App._notifInterval) clearInterval(App._notifInterval);
        App._notifInterval = setInterval(App.loadNotifications, 60000);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', App.init);

/**
 * Configuración de la App Móvil
 */
// Calculate API URL dynamically based on current location
// If we are at /pae/movil/index.html, we want /pae/api
// If we are at /movil/index.html, we want /api
const API_BASE_URL = window.location.pathname.includes('/pae/')
    ? window.location.origin + '/pae/api'
    : window.location.origin + '/api';
const APP_VERSION = '1.0.2';

class MobileApp {
    constructor() {
        const t = localStorage.getItem('pae_token');
        this.token = (t && t !== 'undefined' && t !== 'null') ? t : null;

        try {
            const u = localStorage.getItem('pae_user');
            this.user = (u && u !== 'undefined') ? JSON.parse(u) : {};
        } catch (e) { this.user = {}; }

        try {
            const b = localStorage.getItem('pae_branch');
            this.selectedBranch = (b && b !== 'undefined') ? JSON.parse(b) : null;
        } catch (e) { this.selectedBranch = null; }

        // Load pending scans from local storage
        try {
            const p = localStorage.getItem('pae_pending');
            this.pendingScans = (p && p !== 'undefined') ? JSON.parse(p) : [];
        } catch (e) { this.pendingScans = []; }

        this.init();
    }

    init() {
        if (!this.token) {
            this.showLogin();
        } else {
            this.showDashboard();
            this.loadUserData();
            this.loadStats();
            this.loadRationTypes();
            this.updateSyncUI();
        }
    }

    showLogin() {
        document.getElementById('login-screen').classList.remove('d-none');
        document.getElementById('app-screen').classList.add('d-none');
    }

    showDashboard() {
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('app-screen').classList.remove('d-none');

        if (this.selectedBranch) {
            const locName = this.selectedBranch.school_name ? `${this.selectedBranch.school_name} - ${this.selectedBranch.name}` : this.selectedBranch.name;
            document.getElementById('current-location').innerText = locName;
        } else {
            this.selectBranch(); // Force selection if none
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.select_tenant) {
                    Swal.fire('Atención', 'Usuario Global Admin: La selección de tenant no está soportada en móvil aún. Use un usuario de PAE específico.', 'warning');
                    return;
                }

                if (!data.token) {
                    Swal.fire('Error', 'Respuesta del servidor inválida (Sin token).', 'error');
                    return;
                }

                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('pae_token', this.token);
                localStorage.setItem('pae_user', JSON.stringify(this.user));

                this.showDashboard();
                this.loadUserData();
                this.loadStats();
                this.loadRationTypes();
            } else {
                Swal.fire('Error', data.message || 'Error de autenticación', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Error de conexión con el servidor', 'error');
        }
    }

    logout() {
        localStorage.removeItem('pae_token');
        localStorage.removeItem('pae_user');
        localStorage.removeItem('pae_branch');
        window.location.reload();
    }

    loadUserData() {
        document.getElementById('user-name').innerText = this.user.full_name?.split(' ')[0] || 'Usuario';
    }

    async loadRationTypes() {
        try {
            const response = await fetch(`${API_BASE_URL}/ration-types`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const res = await response.json();
                const list = res.data || [];
                const select = document.getElementById('current-ration-type');

                if (list.length === 0) {
                    select.innerHTML = '<option value="">Sin raciones config.</option>';
                    return;
                }

                select.innerHTML = list.map(rt => `<option value="${rt.id}">${rt.name}</option>`).join('');

                // Auto-select based on time?
                const hour = new Date().getHours();
                if (hour < 10) {
                    const desay = list.find(r => r.name.toUpperCase().includes('DESAYUNO') || r.name.toUpperCase().includes('MAÑANA'));
                    if (desay) select.value = desay.id;
                } else if (hour >= 11 && hour <= 14) {
                    const almu = list.find(r => r.name.toUpperCase().includes('ALMUERZO'));
                    if (almu) select.value = almu.id;
                }
            }
        } catch (error) {
            console.error("Error loading ration types", error);
        }
    }

    async loadStats() {
        if (!this.selectedBranch) return;

        try {
            const response = await fetch(`${API_BASE_URL}/consumptions/stats?branch_id=${this.selectedBranch.id}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                // Update specific elements if they existed, for now we update generic stats
                const statElements = document.querySelectorAll('.action-card h2');
                if (statElements.length >= 2) {
                    statElements[0].innerText = data.today_count || 0;
                    statElements[1].innerText = (data.progress || 0) + '%';
                }
            }
        } catch (error) {
            console.error("Error loading stats", error);
        }
    }

    async selectBranch() {
        try {
            const response = await fetch(`${API_BASE_URL}/branches`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.status === 401 || response.status === 403) {
                this.logout();
                return;
            }

            if (!response.ok) throw new Error('Error cargando sedes');

            const branches = await response.json();

            const list = Array.isArray(branches) ? branches : (branches.data || []);

            if (list.length === 0) {
                Swal.fire('Error', 'No tiene sedes asignadas o disponibles.', 'error');
                return;
            }

            let options = list.map(b => {
                const displayName = b.school_name ? `${b.school_name} - ${b.name}` : b.name;
                return `<option value='${JSON.stringify(b)}'>${displayName}</option>`;
            }).join('');

            Swal.fire({
                title: 'Seleccionar Sede',
                html: `<select id="swal-branch-select" class="form-select">${options}</select>`,
                confirmButtonText: 'Confirmar',
                allowOutsideClick: false,
                preConfirm: () => {
                    const selected = document.getElementById('swal-branch-select').value;
                    return JSON.parse(selected);
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    this.selectedBranch = result.value;
                    localStorage.setItem('pae_branch', JSON.stringify(this.selectedBranch));
                    
                    const locName = this.selectedBranch.school_name ? `${this.selectedBranch.school_name} - ${this.selectedBranch.name}` : this.selectedBranch.name;
                    document.getElementById('current-location').innerText = locName;
                    
                    this.loadStats();
                }
            });

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar las sedes.', 'error');
        }
    }

    openScanner() {
        if (!this.selectedBranch) {
            Swal.fire('Atención', 'Seleccione una sede primero', 'warning').then(() => this.selectBranch());
            return;
        }

        const modalEl = document.getElementById('scannerModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        setTimeout(() => {
            this.startScanner();
        }, 500);

        modalEl.addEventListener('hidden.bs.modal', () => {
            if (this.html5QrCode) {
                this.html5QrCode.stop().then(() => {
                    this.html5QrCode.clear();
                }).catch(err => console.error(err));
            }
        });
    }

    startScanner() {
        if (this.html5QrCode) {
            try { this.html5QrCode.clear(); } catch (e) { }
        }

        if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            Swal.fire({
                icon: 'error',
                title: 'Requiere HTTPS',
                html: 'El navegador bloquea la cámara en sitios no seguros (HTTP).',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        this.html5QrCode = new Html5Qrcode("scanner-container");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        this.html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText, decodedResult) => {
                this.handleScan(decodedText);
            },
            (errorMessage) => { }
        ).catch(err => {
            console.error("Error starting scanner", err);
            let msg = "Error: Cámara no disponible (" + err + ")";
            if (err.toString().includes("streaming not supported") || err.name === "NotAllowedError") {
                msg = "<b>Permiso denegado o no seguro.</b><br>Verifique permisos de cámara y use HTTPS.";
            }
            document.getElementById('scan-result').innerHTML = msg;
            document.getElementById('scan-result').classList.remove('d-none');
        });
    }

    async handleScan(qrCode) {
        // Stop scanning temporarily
        await this.html5QrCode.pause();

        // Format is expected to be PAE:{ID}:{DOC}
        const parts = qrCode.split(':');
        // Validate format
        if (parts[0] !== 'PAE' || parts.length < 3) {
            Swal.fire('Error', 'QR inválido. Use el carnet oficial.', 'error')
                .then(() => this.html5QrCode.resume());
            return;
        }

        const beneficiaryId = parts[1];
        const rationSelect = document.getElementById('current-ration-type');
        const rationTypeId = rationSelect.value;
        const rationTypeName = rationSelect.options[rationSelect.selectedIndex]?.text || '';

        if (!rationTypeId) {
            Swal.fire('Atención', 'Seleccione un momento de entrega primero.', 'warning')
                .then(() => this.html5QrCode.resume());
            return;
        }

        const payload = {
            beneficiary_id: beneficiaryId,
            branch_id: this.selectedBranch.id,
            ration_type_id: rationTypeId,
            meal_type: rationTypeName,
            at: new Date().toISOString(), // Local timestamp for reference
            beneficiary_name: parts[3] || 'Desconocido' // Optional: if QR includes name
        };

        try {
            const response = await fetch(`${API_BASE_URL}/consumptions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Entrega Registrada!',
                    html: `<b>${data.beneficiary_name || ''}</b><br>${rationTypeName}`,
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    this.loadStats();
                    this.html5QrCode.resume();
                });
            } else if (response.status === 409) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Ya entregado',
                    text: data.message,
                    timer: 2500
                }).then(() => this.html5QrCode.resume());
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de servidor',
                    text: data.message || 'Error desconocido'
                }).then(() => this.html5QrCode.resume());
            }

        } catch (error) {
            console.warn("Offline, saving locally:", error);
            this.saveLocally(payload);

            Swal.fire({
                icon: 'info',
                title: 'Guardado Local',
                html: `Sin conexión. La entrega de <b>${payload.beneficiary_name}</b> se sincronizará luego.`,
                timer: 2000,
                showConfirmButton: false
            }).then(() => this.html5QrCode.resume());
        }
    }

    saveLocally(payload) {
        this.pendingScans.push(payload);
        localStorage.setItem('pae_pending', JSON.stringify(this.pendingScans));
        this.updateSyncUI();
    }

    updateSyncUI() {
        const badge = document.getElementById('sync-badge');
        if (badge) {
            if (this.pendingScans.length > 0) {
                badge.innerText = this.pendingScans.length;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
        }
    }

    async syncData() {
        if (this.pendingScans.length === 0) {
            this.loadStats();
            Swal.fire({ icon: 'success', title: 'Sincronizado', text: 'No hay datos pendientes.', timer: 1000, showConfirmButton: false });
            return;
        }

        Swal.fire({
            title: 'Sincronizando...',
            html: `Subiendo <b>${this.pendingScans.length}</b> registros pendientes.`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        let successCount = 0;
        let errors = [];

        // Try to upload each pending scan
        // We do it sequentially to handle duplicates/errors correctly
        const toSync = [...this.pendingScans];
        this.pendingScans = []; // Clear current list temporarily

        for (const item of toSync) {
            try {
                const response = await fetch(`${API_BASE_URL}/consumptions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify(item)
                });

                if (response.ok || response.status === 409) {
                    successCount++;
                } else {
                    const data = await response.json();
                    errors.push(`${item.beneficiary_name}: ${data.message}`);
                    this.pendingScans.push(item); // Put back to retry later
                }
            } catch (e) {
                errors.push(`${item.beneficiary_name}: Error de red`);
                this.pendingScans.push(item); // Put back
            }
        }

        localStorage.setItem('pae_pending', JSON.stringify(this.pendingScans));
        this.updateSyncUI();
        this.loadStats();

        if (errors.length === 0) {
            Swal.fire({ icon: 'success', title: '¡Éxito!', text: `Se sincronizaron ${successCount} registros.`, timer: 2000 });
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Sincronización Parcial',
                html: `Sincronizados: ${successCount}<br>Pendientes: ${this.pendingScans.length}<br><small>Haga clic en sincronizar de nuevo cuando mejore la señal.</small>`,
            });
        }
    }

    manualEntry() {
        if (!this.selectedBranch) {
            Swal.fire('Atención', 'Seleccione una sede primero', 'warning').then(() => this.selectBranch());
            return;
        }

        const rationSelect = document.getElementById('current-ration-type');
        const rationTypeId = rationSelect.value;
        const rationTypeName = rationSelect.options[rationSelect.selectedIndex]?.text || '';

        if (!rationTypeId) {
            Swal.fire('Atención', 'Seleccione un momento de entrega primero.', 'warning');
            return;
        }

        Swal.fire({
            title: 'Registro Manual',
            input: 'text',
            inputLabel: 'Documento del Estudiante',
            inputPlaceholder: 'Ej. 1002345678',
            showCancelButton: true,
            confirmButtonText: 'Registrar Entrega',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                const docNumber = result.value.trim();
                if (!docNumber) return;

                const payload = {
                    document_number: docNumber,
                    branch_id: this.selectedBranch.id,
                    ration_type_id: rationTypeId,
                    meal_type: rationTypeName,
                    at: new Date().toISOString(),
                    beneficiary_name: 'Desconocido' // Updated by API if online
                };

                try {
                    Swal.fire({title: 'Registrando...', didOpen: () => {Swal.showLoading()}});
                    const response = await fetch(`${API_BASE_URL}/consumptions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.token}`
                        },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();

                    if (response.ok) {
                        Swal.fire({
                            icon: 'success',
                            title: '¡Entrega Registrada!',
                            html: `<b>${data.beneficiary_name || ''}</b><br>${rationTypeName}`,
                            timer: 1500,
                            showConfirmButton: false
                        }).then(() => {
                            this.loadStats();
                        });
                    } else if (response.status === 409) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Ya entregado',
                            text: data.message,
                            timer: 2500
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error de servidor',
                            text: data.message || 'Error desconocido'
                        });
                    }
                } catch (error) {
                    console.warn("Offline, saving locally:", error);
                    payload.beneficiary_name = `Doc: ${docNumber}`; // Distinguish offline
                    this.saveLocally(payload);

                    Swal.fire({
                        icon: 'info',
                        title: 'Guardado Local',
                        html: `Sin conexión. La entrega del documento <b>${docNumber}</b> se sincronizará luego.`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            }
        });
    }
}

// Global Instance
window.app = new MobileApp();

// Login Form Handler
document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    window.app.login(email, pass);
});

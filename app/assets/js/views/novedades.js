/**
 * Novedades View - Absences & Withdrawals Module
 * STATUS: IN DEVELOPMENT
 */

window.NovedadesView = {
    async init() {
        console.log('Initializing Novedades Module...');
        this.render();
    },

    render() {
        const html = `
            <div class="container-fluid">
                <div class="row justify-content-center mt-5">
                    <div class="col-md-8">
                        <div class="card shadow-lg border-0">
                            <div class="card-header bg-warning text-dark text-center py-4">
                                <h2 class="mb-0">
                                    <i class="fas fa-hard-hat me-2"></i>
                                    Módulo en Desarrollo
                                </h2>
                            </div>
                            <div class="card-body p-5 text-center">
                                <div class="mb-4">
                                    <i class="fas fa-exclamation-circle fa-5x text-warning"></i>
                                </div>
                                <h3 class="mb-3">Novedades - Ausentismos y Retiros</h3>
                                <p class="lead text-muted mb-4">
                                    Este módulo está actualmente en desarrollo y estará disponible próximamente.
                                </p>
                                
                                <div class="alert alert-info text-start">
                                    <h5 class="alert-heading">
                                        <i class="fas fa-info-circle me-2"></i>
                                        Funcionalidades Planeadas:
                                    </h5>
                                    <ul class="mb-0">
                                        <li>Registro diario de ausentismos</li>
                                        <li>Control de retiros definitivos</li>
                                        <li>Traslados entre sedes</li>
                                        <li>Reportes de asistencia</li>
                                        <li>Estadísticas de cobertura</li>
                                        <li>Alertas de inasistencias prolongadas</li>
                                        <li>Integración con consumo real</li>
                                    </ul>
                                </div>

                                <div class="mt-4">
                                    <button class="btn btn-primary btn-lg" onclick="window.history.back()">
                                        <i class="fas fa-arrow-left me-2"></i>
                                        Volver
                                    </button>
                                </div>
                            </div>
                            <div class="card-footer text-muted text-center">
                                <small>
                                    <i class="fas fa-calendar-alt me-1"></i>
                                    Fecha estimada de implementación: Febrero 2026
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app').innerHTML = html;
    }
};

// Initialize when view is loaded
if (typeof NovedadesView !== 'undefined') {
    NovedadesView.init();
}

(function() {
    const container = document.getElementById('app-container');
    if (!container) return;

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="text-primary-custom fw-bold mb-0">Entregables Financieros</h2>
            </div>
        </div>
        <div class="card shadow-sm border-0 rounded-3">
            <div class="card-body p-5 text-center text-muted">
                <div class="icon-circle bg-danger-light mx-auto mb-3" style="width: 80px; height: 80px;">
                    <i class="fas fa-file-invoice-dollar fa-3x text-danger"></i>
                </div>
                <h4>Módulo de Entregables Financieros</h4>
                <p>Esta sección estará disponible para la gestión de informes y soportes financieros.</p>
            </div>
        </div>
    `;
})();

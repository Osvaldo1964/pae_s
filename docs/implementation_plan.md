# Dashboard Enhancements Plan

Update the dashboard to be more informative and fix production deployment issues.

## Proposed Changes

### 1. Fix Chart.js 404 in Production
- **Action**: Move `chart.min.js` from `app/assets/libs/` to `app/assets/js/libs/` on Hostinger.
- **Status**: Completed (Manually by user after diagnosis).

### 2. Detailed Menu Display
- **Backend**: Modify `DashboardController::getIndex()` to join `menu_recipes` and `recipes`.
- **Frontend**: Update `DashboardView.renderAlerts()` in `dashboard.js` to show the list of dishes.
- **Status**: Completed.

### 3. Improved Branch Display in Budget Report
- **Goal**: Change "↳ PRINCIPAL" to "↳ INSTITUTION - PRINCIPAL" to distinguish between entities.
- **File**: `app/assets/js/views/reports_presupuesto.js`.
- **Logic**: Use `branch.school_name` combined with `branch.name`.

### 4. Breadcrumb Homogenization in Reports
- **Problem**: Sub-hubs (Feeding, Financial, Administrativo) lack breadcrumbs. Virtual routes aren't handled by the global breadcrumb function.
- **File**: `app/assets/js/core/app.js`.
- **Changes**:
    - Update `updateBreadcrumbs()` to handle `reports-ali`, `reports-fin`, `reports-adm`, and `reports-rh`.
    - Inject the breadcrumb container into `renderReportsSubHub()`.

### 5. New HR Reports (Positions and Staff)
- **Goal**: Provide downloadable/printable listings of cargos and employees with filters.
- **File: [app.js](file:///c:/xampp/htdocs/pae/app/assets/js/core/app.js)**:
    - Add `reports-hr-positions` and `reports-hr-employees` to the router.
    - Add the new cards to `renderReportsSubHub('reports-rh')`.
    - Update `updateBreadcrumbs` to include mapping for the new modules.
- **New File: [reports_hr_positions.js](file:///c:/xampp/htdocs/pae/app/assets/js/views/reports_hr_positions.js)**:
    - Interactive listing of all HR positions.
    - Export to Excel and PDF.
- **New File: [reports_hr_employees.js](file:///c:/xampp/htdocs/pae/app/assets/js/views/reports_hr_employees.js)**:
    - Listing of employees with a filter for "Position" (Cargo).
    - Export to Excel and PDF.

## Verification Plan

### Manual Verification
- Log in to the dashboard.
- Check "Ciclos Activos" section.
- Ensure recipe names and descriptions appear under the cycle header.
- Verify Chart.js still loads correctly without 404 errors.

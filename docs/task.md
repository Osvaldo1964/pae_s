# Dashboard Enhancements Task

## Production Fixes
- [x] Debug Chart.js 404 error on Hostinger (mismatched directory).
- [x] Verify local vs production directory structure.

## Dashboard UI Improvements
- [x] Update `DashboardController` to fetch recipe names and descriptions for active cycles.
- [x] Update `dashboard.js` to render recipes list within cycle cards.
- [x] Verify rendering with real/mock data.
- [x] Finalize documentation (Walkthrough).

## Budget Report Improvements
- [x] Implement "Institution - Branch" display in `reports_presupuesto.js`.
- [x] Verify display in detailed report view.

## Breadcrumb Homogenization
- [x] Update `App.updateBreadcrumbs` in `app.js` to handle report hubs.
- [x] Add breadcrumb nav to `App.renderReportsSubHub` in `app.js`.
- [x] Review individual report views for breadcrumb consistency.
- [x] Fix navigation loop in "Talento Humano" (direct link vs hub).
- [x] Create "Listado de Cargos" report view (`reports_hr_positions.js`).
- [x] Create "Listado de Personal" report view (`reports_hr_employees.js`).
- [x] Add new report cards to "Talento Humano" hub in `app.js`.

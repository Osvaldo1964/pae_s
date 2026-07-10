<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Program Control | Admin</title>
    <?php
    $base_path = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/') . '/';
    $assets_path = $base_path . 'assets/';
    ?>
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="<?= $assets_path ?>img/logo_ovc.png">
    <!-- Bootstrap 5 -->
    <link href="<?= $assets_path ?>plugins/bootstrap/css/bootstrap.min.css" rel="stylesheet">
    <!-- FontAwesome -->
    <link href="<?= $assets_path ?>plugins/fontawesome/css/all.min.css" rel="stylesheet">
    <!-- SweetAlert2 -->
    <link href="<?= $assets_path ?>plugins/sweetalert2/sweetalert2.min.css" rel="stylesheet">
    <!-- DataTables Bootstrap 5 -->
    <link href="<?= $assets_path ?>plugins/datatables/dataTables.bootstrap5.min.css" rel="stylesheet">

    <style>
        :root {
            --primary-color: #1B4F72;
            --secondary-color: #27AE60;
        }

        body {
            background-color: #f8f9fa;
            height: 100vh;
            overflow: hidden;
        }

        #wrapper {
            display: flex;
            width: 100%;
            height: 100%;
        }

        #sidebar {
            width: 250px;
            background-color: var(--primary-color);
            color: white;
            flex-shrink: 0;
            overflow-y: auto;
            transition: all 0.3s;
        }

        #sidebar .nav-link {
            color: rgba(255, 255, 255, 0.8);
        }

        #sidebar .nav-link:hover,
        #sidebar .nav-link.active {
            color: white;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
        }

        #main-content {
            flex-grow: 1;
            padding: 20px;
            overflow-y: auto;
        }

        .hover-card {
            transition: transform 0.2s;
            border: none;
        }

        .hover-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary-color);
        }

        .icon-circle {
            width: 60px;
            height: 60px;
            background-color: #e9ecef;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .text-primary-custom {
            color: var(--primary-color);
        }
    </style>
</head>

<body>

    <div id="wrapper">
        <!-- Sidebar -->
        <div id="sidebar" class="d-flex flex-column p-3 d-none">
            <a href="#" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
                <i class="fas fa-utensils me-2 fa-lg"></i>
                <span class="fs-4 fw-bold">Program Control</span>
            </a>
            <hr>
            <ul class="nav nav-pills flex-column mb-auto" id="sidebar-list">
                <!-- Dynamic Menu Items -->
            </ul>
        </div>

        <!-- Main Content -->
        <div id="main-content" class="bg-light d-flex flex-column">
            <!-- Top Header -->
            <nav class="navbar navbar-light bg-white border-bottom shadow-sm py-2 position-relative" id="top-header"
                style="display: none;">
                <div class="container-fluid px-4 d-flex justify-content-between align-items-center position-relative">
                    <!-- Left: Toggle -->
                    <div class="d-flex align-items-center">
                        <button class="btn btn-link text-secondary me-3" id="sidebar-toggle"><i
                                class="fas fa-bars"></i></button>
                    </div>

                    <!-- Center: Branding (Absolute - Inside Container) -->
                    <div id="program-header-info"
                        class="position-absolute top-50 start-50 translate-middle d-flex align-items-center"
                        style="white-space: nowrap; pointer-events: none;">
                        <!-- Dynamic Content loads here -->
                        <h5 class="mb-0 text-primary-custom fw-bold" id="header-title">PAE Control</h5>
                    </div>

                    <!-- Right: User & Notifs -->
                    <div class="d-flex align-items-center">
                        <div class="dropdown me-3">
                            <a href="#module/pqrs" class="text-secondary position-relative" id="notificationsDropdown"
                                data-bs-toggle="dropdown">
                                <i class="fas fa-bell fa-lg"></i>
                                <span id="pqr-badge"
                                    class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                                    style="font-size: 0.5rem; display: none;">0</span>
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0"
                                aria-labelledby="notificationsDropdownLink" id="notificationsDropdownMenu" style="min-width: 240px;">
                                <li>
                                    <h6 class="dropdown-header">Notificaciones</h6>
                                </li>
                                <div id="notifications-list">
                                    <li><span class="dropdown-item small text-muted">Sin notificaciones</span></li>
                                </div>
                            </ul>
                        </div>
                        <div class="dropdown">
                            <a href="#" class="d-flex align-items-center text-decoration-none dropdown-toggle"
                                id="userDropdown" data-bs-toggle="dropdown">
                                <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="User"
                                    class="rounded-circle me-2" width="32" height="32" id="header-user-avatar">
                                <span class="text-dark small fw-bold" id="header-user-name">Usuario</span>
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="userDropdown">
                                <li><a class="dropdown-item" href="#"><i class="fas fa-user-circle me-2"></i>Perfil</a>
                                </li>
                                <li><a class="dropdown-item" href="#"><i class="fas fa-cog me-2"></i>Configuración</a>
                                </li>
                                <li>
                                    <hr class="dropdown-divider">
                                </li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="App.logout()"><i
                                            class="fas fa-sign-out-alt me-2"></i>Cerrar Sesión</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Breadcrumbs -->
            <nav id="breadcrumb-container" class="px-4 mt-3" aria-label="breadcrumb" style="display: none;"></nav>

            <div class="container-fluid flex-grow-1 p-4" id="app">
                <!-- Dynamic View Content (Login / Dashboard / Modules) -->
                <div class="text-center mt-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- jQuery and DataTables -->
    <script src="<?= $assets_path ?>plugins/jquery/jquery.min.js"></script>
    <script src="<?= $assets_path ?>plugins/datatables/jquery.dataTables.min.js"></script>
    <script src="<?= $assets_path ?>plugins/datatables/dataTables.bootstrap5.min.js"></script>

    <!-- App Logic -->
    <?php
    require_once __DIR__ . '/../api/config/Config.php';
    $version = \Config\Config::APP_VERSION;
    ?>
    <script>
        window.APP_VERSION = "<?= $version ?>";
    </script>
    <script src="<?= $assets_path ?>js/core/config.js?v=<?= $version ?>"></script>
    <script src="<?= $assets_path ?>js/core/helper.js?v=<?= $version ?>"></script>
    <!-- Chart.js v4 Local -->
    <script src="<?= $assets_path ?>js/libs/chart.min.js?v=<?= $version ?>"></script>
    <!-- App Logic -->
    <script src="<?= $assets_path ?>js/core/app.js?v=<?= $version ?>"></script>
    <!-- Views Helpers -->
    <script src="<?= $assets_path ?>js/views/print-list.js?v=<?= $version ?>"></script>
    <script src="<?= $assets_path ?>plugins/bootstrap/js/bootstrap.bundle.min.js"></script>
    <script src="<?= $assets_path ?>plugins/sweetalert2/sweetalert2.all.min.js"></script>
</body>

</html>
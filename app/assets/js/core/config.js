/**
 * Config.js
 * Global configuration for PAE Control WebApp
 */

const Config = {
    // Unified source of truth - Always use server version
    get VERSION() {
        return window.APP_VERSION || '1.6.6';
    },

    // Dynamic Base URL detection
    // Detects '/pae/app/' or just '/app/' automatically
    get BASE_URL() {
        const path = window.location.pathname;
        const appIndex = path.indexOf('/app/');
        if (appIndex !== -1) {
            return path.substring(0, appIndex + 5);
        }
        return '/app/';
    },

    // API Base URL (replaces /app/ with /api/)
    get API_URL() {
        return this.BASE_URL.replace(/\/app\/$/, '/api');
    },

    // Root URL (replaces /app/ with /)
    get ROOT_URL() {
        return this.BASE_URL.replace(/\/app\/$/, '/');
    },

    // Assets Base URL
    get ASSETS_URL() {
        return this.BASE_URL + 'assets';
    },

    // Get full asset path
    asset(path) {
        return `${this.ASSETS_URL}/${path}`;
    },

    // Get full API endpoint
    apiEndpoint(endpoint) {
        return `${this.API_URL}${endpoint}`;
    },

    // Get token from localStorage
    getToken() {
        return localStorage.getItem('pae_token');
    },

    // Get headers for API requests
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }
};

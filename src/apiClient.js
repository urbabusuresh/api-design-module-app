/**
 * ============================================================
 *  apiClient.js  –  Centralized API Middleware
 * ============================================================
 *
 *  Single source of truth for:
 *    1. Base URL resolution  (dev proxy or production /api)
 *    2. Auth-token injection (reads from localStorage / sessionStorage)
 *    3. Unified error handling & 401 auto-logout
 *    4. Convenience wrappers: get / post / put / del / postForm
 *
 *  Usage in components / api.js:
 *    import { apiClient } from './apiClient';
 *    const data = await apiClient.get('/projects');
 *    const data = await apiClient.post('/login', { username, password });
 *
 *  For WSDL / external proxy calls:
 *    import { apiClient } from './apiClient';
 *    const data = await apiClient.fetchWsdl(wsdlUrl);
 * ============================================================
 */

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------
// In DEV mode:  Vite proxy intercepts /api/* → http://localhost:6445/api/*
// In PROD mode: Express serves static build AND handles /api/* directly
//               so a plain relative '/api' just works.
//
// We only use the full absolute URL (VITE_API_URL) when it is explicitly
// set in .env – useful for pointing to a remote backend during local dev.
// ---------------------------------------------------------------------------
const resolveBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl.replace(/\/$/, ''); // strip trailing slash

    // Relative path works in both Vite-proxy (dev) and prod (same-origin)
    return '/api';
};

export const BASE_URL = resolveBaseUrl();

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
/**
 * Get the stored auth token from localStorage or sessionStorage.
 * The app stores it under the key 'token' on successful login.
 */
export const getToken = () =>
    localStorage.getItem('token') || sessionStorage.getItem('token') || null;

/**
 * Save token after login.
 * Pass `remember = true` to persist across browser restarts (localStorage).
 */
export const saveToken = (token, remember = true) => {
    if (remember) {
        localStorage.setItem('token', token);
        sessionStorage.removeItem('token');
    } else {
        sessionStorage.setItem('token', token);
        localStorage.removeItem('token');
    }
};

/** Clear token on logout */
export const clearToken = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
};

// ---------------------------------------------------------------------------
// Core fetch middleware
// ---------------------------------------------------------------------------
/**
 * Central fetch wrapper.
 *
 * @param {string}  path      - API path, e.g. '/projects' or '/proxy/wsdl?url=...'
 * @param {object}  options   - Standard fetch options (method, body, headers, ...)
 * @param {object}  extra     - Extra control flags:
 *                                rawText:   boolean  – return raw text instead of JSON
 *                                skipAuth:  boolean  – don't inject Authorization header (e.g. login)
 *                                headers:   object   – additional headers merged AFTER defaults
 *                                skipContentType: boolean – don't set Content-Type (e.g. FormData, XML)
 * @returns {Promise<any>}    - Parsed JSON (or text if rawText=true)
 * @throws  {Error}           - Throws on network failure or non-OK HTTP status
 */
export const apiFetch = async (path, options = {}, extra = {}) => {
    const {
        rawText = false,
        skipAuth = false,
        skipContentType = false,
        headers: extraHeaders = {},    // ← FIX: extra.headers now properly merged
    } = extra;

    // Build URL
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

    // Merge headers: defaults → options.headers → extra.headers (highest priority)
    const headers = {
        ...(skipContentType ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
        ...extraHeaders,               // ← FIX: extra headers now applied correctly
    };

    // Inject auth token unless caller opts out (e.g. login endpoint)
    if (!skipAuth) {
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    // Make the request
    const res = await fetch(url, { ...options, headers });

    // Handle 401 – token expired / invalid → auto-logout
    if (res.status === 401) {
        clearToken();
        // Soft redirect: dispatch a custom event so the app can show login
        window.dispatchEvent(new CustomEvent('api:unauthorized'));
        throw new Error('Session expired. Please log in again.');
    }

    // Parse body
    const body = rawText ? await res.text() : await res.json().catch(() => ({}));

    // Throw structured error so callers can display the server message
    if (!res.ok) {
        const message =
            (typeof body === 'object' && (body.error || body.message)) ||
            `Request failed: ${res.status} ${res.statusText}`;
        throw new Error(message);
    }

    return body;
};

// ---------------------------------------------------------------------------
// Convenience methods
// ---------------------------------------------------------------------------
export const apiClient = {
    /** GET /api/<path> */
    get: (path, extra) => apiFetch(path, { method: 'GET' }, extra),

    /** POST /api/<path> with JSON body */
    post: (path, body, extra) =>
        apiFetch(path, { method: 'POST', body: JSON.stringify(body) }, extra),

    /** PUT /api/<path> with JSON body */
    put: (path, body, extra) =>
        apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }, extra),

    /** DELETE /api/<path> */
    del: (path, extra) => apiFetch(path, { method: 'DELETE' }, extra),

    /** POST with FormData (file uploads, multipart) – skips JSON Content-Type */
    postForm: (path, formData, extra) =>
        apiFetch(
            path,
            { method: 'POST', body: formData, headers: {} },
            { ...extra, skipContentType: true }  // let browser set multipart boundary
        ),

    /**
     * Fetch a WSDL URL via the server-side proxy.
     * Token is automatically injected → avoids 401 on secured WSDL endpoints.
     *
     * @param {string} wsdlUrl - The remote WSDL URL to fetch & parse
     */
    fetchWsdl: (wsdlUrl) =>
        apiFetch(`/proxy/wsdl?url=${encodeURIComponent(wsdlUrl)}`),

    /**
     * Fetch a remote Swagger/OpenAPI spec via the server-side proxy (avoids CORS).
     *
     * @param {string} swaggerUrl - The remote swagger URL
     * @param {boolean} asText    - Return raw text (YAML/JSON string) if true
     */
    fetchSwagger: (swaggerUrl, asText = false) =>
        apiFetch(
            `/proxy/swagger?url=${encodeURIComponent(swaggerUrl)}`,
            { method: 'GET' },
            { rawText: asText }
        ),
};

/**
 * api.js
 * ------
 * All backend API calls go through apiClient (src/apiClient.js).
 * The base URL and auth-token injection are handled there — one place to change.
 *
 * To change the backend URL: update VITE_API_URL in .env
 * To change auth token storage: update getToken/saveToken in apiClient.js
 */
import { apiClient, saveToken, clearToken } from './apiClient';

export const api = {

    // ── PROJECTS ──────────────────────────────────────────────────────────
    getProjects: () => apiClient.get('/projects'),

    getProject: (id) => apiClient.get(`/projects/${id}`),

    createProject: (data) => apiClient.post('/projects', data),

    deleteProject: (id) => apiClient.del(`/projects/${id}`),

    updateProjectSettings: (id, settings) =>
        apiClient.put(`/projects/${id}`, { settings }),

    updateProjectVariables: (id, variables) =>
        apiClient.put(`/projects/${id}/variables`, { variables }),

    // ── SYSTEMS ───────────────────────────────────────────────────────────
    createSystem: (projectId, name) =>
        apiClient.post('/systems', { projectId, name }),

    updateSystem: (id, name) =>
        apiClient.put(`/systems/${id}`, { name }),

    deleteSystem: (id) => apiClient.del(`/systems/${id}`),

    // ── ROOT APIS (Services) ──────────────────────────────────────────────
    createRootApi: (data) => apiClient.post('/root-apis', data),

    // ── SUB APIS ──────────────────────────────────────────────────────────
    saveSubApi: (data) => apiClient.post('/sub-apis', data),

    saveDesignMetadata: (apiId, designMetadata) =>
        apiClient.put(`/sub-apis/${apiId}/design-metadata`, { designMetadata }),

    // ── AUTH / USERS ──────────────────────────────────────────────────────
    /**
     * Login – intentionally skips auth header (we don't have a token yet).
     * Saves the returned token automatically.
     */
    login: async (username, password) => {
        const data = await apiClient.post(
            '/login',
            { username, password },
            { skipAuth: true }   // no token yet
        );
        if (data.token) saveToken(data.token);
        return data;
    },

    logout: () => clearToken(),

    createUser: (data) => apiClient.post('/users', data),

    getUsers: () => apiClient.get('/users'),

    updatePassword: (username, newPassword) =>
        apiClient.put(`/users/${username}/password`, { newPassword }),

    updateUser: (id, data) => apiClient.put(`/users/${id}`, data),

    // ── MODULES ───────────────────────────────────────────────────────────
    createModule: (data) => apiClient.post('/modules', data),

    updateModule: (id, data) => apiClient.put(`/modules/${id}`, data),

    deleteModule: (id) => apiClient.del(`/modules/${id}`),

    getModuleApis: (moduleId) => apiClient.get(`/modules/${moduleId}/apis`),

    addModuleApis: (moduleId, apis) =>
        apiClient.post(`/modules/${moduleId}/apis`, apis),

    updateModuleApi: (id, data) => apiClient.put(`/modules/apis/${id}`, data),

    deleteModuleApi: (id) => apiClient.del(`/modules/apis/${id}`),

    // ── TEST ENDPOINT ─────────────────────────────────────────────────────
    testEndpoint: (data, projectId) =>
        apiClient.post('/test-endpoint', data, {
            // Merge extra header without losing token
            headers: { 'X-Project-Id': projectId }
        }),

    // ── AUTH PROFILES ─────────────────────────────────────────────────────
    getAuthProfiles: (projectId) =>
        apiClient.get(`/projects/${projectId}/auth-profiles`),

    createAuthProfile: (projectId, data) =>
        apiClient.post(`/projects/${projectId}/auth-profiles`, data),

    deleteAuthProfile: (id) => apiClient.del(`/auth-profiles/${id}`),

    updateAuthProfile: (id, data) => apiClient.put(`/auth-profiles/${id}`, data),

    // ── TEST LOGS ─────────────────────────────────────────────────────────
    getTestLogs: (projectId, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiClient.get(`/projects/${projectId}/test-logs${query ? `?${query}` : ''}`);
    },

    // ── LLD EXPORT ────────────────────────────────────────────────────────
    getLLDExport: (projectId) => apiClient.get(`/projects/${projectId}/lld-export`),

    // ── PROXY (WSDL / SWAGGER) ────────────────────────────────────────────
    /** Fetch & parse a remote WSDL via the backend proxy (token auto-injected) */
    fetchWsdl: (wsdlUrl) => apiClient.fetchWsdl(wsdlUrl),

    /** Fetch a remote Swagger/OpenAPI spec via the backend proxy (avoids CORS) */
    fetchProxySwagger: (url) => apiClient.fetchSwagger(url, true),

    // ── WSO2 ──────────────────────────────────────────────────────────────
    publishToWso2: (apiId) => apiClient.post('/wso2/publish', { apiId }),

    importWso2Project: () => apiClient.post('/wso2/import', {}),

    createWso2Project: (data) => apiClient.post('/wso2/project', data),

    getWso2ProjectApis: (projectId) =>
        apiClient.get(`/wso2/project/${projectId}/apis`),

    getWso2ApiSwagger: (projectId, wso2ApiId) =>
        apiClient.get(`/wso2/project/${projectId}/apis/${wso2ApiId}/swagger`),

    getWso2ApiLifecycle: (projectId, wso2ApiId) =>
        apiClient.get(`/wso2/project/${projectId}/apis/${wso2ApiId}/lifecycle`),

    changeWso2ApiLifecycle: (projectId, wso2ApiId, action) =>
        apiClient.post(`/wso2/project/${projectId}/apis/${wso2ApiId}/lifecycle`, { action }),

    getWso2ApiSubscriptions: (projectId, wso2ApiId) =>
        apiClient.get(`/wso2/project/${projectId}/apis/${wso2ApiId}/subscriptions`),

    getWso2SubscriptionPolicies: (projectId) =>
        apiClient.get(`/wso2/project/${projectId}/subscription-policies`),

    getWso2Applications: (projectId) =>
        apiClient.get(`/wso2/project/${projectId}/applications`),

    createWso2Application: (projectId, data) =>
        apiClient.post(`/wso2/project/${projectId}/applications`, data),

    generateWso2ApplicationKeys: (projectId, appId, keyType) =>
        apiClient.post(`/wso2/project/${projectId}/applications/${appId}/keys`, { keyType }),

    subscribeToWso2Api: (projectId, data) =>
        apiClient.post(`/wso2/project/${projectId}/subscriptions`, data),

    getWso2ApiProducts: (projectId) =>
        apiClient.get(`/wso2/project/${projectId}/api-products`),

    createWso2ApiProduct: (projectId, data) =>
        apiClient.post(`/wso2/project/${projectId}/api-products`, data),

    getWso2ApiProduct: (projectId, productId) =>
        apiClient.get(`/wso2/project/${projectId}/api-products/${productId}`),

    getWso2ApiDocuments: (projectId, apiId) =>
        apiClient.get(`/wso2/project/${projectId}/apis/${apiId}/documents`),

    getWso2ApiDocumentContent: (projectId, apiId, docId) =>
        apiClient.get(
            `/wso2/project/${projectId}/apis/${apiId}/documents/${docId}/content`,
            { rawText: true }
        ),

    addWso2ApiDocument: (projectId, apiId, data) =>
        apiClient.post(`/wso2/project/${projectId}/apis/${apiId}/documents`, data),

    getWso2ThrottlingPolicies: (projectId, level) =>
        apiClient.get(`/wso2/project/${projectId}/throttling-policies/${level}`),

    getWso2MediationPolicies: (projectId, apiId) =>
        apiClient.get(`/wso2/project/${projectId}/apis/${apiId}/mediation-policies`),

    getWso2ClientCertificates: (projectId, apiId) =>
        apiClient.get(`/wso2/project/${projectId}/apis/${apiId}/client-certificates`),

    getWso2EndpointCertificates: (projectId, apiId) =>
        apiClient.get(`/wso2/project/${projectId}/apis/${apiId}/endpoint-certificates`),

    getWso2LifecycleHistory: (projectId, apiId) =>
        apiClient.get(`/wso2/project/${projectId}/apis/${apiId}/lifecycle-history`),

    smartLaunchWso2Api: (projectId, apiId) =>
        apiClient.post(`/wso2/project/${projectId}/smart-launch`, { apiId }),

    promoteWso2Api: (projectId, wso2ApiId, targetProjectId) =>
        apiClient.post(`/wso2/project/${projectId}/promote-api`, { wso2ApiId, targetProjectId }),
};

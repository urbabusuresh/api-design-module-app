const API_URL = 'http://localhost:3001/api';

export const api = {
    getProjects: async () => {
        const res = await fetch(`${API_URL}/projects`);
        return res.json();
    },
    getProject: async (id) => {
        const res = await fetch(`${API_URL}/projects/${id}`);
        if (!res.ok) throw new Error('Failed to load project');
        return res.json();
    },
    createProject: async (data) => {
        const res = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    deleteProject: async (id) => {
        const res = await fetch(`${API_URL}/projects/${id}`, {
            method: 'DELETE'
        });
        return res.json();
    },
    updateProjectSettings: async (id, settings) => {
        const res = await fetch(`${API_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings })
        });
        return res.json();
    },
    createSystem: async (projectId, name) => {
        const res = await fetch(`${API_URL}/systems`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, name })
        });
        return res.json();
    },
    createRootApi: async (data) => {
        const res = await fetch(`${API_URL}/root-apis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    saveSubApi: async (data) => {
        const res = await fetch(`${API_URL}/sub-apis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    login: async (username, password) => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('Invalid credentials');
        return res.json();
    },
    createUser: async (data) => {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    // --- MODULES ---
    createModule: async (data) => {
        const res = await fetch(`${API_URL}/modules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    updateModule: async (id, data) => {
        const res = await fetch(`${API_URL}/modules/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    getModuleApis: async (moduleId) => {
        const res = await fetch(`${API_URL}/modules/${moduleId}/apis`);
        return res.json();
    },
    addModuleApis: async (moduleId, apis) => {
        const res = await fetch(`${API_URL}/modules/${moduleId}/apis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apis)
        });
        return res.json();
    },
    updateModuleApi: async (id, data) => {
        const res = await fetch(`${API_URL}/modules/apis/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    deleteModuleApi: async (id) => {
        const res = await fetch(`${API_URL}/modules/apis/${id}`, {
            method: 'DELETE'
        });
        return res.json();
    },
    testEndpoint: async (data, projectId) => {
        const res = await fetch(`${API_URL}/test-endpoint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Project-Id': projectId
            },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    getAuthProfiles: async (projectId) => {
        const res = await fetch(`${API_URL}/projects/${projectId}/auth-profiles`);
        return res.json();
    },
    createAuthProfile: async (projectId, data) => {
        const res = await fetch(`${API_URL}/projects/${projectId}/auth-profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    deleteAuthProfile: async (id) => {
        const res = await fetch(`${API_URL}/auth-profiles/${id}`, {
            method: 'DELETE'
        });
        return res.json();
    },
    getTestLogs: async (projectId) => {
        const res = await fetch(`${API_URL}/projects/${projectId}/test-logs`);
        return res.json();
    },
    publishToWso2: async (apiId) => {
        const res = await fetch(`${API_URL}/wso2/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiId })
        });
        return res.json();
    },
    importWso2Project: async () => {
        const res = await fetch(`${API_URL}/wso2/import`, { method: 'POST' });
        return res.json();
    },
    createWso2Project: async (data) => {
        const res = await fetch(`${API_URL}/wso2/project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    getWso2ProjectApis: async (projectId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis`);
        return res.json();
    },
    getWso2ApiSwagger: async (projectId, wso2ApiId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis/${wso2ApiId}/swagger`);
        if (!res.ok) throw new Error("Failed to fetch Swagger");
        return res.json();
    },
    getWso2ApiLifecycle: async (projectId, wso2ApiId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis/${wso2ApiId}/lifecycle`);
        if (!res.ok) throw new Error("Failed to fetch lifecycle");
        return res.json();
    },
    changeWso2ApiLifecycle: async (projectId, wso2ApiId, action) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis/${wso2ApiId}/lifecycle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        if (!res.ok) throw new Error("Failed to change lifecycle");
        return res.json();
    },
    getWso2ApiSubscriptions: async (projectId, wso2ApiId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis/${wso2ApiId}/subscriptions`);
        if (!res.ok) throw new Error("Failed to fetch subscriptions");
        return res.json();
    },
    getWso2SubscriptionPolicies: async (projectId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/subscription-policies`);
        if (!res.ok) throw new Error("Failed to fetch policies");
        return res.json();
    },
    // Applications
    getWso2Applications: async (projectId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/applications`);
        if (!res.ok) throw new Error("Failed to fetch applications");
        return res.json();
    },
    createWso2Application: async (projectId, data) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to create application");
        return res.json();
    },
    generateWso2ApplicationKeys: async (projectId, appId, keyType) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/applications/${appId}/keys`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyType })
        });
        if (!res.ok) throw new Error("Failed to generate keys");
        return res.json();
    },
    subscribeToWso2Api: async (projectId, data) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/subscriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to subscribe");
        return res.json();
    },
    // API Products
    getWso2ApiProducts: async (projectId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/api-products`);
        if (!res.ok) throw new Error("Failed to fetch API products");
        return res.json();
    },
    createWso2ApiProduct: async (projectId, data) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/api-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to create API product");
        return res.json();
    },
    getWso2ApiProduct: async (projectId, productId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/api-products/${productId}`);
        if (!res.ok) throw new Error("Failed to fetch API product");
        return res.json();
    },
    // Documentation
    getWso2ApiDocuments: async (projectId, apiId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis/${apiId}/documents`);
        if (!res.ok) throw new Error("Failed to fetch documents");
        return res.json();
    },
    getWso2ApiDocumentContent: async (projectId, apiId, docId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis/${apiId}/documents/${docId}/content`);
        if (!res.ok) throw new Error("Failed to fetch document content");
        return res.text();
    },
    addWso2ApiDocument: async (projectId, apiId, data) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis/${apiId}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Failed to add document");
        return res.json();
    },
    // Policies
    getWso2ThrottlingPolicies: async (projectId, level) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/throttling-policies/${level}`);
        if (!res.ok) throw new Error("Failed to fetch throttling policies");
        return res.json();
    },
    getWso2MediationPolicies: async (projectId, apiId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis/${apiId}/mediation-policies`);
        if (!res.ok) throw new Error("Failed to fetch mediation policies");
        return res.json();
    },
    // Certificates
    getWso2ClientCertificates: async (projectId, apiId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis/${apiId}/client-certificates`);
        if (!res.ok) throw new Error("Failed to fetch client certificates");
        return res.json();
    },
    getWso2EndpointCertificates: async (projectId, apiId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis/${apiId}/endpoint-certificates`);
        if (!res.ok) throw new Error("Failed to fetch endpoint certificates");
        return res.json();
    },
    // Lifecycle History
    getWso2LifecycleHistory: async (projectId, apiId) => {
        const res = await fetch(`${API_URL}/wso2/project/${projectId}/apis/${apiId}/lifecycle-history`);
        if (!res.ok) throw new Error("Failed to fetch lifecycle history");
        return res.json();
    }
};

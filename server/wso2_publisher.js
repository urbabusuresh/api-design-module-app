// Disable TLS/SSL verification for WSO2 localhost self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const path = require('path');

// WSO2 Configuration (Can be moved to env variables)
const WSO2_CONFIG = {
    baseUrl: process.env.WSO2_BASE_URL || 'https://localhost:9443',
    username: process.env.WSO2_USERNAME || 'admin',
    password: process.env.WSO2_PASSWORD || 'admin',
    dcrEndpoint: process.env.WSO2_DCR_ENDPOINT || '/client-registration/v0.17/register',
    tokenEndpoint: process.env.WSO2_TOKEN_ENDPOINT || '/oauth2/token',
    publisherApiUrl: process.env.WSO2_PUBLISHER_API_URL || '/api/am/publisher/v4'
};


// Cache for Client Credentials
let dcrCache = {
    clientId: null,
    clientSecret: null
};

// Helper: Base64 Encode
const base64Encode = (str) => Buffer.from(str).toString('base64');

// Config Check Helper
const isSameConfig = (cfg1, cfg2) => cfg1.baseUrl === cfg2.baseUrl && cfg1.username === cfg2.username;

let currentConfig = null;

// Helper: Merge and Sanitize Config
const getSanitizedConfig = (config) => {
    const cfg = { ...WSO2_CONFIG, ...config };

    // Auto-fix URL scheme
    if (cfg.baseUrl && !cfg.baseUrl.startsWith('http')) {
        cfg.baseUrl = 'https://' + cfg.baseUrl;
    }
    if (cfg.baseUrl && cfg.baseUrl.includes(':9443') && cfg.baseUrl.startsWith('http:')) {
        cfg.baseUrl = cfg.baseUrl.replace('http:', 'https:');
    }
    return cfg;
};

async function registerClient(config = {}) {
    const cfg = getSanitizedConfig(config);

    console.log(`[WSO2] Registering Client for: ${cfg.baseUrl} as ${cfg.username}`);

    // Reset cache if config changes
    if (!currentConfig || !isSameConfig(currentConfig, cfg)) {
        console.log("WSO2 Config Changed. Resetting DCR Cache.");
        dcrCache = { clientId: null, clientSecret: null };
        currentConfig = cfg;
    }

    if (dcrCache.clientId) return dcrCache;

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.dcrEndpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${base64Encode(`${cfg.username}:${cfg.password}`)}`
            },
            body: JSON.stringify({
                callbackUrl: "www.google.lk",
                clientName: "raptr_dashboard_publisher_" + Date.now(),
                owner: cfg.username || "admin",
                grantType: "client_credentials password refresh_token",
                saasApp: true
            }),
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`DCR Failed: ${response.status} ${txt}`);
        }

        const data = await response.json();
        dcrCache.clientId = data.clientId;
        dcrCache.clientSecret = data.clientSecret;
        return dcrCache;
    } catch (error) {
        console.error("Error in Register Client:", error);
        throw error;
    }
}

async function getAccessToken(config = {}) {
    const cfg = getSanitizedConfig(config);
    const caps = await registerClient(cfg);

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('username', cfg.username);
        params.append('password', cfg.password);
        params.append('scope', 'apim:api_create apim:api_publish apim:api_view apim:api_delete'); // Essential scopes

        const response = await fetch(`${cfg.baseUrl}${cfg.tokenEndpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${base64Encode(`${caps.clientId}:${caps.clientSecret}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params,
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Token Gen Failed: ${response.status} ${txt}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Error in Get Token:", error);
        throw error;
    }
}

async function publishApiToWso2(apiData, downstreamUrl) {
    const token = await getAccessToken();

    // 1. Construct Payload
    // Sanitizing name and context
    const apiName = apiData.api_name.replace(/[^a-zA-Z0-9]/g, '');
    const context = `/${apiName.toLowerCase()}`;
    const version = apiData.api_version || '1.0.0';

    // Default Payload Structure
    const payload = {
        name: apiName,
        context: context,
        version: version,
        description: apiData.description || "Created via Raptr Admin Dashboard",
        provider: "admin",
        lifeCycleStatus: "CREATED",
        responseCachingEnabled: false,
        isDefaultVersion: false,
        type: "HTTP",
        transport: ["http", "https"],
        policies: ["Unlimited"],
        securityScheme: ["oauth2"],
        visibility: "PUBLIC",
        businessInformation: {
            businessOwner: "RaptrUser",
            businessOwnerEmail: "raptr@example.com"
        },
        endpointConfig: {
            endpoint_type: "http",
            sandbox_endpoints: {
                url: downstreamUrl || "http://localhost:8080/mock"
            },
            production_endpoints: {
                url: downstreamUrl || "http://localhost:8080/mock"
            }
        },
        operations: []
    };

    // Add Operation (Method + Resource)
    // Assuming the DB stores the full URL path like '/v1/users/{id}'
    // We need to match this to what WSO2 expects.
    // If apiData.url is '/v1/users/{id}', we use that as target.

    let target = apiData.url || "/*";
    // Ensure target starts with /
    if (!target.startsWith('/')) target = '/' + target;

    payload.operations.push({
        target: target,
        verb: apiData.http_method || "GET",
        authType: "Application & Application User",
        throttlingPolicy: "Unlimited"
    });

    console.log("Creating API with payload:", JSON.stringify(payload, null, 2));

    // 2. Call Create API
    try {
        const createResp = await fetch(`${WSO2_CONFIG.baseUrl}${WSO2_CONFIG.publisherApiUrl}/apis`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
        });

        if (!createResp.ok) {
            // Check if it already exists
            if (createResp.status === 409) {
                console.log("API already exists. Trying to find it...");
                // Handle Update logic here if needed, for now just return error
                throw new Error("API Already Exists");
            }
            const txt = await createResp.text();
            throw new Error(`Create API Failed: ${createResp.status} ${txt}`);
        }

        const createdApi = await createResp.json();
        const apiId = createdApi.id;
        console.log(`API Created successfully. ID: ${apiId}`);

        // 3. Publish API (Change Lifecycle)
        // action=Publish
        const lifecycleUrl = `${WSO2_CONFIG.baseUrl}${WSO2_CONFIG.publisherApiUrl}/apis/change-lifecycle?apiId=${apiId}&action=Publish`;

        const pubResp = await fetch(lifecycleUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        if (!pubResp.ok) {
            const txt = await pubResp.text();
            console.warn(`Lifecycle Change Failed: ${pubResp.status} ${txt}`);
            // We don't throw here, as creation was successful
            return { wso2Id: apiId, status: 'Created (Publish Failed)', details: txt };
        }

        return { wso2Id: apiId, status: 'Published', context: context };

    } catch (error) {
        console.error("Error in WSO2 Publish:", error);
        throw error;
    }
}



// Helper: Normalize URL into { base, path }
const normalizeUrl = (rawUrl) => {
    try {
        if (!rawUrl) return { base: 'http://localhost:8080', path: '/*' };
        let urlStr = rawUrl.trim();
        if (!urlStr.startsWith('http')) urlStr = 'http://' + urlStr;
        const url = new URL(urlStr);
        return {
            base: `${url.protocol}//${url.host}`,
            path: url.pathname === '/' ? '/*' : url.pathname
        };
    } catch (e) {
        return { base: 'http://localhost:8080', path: '/*' };
    }
};

async function listApisFromWso2(config = {}) {
    const cfg = getSanitizedConfig(config);
    // ensure we clear cache if switching contexts in a real app, but for now reuse
    const token = await getAccessToken(cfg);
    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis?limit=50`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`List APIs Failed: ${response.status} ${txt}`);
        }

        const data = await response.json();
        const apiList = data.list || [];

        // ENHANCEMENT: Fetch detailed info (operations) for each API
        // This is needed because the list endpoint doesn't return operations/endpoints
        console.log(`[WSO2] Fetching details for ${apiList.length} APIs...`);

        const detailedApis = await Promise.all(apiList.map(async (api) => {
            try {
                const detailResp = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${api.id}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (detailResp.ok) {
                    const fullDetails = await detailResp.json();
                    // Merge operations and endpointConfig into the api object
                    return {
                        ...api,
                        operations: fullDetails.operations || [],
                        endpointConfig: fullDetails.endpointConfig,
                        type: fullDetails.type
                    };
                }
                return api;
            } catch (ignore) {
                console.warn(`Failed to fetch details for API ${api.name}`, ignore);
                return api;
            }
        }));

        return detailedApis;
    } catch (error) {
        console.error("Error in List APIs:", error);
        throw error;
    }
}

async function getApiDetails(apiId, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get API Details Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching details for API ${apiId}:`, error);
        throw error;
    }
}

async function updateApiDetails(apiId, apiPayload, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Update API Details Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error updating details for API ${apiId}:`, error);
        throw error;
    }
}

async function getApiSwaggerFromWso2(apiId, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}/swagger`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get Swagger Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching Swagger for API ${apiId}:`, error);
        throw error;
    }
}

async function updateApiSwagger(apiId, swaggerContent, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const formData = new FormData();
        const content = typeof swaggerContent === 'string' ? swaggerContent : JSON.stringify(swaggerContent);

        // WSO2 V4 PUT /swagger expects multipart/form-data with "apiDefinition"
        // In Node 21+, FormData and Blob are available globally.
        formData.append('apiDefinition', new Blob([content], { type: 'application/json' }));

        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}/swagger`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
                // Note: Content-Type is set automatically by fetch when body is FormData
            },
            body: formData
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Update Swagger Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error updating Swagger for API ${apiId}:`, error);
        throw error;
    }
}

// Get API Lifecycle State
async function getApiLifecycleState(apiId, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}/lifecycle-state`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get Lifecycle Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching lifecycle for API ${apiId}:`, error);
        throw error;
    }
}

// Change API Lifecycle State
async function changeApiLifecycleState(apiId, action, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/change-lifecycle?apiId=${apiId}&action=${action}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Lifecycle Change Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error changing lifecycle for API ${apiId}:`, error);
        throw error;
    }
}

// Get Subscriptions for an API
async function getApiSubscriptions(apiId, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/subscriptions?apiId=${apiId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get Subscriptions Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching subscriptions for API ${apiId}:`, error);
        throw error;
    }
}

// Get Subscription Policies
async function getSubscriptionPolicies(config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/subscription-policies`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get Policies Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching subscription policies:', error);
        throw error;
    }
}



// ============ APPLICATIONS ============

async function listApplications(config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/applications`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`List Applications Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error listing applications:', error);
        throw error;
    }
}

async function createApplication(appData, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/applications`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appData)
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Create Application Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating application:', error);
        throw error;
    }
}

async function generateApplicationKeys(applicationId, keyType, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/applications/${applicationId}/generate-keys`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ keyType }) // PRODUCTION or SANDBOX
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Generate Keys Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error generating keys:', error);
        throw error;
    }
}

async function subscribeToApi(subscriptionData, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/subscriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscriptionData)
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Subscribe Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error subscribing to API:', error);
        throw error;
    }
}

// ============ API PRODUCTS ============

async function listApiProducts(config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/api-products`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`List API Products Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error listing API products:', error);
        throw error;
    }
}

async function createApiProduct(productData, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/api-products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Create API Product Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating API product:', error);
        throw error;
    }
}

async function getApiProductById(productId, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/api-products/${productId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get API Product Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching API product ${productId}:`, error);
        throw error;
    }
}

// ============ DOCUMENTATION ============

async function getApiDocumentation(apiId, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}/documents`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get Documentation Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching documentation for API ${apiId}:`, error);
        throw error;
    }
}

async function getDocumentContent(apiId, documentId, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}/documents/${documentId}/content`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get Document Content Failed: ${response.status} ${txt}`);
        }

        return await response.text();
    } catch (error) {
        console.error(`Error fetching document content:`, error);
        throw error;
    }
}

async function addApiDocumentation(apiId, docData, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}/documents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(docData)
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Add Documentation Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error adding documentation:', error);
        throw error;
    }
}

// ============ POLICIES ============

async function getThrottlingPolicies(policyLevel, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/throttling-policies/${policyLevel}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get Throttling Policies Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${policyLevel} policies:`, error);
        throw error;
    }
}

async function getMediationPolicies(apiId, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}/mediation-policies`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get Mediation Policies Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching mediation policies:', error);
        throw error;
    }
}

// ============ CERTIFICATES ============

async function getClientCertificates(apiId, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}/client-certificates`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get Client Certificates Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching client certificates:', error);
        throw error;
    }
}

async function getEndpointCertificates(apiId, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}/endpoint-certificates`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get Endpoint Certificates Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching endpoint certificates:', error);
        throw error;
    }
}

// ============ LIFECYCLE HISTORY ============

async function getLifecycleHistory(apiId, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        const response = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${apiId}/lifecycle-history`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Get Lifecycle History Failed: ${response.status} ${txt}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching lifecycle history:', error);
        throw error;
    }
}

// ============ SMART LAUNCH ============
// Creates API, adds default documentation, applies standard policy, then publishes.
async function smartLaunch(apiData, downstreamUrl, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    // 1. Create the API
    const rawName = apiData.name || apiData.api_name || 'UnnamedAPI';
    const apiName = rawName.replace(/[^a-zA-Z0-9]/g, '');
    if (!apiName) throw new Error('Smart Launch: API name is empty after sanitization; please use alphanumeric characters.');

    const version = apiData.version || apiData.api_version || '1.0.0';
    const contextPart = apiName.toLowerCase();
    const context = `/${contextPart}/${version.replace(/\./g, '_')}`;

    // 2. Prepare Endpoint Config
    // Use the first endpoint or fallback to identify a base URL
    const { base: targetBase } = normalizeUrl(downstreamUrl);

    // 3. Prepare Operations
    // WSO2 expects 'target' to be the resource path only (e.g. /users)
    const operations = apiData.endpoints && apiData.endpoints.length > 0
        ? apiData.endpoints.map(ep => ({
            target: normalizeUrl(ep.url).path,
            verb: (ep.http_method || 'GET').toUpperCase(),
            authType: 'Application & Application User',
            throttlingPolicy: 'Unlimited'
        }))
        : [{
            target: normalizeUrl(apiData.url).path,
            verb: (apiData.http_method || 'GET').toUpperCase(),
            authType: 'Application & Application User',
            throttlingPolicy: 'Unlimited'
        }];

    const payload = {
        name: apiName,
        context: context.startsWith('/') ? context : '/' + context,
        version,
        description: apiData.description || 'Created via Smart Launch (RaptrDXP)',
        provider: cfg.username || 'admin',
        lifeCycleStatus: 'CREATED',
        responseCachingEnabled: false,
        isDefaultVersion: false,
        type: 'HTTP',
        transport: ['http', 'https'],
        policies: ['Unlimited'],
        securityScheme: ['oauth2'],
        visibility: 'PUBLIC',
        endpointConfig: {
            endpoint_type: 'http',
            sandbox_endpoints: { url: targetBase },
            production_endpoints: { url: targetBase }
        },
        operations
    };

    console.log(`[WSO2] Smart Launch Payload:`, JSON.stringify(payload, null, 2));

    const createResp = await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!createResp.ok) {
        const txt = await createResp.text();
        throw new Error(`Smart Launch - Create Failed: ${createResp.status} ${txt}`);
    }
    const createdApi = await createResp.json();
    const wso2ApiId = createdApi.id;

    // 1.5 UPDATE SWAGGER (OAS) DEFINITION
    // WSO2 Post /apis doesn't always generate paths in the OAS from the operations array.
    // We explicitly set the paths in the OAS definition.
    try {
        console.log(`[WSO2] Fetching initial Swagger for ${wso2ApiId}...`);
        const swagger = await getApiSwaggerFromWso2(wso2ApiId, config);

        // Ensure paths object exists
        if (!swagger.paths) swagger.paths = {};

        // If we have bundled endpoints (Service level), add them to paths
        if (apiData.endpoints && apiData.endpoints.length > 0) {
            apiData.endpoints.forEach(ep => {
                const epInfo = normalizeUrl(ep.url);
                const path = epInfo.path.startsWith('/') ? epInfo.path : '/' + epInfo.path;
                const verb = (ep.http_method || 'GET').toLowerCase();

                if (!swagger.paths[path]) swagger.paths[path] = {};
                swagger.paths[path][verb] = {
                    responses: { "200": { description: "OK" } },
                    "x-auth-type": "Application & Application User",
                    "x-throttling-tier": "Unlimited"
                };
            });
        } else {
            // Individual endpoint level
            const epInfo = normalizeUrl(apiData.url);
            const path = epInfo.path.startsWith('/') ? epInfo.path : '/' + epInfo.path;
            const verb = (apiData.http_method || 'GET').toLowerCase();

            if (!swagger.paths[path]) swagger.paths[path] = {};
            swagger.paths[path][verb] = {
                responses: { "200": { description: "OK" } },
                "x-auth-type": "Application & Application User",
                "x-throttling-tier": "Unlimited"
            };
        }

        console.log(`[WSO2] Updating Swagger definition with ${Object.keys(swagger.paths).length} paths...`);
        await updateApiSwagger(wso2ApiId, swagger, config);
    } catch (swErr) {
        console.warn(`[WSO2] Swagger update failed (non-fatal):`, swErr.message);
    }

    // 2. Add default documentation
    try {
        await fetch(`${cfg.baseUrl}${cfg.publisherApiUrl}/apis/${wso2ApiId}/documents`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Overview',
                type: 'HOWTO',
                summary: `Auto-generated documentation for ${apiName} ${version}`,
                sourceType: 'INLINE',
                visibility: 'API_LEVEL',
                inlineContent: `## ${apiName}\n\n${apiData.description || 'API created via RaptrDXP Smart Launch.'}\n\n**Version:** ${version}\n**Endpoint:** ${downstreamUrl}`
            })
        });
    } catch (docErr) {
        console.warn('[SmartLaunch] Doc creation failed (non-fatal):', docErr.message);
    }

    // 3. Publish the API
    const pubResp = await fetch(
        `${cfg.baseUrl}${cfg.publisherApiUrl}/apis/change-lifecycle?apiId=${wso2ApiId}&action=Publish`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }
    );
    const publishStatus = pubResp.ok ? 'Published' : 'Created (Publish Failed)';

    return { wso2Id: wso2ApiId, status: publishStatus, context };
}

// ============ APPEND TO EXISTING API ============

async function appendToExistingWso2Api(wso2ApiId, apiData, config = {}) {
    const cfg = getSanitizedConfig(config);
    const token = await getAccessToken(cfg);

    try {
        // 1. Fetch current API metadata to update its functional "Operations" model
        console.log(`[WSO2] Fetching API details for ${wso2ApiId}...`);
        const api = await getApiDetails(wso2ApiId, config);

        // 2. Normalize and prepare new operation
        const epInfo = normalizeUrl(apiData.url);
        const path = epInfo.path.startsWith('/') ? epInfo.path : '/' + epInfo.path;
        const verb = (apiData.http_method || 'GET').toUpperCase();

        // 3. Update the internal operations model (functional resources)
        if (!api.operations) api.operations = [];

        // Check if operation already exists to avoid duplicates
        const exists = api.operations.some(op => op.target === path && op.verb === verb);
        if (!exists) {
            console.log(`[WSO2] Adding operation ${verb} ${path} to API functional model...`);
            api.operations.push({
                target: path,
                verb: verb,
                authType: 'Application & Application User',
                throttlingPolicy: 'Unlimited'
            });

            // PUT the updated API metadata (essential for Gateway resources)
            // Strip immutable system fields
            // eslint-disable-next-line no-unused-vars
            const { id, createdTime, lastUpdatedTime, lifeCycleStatus, ...updatePayload } = api;
            await updateApiDetails(wso2ApiId, updatePayload, config);
        } else {
            console.log(`[WSO2] Operation ${verb} ${path} already exists in API functional model.`);
        }

        // 4. Update the Swagger (OAS) definition (documentation & console)
        console.log(`[WSO2] Fetching Swagger for ${wso2ApiId} to sync documentation...`);
        const swagger = await getApiSwaggerFromWso2(wso2ApiId, config);
        if (!swagger.paths) swagger.paths = {};

        const lowVerb = verb.toLowerCase();
        if (!swagger.paths[path]) swagger.paths[path] = {};
        swagger.paths[path][lowVerb] = {
            responses: { "200": { description: "OK" } },
            "x-auth-type": "Application & Application User",
            "x-throttling-tier": "Unlimited"
        };

        await updateApiSwagger(wso2ApiId, swagger, config);

        // 5. Trigger a Lifestyle "Publish" action to ensure the new resource is deployed to the Gateway
        if (api.lifeCycleStatus === 'PUBLISHED' || api.lifeCycleStatus === 'DEPRECATED') {
            console.log(`[WSO2] Re-publishing API ${wso2ApiId} to sync gateway resources...`);
            await fetch(
                `${cfg.baseUrl}${cfg.publisherApiUrl}/apis/change-lifecycle?apiId=${wso2ApiId}&action=Publish`,
                { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }
            );
        }

        return { success: true, wso2Id: wso2ApiId, status: 'Updated' };
    } catch (error) {
        console.error(`[WSO2] Append failed for API ${wso2ApiId}:`, error);
        throw error;
    }
}

// ============ ENVIRONMENT PROMOTION ============
// Reads an API's swagger from the source WSO2 and recreates it in the target WSO2.
async function promoteApiToEnv(wso2ApiId, sourceConfig, targetConfig) {
    const srcCfg = getSanitizedConfig(sourceConfig);
    const tgtCfg = getSanitizedConfig(targetConfig);

    // 1. Fetch full API details from source
    const srcToken = await getAccessToken(srcCfg);
    const detailResp = await fetch(`${srcCfg.baseUrl}${srcCfg.publisherApiUrl}/apis/${wso2ApiId}`, {
        headers: { 'Authorization': `Bearer ${srcToken}` }
    });
    if (!detailResp.ok) throw new Error(`Promote: Failed to fetch source API details (${detailResp.status})`);
    const srcApi = await detailResp.json();

    // Strip source-specific fields (id, timestamps, lifecycle) before recreating in target environment
    // eslint-disable-next-line no-unused-vars
    const { id: _sourceId, createdTime, lastUpdatedTime, lifeCycleStatus, ...apiPayload } = srcApi;
    apiPayload.lifeCycleStatus = 'CREATED';
    apiPayload.provider = tgtCfg.username || 'admin';

    // 2. Recreate API in target environment
    const tgtToken = await getAccessToken(tgtCfg);

    const createResp = await fetch(`${tgtCfg.baseUrl}${tgtCfg.publisherApiUrl}/apis`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tgtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
    });
    if (!createResp.ok) {
        const txt = await createResp.text();
        // 409 = already exists, treat as success
        if (createResp.status !== 409) throw new Error(`Promote: Target create failed (${createResp.status}) ${txt}`);
        return { status: 'AlreadyExists', targetEnv: tgtCfg.baseUrl };
    }
    const promoted = await createResp.json();

    // 3. Publish in target
    await fetch(
        `${tgtCfg.baseUrl}${tgtCfg.publisherApiUrl}/apis/change-lifecycle?apiId=${promoted.id}&action=Publish`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${tgtToken}` } }
    );

    return { status: 'Promoted', targetApiId: promoted.id, targetEnv: tgtCfg.baseUrl };
}

module.exports = {
    publishApiToWso2,
    getApiDetails,
    updateApiDetails,
    listApisFromWso2,
    getApiSwaggerFromWso2,
    updateApiSwagger,
    getApiLifecycleState,
    changeApiLifecycleState,
    getApiSubscriptions,
    getSubscriptionPolicies,
    listApplications,
    createApplication,
    generateApplicationKeys,
    subscribeToApi,
    listApiProducts,
    createApiProduct,
    getApiProductById,
    getApiDocumentation,
    getDocumentContent,
    addApiDocumentation,
    getThrottlingPolicies,
    getMediationPolicies,
    getClientCertificates,
    getEndpointCertificates,
    getLifecycleHistory,
    smartLaunch,
    promoteApiToEnv,
    appendToExistingWso2Api
};




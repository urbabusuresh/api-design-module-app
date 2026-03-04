// WSO2 Additional Routes - Applications, Products, Documentation, Policies

module.exports = (app, pool, wso2Functions) => {
    const {
        listApplications, createApplication, generateApplicationKeys, subscribeToApi,
        listApiProducts, createApiProduct, getApiProductById,
        getApiDocumentation, getDocumentContent, addApiDocumentation,
        getThrottlingPolicies, getMediationPolicies,
        getClientCertificates, getEndpointCertificates, getLifecycleHistory
    } = wso2Functions;

    // ============ APPLICATIONS ============

    app.get('/api/wso2/project/:id/applications', async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const applications = await listApplications(config);
            res.json(applications);
        } catch (err) {
            console.error("WSO2 Applications Fetch Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/wso2/project/:id/applications', async (req, res) => {
        const { id } = req.params;
        const appData = req.body;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const result = await createApplication(appData, config);
            res.json(result);
        } catch (err) {
            console.error("WSO2 Application Create Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/wso2/project/:id/applications/:appId/keys', async (req, res) => {
        const { id, appId } = req.params;
        const { keyType } = req.body; // PRODUCTION or SANDBOX
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const keys = await generateApplicationKeys(appId, keyType, config);
            res.json(keys);
        } catch (err) {
            console.error("WSO2 Generate Keys Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/wso2/project/:id/subscriptions', async (req, res) => {
        const { id } = req.params;
        const subscriptionData = req.body;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const result = await subscribeToApi(subscriptionData, config);
            res.json(result);
        } catch (err) {
            console.error("WSO2 Subscribe Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // ============ API PRODUCTS ============

    app.get('/api/wso2/project/:id/api-products', async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const products = await listApiProducts(config);
            res.json(products);
        } catch (err) {
            console.error("WSO2 API Products Fetch Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/wso2/project/:id/api-products', async (req, res) => {
        const { id } = req.params;
        const productData = req.body;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const result = await createApiProduct(productData, config);
            res.json(result);
        } catch (err) {
            console.error("WSO2 API Product Create Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/wso2/project/:id/api-products/:productId', async (req, res) => {
        const { id, productId } = req.params;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const product = await getApiProductById(productId, config);
            res.json(product);
        } catch (err) {
            console.error("WSO2 API Product Fetch Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // ============ DOCUMENTATION ============

    app.get('/api/wso2/project/:id/apis/:apiId/documents', async (req, res) => {
        const { id, apiId } = req.params;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const docs = await getApiDocumentation(apiId, config);
            res.json(docs);
        } catch (err) {
            console.error("WSO2 Documentation Fetch Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/wso2/project/:id/apis/:apiId/documents/:docId/content', async (req, res) => {
        const { id, apiId, docId } = req.params;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const content = await getDocumentContent(apiId, docId, config);
            res.send(content);
        } catch (err) {
            console.error("WSO2 Document Content Fetch Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/wso2/project/:id/apis/:apiId/documents', async (req, res) => {
        const { id, apiId } = req.params;
        const docData = req.body;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const result = await addApiDocumentation(apiId, docData, config);
            res.json(result);
        } catch (err) {
            console.error("WSO2 Add Documentation Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // ============ POLICIES ============

    app.get('/api/wso2/project/:id/throttling-policies/:level', async (req, res) => {
        const { id, level } = req.params;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const policies = await getThrottlingPolicies(level, config);
            res.json(policies);
        } catch (err) {
            console.error("WSO2 Throttling Policies Fetch Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/wso2/project/:id/apis/:apiId/mediation-policies', async (req, res) => {
        const { id, apiId } = req.params;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const policies = await getMediationPolicies(apiId, config);
            res.json(policies);
        } catch (err) {
            console.error("WSO2 Mediation Policies Fetch Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // ============ CERTIFICATES ============

    app.get('/api/wso2/project/:id/apis/:apiId/client-certificates', async (req, res) => {
        const { id, apiId } = req.params;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const certs = await getClientCertificates(apiId, config);
            res.json(certs);
        } catch (err) {
            console.error("WSO2 Client Certificates Fetch Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/wso2/project/:id/apis/:apiId/endpoint-certificates', async (req, res) => {
        const { id, apiId } = req.params;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            const certs = await getEndpointCertificates(apiId, config);
            res.json(certs);
        } catch (err) {
            console.error("WSO2 Endpoint Certificates Fetch Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // ============ LIFECYCLE HISTORY ============

    app.get('/api/wso2/project/:id/apis/:apiId/lifecycle-history', async (req, res) => {
        const { id, apiId } = req.params;
        try {
            const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

            let config = rows[0].connection_details;
            if (typeof config === 'string') config = JSON.parse(config);

            try {
                const history = await getLifecycleHistory(apiId, config);
                res.json(history);
            } catch (wso2Err) {
                // WSO2 lifecycle-history may not be available for all API types/versions
                // Return empty history instead of crashing the UI
                console.warn(`WSO2 lifecycle-history not available for ${apiId}:`, wso2Err.message);
                res.json({ list: [], count: 0 });
            }
        } catch (err) {
            console.error("WSO2 Lifecycle History Fetch Error:", err);
            res.status(500).json({ error: err.message });
        }
    });
};


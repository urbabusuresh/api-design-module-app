const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const {
    publishApiToWso2, listApisFromWso2, getApiSwaggerFromWso2,
    getApiLifecycleState, changeApiLifecycleState, getApiSubscriptions, getSubscriptionPolicies,
    listApplications, createApplication, generateApplicationKeys, subscribeToApi,
    listApiProducts, createApiProduct, getApiProductById,
    getApiDocumentation, getDocumentContent, addApiDocumentation,
    getThrottlingPolicies, getMediationPolicies,
    getClientCertificates, getEndpointCertificates, getLifecycleHistory
} = require('./wso2_publisher');


const app = express();
app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    multipleStatements: true
};

let pool;

async function initDb() {
    try {
        // Create connection without DB selected to create DB if not exists
        const connection = await mysql.createConnection(dbConfig);
        await connection.query(`CREATE DATABASE IF NOT EXISTS raptr_dxp_db`);
        await connection.end();

        // Create pool with DB
        pool = mysql.createPool({ ...dbConfig, database: 'raptr_dxp_db' });

        console.log('Connected to MySQL. Initializing Schema...');
        const schema = fs.readFileSync(path.join(__dirname, 'schema_final.sql'), 'utf8');
        await pool.query(schema);
        console.log('Database Initialized.');

        // --- AUTO SEED ---
        const [projRows] = await pool.query('SELECT id FROM projects LIMIT 1');
        if (projRows.length === 0) {
            console.log('Seeding Sample Data...');
            const projId = 'proj_sample_01';
            await pool.query('INSERT INTO projects (id, name, description) VALUES (?, ?, ?)',
                [projId, 'RaptrDXP Demo', 'A sample project to demonstrate capabilities.']);

            // Add LOVs
            const lovs = [
                [projId, 'CATEGORY', 'Core', '', 0],
                [projId, 'CATEGORY', 'Payment', '', 1],
                [projId, 'NB_CHANNEL', 'Web Portal', '', 0],
                [projId, 'SB_CHANNEL', 'Legacy CRM', '', 0]
            ];
            await pool.query('INSERT INTO project_lov (project_id, type, value, description, display_order) VALUES ?', [lovs]);

            // Add System/Service
            const sysId = 'sys_sample_01';
            await pool.query('INSERT INTO systems (id, project_id, name) VALUES (?, ?, ?)', [sysId, projId, 'Core Banking']);

            const svcId = 'svc_sample_01';
            await pool.query('INSERT INTO services (id, system_id, name, version, description) VALUES (?, ?, ?, ?, ?)',
                [svcId, sysId, 'Account Service', 'v1', 'Handles user accounts']);

            // Add API
            const apiId = 'api_sample_01';
            await pool.query('INSERT INTO api_catalog (id, service_id, api_name, url, http_method, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [apiId, svcId, 'Get User Profile', '/v1/users/{id}', 'GET', 'Active', 'Fetches user details']);

            console.log('Sample Data Seeded.');
        }

        // Seed Users
        const SEED_USERS = [
            { username: 'admin', password: 'password123', role: 'admin' },
            { username: 'viewer', password: 'viewer123', role: 'viewer' }
        ];
        for (const u of SEED_USERS) {
            const [uRows] = await pool.query('SELECT id FROM users WHERE username = ?', [u.username]);
            if (uRows.length === 0) {
                const uid = `usr_${Date.now()}_${Math.floor(Math.random() * 100)}`;
                await pool.query('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)', [uid, u.username, u.password, u.role]);
            }
        }
        // --- SCHEMA MIGRATION: ADD STATUS COLUMNS IF MISSING ---
        const ensureColumn = async (table, colName, colDef) => {
            try {
                const [cols] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE '${colName}'`);
                if (cols.length === 0) {
                    console.log(`Migrating table ${table}: Adding ${colName} column...`);
                    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`);
                }
            } catch (e) {
                console.warn(`Migration check failed for ${table}.${colName}:`, e.message);
            }
        };
        await ensureColumn('projects', 'status', "VARCHAR(50) DEFAULT 'Active'");
        await ensureColumn('projects', 'type', "VARCHAR(20) DEFAULT 'LOCAL'");
        await ensureColumn('projects', 'connection_details', "JSON");

        await ensureColumn('systems', 'status', "VARCHAR(50) DEFAULT 'Active'");
        await ensureColumn('services', 'status', "VARCHAR(50) DEFAULT 'Active'");
        await ensureColumn('api_catalog', 'remarks', "TEXT");
        await ensureColumn('api_catalog', 'design_metadata', "JSON");

    } catch (err) {
        console.error('Database Initialization Failed:', err);
    }
}

initDb();

// --- HELPERS ---
const generateId = (prefix) => `${prefix}_${Date.now()}`;

// Simple in-memory rate limiter (per IP, sliding window)
const rateLimitStore = new Map();
function rateLimit(maxRequests, windowMs) {
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };
        if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
        entry.count += 1;
        rateLimitStore.set(key, entry);
        if (entry.count > maxRequests) {
            return res.status(429).json({ error: 'Too many requests, please try again later.' });
        }
        next();
    };
}

// --- ROUTES ---

// Get All Projects (Summary)
app.get('/api/projects', async (req, res) => {
    try {
        // Removed 'settings' from selection as it is deprecated/dropped
        // Include Active projects and legacy ones (NULL status)
        const [rows] = await pool.query("SELECT id, name, description, status, type, connection_details, created_at FROM projects WHERE (status != 'Deleted' OR status IS NULL) ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Project
app.post('/api/projects', async (req, res) => {
    const { name, description, settings, moduleName } = req.body;
    const id = generateId('proj');
    try {
        // Insert Project
        await pool.query('INSERT INTO projects (id, name, description) VALUES (?, ?, ?)', [id, name, description]);

        // Insert Settings into LOV
        if (settings) {
            const values = [];
            const add = (type, list) => {
                if (Array.isArray(list)) list.forEach((val, idx) =>
                    // ID removed for Auto Inc
                    values.push([id, type, val, '', idx])
                );
            };
            add('CATEGORY', settings.categories);
            add('NB_CHANNEL', settings.channels?.northbound);
            add('SB_CHANNEL', settings.channels?.southbound);
            add('MARKET_SEGMENT', settings.marketSegments);

            if (values.length > 0) {
                // ID removed from column list
                await pool.query('INSERT INTO project_lov (project_id, type, value, description, display_order) VALUES ?', [values]);
            }
        }

        // Create initial Module if provided
        if (moduleName) {
            const moduleId = generateId('mod');
            await pool.query('INSERT INTO project_modules (id, project_id, name, status) VALUES (?, ?, ?, ?)',
                [moduleId, id, moduleName, 'Active']);
        }

        res.json({ id, name, description, settings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Soft Delete Project
app.delete('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Mark Project as Deleted
        await conn.query("UPDATE projects SET status = 'Deleted' WHERE id = ?", [id]);

        // 2. Mark Systems as Deleted
        // (Note: project_modules also needs delete, but sticking to core flow first)
        await conn.query("UPDATE systems SET status = 'Deleted' WHERE project_id = ?", [id]);

        // 3. Mark Services as Deleted
        await conn.query(`
            UPDATE services s
            JOIN systems sys ON s.system_id = sys.id
            SET s.status = 'Deleted'
            WHERE sys.project_id = ?
        `, [id]);

        // 4. Mark APIs as Deleted
        await conn.query(`
            UPDATE api_catalog a
            JOIN services s ON a.service_id = s.id
            JOIN systems sys ON s.system_id = sys.id
            SET a.status = 'Deleted'
            WHERE sys.project_id = ?
        `, [id]);

        await conn.commit();
        res.json({ success: true, message: 'Project and all related data marked as Deleted' });

    } catch (err) {
        await conn.rollback();
        console.error("Delete Project Failed:", err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

// Get Full Project Details (Tree Structure)
app.get('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
        if (projects.length === 0) return res.status(404).json({ error: 'Project not found' });

        const project = projects[0];
        project.settings = typeof project.settings === 'string' ? JSON.parse(project.settings) : project.settings;

        // Fetch Systems
        const [systems] = await pool.query('SELECT * FROM systems WHERE project_id = ?', [id]);

        // Fetch Services (Root APIs)
        const systemIds = systems.map(s => s.id);
        let services = [];
        if (systemIds.length > 0) {
            [services] = await pool.query('SELECT * FROM services WHERE system_id IN (?)', [systemIds]);
        }

        // Fetch LOVs for Project Settings
        const [lovs] = await pool.query('SELECT type, value FROM project_lov WHERE project_id = ? ORDER BY display_order', [id]);

        // Fetch Modules
        const [modules] = await pool.query('SELECT * FROM project_modules WHERE project_id = ? ORDER BY created_at DESC', [id]);
        project.modules = modules;

        // Reconstruct settings object for frontend compatibility
        project.settings = {
            categories: lovs.filter(l => l.type === 'CATEGORY').map(l => l.value),
            channels: {
                northbound: lovs.filter(l => l.type === 'NB_CHANNEL').map(l => l.value),
                southbound: lovs.filter(l => l.type === 'SB_CHANNEL').map(l => l.value)
            }
        };

        // Fetch Auth Profiles
        const [authProfiles] = await pool.query('SELECT * FROM project_authentications WHERE project_id = ?', [id]);
        project.authProfiles = authProfiles.map(a => ({
            ...a,
            details: typeof a.details === 'string' ? JSON.parse(a.details) : a.details
        }));

        // Fetch APIs (Sub APIs) from Flat Table
        const serviceIds = services.map(s => s.id);
        let apis = [];
        if (serviceIds.length > 0) {
            // Include api_dependencies to populate downstream more accurately if needed
            // For now, simple fetch
            [apis] = await pool.query('SELECT * FROM api_catalog WHERE service_id IN (?)', [serviceIds]);

            // Fetch Dependencies
            const apiIds = apis.map(a => a.id);
            let dependencies = [];
            if (apiIds.length > 0) {
                const [deps] = await pool.query(`
                    SELECT d.*, c.api_name, c.url, c.http_method, c.provider_system 
                    FROM api_dependencies d 
                    JOIN api_catalog c ON d.child_api_id = c.id 
                    WHERE d.parent_api_id IN (?)`, [apiIds]);
                dependencies = deps;
            }

            // Map dependencies to their parent APIs
            apis.forEach(api => {
                api._dependencies = dependencies.filter(d => d.parent_api_id === api.id);
            });
        }

        // Construct Tree
        project.systems = systems.map(sys => {
            sys.rootApis = services.filter(svc => svc.system_id === sys.id).map(svc => {
                svc.subApis = apis.filter(api => api.service_id === svc.id).map(api => {
                    // Map Database Columns to Frontend Model
                    const rawChannels = typeof api.channels === 'string' ? JSON.parse(api.channels) : api.channels;
                    const channels = rawChannels || { northbound: [], southbound: [] };

                    return {
                        id: api.id,
                        rootApiId: api.service_id,
                        name: api.api_name,
                        method: api.http_method,
                        url: api.url,
                        version: api.api_version,
                        module: api.module,
                        status: api.status,
                        description: api.description,
                        providerSystem: api.provider_system,

                        // JSON Fields
                        authentication: typeof api.authentication === 'string' ? JSON.parse(api.authentication) : (api.authentication || { type: 'None' }),
                        request: typeof api.request_body === 'string' ? JSON.parse(api.request_body) : (api.request_body || {}),
                        responses: typeof api.response_body === 'string' ? JSON.parse(api.response_body) : (api.response_body || {}),
                        headers: typeof api.headers === 'string' ? JSON.parse(api.headers) : (api.headers || []),

                        // Map legacy structures to new JSON structure for frontend compatibility
                        consumers: (channels.northbound || []).map(n => ({ name: n, type: 'Northbound' })),
                        // REPLACEMENT: Use the JOINed dependencies instead of the JSON blob for downstream
                        downstream: (api._dependencies || []).map(d => ({
                            id: d.child_api_id,
                            name: d.api_name,
                            url: d.url,
                            method: d.http_method,
                            providerSystem: d.provider_system,
                            priority: d.priority,
                            isExisting: true
                        })),
                        channels: channels,

                        // Extra Fields
                        swaggerUrl: api.swagger_url,
                        swaggerApiName: api.swagger_api_name,
                        designDoc: api.design_doc,
                        referenceLink: api.reference_link,
                        remarks: api.remarks || '',
                        designMetadata: (() => {
                            try {
                                return typeof api.design_metadata === 'string'
                                    ? JSON.parse(api.design_metadata)
                                    : (api.design_metadata || null);
                            } catch (_) {
                                return null;
                            }
                        })(),
                        createdBy: api.created_by,
                        updatedBy: api.updated_by
                    };
                });
                return svc;
            });
            return sys;
        });

        res.json(project);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Update Project Settings (Write to LOV Table)
app.put('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    const { settings } = req.body;

    // settings = { categories: [], channels: { northbound: [], southbound: [] }, marketSegments: [] }
    try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Delete existing LOVs for this project
            await connection.query('DELETE FROM project_lov WHERE project_id = ?', [id]);

            const values = [];
            const add = (type, list) => {
                if (Array.isArray(list)) {
                    list.forEach((val, idx) => {
                        values.push([
                            // REMOVED manual ID generation
                            // Schema is now AUTO_INCREMENT
                            id,
                            type,
                            val,
                            '',
                            idx
                        ]);
                    });
                }
            };

            add('CATEGORY', settings.categories);
            add('NB_CHANNEL', settings.channels?.northbound);
            add('SB_CHANNEL', settings.channels?.southbound);
            add('MARKET_SEGMENT', settings.marketSegments);
            add('ENVIRONMENT', settings.environments);

            if (values.length > 0) {
                // Removed ID from column list
                await connection.query(
                    'INSERT INTO project_lov (project_id, type, value, description, display_order) VALUES ?',
                    [values]
                );
            } else {
                // If all settings cleared, do nothing (deletion already happened)
            }

            await connection.commit();
            res.json({ success: true });
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add System
app.post('/api/systems', async (req, res) => {
    const { projectId, name } = req.body;
    const id = generateId('sys');
    try {
        await pool.query('INSERT INTO systems (id, project_id, name) VALUES (?, ?, ?)', [id, projectId, name]);
        res.json({ id, name, rootApis: [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Service (Root API)
app.post('/api/root-apis', async (req, res) => {
    const { systemId, name, version, context, description } = req.body;
    const id = generateId('svc');
    try {
        await pool.query('INSERT INTO services (id, system_id, name, version, context, description) VALUES (?, ?, ?, ?, ?, ?)',
            [id, systemId, name, version, context, description]);
        res.json({ id, name, version, context, description, subApis: [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upsert API (Flat Table)
app.post('/api/sub-apis', async (req, res) => {
    const api = req.body;
    const isNew = !api.id || api.id.toString().startsWith('temp_');
    const id = isNew ? generateId('api') : api.id;

    // Map Frontend Model to DB Columns
    const dbRecord = {
        id: id,
        service_id: api.rootApiId,
        api_name: api.name,
        api_version: api.version,
        module: api.module || api.category,
        description: api.description,
        url: api.url,
        http_method: api.method,
        status: api.status || 'Draft',

        headers: JSON.stringify(api.headers || []),
        request_body: JSON.stringify(api.request || {}),
        response_body: JSON.stringify(api.responses || []),
        authentication: JSON.stringify(api.authentication || {}),

        swagger_url: api.swaggerUrl,
        swagger_api_name: api.swaggerApiName,
        design_doc: api.designDoc,
        reference_link: api.referenceLink,
        remarks: api.remarks || null,
        design_metadata: api.designMetadata ? JSON.stringify(api.designMetadata) : null,

        // Convert frontend consumers/downstream back to channels JSON
        // FIX: Do NOT put downstream dependencies in 'southbound' channels array anymore, as we use api_dependencies table now.
        channels: JSON.stringify({
            northbound: api.consumers ? api.consumers.map(c => c.name) : [],
            southbound: [] // Legacy field, kept empty or could be used for high-level system tags if needed, but dependencies are now real.
        }),

        provider_system: api.providerSystem,
        created_by: api.createdBy || 'InitialUser',
        updated_by: 'CurrentUser'
    };

    try {
        if (isNew) {
            await pool.query('INSERT INTO api_catalog SET ?', dbRecord);
        } else {
            // Updated columns for UPDATE statement
            const { id, created_by, ...updateRecord } = dbRecord;
            await pool.query('UPDATE api_catalog SET ? WHERE id = ?', [updateRecord, id]);
        }

        // Handle Downstream Dependencies (New Logic)
        if (api.downstream) {
            await pool.query('DELETE FROM api_dependencies WHERE parent_api_id = ?', [id]);

            for (const d of api.downstream) {
                // Logic to Link or Create Downstream API
                let childApiId = d.id;

                // If the downstream is NOT an existing API (e.g. ad-hoc definition), check if we can REUSE an existing one by Name/URL
                if (!childApiId || childApiId.toString().startsWith('temp_') || !d.isExisting) {

                    // 1. Try to find existing API by name AND provider system (or just name if unique enough)
                    const [existing] = await pool.query('SELECT id FROM api_catalog WHERE api_name = ? AND (provider_system = ? OR url = ?)', [d.name, d.providerSystem || d.name, d.url]);

                    if (existing.length > 0) {
                        childApiId = existing[0].id;
                    } else {
                        // 2. Create new if not found
                        const newChildId = generateId('api_ds');
                        await pool.query('INSERT INTO api_catalog (id, api_name, api_version, url, http_method, description, provider_system, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            [newChildId, d.name, 'v1', d.url, d.method || 'GET', d.description, d.providerSystem || d.name, 'Active']
                        );
                        childApiId = newChildId;
                    }
                }

                // Insert Dependency
                await pool.query('INSERT INTO api_dependencies (id, parent_api_id, child_api_id, priority, type) VALUES (?, ?, ?, ?, ?)',
                    [generateId('dep'), id, childApiId, d.priority || 1, 'Direct']
                );
            }
        }


        res.json({ ...api, id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Update Design Metadata for an API endpoint (NB→SB field mapping)
app.put('/api/sub-apis/:id/design-metadata', rateLimit(30, 60 * 1000), async (req, res) => {
    const { id } = req.params;
    const { designMetadata } = req.body;
    try {
        await pool.query('UPDATE api_catalog SET design_metadata = ? WHERE id = ?',
            [JSON.stringify(designMetadata), id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LLD Export: Generate structured Low-Level Design document for a project
app.get('/api/projects/:id/lld-export', rateLimit(10, 60 * 1000), async (req, res) => {
    const { id } = req.params;
    try {
        const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
        if (projects.length === 0) return res.status(404).json({ error: 'Project not found' });
        const project = projects[0];

        const [systems] = await pool.query("SELECT * FROM systems WHERE project_id = ? AND (status != 'Deleted' OR status IS NULL)", [id]);
        const systemIds = systems.map(s => s.id);

        let services = [];
        if (systemIds.length > 0) {
            [services] = await pool.query("SELECT * FROM services WHERE system_id IN (?) AND (status != 'Deleted' OR status IS NULL)", [systemIds]);
        }
        const serviceIds = services.map(s => s.id);

        let apis = [];
        if (serviceIds.length > 0) {
            [apis] = await pool.query('SELECT * FROM api_catalog WHERE service_id IN (?)', [serviceIds]);
            const apiIds = apis.map(a => a.id);
            if (apiIds.length > 0) {
                const [deps] = await pool.query(`
                    SELECT d.*, c.api_name, c.url, c.http_method, c.provider_system
                    FROM api_dependencies d
                    JOIN api_catalog c ON d.child_api_id = c.id
                    WHERE d.parent_api_id IN (?)`, [apiIds]);
                apis.forEach(api => { api._dependencies = deps.filter(d => d.parent_api_id === api.id); });
            }
        }

        // Build LLD Document
        const lld = {
            document_type: 'LLD_API_SPEC',
            generated_at: new Date().toISOString(),
            project: { id: project.id, name: project.name, description: project.description },
            summary: {
                total_systems: systems.length,
                total_services: services.length,
                total_apis: apis.length
            },
            systems: systems.map(sys => ({
                id: sys.id,
                name: sys.name,
                status: sys.status,
                services: services.filter(svc => svc.system_id === sys.id).map(svc => ({
                    id: svc.id,
                    name: svc.name,
                    version: svc.version,
                    description: svc.description,
                    status: svc.status,
                    apis: apis.filter(api => api.service_id === svc.id).map(api => {
                        const rawChannels = typeof api.channels === 'string' ? JSON.parse(api.channels) : (api.channels || {});
                        const nbChannels = rawChannels.northbound || [];
                        const downstream = (api._dependencies || []).map(d => ({
                            name: d.api_name,
                            url: d.url,
                            method: d.http_method,
                            provider_system: d.provider_system,
                            priority: d.priority
                        }));
                        return {
                            id: api.id,
                            name: api.api_name,
                            version: api.api_version,
                            method: api.http_method,
                            url: api.url,
                            status: api.status,
                            module: api.module,
                            description: api.description,
                            remarks: api.remarks || '',
                            swagger_url: api.swagger_url,
                            design_doc: api.design_doc,
                            reference_link: api.reference_link,
                            nb_channels: nbChannels,
                            sb_downstream: downstream,
                            mapping_summary: nbChannels.length > 0 || downstream.length > 0
                                ? `${nbChannels.join(', ') || 'N/A'} → [${api.api_name}] → ${downstream.map(d => d.provider_system || d.name).join(', ') || 'N/A'}`
                                : null
                        };
                    })
                }))
            })),
            nb_sb_mapping_matrix: (() => {
                const matrix = [];
                apis.forEach(api => {
                    const rawChannels = typeof api.channels === 'string' ? JSON.parse(api.channels) : (api.channels || {});
                    const nbChannels = rawChannels.northbound || [];
                    const downstream = (api._dependencies || []).map(d => ({
                        name: d.api_name,
                        provider_system: d.provider_system
                    }));
                    if (nbChannels.length > 0 || downstream.length > 0) {
                        matrix.push({
                            api_name: api.api_name,
                            method: api.http_method,
                            url: api.url,
                            northbound_consumers: nbChannels,
                            southbound_providers: downstream.map(d => d.provider_system || d.name).filter(Boolean),
                            downstream_apis: downstream.map(d => d.name)
                        });
                    }
                });
                return matrix;
            })()
        };

        res.json(lld);
    } catch (err) {
        console.error('LLD Export Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Expose API to WSO2
app.post('/api/wso2/publish', async (req, res) => {
    const { apiId } = req.body;
    try {
        // 1. Fetch API Details
        const [apis] = await pool.query('SELECT * FROM api_catalog WHERE id = ?', [apiId]);
        if (apis.length === 0) return res.status(404).json({ error: 'API not found' });
        const apiData = apis[0];

        // 2. Fetch Downstream Endpoint
        // We pick the first direct dependency as the primary backend
        const [deps] = await pool.query(`
            SELECT c.url 
            FROM api_dependencies d
            JOIN api_catalog c ON d.child_api_id = c.id
            WHERE d.parent_api_id = ? AND d.type = 'Direct'
            ORDER BY d.priority ASC
            LIMIT 1
        `, [apiId]);

        const downstreamUrl = deps.length > 0 ? deps[0].url : 'http://localhost:8080/mock'; // Default if no DS

        // 3. Call WSO2 Logic
        const result = await publishApiToWso2(apiData, downstreamUrl);

        // 4. Update Local Status
        await pool.query('UPDATE api_catalog SET status = ? WHERE id = ?', ['Published', apiId]);

        res.json({ success: true, ...result });

    } catch (err) {
        console.error("WSO2 Publish Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Smart Launch: create API, add default docs, apply standard policy, and publish in one step
app.post('/api/wso2/project/:id/smart-launch', rateLimit(5, 60 * 1000), async (req, res) => {
    const { id } = req.params;
    const { apiId } = req.body;
    try {
        const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
        let config = rows[0].connection_details;
        if (typeof config === 'string') config = JSON.parse(config);

        const [apis] = await pool.query('SELECT * FROM api_catalog WHERE id = ?', [apiId]);
        if (apis.length === 0) return res.status(404).json({ error: 'API not found' });
        const apiData = apis[0];

        const [deps] = await pool.query(
            `SELECT c.url FROM api_dependencies d JOIN api_catalog c ON d.child_api_id = c.id WHERE d.parent_api_id = ? AND d.type = 'Direct' ORDER BY d.priority ASC LIMIT 1`,
            [apiId]
        );
        const downstreamUrl = deps.length > 0 ? deps[0].url : 'http://localhost:8080/mock';

        const { smartLaunch } = require('./wso2_publisher');
        const result = await smartLaunch(apiData, downstreamUrl, config);
        await pool.query("UPDATE api_catalog SET status = 'Published' WHERE id = ?", [apiId]);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("Smart Launch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Promote API: sync an API from one WSO2 environment to another
app.post('/api/wso2/project/:id/promote-api', rateLimit(5, 60 * 1000), async (req, res) => {
    const { id } = req.params;
    const { wso2ApiId, targetProjectId } = req.body;
    try {
        const [srcRows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
        if (srcRows.length === 0) return res.status(404).json({ error: 'Source project not found' });
        let srcConfig = srcRows[0].connection_details;
        if (typeof srcConfig === 'string') srcConfig = JSON.parse(srcConfig);

        const [tgtRows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [targetProjectId]);
        if (tgtRows.length === 0) return res.status(404).json({ error: 'Target project not found' });
        let tgtConfig = tgtRows[0].connection_details;
        if (typeof tgtConfig === 'string') tgtConfig = JSON.parse(tgtConfig);

        const { promoteApiToEnv } = require('./wso2_publisher');
        const result = await promoteApiToEnv(wso2ApiId, srcConfig, tgtConfig);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("Promote API Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Import APIs from WSO2
app.post('/api/wso2/import', async (req, res) => {
    try {
        console.log("Starting WSO2 Import...");

        // 1. Ensure Target Project Exists & IS ACTIVE
        const projid = 'proj_wso2_import';
        const [pRows] = await pool.query('SELECT id FROM projects WHERE id = ?', [projid]);
        if (pRows.length === 0) {
            await pool.query('INSERT INTO projects (id, name, description, status) VALUES (?, ?, ?, ?)',
                [projid, 'WSO2 Gateway APIs', 'APIs imported directly from WSO2 API Manager', 'Active']);
        } else {
            await pool.query("UPDATE projects SET status = 'Active' WHERE id = ?", [projid]);
        }

        // 2. Ensure System Exists & IS ACTIVE
        const sysid = 'sys_wso2_default';
        const [sRows] = await pool.query('SELECT id FROM systems WHERE id = ?', [sysid]);
        if (sRows.length === 0) {
            await pool.query('INSERT INTO systems (id, project_id, name, status) VALUES (?, ?, ?, ?)',
                [sysid, projid, 'WSO2 APIM', 'Active']);
        } else {
            await pool.query("UPDATE systems SET status = 'Active' WHERE id = ?", [sysid]);
        }

        // 3. Ensure Service Exists & IS ACTIVE
        const svcid = 'svc_wso2_imported';
        const [svcRows] = await pool.query('SELECT id FROM services WHERE id = ?', [svcid]);
        if (svcRows.length === 0) {
            await pool.query('INSERT INTO services (id, system_id, name, version, description, status) VALUES (?, ?, ?, ?, ?, ?)',
                [svcid, sysid, 'Imported Services', 'v1', 'Aggregated APIs from WSO2', 'Active']);
        } else {
            await pool.query("UPDATE services SET status = 'Active' WHERE id = ?", [svcid]);
        }

        // 4. Fetch APIs from WSO2
        const wso2Apis = await listApisFromWso2();
        console.log(`Fetched ${wso2Apis.length} APIs from WSO2`);

        let count = 0;
        for (const api of wso2Apis) {
            const apiId = `api_wso2_${api.id}`;
            const [exRows] = await pool.query('SELECT id FROM api_catalog WHERE id = ?', [apiId]);

            // Map WSO2 Data to Local Schema
            // context often includes version, but we stick to context as 'url'
            const apiName = api.name;
            const url = api.context;
            const method = 'GET'; // WSO2 list doesn't give method, default to GET or placeholder
            const status = api.lifeCycleStatus === 'PUBLISHED' ? 'Published' : 'Draft';
            const desc = api.description || 'Imported from WSO2';

            if (exRows.length === 0) {
                await pool.query(
                    'INSERT INTO api_catalog (id, service_id, api_name, url, http_method, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [apiId, svcid, apiName, url, method, status, desc]
                );
                count++;
            } else {
                await pool.query(
                    'UPDATE api_catalog SET api_name=?, url=?, status=?, description=? WHERE id=?',
                    [apiName, url, status, desc, apiId]
                );
            }
        }

        res.json({ success: true, imported: count, total: wso2Apis.length, projectId: projid });

    } catch (err) {
        console.error("WSO2 Import Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Create Remote WSO2 Project (Store Metadata Only)
app.post('/api/wso2/project', async (req, res) => {
    const { name, url, env, username, password } = req.body;
    const id = generateId('proj_wso2');

    try {
        const connectionDetails = JSON.stringify({
            baseUrl: url,
            env: env,
            username: username || 'admin', // Default or user provided
            password: password || 'admin',
            dcrEndpoint: '/client-registration/v0.17/register',
            tokenEndpoint: '/oauth2/token',
            publisherApiUrl: '/api/am/publisher/v4'
        });

        await pool.query(
            'INSERT INTO projects (id, name, description, status, type, connection_details) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, `Remote WSO2 Workspace (${env})`, 'Active', 'WSO2_REMOTE', connectionDetails]
        );

        res.json({ success: true, id, name });
    } catch (err) {
        console.error('Create WSO2 Project Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Proxy: Get APIs for a WSO2 Project (Dynamic Fetch)
app.get('/api/wso2/project/:id/apis', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Get Project Connection Details
        const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        let config = rows[0].connection_details;
        if (typeof config === 'string') config = JSON.parse(config);

        // 2. Fetch from WSO2
        const apis = await listApisFromWso2(config);

        // 3. Transform to Dashboard Format (Mocking Service/System structure)
        // We pretend these belong to a "WSO2 System" -> "Default Service"
        // This is purely for frontend visual compatibility

        let mappedApis = [];

        apis.forEach(api => {
            if (api.operations && api.operations.length > 0) {
                // Create an entry per operation (endpoint)
                api.operations.forEach((op, index) => {
                    mappedApis.push({
                        id: `${api.id}_op_${index}`, // Unique ID for React
                        api_name: `${api.name} - ${op.verb} ${op.target}`,
                        url: (api.context + op.target).replace('//', '/'), // Full path
                        http_method: op.verb,
                        version: api.version,
                        status: api.lifeCycleStatus,
                        description: api.description,
                        // Add WSO2 specific meta
                        wso2_id: api.id,
                        provider: api.provider,
                        endpoint_config: api.endpointConfig,
                        api_type: api.type
                    });
                });
            } else {
                // Fallback for API with no operations
                mappedApis.push({
                    id: api.id,
                    api_name: api.name,
                    url: api.context, // Main identifier
                    http_method: 'GET', // Default
                    version: api.version,
                    status: api.lifeCycleStatus,
                    description: api.description,
                    // Add WSO2 specific meta
                    wso2_id: api.id,
                    provider: api.provider,
                    endpoint_config: api.endpointConfig,
                    api_type: api.type
                });
            }
        });

        res.json(mappedApis);

    } catch (err) {
        console.error('WSO2 Proxy Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Proxy: Get Swagger for a Specific WSO2 API
app.get('/api/wso2/project/:id/apis/:apiId/swagger', async (req, res) => {
    const { id, apiId } = req.params;
    try {
        // 1. Get Project Connection Details
        const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        let config = rows[0].connection_details;
        if (typeof config === 'string') config = JSON.parse(config);

        // 2. Fetch Swagger from WSO2
        const swagger = await getApiSwaggerFromWso2(apiId, config);

        res.json(swagger);
    } catch (err) {
        console.error("WSO2 Swagger Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get API Lifecycle State
app.get('/api/wso2/project/:id/apis/:apiId/lifecycle', async (req, res) => {
    const { id, apiId } = req.params;
    try {
        const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        let config = rows[0].connection_details;
        if (typeof config === 'string') config = JSON.parse(config);

        const lifecycle = await getApiLifecycleState(apiId, config);
        res.json(lifecycle);
    } catch (err) {
        console.error("WSO2 Lifecycle Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Change API Lifecycle State
app.post('/api/wso2/project/:id/apis/:apiId/lifecycle', async (req, res) => {
    const { id, apiId } = req.params;
    const { action } = req.body;
    try {
        const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        let config = rows[0].connection_details;
        if (typeof config === 'string') config = JSON.parse(config);

        const result = await changeApiLifecycleState(apiId, action, config);
        res.json(result);
    } catch (err) {
        console.error("WSO2 Lifecycle Change Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get API Subscriptions
app.get('/api/wso2/project/:id/apis/:apiId/subscriptions', async (req, res) => {
    const { id, apiId } = req.params;
    try {
        const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        let config = rows[0].connection_details;
        if (typeof config === 'string') config = JSON.parse(config);

        const subscriptions = await getApiSubscriptions(apiId, config);
        res.json(subscriptions);
    } catch (err) {
        console.error("WSO2 Subscriptions Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get Subscription Policies
app.get('/api/wso2/project/:id/subscription-policies', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT connection_details FROM projects WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        let config = rows[0].connection_details;
        if (typeof config === 'string') config = JSON.parse(config);

        const policies = await getSubscriptionPolicies(config);
        res.json(policies);
    } catch (err) {
        console.error("WSO2 Policies Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Load additional WSO2 routes
require('./wso2_routes')(app, pool, {
    listApplications, createApplication, generateApplicationKeys, subscribeToApi,
    listApiProducts, createApiProduct, getApiProductById,
    getApiDocumentation, getDocumentContent, addApiDocumentation,
    getThrottlingPolicies, getMediationPolicies,
    getClientCertificates, getEndpointCertificates, getLifecycleHistory
});


// --- AUTH ROUTES ---

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = users[0];
        // In real app, compare hash. Here simple check.
        if (user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });

        res.json({ id: user.id, username: user.username, role: user.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create User (Admin Only - simplified for MVP)
app.post('/api/users', async (req, res) => {
    const { username, password, role } = req.body;
    const id = generateId('usr');
    try {
        await pool.query('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
            [id, username, password, role || 'viewer']);
        res.json({ id, username, role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
// --- MODULES ---

// Create Module
app.post('/api/modules', async (req, res) => {
    const { projectId, name, description, swagger, swaggerUrl } = req.body;
    const id = generateId('mod');
    try {
        await pool.query('INSERT INTO project_modules (id, project_id, name, description, swagger_content, swagger_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, projectId, name, description, swagger, swaggerUrl, 'Active']);
        res.json({ id, projectId, name, status: 'Active' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Module (e.g. Swagger)
app.put('/api/modules/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, swagger, swaggerUrl, envUrls, status } = req.body;
    try {
        // Build dynamic update query
        const updates = [];
        const values = [];
        if (name) { updates.push('name = ?'); values.push(name); }
        if (description) { updates.push('description = ?'); values.push(description); }
        if (swagger !== undefined) { updates.push('swagger_content = ?'); values.push(swagger); }
        if (swaggerUrl !== undefined) { updates.push('swagger_url = ?'); values.push(swaggerUrl); }
        if (envUrls !== undefined) { updates.push('env_urls = ?'); values.push(JSON.stringify(envUrls)); }
        if (status) { updates.push('status = ?'); values.push(status); }

        if (updates.length > 0) {
            values.push(id);
            await pool.query(`UPDATE project_modules SET ${updates.join(', ')} WHERE id = ?`, values);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MODULE APIs ---

app.get('/api/modules/:id/apis', async (req, res) => {
    try {
        const [apis] = await pool.query('SELECT * FROM module_api_catalog WHERE module_id = ? ORDER BY api_name', [req.params.id]);
        res.json(apis);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/modules/:id/apis', async (req, res) => {
    const { id } = req.params;
    // supports single or array for bulk import
    const items = Array.isArray(req.body) ? req.body : [req.body];

    try {
        for (const item of items) {
            const apiId = generateId('mapi');
            await pool.query(
                `INSERT INTO module_api_catalog 
                (id, module_id, api_name, url, http_method, description, swagger_reference, headers, request_body, response_body, authentication, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    apiId, id, item.name, item.url, item.method, item.description, item.swaggerRef,
                    JSON.stringify(item.headers || {}),
                    JSON.stringify(item.request_body || {}),
                    JSON.stringify(item.response_body || {}),
                    JSON.stringify(item.authentication || { type: 'None' }),
                    'Active'
                ]
            );
        }
        res.json({ success: true, count: items.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/modules/apis/:id', async (req, res) => {
    const { id } = req.params;
    const api = req.body;
    try {
        await pool.query(
            `UPDATE module_api_catalog SET 
                api_name = ?, url = ?, http_method = ?, description = ?, swagger_reference = ?, 
                headers = ?, request_body = ?, response_body = ?, authentication = ?, status = ? 
            WHERE id = ?`,
            [
                api.name, api.url, api.method, api.description, api.swaggerRef,
                JSON.stringify(api.headers || {}),
                JSON.stringify(api.request_body || {}),
                JSON.stringify(api.response_body || {}),
                JSON.stringify(api.authentication || { type: 'None' }),
                api.status || 'Active',
                id
            ]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/modules/apis/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM module_api_catalog WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/test-endpoint', async (req, res) => {
    const { url, method, headers, body } = req.body;
    try {
        const start = Date.now();
        const response = await fetch(url, {
            method: method || 'GET',
            headers: headers || {},
            body: method !== 'GET' ? (typeof body === 'object' ? JSON.stringify(body) : body) : undefined
        });
        const duration = Date.now() - start;

        const responseData = await response.text();
        let parsedData;
        try {
            parsedData = JSON.parse(responseData);
        } catch (e) {
            parsedData = responseData;
        }

        const respHeaders = {};
        response.headers.forEach((v, k) => respHeaders[k] = v);

        res.json({
            status: response.status,
            statusText: response.statusText,
            headers: respHeaders,
            data: parsedData,
            duration: `${duration}ms`
        });

        // Save to Logs (Fire and forget or async)
        const projectId = req.headers['x-project-id'];
        if (projectId) {
            pool.query(
                `INSERT INTO api_test_logs 
                (id, project_id, api_id, url, method, request_headers, request_body, response_status, response_body, response_headers, duration, tested_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    generateId('log'),
                    projectId,
                    req.body.apiId || null,
                    url,
                    method || 'GET',
                    JSON.stringify(headers || {}),
                    JSON.stringify(body || {}),
                    response.status,
                    JSON.stringify(parsedData),
                    JSON.stringify(respHeaders),
                    `${duration}ms`,
                    'UI_User'
                ]
            ).catch(err => console.error("Logging failed", err));
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTH PROFILES ---
app.get('/api/projects/:id/auth-profiles', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM project_authentications WHERE project_id = ?', [req.params.id]);
        res.json(rows.map(a => ({ ...a, details: typeof a.details === 'string' ? JSON.parse(a.details) : a.details })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/projects/:id/auth-profiles', async (req, res) => {
    const { name, type, details } = req.body;
    const id = generateId('auth');
    try {
        await pool.query('INSERT INTO project_authentications (id, project_id, name, type, details) VALUES (?, ?, ?, ?, ?)',
            [id, req.params.id, name, type, JSON.stringify(details)]);
        res.json({ id, name, type, details });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/auth-profiles/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM project_authentications WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TEST LOGS ---
app.get('/api/projects/:id/test-logs', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM api_test_logs WHERE project_id = ? ORDER BY created_at DESC LIMIT 50', [req.params.id]);
        res.json(rows.map(l => ({
            ...l,
            request_headers: typeof l.request_headers === 'string' ? JSON.parse(l.request_headers) : l.request_headers,
            request_body: typeof l.request_body === 'string' ? JSON.parse(l.request_body) : l.request_body,
            response_headers: typeof l.response_headers === 'string' ? JSON.parse(l.response_headers) : l.response_headers,
            response_body: typeof l.response_body === 'string' ? JSON.parse(l.response_body) : l.response_body,
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

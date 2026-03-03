import React, { useState, useEffect } from 'react';
import {
    BookOpen, Globe, Activity, FileJson, Plus, Trash2, Key, Box, Save, X,
    FileText, Shield, CheckCircle, Code, Layers as LayersIcon, Copy, Search, AlertCircle,
    Heart, Play, FileJson2, Zap, GitCompare, Sparkles, GitBranch, List, CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { api } from '../../api';
import { AdvancedApiTester } from './AdvancedApiTester';
import { ApiHealthMonitor } from './ApiHealthMonitor';
import { CollectionRunner } from './CollectionRunner';
import { PostmanImporter } from './PostmanImporter';
import { ResponseDiffTool } from './ResponseDiffTool';
import { ApiStatusWorkflow } from './ApiStatusWorkflow';
import { MockResponseGenerator } from './MockResponseGenerator';
import ReactMarkdown from 'react-markdown';

export function ModuleViewer({ module, environments = [], selectedEnv: globalSelectedEnv, onUpdate, project }) {
    const [isEditing, setIsEditing] = useState(false);
    const [spec, setSpec] = useState(module.swagger_content || "");
    const [url, setUrl] = useState(module.swagger_url || "");
    const [envUrls, setEnvUrls] = useState(typeof module.env_urls === 'string' ? JSON.parse(module.env_urls) : module.env_urls || {});
    const [name, setName] = useState(module.name);
    const [standardHeaders, setStandardHeaders] = useState(typeof module.standard_headers === 'string' ? JSON.parse(module.standard_headers) : module.standard_headers || {});
    const [envContextApis, setEnvContextApis] = useState(typeof module.env_context_apis === 'string' ? JSON.parse(module.env_context_apis) : module.env_context_apis || {});
    const [envAuthProfiles, setEnvAuthProfiles] = useState(typeof module.env_auth_profiles === 'string' ? JSON.parse(module.env_auth_profiles) : module.env_auth_profiles || {});

    const [viewMode, setViewMode] = useState('list');
    // REMOVED local selectedEnv state to use globalSelectedEnv prop
    const selectedEnv = globalSelectedEnv || 'DEV';
    const [loadSwaggerRequested, setLoadSwaggerRequested] = useState(false);

    useEffect(() => {
        setSpec(module.swagger_content || "");
        setUrl(module.swagger_url || "");
        setEnvUrls(typeof module.env_urls === 'string' ? JSON.parse(module.env_urls) : module.env_urls || {});
        setName(module.name);
        setStandardHeaders(typeof module.standard_headers === 'string' ? JSON.parse(module.standard_headers) : module.standard_headers || {});
        setEnvContextApis(typeof module.env_context_apis === 'string' ? JSON.parse(module.env_context_apis) : module.env_context_apis || {});
        setEnvAuthProfiles(typeof module.env_auth_profiles === 'string' ? JSON.parse(module.env_auth_profiles) : module.env_auth_profiles || {});
    }, [module]);

    const handleSave = () => {
        onUpdate(module.id, { name, swagger: spec, swaggerUrl: url, envUrls, standardHeaders, envContextApis, envAuthProfiles });
        setIsEditing(false);
    };

    const currentDisplayUrl = envUrls[selectedEnv] || url;

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center space-x-3">
                    <BookOpen className="w-5 h-5 text-pink-400" />
                    {isEditing ? (
                        <input value={name} onChange={e => setName(e.target.value)} className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 text-sm font-bold outline-none focus:border-indigo-500" />
                    ) : (
                        <h2 className="text-lg font-bold text-white max-w-xl truncate">{module.name}</h2>
                    )}
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Module</span>
                </div>
                <div className="flex items-center space-x-3">
                    {!isEditing && (
                        <div className="flex bg-slate-800 rounded-lg p-0.5 mr-4">
                            <button onClick={() => setViewMode('swagger')} className={`px-3 py-1 text-xs font-bold rounded-md ${viewMode === 'swagger' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Swagger UI</button>
                            <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-xs font-bold rounded-md ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Module APIs</button>
                        </div>
                    )}

                    <button onClick={() => setIsEditing(!isEditing)} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${isEditing ? 'border-slate-700 text-slate-300' : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-500'}`}>
                        {isEditing ? 'Cancel' : 'Edit Settings'}
                    </button>
                    {isEditing && (
                        <button onClick={handleSave} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500">
                            Save Changes
                        </button>
                    )}
                </div>
            </div>

            {isEditing ? (
                <div className="flex-1 flex flex-col bg-slate-950 p-6 animate-fade-in text-white space-y-4 overflow-y-auto">
                    <div className="flex flex-col">
                        <label className="text-slate-400 text-xs font-bold uppercase mb-2">Environment URLs (Swagger)</label>
                        <div className="grid grid-cols-2 gap-4">
                            {environments.map(env => (
                                <div key={env}>
                                    <label className="text-[10px] text-indigo-400 font-bold mb-1 block">{env} — Swagger URL</label>
                                    <input
                                        value={envUrls[env] || ''}
                                        onChange={e => setEnvUrls({ ...envUrls, [env]: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-indigo-500"
                                        placeholder={`https://api-${env.toLowerCase()}.example.com/swagger.json`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col pt-4 border-t border-slate-800">
                        <label className="text-slate-400 text-xs font-bold uppercase mb-2">Context API Base URLs (per Environment)</label>
                        <p className="text-[10px] text-slate-500 mb-3">The base URL prepended to all API calls in this module when testing in each environment.</p>
                        <div className="grid grid-cols-2 gap-4">
                            {environments.map(env => (
                                <div key={env}>
                                    <label className="text-[10px] text-emerald-400 font-bold mb-1 block">{env} — Context Base URL</label>
                                    <input
                                        value={envContextApis[env] || ''}
                                        onChange={e => setEnvContextApis({ ...envContextApis, [env]: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-emerald-500"
                                        placeholder={`https://api-${env.toLowerCase()}.example.com`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col pt-4 border-t border-slate-800">
                        <label className="text-slate-400 text-xs font-bold uppercase mb-2">Auth Profile (per Environment)</label>
                        <p className="text-[10px] text-slate-500 mb-3">Tag an authentication profile to auto-apply when running tests in each environment.</p>
                        <div className="grid grid-cols-2 gap-4">
                            {environments.map(env => (
                                <div key={env}>
                                    <label className="text-[10px] text-amber-400 font-bold mb-1 block">{env} — Auth Profile</label>
                                    <select
                                        value={envAuthProfiles[env] || ''}
                                        onChange={e => setEnvAuthProfiles({ ...envAuthProfiles, [env]: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                                    >
                                        <option value="">-- No Auth Profile --</option>
                                        {(project.authProfiles || []).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col pt-4 border-t border-slate-800">
                        <label className="text-slate-400 text-xs font-bold uppercase mb-2">Default / Fallback Swagger URL</label>
                        <input
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 font-mono text-sm text-blue-400 outline-none focus:border-indigo-500"
                            placeholder="https://petstore.swagger.io/v2/swagger.json"
                        />
                    </div>

                    <div className="flex flex-col pt-4 border-t border-slate-800">
                        <label className="text-slate-400 text-xs font-bold uppercase mb-2">Module Standard Headers (JSON)</label>
                        <p className="text-[10px] text-slate-500 mb-2">These headers will be automatically applied to ALL APIs in this module during testing.</p>
                        <textarea
                            value={typeof standardHeaders === 'string' ? standardHeaders : JSON.stringify(standardHeaders, null, 4)}
                            onChange={e => {
                                try {
                                    const parsed = JSON.parse(e.target.value);
                                    setStandardHeaders(parsed);
                                } catch (err) {
                                    setStandardHeaders(e.target.value);
                                }
                            }}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-indigo-400 h-32 resize-none outline-none focus:border-indigo-500"
                            placeholder='{ "X-Channel-Id": "WEB", "X-Country-Code": "IN" }'
                        />
                    </div>

                    <div className="flex-1 flex flex-col min-h-[300px]">
                        <label className="text-slate-400 text-xs font-bold uppercase mb-2 pt-4">Start Content (JSON/YAML)</label>
                        <textarea
                            value={spec}
                            onChange={e => setSpec(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-xs text-green-400 resize-none outline-none focus:border-indigo-500"
                            placeholder='Paste your Swagger/OpenAPI spec here...'
                        />
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0 bg-white relative">
                    <div className="h-10 border-b border-slate-200 bg-slate-50 flex items-center px-4 justify-between shrink-0">
                        <div className="flex items-center space-x-2">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase">Environment:</span>
                            <span className="bg-slate-200 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase">{selectedEnv}</span>
                            <span className="text-xs text-slate-400 px-2">|</span>
                            <span className="text-xs font-mono text-slate-600 truncate max-w-md" title={currentDisplayUrl}>{currentDisplayUrl || "No URL mapped"}</span>
                        </div>
                        {viewMode === 'swagger' && currentDisplayUrl && (
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => window.open(currentDisplayUrl, '_blank')}
                                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center space-x-1"
                                >
                                    <Globe className="w-3 h-3" /> <span>Open in New Tab</span>
                                </button>
                                {!loadSwaggerRequested && (
                                    <button
                                        onClick={() => setLoadSwaggerRequested(true)}
                                        className="bg-indigo-600 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-indigo-500 transition-colors shadow-sm"
                                    >
                                        Load Swagger UI
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {viewMode === 'swagger' ? (
                        <div className="flex-1 overflow-y-auto">
                            {module.swagger_content || currentDisplayUrl ? (
                                <div className="swagger-wrapper min-h-full p-4">
                                    {loadSwaggerRequested ? (
                                        <SwaggerUI
                                            spec={module.swagger_content || undefined}
                                            url={currentDisplayUrl || undefined}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-[500px] text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl m-8">
                                            <Activity className="w-12 h-12 mb-4 opacity-20" />
                                            <p className="font-medium">Swagger UI is not loaded to save resources.</p>
                                            <p className="text-xs mt-1">Click "Load Swagger UI" in the bar above to visualize this definition.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-4">
                                    <FileJson className="w-16 h-16 opacity-20" />
                                    <p>No Swagger Definition Found for {selectedEnv}</p>
                                    <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:underline font-medium">Add Configuration</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <ModuleApiCatalog module={module} project={project} selectedEnv={selectedEnv} />
                    )}
                </div>
            )
            }
        </div >
    );
}

export function ModuleApiCatalog({ module, project, selectedEnv = 'DEV' }) {
    const [apis, setApis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApi, setSelectedApi] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [wsdlImport, setWsdlImport] = useState({ open: false, url: '', loading: false, operations: [], endpoint: '', error: '', selected: new Set() });
    const [showHealthMonitor, setShowHealthMonitor] = useState(false);
    const [showCollectionRunner, setShowCollectionRunner] = useState(false);
    const [showPostmanImporter, setShowPostmanImporter] = useState(false);
    const [showResponseDiff, setShowResponseDiff] = useState(false);
    const [showApiStatus, setShowApiStatus] = useState(null); // api item
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkSelected, setBulkSelected] = useState(new Set());
    const [bulkStatus, setBulkStatus] = useState('');

    useEffect(() => {
        loadApis();
    }, [module.id]);

    const loadApis = async () => {
        setLoading(true);
        try {
            const data = await api.getModuleApis(module.id);
            setApis(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (apiData) => {
        try {
            if (apiData.id) {
                await api.updateModuleApi(apiData.id, apiData);
            } else {
                await api.addModuleApis(module.id, apiData);
            }
            setSelectedApi(null);
            setIsCreating(false);
            loadApis();
        } catch (e) {
            toast.error("Failed to save API");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this catalog API?")) return;
        try {
            await api.deleteModuleApi(id);
            loadApis();
            toast.success("API removed from catalog");
        } catch (e) { toast.error("Delete failed"); }
    };

    const handleDuplicate = async (apiItem) => {
        const toastId = toast.loading(`Duplicating ${apiItem.api_name}...`);
        try {
            const copy = {
                name: `${apiItem.api_name} (Copy)`,
                url: apiItem.url,
                method: apiItem.http_method,
                description: apiItem.description,
                swaggerRef: apiItem.swagger_reference || "",
                headers: apiItem.headers || {},
                request_body: apiItem.request_body || {},
                response_body: apiItem.response_body || {},
                authentication: apiItem.authentication || { type: 'None' },
                isAuthApi: apiItem.is_auth_api || false
            };
            await api.addModuleApis(module.id, [copy]);
            toast.success("API duplicated successfully", { id: toastId });
            loadApis();
        } catch (err) {
            toast.error("Duplicate failed: " + err.message, { id: toastId });
        }
    };

    const handleSyncSwagger = async () => {
        let swaggerObj = null;
        const toastId = toast.loading("Fetching and parsing Swagger...");

        try {
            // 1. Get Swagger Content
            let content = module.swagger_content;
            if (module.swagger_url && !content) {
                content = await api.fetchProxySwagger(module.swagger_url);
            }

            if (!content) {
                toast.error("No swagger content or URL found to sync.", { id: toastId });
                return;
            }

            // 2. Parse (Handle JSON)
            try {
                swaggerObj = JSON.parse(content);
            } catch (e) {
                toast.error("Swagger content must be valid JSON for auto-sync.", { id: toastId });
                return;
            }

            // 3. Extract APIs
            const extractedApis = [];
            const paths = swaggerObj.paths || {};

            Object.keys(paths).forEach(path => {
                const methods = paths[path];
                Object.keys(methods).forEach(method => {
                    const op = methods[method];
                    if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
                        extractedApis.push({
                            name: op.summary || op.operationId || `${method.toUpperCase()} ${path}`,
                            url: path,
                            method: method.toUpperCase(),
                            description: op.description || op.summary || "",
                            swaggerRef: op.operationId || "",
                            headers: {}, // Can be enriched from parameters if needed
                            request_body: {}, // Can be enriched if needed
                            response_body: {},
                            authentication: { type: 'None' },
                            isAuthApi: false
                        });
                    }
                });
            });

            if (extractedApis.length === 0) {
                toast.error("No valid API endpoints found in swagger.", { id: toastId });
                return;
            }

            // 4. Save to DB
            await api.addModuleApis(module.id, extractedApis);
            toast.success(`Successfully synced ${extractedApis.length} APIs to catalog!`, { id: toastId });
            loadApis();

        } catch (err) {
            console.error("Sync Error:", err);
            toast.error(`Sync Failed: ${err.message}`, { id: toastId });
        }
    };

    const handleParseWsdl = async () => {
        if (!wsdlImport.url.trim()) return;
        setWsdlImport(prev => ({ ...prev, loading: true, error: '', operations: [], selected: new Set() }));
        try {
            const res = await fetch(`/api/proxy/wsdl?url=${encodeURIComponent(wsdlImport.url.trim())}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch WSDL');
            if (!data.operations?.length) throw new Error('No operations found in WSDL');
            setWsdlImport(prev => ({
                ...prev,
                loading: false,
                operations: data.operations,
                endpoint: data.endpoint || '',
                selected: new Set(data.operations.map((_, i) => i)) // select all by default
            }));
            toast.success(`Found ${data.operations.length} operations`);
        } catch (err) {
            setWsdlImport(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

    const handleImportSelectedWsdlOps = async () => {
        const toImport = wsdlImport.operations.filter((_, i) => wsdlImport.selected.has(i));
        if (!toImport.length) { toast.error('Select at least one operation'); return; }
        const toastId = toast.loading(`Importing ${toImport.length} SOAP operations...`);
        try {
            const apiItems = toImport.map(op => ({
                name: op.name,
                url: wsdlImport.endpoint || wsdlImport.url.replace(/\?wsdl$/i, ''),
                method: 'POST',
                description: op.description || `SOAP Operation: ${op.name}`,
                swaggerRef: op.name,
                headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': `"${op.name}"` },
                request_body: op.soapTemplate || `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Header/><soapenv:Body><${op.name}/></soapenv:Body></soapenv:Envelope>`,
                response_body: {},
                authentication: { type: 'None' },
                isAuthApi: false,
                bodyFormat: 'xml'
            }));
            await api.addModuleApis(module.id, apiItems);
            toast.success(`Imported ${apiItems.length} SOAP operations!`, { id: toastId });
            setWsdlImport({ open: false, url: '', loading: false, operations: [], endpoint: '', error: '', selected: new Set() });
            loadApis();
        } catch (err) {
            toast.error(`Import failed: ${err.message}`, { id: toastId });
        }
    };

    const toggleWsdlOp = (idx) => {
        setWsdlImport(prev => {
            const next = new Set(prev.selected);
            if (next.has(idx)) next.delete(idx); else next.add(idx);
            return { ...prev, selected: next };
        });
    };

    const handleBulkStatusUpdate = async () => {
        if (!bulkSelected.size || !bulkStatus) { toast.error('Select APIs and a status'); return; }
        const toastId = toast.loading(`Updating ${bulkSelected.size} APIs to ${bulkStatus}...`);
        try {
            await Promise.all([...bulkSelected].map(id => api.updateModuleApi(id, { status: bulkStatus })));
            toast.success(`Updated ${bulkSelected.size} APIs to ${bulkStatus}`, { id: toastId });
            setBulkSelected(new Set());
            setBulkMode(false);
            setBulkStatus('');
            loadApis();
        } catch (e) {
            toast.error('Bulk update failed: ' + e.message, { id: toastId });
        }
    };

    const handleBulkDelete = async () => {
        if (!bulkSelected.size) return;
        if (!confirm(`Delete ${bulkSelected.size} selected APIs?`)) return;
        const toastId = toast.loading(`Deleting ${bulkSelected.size} APIs...`);
        try {
            await Promise.all([...bulkSelected].map(id => api.deleteModuleApi(id)));
            toast.success(`Deleted ${bulkSelected.size} APIs`, { id: toastId });
            setBulkSelected(new Set());
            setBulkMode(false);
            loadApis();
        } catch (e) {
            toast.error('Bulk delete failed: ' + e.message, { id: toastId });
        }
    };

    const handleApiStatusTransition = async (apiItem, newStatus) => {
        try {
            await api.updateModuleApi(apiItem.id, { status: newStatus });
            loadApis();
        } catch (e) {
            toast.error('Status update failed: ' + e.message);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
            <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200 shrink-0">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">API Catalog</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Manage APIs associated with this module for downstream mapping.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter catalog..."
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                            className="bg-slate-100 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-[10px] text-slate-700 outline-none w-48 focus:border-indigo-500/50 transition-all"
                        />
                    </div>
                    <button
                        onClick={handleSyncSwagger}
                        title="Extract endpoints from Swagger definition and save to DB"
                        className="flex items-center space-x-2 px-3 py-1.5 border border-indigo-600/30 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-50 transition-all"
                    >
                        <Activity className="w-3.5 h-3.5" /> <span>Sync from Swagger</span>
                    </button>
                    <button
                        onClick={() => setWsdlImport(prev => ({ ...prev, open: true }))}
                        title="Import SOAP operations from a WSDL URL"
                        className="flex items-center space-x-2 px-3 py-1.5 border border-amber-500/30 text-amber-600 rounded-lg text-[10px] font-bold hover:bg-amber-50 transition-all"
                    >
                        <Code className="w-3.5 h-3.5" /> <span>Import WSDL</span>
                    </button>
                    <button
                        onClick={() => setShowPostmanImporter(true)}
                        title="Import from Postman Collection JSON"
                        className="flex items-center space-x-2 px-3 py-1.5 border border-orange-500/30 text-orange-600 rounded-lg text-[10px] font-bold hover:bg-orange-50 transition-all"
                    >
                        <FileJson2 className="w-3.5 h-3.5" /> <span>Postman</span>
                    </button>
                    <button
                        onClick={() => setShowHealthMonitor(true)}
                        title="Run API health check"
                        className="flex items-center space-x-2 px-3 py-1.5 border border-emerald-500/30 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-50 transition-all"
                    >
                        <Heart className="w-3.5 h-3.5" /> <span>Health</span>
                    </button>
                    <button
                        onClick={() => setShowCollectionRunner(true)}
                        title="Run all APIs as a collection"
                        className="flex items-center space-x-2 px-3 py-1.5 border border-violet-500/30 text-violet-600 rounded-lg text-[10px] font-bold hover:bg-violet-50 transition-all"
                    >
                        <Play className="w-3.5 h-3.5" /> <span>Run</span>
                    </button>
                    <button
                        onClick={() => setShowResponseDiff(true)}
                        title="Compare responses across environments"
                        className="flex items-center space-x-2 px-3 py-1.5 border border-cyan-500/30 text-cyan-600 rounded-lg text-[10px] font-bold hover:bg-cyan-50 transition-all"
                    >
                        <GitCompare className="w-3.5 h-3.5" /> <span>Diff</span>
                    </button>
                    <button
                        onClick={() => { setBulkMode(m => !m); setBulkSelected(new Set()); }}
                        title="Bulk-select and edit multiple APIs"
                        className={`flex items-center space-x-2 px-3 py-1.5 border rounded-lg text-[10px] font-bold transition-all ${bulkMode ? 'border-amber-500/60 bg-amber-500/10 text-amber-600' : 'border-amber-500/30 text-amber-600 hover:bg-amber-50'}`}
                    >
                        <List className="w-3.5 h-3.5" /> <span>Bulk</span>
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center space-x-2 transition-all shadow-md shadow-indigo-500/10"
                    >
                        <Plus className="w-3.5 h-3.5" /> <span>Add API</span>
                    </button>
                </div>
            </div>

            {/* Bulk Edit Toolbar */}
            {bulkMode && (
                <div className="px-6 py-2 bg-amber-500/5 border-b border-amber-500/20 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-amber-500">{bulkSelected.size} selected</span>
                    <button onClick={() => setBulkSelected(new Set(apis.map(a => a.id)))} className="text-[9px] text-slate-500 hover:text-slate-300 font-bold">Select All</button>
                    <button onClick={() => setBulkSelected(new Set())} className="text-[9px] text-slate-500 hover:text-slate-300 font-bold">Clear</button>
                    <div className="flex-1" />
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Set Status:</label>
                    <select
                        value={bulkStatus}
                        onChange={e => setBulkStatus(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white outline-none"
                    >
                        <option value="">-- Choose --</option>
                        {['Draft', 'Review', 'Active', 'Deprecated', 'Retired'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button
                        onClick={handleBulkStatusUpdate}
                        disabled={!bulkSelected.size || !bulkStatus}
                        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3 py-1 rounded text-[10px] font-bold transition-colors"
                    >
                        Apply Status
                    </button>
                    <button
                        onClick={handleBulkDelete}
                        disabled={!bulkSelected.size}
                        className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white px-3 py-1 rounded text-[10px] font-bold transition-colors"
                    >
                        Delete Selected
                    </button>
                    <button onClick={() => { setBulkMode(false); setBulkSelected(new Set()); }} className="text-[9px] text-slate-500 hover:text-slate-300 font-bold">Cancel</button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading catalog...</div>
                ) : apis.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                        <LayersIcon className="w-12 h-12 opacity-20 mb-4" />
                        <p className="font-medium uppercase tracking-wider text-[10px]">No APIs in Catalog</p>
                        <p className="text-xs mt-1">Import from Swagger or add manually to start mapping.</p>
                        <button onClick={() => setIsCreating(true)} className="mt-6 px-6 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-xl hover:bg-slate-800 transition-all">Add Manual API</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {apis.filter(a =>
                            !catalogSearch ||
                            a.api_name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                            a.url.toLowerCase().includes(catalogSearch.toLowerCase())
                        ).map(apiItem => (
                            <div
                                key={apiItem.id}
                                onClick={() => {
                                    if (bulkMode) {
                                        setBulkSelected(prev => {
                                            const n = new Set(prev);
                                            n.has(apiItem.id) ? n.delete(apiItem.id) : n.add(apiItem.id);
                                            return n;
                                        });
                                        return;
                                    }
                                    setSelectedApi({
                                        id: apiItem.id,
                                        name: apiItem.api_name,
                                        url: apiItem.url,
                                        method: apiItem.http_method,
                                        description: apiItem.description,
                                        headers: apiItem.headers,
                                        request_body: apiItem.request_body,
                                        response_body: apiItem.response_body,
                                        authentication: apiItem.authentication,
                                        swaggerRef: apiItem.swagger_reference,
                                        isAuthApi: apiItem.is_auth_api
                                    });
                                }}
                                className={`bg-white border rounded-2xl p-4 hover:shadow-lg transition-all group cursor-pointer ${bulkSelected.has(apiItem.id) ? 'border-amber-400 ring-1 ring-amber-400/40' : 'border-slate-200'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        {bulkMode && (
                                            <input
                                                type="checkbox"
                                                checked={bulkSelected.has(apiItem.id)}
                                                onChange={() => {}}
                                                className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                                                onClick={e => e.stopPropagation()}
                                            />
                                        )}
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${apiItem.http_method === 'GET' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}`}>{apiItem.http_method}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowApiStatus(apiItem); }}
                                            className="p-1 text-slate-400 hover:text-indigo-500 transition-all"
                                            title="Change Status Workflow"
                                        >
                                            <GitBranch className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDuplicate(apiItem); }}
                                            className="p-1 text-slate-400 hover:text-indigo-500 transition-all"
                                            title="Duplicate API"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(apiItem.id); }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-all"
                                            title="Delete API"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 mb-1 truncate">{apiItem.api_name}</h4>
                                <p className="text-xs text-slate-500 font-mono truncate mb-3">{apiItem.url}</p>
                                {apiItem.description && (
                                    <div className="text-[10px] text-slate-500 mb-2 line-clamp-2 prose prose-xs max-w-none">
                                        <ReactMarkdown>{apiItem.description}</ReactMarkdown>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">
                                            {apiItem.swagger_reference && <><BookOpen className="w-3 h-3 mr-1" /> Linked</>}
                                        </div>
                                        {apiItem.is_auth_api && (
                                            <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1">
                                                <Key className="w-2.5 h-2.5" /> Auth API
                                            </span>
                                        )}
                                        {apiItem.status && (
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${apiItem.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                                apiItem.status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                                                    apiItem.status === 'Deprecated' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-indigo-100 text-indigo-700'
                                                }`}>
                                                {apiItem.status}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex space-x-2">
                                        {(apiItem.headers && Object.keys(apiItem.headers).length > 0) && (
                                            <div title="Contains Headers" className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center">
                                                <Shield className="w-2.5 h-2.5 text-slate-400" />
                                            </div>
                                        )}
                                        {(apiItem.request_body && Object.keys(apiItem.request_body).length > 0) && (
                                            <div title="Contains Payload" className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center">
                                                <Box className="w-2.5 h-2.5 text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {(isCreating || selectedApi) && (
                <ModuleApiDrawer
                    api={selectedApi}
                    moduleId={module.id}
                    project={project}
                    selectedEnv={selectedEnv}
                    onClose={() => { setSelectedApi(null); setIsCreating(false); }}
                    onSave={handleSave}
                />
            )}

            {showHealthMonitor && (
                <ApiHealthMonitor
                    apis={apis}
                    baseUrl={typeof module.env_context_apis === 'string' ? JSON.parse(module.env_context_apis || '{}')[selectedEnv] || '' : (module.env_context_apis || {})[selectedEnv] || ''}
                    project={project}
                    onClose={() => setShowHealthMonitor(false)}
                />
            )}

            {showCollectionRunner && (
                <CollectionRunner
                    apis={apis}
                    baseUrl={typeof module.env_context_apis === 'string' ? JSON.parse(module.env_context_apis || '{}')[selectedEnv] || '' : (module.env_context_apis || {})[selectedEnv] || ''}
                    project={project}
                    onClose={() => setShowCollectionRunner(false)}
                />
            )}

            {showPostmanImporter && (
                <PostmanImporter
                    module={module}
                    onClose={() => setShowPostmanImporter(false)}
                    onImported={() => { setShowPostmanImporter(false); loadApis(); }}
                />
            )}

            {showResponseDiff && (
                <ResponseDiffTool
                    apis={apis}
                    environments={project?.settings?.environments || ['DEV', 'SIT', 'UAT', 'PROD']}
                    project={project}
                    onClose={() => setShowResponseDiff(false)}
                />
            )}

            {showApiStatus && (
                <ApiStatusWorkflow
                    currentStatus={showApiStatus.status || 'Draft'}
                    apiName={showApiStatus.api_name}
                    onTransition={(newStatus) => handleApiStatusTransition(showApiStatus, newStatus)}
                    onClose={() => setShowApiStatus(null)}
                />
            )}

            {/* WSDL Import Modal */}
            {wsdlImport.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setWsdlImport(prev => ({ ...prev, open: false }))}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[650px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <Code className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Import from WSDL</h3>
                                    <p className="text-[10px] text-slate-500">Fetch SOAP operations and add them to this module's catalog</p>
                                </div>
                            </div>
                            <button onClick={() => setWsdlImport(prev => ({ ...prev, open: false }))} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* URL Input */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">WSDL URL</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 focus-within:border-amber-500/50 transition-colors">
                                        <Globe className="w-3.5 h-3.5 text-slate-600 mr-2 shrink-0" />
                                        <input
                                            value={wsdlImport.url}
                                            onChange={e => setWsdlImport(prev => ({ ...prev, url: e.target.value, error: '' }))}
                                            onKeyDown={e => e.key === 'Enter' && handleParseWsdl()}
                                            placeholder="https://example.com/service?wsdl"
                                            className="flex-1 bg-transparent py-2.5 text-sm text-white font-mono outline-none placeholder-slate-700"
                                        />
                                    </div>
                                    <button
                                        onClick={handleParseWsdl}
                                        disabled={wsdlImport.loading || !wsdlImport.url.trim()}
                                        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-amber-900/20"
                                    >
                                        {wsdlImport.loading ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                        <span>{wsdlImport.loading ? 'Parsing...' : 'Parse'}</span>
                                    </button>
                                </div>
                                <p className="text-[9px] text-slate-600">Try: <span className="font-mono text-slate-500">http://www.dneonline.com/calculator.asmx?WSDL</span></p>
                            </div>

                            {/* Error */}
                            {wsdlImport.error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-medium p-3 rounded-xl flex items-start space-x-2">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span>{wsdlImport.error}</span>
                                </div>
                            )}

                            {/* Endpoint info */}
                            {wsdlImport.endpoint && (
                                <div className="text-[10px] text-slate-500 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono flex items-center gap-2">
                                    <Globe className="w-3 h-3 text-amber-500 shrink-0" />
                                    <span className="truncate">Service Endpoint: <span className="text-amber-400">{wsdlImport.endpoint}</span></span>
                                </div>
                            )}

                            {/* Operations List */}
                            {wsdlImport.operations.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Operations
                                            <span className="ml-2 bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[9px]">{wsdlImport.operations.length}</span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setWsdlImport(prev => ({ ...prev, selected: new Set(prev.operations.map((_, i) => i)) }))} className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold">Select All</button>
                                            <span className="text-slate-700">|</span>
                                            <button onClick={() => setWsdlImport(prev => ({ ...prev, selected: new Set() }))} className="text-[9px] text-slate-500 hover:text-slate-300 font-bold">Deselect All</button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800 max-h-64 overflow-y-auto">
                                        {wsdlImport.operations.map((op, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => toggleWsdlOp(idx)}
                                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-800/50 ${wsdlImport.selected.has(idx) ? 'bg-amber-500/5' : ''}`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${wsdlImport.selected.has(idx) ? 'bg-amber-500 border-amber-500' : 'border-slate-600'}`}>
                                                    {wsdlImport.selected.has(idx) && <CheckCircle className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="text-sm font-semibold text-white truncate">{op.name}</div>
                                                    <div className="text-[9px] text-slate-500 truncate">{op.description}</div>
                                                </div>
                                                <span className="ml-auto text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold shrink-0">POST/XML</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-slate-600">Each selected operation will be added as a separate API entry with a SOAP Envelope template.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                            <button onClick={() => setWsdlImport({ open: false, url: '', loading: false, operations: [], endpoint: '', error: '', selected: new Set() })} className="text-xs text-slate-500 hover:text-slate-300 px-4 py-2 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleImportSelectedWsdlOps}
                                disabled={!wsdlImport.selected.size || wsdlImport.loading}
                                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-amber-900/20"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Import {wsdlImport.selected.size} Operation{wsdlImport.selected.size !== 1 ? 's' : ''} to Catalog</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function ModuleApiDrawer({ api: initialApi, moduleId, project, onClose, onSave, selectedEnv }) {
    const [localApi, setLocalApi] = useState(initialApi || {
        name: "",
        url: "",
        method: "GET",
        description: "",
        headers: {},
        request_body: {},
        response_body: {},
        authentication: { type: 'None' },
        swaggerRef: "",
        isAuthApi: false
    });
    const [activeTab, setActiveTab] = useState('info');
    const [showMockGenerator, setShowMockGenerator] = useState(false);

    const handleSave = () => {
        if (!localApi.name || !localApi.url) {
            toast.error("Name and URL are required");
            return;
        }
        onSave(localApi);
    };

    // Keyboard shortcut: Ctrl+S to save, Esc to close
    React.useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [localApi]);

    const renderJsonEditor = (field, label) => {
        const val = localApi[field];
        const strVal = typeof val === 'string' ? val : JSON.stringify(val, null, 4);

        return (
            <div className="flex-1 flex flex-col min-h-0 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">JSON Structure</span>
                </div>
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex flex-col">
                    <textarea
                        value={strVal}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                setLocalApi({ ...localApi, [field]: parsed });
                            } catch (err) {
                                setLocalApi({ ...localApi, [field]: e.target.value });
                            }
                        }}
                        className="flex-1 w-full bg-transparent p-6 font-mono text-xs text-indigo-400 outline-none resize-none leading-relaxed"
                        spellCheck="false"
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm transition-all" onClick={onClose}>
            <div className="w-[950px] bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col animate-slide-in-right overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900 shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                            <Box className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">{initialApi?.id ? 'Edit' : 'Add'} Module API</div>
                            <h2 className="text-sm font-bold text-white max-w-xs truncate">{localApi.name || "New API"}</h2>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={handleSave} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20">
                            <Save className="w-3.5 h-3.5" /> <span>Save</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-2 bg-slate-900 border-b border-slate-800 flex items-center space-x-1 shrink-0">
                    {[
                        { id: 'info', label: 'Basic Info', icon: FileText },
                        { id: 'headers', label: 'Headers', icon: Shield },
                        { id: 'request', label: 'Payload', icon: Box },
                        { id: 'response', label: 'Response', icon: CheckCircle },
                        { id: 'test', label: 'Test', icon: Activity }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id
                                ? 'bg-indigo-600/10 text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                }`}
                        >
                            <tab.icon className="w-3 h-3" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className={`flex-1 overflow-y-auto ${activeTab === 'test' ? 'p-2' : 'p-8'} flex flex-col min-h-0 bg-slate-900/50`}>
                    {activeTab === 'info' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Method</label>
                                    <select
                                        value={localApi.method}
                                        onChange={e => setLocalApi({ ...localApi, method: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-indigo-400 font-black outline-none focus:border-indigo-500"
                                    >
                                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Endpoint URL</label>
                                    <input
                                        value={localApi.url}
                                        onChange={e => setLocalApi({ ...localApi, url: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-indigo-500"
                                        placeholder="/v1/users"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">API Display Name</label>
                                <input
                                    value={localApi.name}
                                    onChange={e => setLocalApi({ ...localApi, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-indigo-500"
                                    placeholder="e.g. Get User Profile"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Description</label>
                                <textarea
                                    value={localApi.description}
                                    onChange={e => setLocalApi({ ...localApi, description: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 outline-none focus:border-indigo-500 h-24 resize-none leading-relaxed"
                                    placeholder="What does this API do?"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Key className="w-3.5 h-3.5 text-amber-400" />
                                        Authentication API Tag
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">Tag this API as an authentication endpoint for easier identification.</p>
                                </div>
                                <button
                                    onClick={() => setLocalApi({ ...localApi, isAuthApi: !localApi.isAuthApi })}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border ${localApi.isAuthApi ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                                >
                                    {localApi.isAuthApi ? 'Tagged as Auth API' : 'Tag as Auth API'}
                                </button>
                            </div>

                            <div className="pt-6 border-t border-slate-800">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Swagger Reference (OperationID)</label>
                                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                                    <Code className="w-4 h-4 text-slate-600" />
                                    <input
                                        value={localApi.swaggerRef}
                                        onChange={e => setLocalApi({ ...localApi, swaggerRef: e.target.value })}
                                        className="flex-1 bg-transparent text-xs text-indigo-400 font-mono outline-none"
                                        placeholder="e.g. SIM_SWAP_ASYNC"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'headers' && renderJsonEditor('headers', 'HTTP Headers')}
                    {activeTab === 'request' && renderJsonEditor('request_body', 'Request Payload')}
                    {activeTab === 'response' && (
                        <div className="flex flex-col h-full gap-2">
                            <div className="flex items-center justify-end">
                                <button
                                    onClick={() => setShowMockGenerator(true)}
                                    className="flex items-center gap-1.5 text-[10px] font-bold text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-all"
                                >
                                    <Sparkles className="w-3 h-3" /> Generate Mock Response
                                </button>
                            </div>
                            {renderJsonEditor('response_body', 'Sample Response')}
                        </div>
                    )}
                    {activeTab === 'test' && (
                        <AdvancedApiTester
                            api={localApi}
                            project={project}
                            moduleId={moduleId}
                            selectedEnv={selectedEnv}
                            onUpdateExamples={(sample) => {
                                setLocalApi({ ...localApi, response_body: sample });
                            }}
                        />
                    )}
                </div>

                {showMockGenerator && (
                    <MockResponseGenerator
                        responseSchema={localApi.response_body}
                        onAccept={(mock) => setLocalApi({ ...localApi, response_body: mock })}
                        onClose={() => setShowMockGenerator(false)}
                    />
                )}

                <div className="h-12 border-t border-slate-800 px-8 flex items-center justify-between bg-slate-900 shrink-0">
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">RAPTR DXP CATALOG ENGINE</span>
                    <div className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{localApi.method} VALIDATED</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

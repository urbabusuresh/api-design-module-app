import React, { useState, useEffect } from 'react';
import {
    Globe, Activity, Play, Clock, Database, ChevronRight, CheckCircle,
    Shield, Trash2, Plus, Copy, Box, Laptop, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';
import { useKeyboardShortcuts, formatXml, isXml } from '../../utils';
import { DiffIcon, History, Zap, Sparkles } from 'lucide-react';

export function KeyValueTable({ data, onAdd, onUpdate, onRemove }) {
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-2 pb-2 border-b border-slate-800/50">
                <div className="col-span-1"></div>
                <div className="col-span-4 text-[10px] font-bold text-slate-500 uppercase">Key</div>
                <div className="col-span-6 text-[10px] font-bold text-slate-500 uppercase">Value</div>
                <div className="col-span-1"></div>
            </div>
            {data.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 group items-center animate-fade-in py-1">
                    <div className="col-span-1 flex justify-center">
                        <input
                            type="checkbox"
                            checked={row.active}
                            onChange={(e) => onUpdate(idx, 'active', e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                        />
                    </div>
                    <div className="col-span-4">
                        <input
                            value={row.key}
                            onChange={(e) => onUpdate(idx, 'key', e.target.value)}
                            placeholder="Key"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700"
                        />
                    </div>
                    <div className="col-span-6">
                        <input
                            value={row.value}
                            onChange={(e) => onUpdate(idx, 'value', e.target.value)}
                            placeholder="Value"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-indigo-300 font-mono outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700"
                        />
                    </div>
                    <div className="col-span-1 flex justify-center">
                        <button
                            onClick={() => onRemove(idx)}
                            disabled={data.length === 1}
                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-all p-1"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            ))}
            <button
                onClick={onAdd}
                className="mt-4 flex items-center space-x-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1 hover:bg-indigo-500/5 rounded-lg"
            >
                <Plus className="w-3 h-3" /> <span>Add Row</span>
            </button>
        </div>
    );
}

export function AdvancedApiTester({ api: targetApi, project, onUpdateExamples, moduleId, selectedEnv }) {
    const [testUrl, setTestUrl] = useState(targetApi.url || "");
    const [testMethod, setTestMethod] = useState(targetApi.method || "GET");
    const [isInternalChange, setIsInternalChange] = useState(false);

    // Request Configuration State
    const [params, setParams] = useState(() => {
        try {
            const urlStr = targetApi.url || "";
            const searchPart = urlStr.includes('?') ? urlStr.split('?')[1] : "";
            const sp = new URLSearchParams(searchPart);
            const p = [];
            sp.forEach((v, k) => p.push({ key: k, value: v, active: true }));
            return p.length > 0 ? p : [{ key: '', value: '', active: true }];
        } catch (e) {
            return [{ key: '', value: '', active: true }];
        }
    });

    // Sync URL -> Params
    useEffect(() => {
        if (isInternalChange) {
            setIsInternalChange(false);
            return;
        }
        try {
            if (testUrl.includes('?')) {
                const searchPart = testUrl.split('?')[1];
                const sp = new URLSearchParams(searchPart);
                const newParams = [];
                sp.forEach((v, k) => newParams.push({ key: k, value: v, active: true }));
                if (newParams.length > 0) {
                    setParams(prev => {
                        return [...newParams, { key: '', value: '', active: true }];
                    });
                }
            }
        } catch (e) { }
    }, [testUrl]);

    // Sync Params -> URL
    useEffect(() => {
        const activeParams = params.filter(p => p.active && p.key);
        const baseUrl = testUrl.includes('?') ? testUrl.split('?')[0] : testUrl;

        if (activeParams.length > 0) {
            const qs = activeParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
            const newUrl = baseUrl + '?' + qs;
            if (newUrl !== testUrl) {
                setIsInternalChange(true);
                setTestUrl(newUrl);
            }
        } else if (testUrl.includes('?')) {
            setIsInternalChange(true);
            setTestUrl(baseUrl);
        }
    }, [params]);

    const [testHeaders, setTestHeaders] = useState(() => {
        const h = [];
        const apiHeaders = targetApi.headers || {};
        const isSoap = targetApi.apiType === 'SOAP' || targetApi.method === 'SOAP';

        if (isSoap) {
            h.push({ key: 'Content-Type', value: 'text/xml; charset=utf-8', active: true });
            const soapAction = apiHeaders['SOAPAction'] || apiHeaders['soapaction'] || '""';
            h.push({ key: 'SOAPAction', value: soapAction, active: true });
        } else if (targetApi.method !== 'GET') {
            const hasContentType = Object.keys(apiHeaders).some(k => k.toLowerCase() === 'content-type');
            if (!hasContentType) {
                h.push({ key: 'Content-Type', value: 'application/json', active: true });
            }
        }

        if (Array.isArray(targetApi.headers)) {
            targetApi.headers.forEach(item => {
                if (item.key && !h.some(existing => existing.key.toLowerCase() === item.key.toLowerCase())) {
                    h.push({ ...item, active: true });
                }
            });
        } else if (targetApi.headers && typeof targetApi.headers === 'object') {
            Object.entries(targetApi.headers).forEach(([k, v]) => {
                if (!h.some(existing => existing.key.toLowerCase() === k.toLowerCase())) {
                    h.push({ key: k, value: String(v), active: true });
                }
            });
        }
        return h.length > 0 ? h : [{ key: '', value: '', active: true }];
    });

    const [testBody, setTestBody] = useState(() => {
        let body = targetApi.request?.body;
        if (!body) body = targetApi.request;
        if (!body) body = targetApi.request_body;
        if (body && typeof body === 'object') return JSON.stringify(body, null, 4);
        return body || "";
    });

    const [auth, setAuth] = useState(targetApi.authentication || { type: 'None' });
    const [selectedProfileId, setSelectedProfileId] = useState("");
    const [bodyFormat, setBodyFormat] = useState('json');
    const [activeReqTab, setActiveReqTab] = useState('params');
    const [testLogs, setTestLogs] = useState([]);
    const [diffTarget, setDiffTarget] = useState(null); // For comparing two responses
    const [showDiffModal, setShowDiffModal] = useState(false);
    const [soapWss, setSoapWss] = useState({
        enabled: false,
        username: '',
        password: '',
        addTimestamp: true,
        type: 'UsernameToken'
    });

    // Feature 13: Keyboard Shortcuts
    useKeyboardShortcuts([
        { key: 'Enter', ctrl: true, action: () => runTest(), allowInInput: true },
        { key: 's', ctrl: true, action: (e) => { e.preventDefault(); runTest(); } }
    ]);

    // Reset / Sync state when targetApi changes
    useEffect(() => {
        setTestUrl(targetApi.url || "");
        setTestMethod(targetApi.method || "GET");

        // Headers
        const h = [];
        const apiHeaders = targetApi.headers || {};
        const isSoap = targetApi.apiType === 'SOAP' || targetApi.method === 'SOAP';

        if (isSoap) {
            h.push({ key: 'Content-Type', value: 'text/xml; charset=utf-8', active: true });
            const soapAction = apiHeaders['SOAPAction'] || apiHeaders['soapaction'] || '""';
            h.push({ key: 'SOAPAction', value: soapAction, active: true });
        } else if (targetApi.method !== 'GET') {
            const hasContentType = Object.keys(apiHeaders).some(k => k.toLowerCase() === 'content-type');
            if (!hasContentType) {
                h.push({ key: 'Content-Type', value: 'application/json', active: true });
            }
        }

        if (Array.isArray(targetApi.headers)) {
            targetApi.headers.forEach(item => {
                if (item.key && !h.some(existing => existing.key.toLowerCase() === item.key.toLowerCase())) {
                    h.push({ ...item, active: true });
                }
            });
        } else if (targetApi.headers && typeof targetApi.headers === 'object') {
            Object.entries(targetApi.headers).forEach(([k, v]) => {
                if (!h.some(existing => existing.key.toLowerCase() === k.toLowerCase())) {
                    h.push({ key: k, value: String(v), active: true });
                }
            });
        }
        setTestHeaders(h.length > 0 ? h : [{ key: '', value: '', active: true }]);

        // Body
        let body = targetApi.request?.body || targetApi.request || targetApi.request_body || "";
        if (body && typeof body === 'object') body = JSON.stringify(body, null, 4);
        setTestBody(body);

        // Body Format
        const format = targetApi.bodyFormat || (String(body).includes('<?xml') ? 'xml' : 'json');
        setBodyFormat(format);

        // Auth
        setAuth(targetApi.authentication || { type: 'None' });

        // Reset results
        setResult(null);
        setTestLogs([]);
    }, [targetApi.id]);

    useEffect(() => {
        if (moduleId && !selectedProfileId) {
            const defProfile = project.authProfiles?.find(p => p.linkedModuleId === moduleId);
            if (defProfile) setSelectedProfileId(defProfile.id);
        }
    }, [moduleId, project.authProfiles]);

    const addLog = (msg, type = 'info') => {
        setTestLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
    };

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeResTab, setActiveResTab] = useState('body');
    const [history, setHistory] = useState([]);

    const authProfiles = project.authProfiles || [];

    const loadHistory = async () => {
        try {
            const logs = await api.getTestLogs(project.id);
            const dataToFilter = logs.logs || logs;
            const filtered = targetApi.id ? dataToFilter.filter(l => l.api_id === targetApi.id) : dataToFilter.filter(l => l.url === testUrl);
            setHistory(filtered);
        } catch (e) {
            console.error("History fail", e);
        }
    };

    useEffect(() => { loadHistory(); }, [targetApi.id]);

    const runTest = async () => {
        setLoading(true);
        setResult(null);
        setTestLogs([]);
        addLog("Initializing request cycle...", "info");

        try {
            // Helper to resolve {{variable}} placeholders from global variables
            const globalVars = project.globalVariables || {};
            const resolveVars = (str) => {
                if (typeof str !== 'string') return str;
                return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                    return globalVars[key] !== undefined ? globalVars[key] : `{{${key}}}`;
                });
            };

            const finalHeaders = {};

            // 1. Apply Module Level Standard Headers
            const currentModule = project.modules?.find(m => m.id === moduleId);
            if (currentModule && currentModule.standard_headers) {
                try {
                    const stdHeaders = typeof currentModule.standard_headers === 'string'
                        ? JSON.parse(currentModule.standard_headers)
                        : currentModule.standard_headers;

                    Object.entries(stdHeaders).forEach(([k, v]) => {
                        finalHeaders[resolveVars(k)] = resolveVars(v);
                    });
                    addLog(`Attached ${Object.keys(stdHeaders).length} standard module headers.`, "info");
                } catch (e) {
                    console.error("Failed to parse module standard headers", e);
                }
            }

            // 2. Apply API Level Specific Headers (they override module level if keys match)
            testHeaders.filter(h => h.active && h.key).forEach(h => { finalHeaders[resolveVars(h.key)] = resolveVars(h.value); });

            let finalBody = resolveVars(testBody);

            // SOAP WS-Security Injection
            if (targetApi.apiType === 'SOAP' && soapWss.enabled && soapWss.username) {
                try {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(finalBody, "text/xml");
                    const ns = {
                        soap: "http://schemas.xmlsoap.org/soap/envelope/",
                        wsse: "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
                        wsu: "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
                    };

                    let envelope = xmlDoc.getElementsByTagNameNS(ns.soap, "Envelope")[0] || xmlDoc.documentElement;
                    let header = xmlDoc.getElementsByTagNameNS(ns.soap, "Header")[0];
                    if (!header) {
                        header = xmlDoc.createElementNS(ns.soap, "soap:Header");
                        envelope.insertBefore(header, envelope.firstChild);
                    }

                    const security = xmlDoc.createElementNS(ns.wsse, "wsse:Security");
                    security.setAttribute("xmlns:wsse", ns.wsse);
                    security.setAttribute("xmlns:wsu", ns.wsu);
                    security.setAttribute("soap:mustUnderstand", "1");

                    const userToken = xmlDoc.createElementNS(ns.wsse, "wsse:UsernameToken");

                    const userNode = xmlDoc.createElementNS(ns.wsse, "wsse:Username");
                    userNode.textContent = resolveVars(soapWss.username);
                    userToken.appendChild(userNode);

                    const passNode = xmlDoc.createElementNS(ns.wsse, "wsse:Password");
                    passNode.setAttribute("Type", "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText");
                    passNode.textContent = resolveVars(soapWss.password);
                    userToken.appendChild(passNode);

                    if (soapWss.addTimestamp) {
                        const ts = xmlDoc.createElementNS(ns.wsu, "wsu:Timestamp");
                        const created = xmlDoc.createElementNS(ns.wsu, "wsu:Created");
                        created.textContent = new Date().toISOString();
                        ts.appendChild(created);
                        security.appendChild(ts);
                    }

                    security.appendChild(userToken);
                    header.appendChild(security);

                    finalBody = new XMLSerializer().serializeToString(xmlDoc);
                    addLog("Injected WS-Security Headers into SOAP Envelope", "success");
                } catch (e) {
                    addLog("WS-Security Injection failed: " + e.message, "error");
                }
            }

            // Resolve global variables in URL
            let base = "";
            if (currentModule && selectedEnv && currentModule.env_urls) {
                try {
                    const urls = typeof currentModule.env_urls === 'string' ? JSON.parse(currentModule.env_urls) : currentModule.env_urls;
                    base = urls[selectedEnv] || "";
                    if (base) addLog(`Prepending ${selectedEnv} base URL: ${base}`, "info");
                } catch (e) { }
            }

            const rawVal = resolveVars(testUrl);
            const resolvedUrl = (rawVal.startsWith('http') || !base)
                ? rawVal
                : (base.replace(/\/$/, '') + '/' + rawVal.replace(/^\//, ''));

            let finalAuth = { ...auth };
            if (selectedProfileId) {
                const profile = authProfiles.find(p => p.id === selectedProfileId);
                if (profile) {
                    finalAuth = { type: profile.type, ...profile.details };
                    addLog(`Using Auth Profile: ${profile.name}`, "info");

                    if (profile.authApiId) {
                        setActiveResTab('console');
                        try {
                            addLog(`Found linked Auth API. Generating fresh token...`, "warning");
                            const authApis = await api.getModuleApis(profile.linkedModuleId);
                            const authApi = authApis.find(a => a.id === profile.authApiId);

                            if (authApi) {
                                addLog(`Calling Token API: ${authApi.url}`, "info");
                                const authApiHeaders = typeof authApi.headers === 'string' ? JSON.parse(authApi.headers) : (authApi.headers || {});
                                const authApiAuth = typeof authApi.authentication === 'string' ? JSON.parse(authApi.authentication) : (authApi.authentication || { type: 'None' });

                                if (authApiAuth.type === 'Bearer' && authApiAuth.token) {
                                    authApiHeaders['Authorization'] = `Bearer ${authApiAuth.token}`;
                                } else if (authApiAuth.type === 'Basic' && authApiAuth.username && authApiAuth.password) {
                                    authApiHeaders['Authorization'] = `Basic ${btoa(`${authApiAuth.username}:${authApiAuth.password}`)}`;
                                } else if (authApiAuth.type === 'API Key' && authApiAuth.key && authApiAuth.value) {
                                    authApiHeaders[authApiAuth.key] = authApiAuth.value;
                                }

                                const authRes = await api.testEndpoint({
                                    url: authApi.url,
                                    method: authApi.http_method || 'POST',
                                    headers: authApiHeaders,
                                    body: typeof authApi.request_body === 'string' ? JSON.parse(authApi.request_body) : (authApi.request_body || {})
                                }, project.id);

                                if (authRes && authRes.status < 400 && !authRes.error) {
                                    const path = profile.tokenPath || 'access_token';
                                    const responseData = authRes.data || authRes.response_body;
                                    const token = path.split('.').reduce((o, i) => o?.[i], responseData);

                                    if (token) {
                                        if (profile.type === 'Bearer') finalAuth.token = token;
                                        else if (profile.type === 'API Key') finalAuth.value = token;
                                        addLog(`Token generated successfully: ${token.substring(0, 10)}...`, "success");
                                    } else {
                                        addLog(`Token path "${path}" not found in response.`, "error");
                                        toast.error("Could not find token in Auth API response");
                                    }
                                } else {
                                    const errMsg = authRes?.data?.message || authRes?.error || authRes?.statusText || "Unauthorized";
                                    addLog(`Token generation failed (Status ${authRes?.status}): ${errMsg}`, "error");
                                    toast.error(`Handshake Failed: ${errMsg}`);
                                }
                            } else {
                                addLog(`Auth API definition not found (ID: ${profile.authApiId})`, "error");
                            }
                        } catch (err) {
                            addLog(`Dynamic Auth error: ${err.message}`, "error");
                            console.error("Dynamic Auth Failure", err);
                        }
                    }
                }
            }

            if (finalAuth.type === 'Bearer' && finalAuth.token) {
                finalHeaders['Authorization'] = `Bearer ${finalAuth.token}`;
                addLog("Authorization header attached.", "info");
            } else if (finalAuth.type === 'Basic' && finalAuth.username && finalAuth.password) {
                finalHeaders['Authorization'] = `Basic ${btoa(`${finalAuth.username}:${finalAuth.password}`)}`;
                addLog("Basic Authorization header attached.", "info");
            } else if (finalAuth.type === 'API Key' && finalAuth.key && finalAuth.value) {
                finalHeaders[finalAuth.key] = finalAuth.value;
                addLog(`API Key "${finalAuth.key}" attached to headers.`, "info");
            }

            addLog(`Sending ${testMethod} request to target...`, "info");

            const data = await api.testEndpoint({
                apiId: targetApi.id,
                url: resolvedUrl,
                method: testMethod,
                headers: finalHeaders,
                bodyFormat: bodyFormat,
                body: testMethod !== 'GET' ? finalBody : undefined
            }, project.id);

            setResult(data);
            addLog(`Request completed with status ${data.status}.`, data.status < 400 ? "success" : "error");
            loadHistory();
            setActiveResTab('body');
        } catch (e) {
            setResult({ error: e.message });
            addLog(`Request failed: ${e.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    // Feature 6: Full History Replay
    const replayHistory = (log) => {
        setTestUrl(log.url);
        setTestMethod(log.method);

        // Parse Headers
        try {
            const hRaw = typeof log.request_headers === 'string' ? JSON.parse(log.request_headers) : (log.request_headers || {});
            const hArr = Object.entries(hRaw).map(([k, v]) => ({ key: k, value: String(v), active: true }));
            setTestHeaders(hArr.length > 0 ? hArr : [{ key: '', value: '', active: true }]);
        } catch (e) { console.error("Header restore fail", e); }

        // Parse Body
        try {
            const bRaw = typeof log.request_body === 'string' ? JSON.parse(log.request_body) : log.request_body;
            setTestBody(typeof bRaw === 'object' ? JSON.stringify(bRaw, null, 4) : String(bRaw || ''));
            setBodyFormat(isXml(String(bRaw)) ? 'xml' : 'json');
        } catch (e) { setTestBody(String(log.request_body || '')); }

        // Load result into view
        setResult({
            status: log.response_status,
            data: log.response_body,
            headers: log.response_headers,
            duration: log.duration,
            isHistory: true
        });
        setActiveResTab('body');
        toast.success("History replayed!");
    };

    // Feature 10: Mock Generator
    const generateMock = () => {
        const bodyContent = testBody?.trim() || (targetApi.request_body ? (typeof targetApi.request_body === 'string' ? targetApi.request_body : JSON.stringify(targetApi.request_body, null, 2)) : '{}');

        try {
            let data = {};
            try {
                data = JSON.parse(bodyContent);
            } catch (e) {
                toast.error("Invalid JSON in Request Body. Cannot generate mock.");
                return;
            }

            const mockObj = {
                status: "success",
                message: "This is a mock response generated by RAPTR DXP AI",
                timestamp: new Date().toISOString(),
                data: {}
            };

            // Recursively generate mock values
            const gen = (obj) => {
                const res = Array.isArray(obj) ? [] : {};
                Object.entries(obj).forEach(([k, v]) => {
                    if (Array.isArray(v)) {
                        res[k] = [gen(v[0] || {})];
                    } else if (v && typeof v === 'object') {
                        res[k] = gen(v);
                    } else {
                        // Dummy value generation
                        if (typeof v === 'string') res[k] = "mock_" + k;
                        else if (typeof v === 'number') res[k] = Math.floor(Math.random() * 100);
                        else if (typeof v === 'boolean') res[k] = true;
                        else res[k] = null;
                    }
                });
                return res;
            };

            mockObj.data = gen(data);
            const mockStr = JSON.stringify(mockObj, null, 4);

            if (onUpdateExamples) {
                onUpdateExamples(mockStr);
                toast.success("Mock schema generated and saved to 'Sample Response' tab!");
                setActiveResTab('body');
            } else {
                toast.success("Mock generated (Internal logic updated)");
            }
        } catch (err) {
            toast.error("Mock generation failed: " + err.message);
        }
    };

    const addRow = (setter) => setter(prev => [...prev, { key: '', value: '', active: true }]);
    const updateRow = (setter, index, field, value) => {
        setter(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
    };
    const removeRow = (setter, index) => setter(prev => prev.filter((_, i) => i !== index));

    return (
        <div className="flex flex-col h-full text-slate-300">
            {/* Top Bar: Method \u0026 URL */}
            {/* Top Bar: Method & URL */}
            <div className="flex-none p-4 pb-0">
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-xl">
                    <div className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${targetApi.apiType === 'SOAP' ? 'bg-amber-500/10 text-amber-500' : targetApi.apiType === 'GRAPHQL' ? 'bg-pink-500/10 text-pink-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                        {targetApi.apiType || 'REST'}
                    </div>
                    <select
                        value={testMethod}
                        onChange={e => setTestMethod(e.target.value)}
                        className={`bg-slate-800 border-none rounded-lg px-3 py-2 text-[10px] font-black outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${testMethod === 'GET' ? 'text-emerald-400' : 'text-indigo-400'}`}
                    >
                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                    </select>
                    <div className="flex-1 flex items-center bg-slate-950/50 rounded-lg px-2 border border-slate-800/50">
                        <Globe className="w-3.5 h-3.5 text-slate-600 mr-2" />
                        <input
                            value={testUrl}
                            onChange={e => setTestUrl(e.target.value)}
                            placeholder="https://api.example.com/resource"
                            className="flex-1 bg-transparent border-none py-2 text-xs font-mono text-white outline-none placeholder-slate-700"
                        />
                    </div>
                    <button
                        onClick={runTest}
                        disabled={loading}
                        className={`px-5 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all disabled:opacity-50 shadow-lg active:scale-95 shrink-0 ${targetApi.apiType === 'SOAP' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'} text-white`}
                    >
                        {loading ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{loading ? 'Processing...' : 'Send Request'}</span>
                    </button>
                </div>
            </div>

            {/* Main Split Area */}
            <div className="flex-1 overflow-hidden p-4 grid grid-cols-2 gap-4">

                {/* LEFT: Request Setup */}
                <div className="flex flex-col min-h-0 bg-slate-900/30 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-800 bg-slate-900/50 px-2 space-x-1 shrink-0">
                        {[
                            { id: 'params', label: 'Params' },
                            { id: 'auth', label: 'Auth' },
                            { id: 'headers', label: 'Headers' },
                            { id: 'body', label: targetApi.apiType === 'SOAP' ? 'Envelope' : 'Body' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveReqTab(t.id)}
                                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeReqTab === t.id
                                    ? (targetApi.apiType === 'SOAP' ? 'border-amber-500 text-white bg-slate-800/50' : 'border-indigo-500 text-white bg-slate-800/50')
                                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-950/30">
                        {activeReqTab === 'params' && (
                            <KeyValueTable data={params} onAdd={() => addRow(setParams)} onUpdate={(i, f, v) => updateRow(setParams, i, f, v)} onRemove={(i) => removeRow(setParams, i)} />
                        )}
                        {activeReqTab === 'headers' && (
                            <div className="space-y-4">
                                <div className="flex justify-end p-2">
                                    <button
                                        onClick={() => {
                                            const hasSoap = testHeaders.some(h => h.key?.toLowerCase() === 'content-type' && h.value?.includes('xml'));
                                            if (!hasSoap) {
                                                setTestHeaders(prev => [
                                                    { key: 'Content-Type', value: 'text/xml; charset=utf-8', active: true },
                                                    { key: 'SOAPAction', value: '""', active: true },
                                                    ...prev.filter(h => h.key?.toLowerCase() !== 'content-type')
                                                ]);
                                                setBodyFormat('xml');
                                                setTestMethod('POST');
                                                toast.success("SOAP headers applied!");
                                            }
                                        }}
                                        className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 px-3 py-1 rounded-md border border-amber-500/20 font-bold transition-all"
                                    >
                                        Apply SOAP Presets
                                    </button>
                                </div>
                                <KeyValueTable data={testHeaders} onAdd={() => addRow(setTestHeaders)} onUpdate={(i, f, v) => updateRow(setTestHeaders, i, f, v)} onRemove={(i) => removeRow(setTestHeaders, i)} />
                            </div>
                        )}
                        {activeReqTab === 'auth' && (
                            <div className="space-y-6 p-2">
                                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                        <Shield className="w-4 h-4 mr-2" /> Auth Type
                                    </label>
                                    <div className="flex items-center space-x-3">
                                        {authProfiles.length > 0 && (
                                            <select
                                                value={selectedProfileId}
                                                onChange={e => { setSelectedProfileId(e.target.value); if (e.target.value) setAuth({ type: 'None' }); }}
                                                className="bg-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg outline-none text-emerald-400 border border-emerald-500/20"
                                            >
                                                <option value="">Custom In-place</option>
                                                {authProfiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                                            </select>
                                        )}
                                        <select
                                            value={auth.type}
                                            disabled={!!selectedProfileId}
                                            onChange={e => setAuth({ ...auth, type: e.target.value })}
                                            className="bg-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg outline-none text-indigo-400 border border-slate-700"
                                        >
                                            <option value="None">No Auth</option>
                                            <option value="Bearer">Bearer Token</option>
                                            <option value="Basic">Basic Auth</option>
                                            <option value="API Key">API Key</option>
                                        </select>
                                    </div>
                                </div>

                                {!selectedProfileId && auth.type !== 'None' && (
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-inner">
                                        {auth.type === 'Bearer' && (
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Token</label>
                                                <input value={auth.token || ''} onChange={e => setAuth({ ...auth, token: e.target.value })} placeholder="Enter Bearer Token" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm font-mono text-indigo-300 outline-none focus:border-indigo-500 shadow-sm" />
                                            </div>
                                        )}
                                        {auth.type === 'Basic' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Username</label>
                                                    <input value={auth.username || ''} onChange={e => setAuth({ ...auth, username: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Password</label>
                                                    <input value={auth.password || ''} onChange={e => setAuth({ ...auth, password: e.target.value })} type="password" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500" />
                                                </div>
                                            </div>
                                        )}
                                        {auth.type === 'API Key' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Key</label>
                                                    <input value={auth.key || ''} onChange={e => setAuth({ ...auth, key: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Value</label>
                                                    <input value={auth.value || ''} onChange={e => setAuth({ ...auth, value: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm outline-none focus:border-indigo-500" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {targetApi.apiType === 'SOAP' && (
                                    <div className="mt-8 border-t border-slate-800 pt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center space-x-3 text-amber-500">
                                                <Shield className="w-4 h-4" />
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">SOAP WS-Security Manager</h4>
                                            </div>
                                            <div onClick={() => setSoapWss({ ...soapWss, enabled: !soapWss.enabled })} className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${soapWss.enabled ? 'bg-amber-600' : 'bg-slate-800'}`}>
                                                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${soapWss.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                        </div>

                                        {soapWss.enabled && (
                                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 animate-fade-in shadow-inner">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest pl-1">Username (WSS)</label>
                                                        <input
                                                            value={soapWss.username}
                                                            onChange={e => setSoapWss({ ...soapWss, username: e.target.value })}
                                                            placeholder="e.g. {{WSS_USER}}"
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-xs font-mono text-amber-400 outline-none focus:border-amber-500 shadow-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest pl-1">Password (WSS)</label>
                                                        <input
                                                            value={soapWss.password}
                                                            onChange={e => setSoapWss({ ...soapWss, password: e.target.value })}
                                                            type="password"
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-xs outline-none focus:border-amber-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6 pt-2">
                                                    <label className="flex items-center space-x-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={soapWss.addTimestamp}
                                                            onChange={e => setSoapWss({ ...soapWss, addTimestamp: e.target.checked })}
                                                            className="sr-only"
                                                        />
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${soapWss.addTimestamp ? 'bg-amber-600 border-amber-600' : 'border-slate-700 bg-slate-800'}`}>
                                                            {soapWss.addTimestamp && <CheckCircle className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-amber-400 uppercase tracking-tighter">Add Timestamp</span>
                                                    </label>
                                                    <div className="text-[9px] text-slate-600 font-bold bg-slate-950 px-2 py-1 rounded">Type: UsernameToken (Standard)</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {selectedProfileId && (
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 mr-3" /> Using Project Profile: {authProfiles.find(p => p.id === selectedProfileId)?.name}
                                    </div>
                                )}
                            </div>
                        )}
                        {activeReqTab === 'body' && (
                            <div className="h-full flex flex-col">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                                        <button
                                            onClick={() => setBodyFormat('json')}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${bodyFormat === 'json' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            JSON
                                        </button>
                                        <button
                                            onClick={() => setBodyFormat('xml')}
                                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${bodyFormat === 'xml' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            XML/SOAP
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (bodyFormat === 'xml') {
                                                setTestBody(formatXml(testBody));
                                            } else {
                                                try {
                                                    const obj = JSON.parse(testBody);
                                                    setTestBody(JSON.stringify(obj, null, 4));
                                                } catch (e) { toast.error("Invalid JSON"); }
                                            }
                                        }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center space-x-1.5 bg-slate-800 px-2 py-1 rounded border border-slate-700 transition-colors"
                                    >
                                        <Activity className="w-3 h-3" /> <span>Prettify</span>
                                    </button>
                                </div>
                                <textarea
                                    value={testBody}
                                    onChange={e => setTestBody(e.target.value)}
                                    className={`flex-1 w-full bg-slate-950 border rounded-xl p-4 font-mono text-xs outline-none resize-none focus:border-indigo-500/50 transition-colors ${bodyFormat === 'xml' ? 'text-amber-100 border-amber-500/20' : 'text-emerald-400 border-slate-800'}`}
                                    placeholder={bodyFormat === 'json' ? '{ "key": "value" }' : '<?xml version="1.0" encoding="UTF-8"?>\n<soap:Envelope ...>'}
                                    spellCheck="false"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Response View */}
                <div className="flex flex-col min-h-0 bg-slate-900/30 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-2 shrink-0">
                        <div className="flex space-x-1">
                            {[
                                { id: 'body', label: 'Response' },
                                { id: 'headers', label: 'Headers' },
                                { id: 'history', label: `History` },
                                { id: 'console', label: 'Console' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveResTab(t.id)}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeResTab === t.id
                                        ? (targetApi.apiType === 'SOAP' ? 'border-amber-500 text-white bg-slate-800/50' : 'border-emerald-500 text-white bg-slate-800/50')
                                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        {result && (
                            <div className="flex items-center space-x-4 pr-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded shadow-sm ${result.status < 400 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {result.status} {result.statusText}
                                </span>
                                <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-bold uppercase">
                                    <Clock className="w-3 h-3" /> <span>{result.duration}ms</span>
                                </div>
                                <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-bold uppercase">
                                    <Database className="w-3 h-3" /> <span>{Math.round(JSON.stringify(result.data || "").length / 1024 * 10) / 10} KB</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto bg-slate-950/20 relative">
                        {!result && activeResTab !== 'history' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 opacity-40">
                                <Globe className="w-16 h-16 mb-4" />
                                <p className="text-sm font-bold uppercase tracking-[0.2em]">Ready to Send</p>
                            </div>
                        )}

                        {result && activeResTab === 'body' && (
                            <div className="relative h-full group">
                                <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : String(result.data)); toast.success("Copied to clipboard!"); }}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors border border-slate-700"
                                        title="Copy Response"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => { if (onUpdateExamples) onUpdateExamples(result.data); toast.success("Saved to examples!"); }}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all"
                                    >
                                        Save as Example
                                    </button>
                                </div>
                                <pre className="p-6 text-xs font-mono text-blue-300 leading-relaxed h-full overflow-auto whitespace-pre-wrap break-all focus:outline-none" tabIndex={0}>
                                    {typeof result.data === 'object'
                                        ? JSON.stringify(result.data, null, 2)
                                        : (isXml(String(result.data)) ? formatXml(String(result.data)) : String(result.data))}
                                </pre>

                                {/* Feature 4: Response Diff Button */}
                                <div className="absolute bottom-4 right-4 flex gap-2">
                                    <button
                                        onClick={generateMock}
                                        className="bg-slate-800 hover:bg-slate-700 text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-purple-500/20 flex items-center gap-1.5 transition-all"
                                        title="Use this response as a mock body"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" /> Mock Result
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (history.length < 1) { toast.error("Need at least one history record to diff"); return; }
                                            setShowDiffModal(true);
                                        }}
                                        className="bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-indigo-500/20 flex items-center gap-1.5 transition-all"
                                    >
                                        <DiffIcon className="w-3.5 h-3.5" /> Compare with History
                                    </button>
                                </div>
                            </div>
                        )}

                        {result && activeResTab === 'headers' && (
                            <div className="p-6 space-y-1">
                                {Object.entries(result.headers || {}).map(([k, v]) => (
                                    <div key={k} className="flex text-xs border-b border-slate-800/50 pb-2 last:border-0 pt-2 text-slate-400">
                                        <span className="w-1/3 font-bold text-slate-500 break-all pr-4">{k}</span>
                                        <span className="flex-1 font-mono text-slate-300 break-all">{String(v)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeResTab === 'history' && (
                            <div className="p-4 space-y-3 animate-fade-in">
                                {history.map(log => (
                                    <div key={log.id} className="group relative">
                                        <div onClick={() => replayHistory(log)} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-indigo-500/50 transition-all cursor-pointer flex justify-between items-center shadow-lg hover:shadow-indigo-500/10">
                                            <div className="flex items-center space-x-4 overflow-hidden">
                                                <span className={`w-12 text-center text-[10px] font-black py-1 rounded-lg ${log.response_status < 400 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'} shrink-0`}>{log.response_status}</span>
                                                <div className="min-w-0">
                                                    <div className="text-white text-xs font-bold truncate flex items-center">
                                                        <span className="text-slate-500 mr-2">{log.method}</span>
                                                        {log.url}
                                                    </div>
                                                    <div className="text-slate-500 text-[10px] mt-0.5 flex items-center space-x-3">
                                                        <span>{new Date(log.created_at).toLocaleString()}</span>
                                                        <span className="flex items-center text-amber-500/80 font-bold uppercase tracking-widest text-[9px]">
                                                            <Clock className="w-2.5 h-2.5 mr-1" />
                                                            {log.duration || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDiffTarget(log); setShowDiffModal(true); }}
                                                    className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-indigo-400 rounded-lg transition-colors"
                                                    title="Diff with current"
                                                >
                                                    <DiffIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-400" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {history.length === 0 && (
                                    <div className="py-20 text-center text-slate-600 italic text-sm">No activity records found</div>
                                )}
                            </div>
                        )}

                        {activeResTab === 'console' && (
                            <div className="p-6 font-mono text-[10px] space-y-2 h-full bg-slate-950 overflow-auto">
                                <div className="text-slate-600 border-b border-slate-900 pb-2 mb-4 uppercase font-bold tracking-widest">Execution Logs</div>
                                {testLogs.length === 0 && <div className="text-slate-800 italic">No logs generated for the last request.</div>}
                                {testLogs.map((log, i) => (
                                    <div key={i} className="flex gap-3 animate-fade-in border-b border-slate-900/50 pb-1">
                                        <span className="text-slate-700 shrink-0">[{log.time}]</span>
                                        <span className={
                                            log.type === 'error' ? 'text-red-500' :
                                                log.type === 'success' ? 'text-emerald-400' :
                                                    log.type === 'warning' ? 'text-amber-400' :
                                                        'text-indigo-300'
                                        }>{log.msg}</span>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex items-center gap-2 text-indigo-500 animate-pulse mt-4">
                                        <Activity className="w-3 h-3 animate-spin" />
                                        <span>Awaiting Response...</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Feature 4: Response Diff Modal */}
                        {showDiffModal && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => { setShowDiffModal(false); setDiffTarget(null); }}>
                                <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[95%] h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                                    <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                                        <div>
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <DiffIcon className="w-4 h-4 text-indigo-400" /> Response Comparison
                                            </h3>
                                            <p className="text-[10px] text-slate-500">Comparing current response vs {diffTarget ? `log from ${new Date(diffTarget.created_at).toLocaleTimeString()}` : 'historical entry'}</p>
                                        </div>
                                        <button onClick={() => { setShowDiffModal(false); setDiffTarget(null); }} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-slate-800">
                                        {/* Left: Current */}
                                        <div className="flex flex-col min-h-0">
                                            <div className="px-6 py-3 bg-slate-800/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest border-b border-slate-800 flex items-center justify-between">
                                                <span>Current Response</span>
                                                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-black">{result?.status || '???'}</span>
                                            </div>
                                            <pre className="flex-1 p-6 text-[10px] font-mono text-blue-300 overflow-auto whitespace-pre-wrap leading-relaxed">
                                                {typeof result?.data === 'object' ? JSON.stringify(result.data, null, 2) : String(result?.data || '')}
                                            </pre>
                                        </div>
                                        {/* Right: Historical */}
                                        <div className="flex flex-col min-h-0 bg-slate-950/20">
                                            <div className="px-6 py-3 bg-slate-800/20 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <History className="w-3 h-3" />
                                                    <select
                                                        value={diffTarget?.id || ''}
                                                        onChange={e => setDiffTarget(history.find(h => h.id === parseInt(e.target.value)))}
                                                        className="bg-transparent border-none outline-none text-indigo-400 cursor-pointer"
                                                    >
                                                        {!diffTarget && <option value="">Select entry to compare...</option>}
                                                        {history.map(h => <option key={h.id} value={h.id}>{new Date(h.created_at).toLocaleString()} ({h.response_status})</option>)}
                                                    </select>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded font-black ${diffTarget?.response_status < 400 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{diffTarget?.response_status || '???'}</span>
                                            </div>
                                            <pre className="flex-1 p-6 text-[10px] font-mono text-slate-400 overflow-auto whitespace-pre-wrap leading-relaxed border-l border-slate-800/50">
                                                {diffTarget ? (typeof diffTarget.response_body === 'object' ? JSON.stringify(diffTarget.response_body, null, 2) : String(diffTarget.response_body)) : 'Select a history record on the right...'}
                                            </pre>
                                        </div>
                                    </div>
                                    <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-600 font-medium">
                                        Tip: Use the dropdown in the right panel to switch between different historical snapshots.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

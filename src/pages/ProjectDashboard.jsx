import React, { useState, useEffect } from 'react';
import {
    Server, Activity, Search, Plus, Settings, ChevronRight, ArrowRight,
    Database, Trash2, Save, X, Layers, Box, Globe, LayoutGrid, FileText,
    Shield, Code, MessageSquare, Tag, FileJson, CheckCircle, Share2, Laptop,
    MoreVertical, Edit2, LayoutList, Grid, Filter, Lock, BookOpen, Layers as LayersIcon,
    Eye, Key, History, Play, GitBranch
} from 'lucide-react';
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { api } from '../api';
import DesignMapper from '../components/DesignMapper.jsx';

// --- ENDPOINT TESTER COMPONENT ---
// --- ADVANCED API TESTER COMPONENT (Postman-like) ---
function AdvancedApiTester({ api: targetApi, project, onUpdateExamples }) {
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
                        // Keep any empty rows if they were being edited? 
                        // Actually let's just replace if it's external change
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
        h.push({ key: 'Content-Type', value: 'application/json', active: true });
        if (Array.isArray(targetApi.headers)) {
            targetApi.headers.forEach(item => { if (item.key) h.push({ ...item, active: true }); });
        } else if (targetApi.headers && typeof targetApi.headers === 'object') {
            Object.entries(targetApi.headers).forEach(([k, v]) => h.push({ key: k, value: String(v), active: true }));
        }
        return h.length > 1 ? h : [...h, { key: '', value: '', active: true }];
    });

    const [testBody, setTestBody] = useState(() => {
        // Safe access: try nested 'body', then the object itself, then legacy 'request_body'
        let body = targetApi.request?.body;
        if (!body) body = targetApi.request;
        if (!body) body = targetApi.request_body;

        // If it's an object (and not empty), stringify it. If string, use as is.
        if (body && typeof body === 'object') return JSON.stringify(body, null, 4);
        return body || "";
    });

    const [auth, setAuth] = useState(targetApi.authentication || { type: 'None' });
    const [selectedProfileId, setSelectedProfileId] = useState("");
    const [activeReqTab, setActiveReqTab] = useState('params'); // params, auth, headers, body

    // Response State
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeResTab, setActiveResTab] = useState('body'); // body, headers, history
    const [history, setHistory] = useState([]);

    const authProfiles = project.authProfiles || [];

    const loadHistory = async () => {
        try {
            const logs = await api.getTestLogs(project.id);
            const filtered = targetApi.id ? logs.filter(l => l.api_id === targetApi.id) : logs.filter(l => l.url === testUrl);
            setHistory(filtered);
        } catch (e) {
            console.error("History fail", e);
        }
    };

    useEffect(() => { loadHistory(); }, [targetApi.id]);

    const runTest = async () => {
        setLoading(true);
        setResult(null);
        try {
            // Build final headers
            const finalHeaders = {};
            testHeaders.filter(h => h.active && h.key).forEach(h => { finalHeaders[h.key] = h.value; });

            let finalAuth = { ...auth };
            if (selectedProfileId) {
                const profile = authProfiles.find(p => p.id === selectedProfileId);
                if (profile) finalAuth = { type: profile.type, ...profile.details };
            }

            if (finalAuth.type === 'Bearer' && finalAuth.token) {
                finalHeaders['Authorization'] = `Bearer ${finalAuth.token}`;
            } else if (finalAuth.type === 'Basic' && finalAuth.username && finalAuth.password) {
                finalHeaders['Authorization'] = `Basic ${btoa(`${finalAuth.username}:${finalAuth.password}`)}`;
            } else if (finalAuth.type === 'API Key' && finalAuth.key && finalAuth.value) {
                finalHeaders[finalAuth.key] = finalAuth.value;
            }

            let bodyToPay = testBody;
            if (testMethod !== 'GET' && testBody) {
                try {
                    bodyToPay = JSON.parse(testBody);
                } catch (e) { }
            }

            const data = await api.testEndpoint({
                apiId: targetApi.id,
                url: testUrl,
                method: testMethod,
                headers: finalHeaders,
                body: testMethod !== 'GET' ? bodyToPay : undefined
            }, project.id);
            setResult(data);
            loadHistory();
            setActiveResTab('body');
        } catch (e) {
            setResult({ error: e.message });
        } finally {
            setLoading(false);
        }
    };

    const addRow = (setter) => setter(prev => [...prev, { key: '', value: '', active: true }]);
    const updateRow = (setter, index, field, value) => {
        setter(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
    };
    const removeRow = (setter, index) => setter(prev => prev.filter((_, i) => i !== index));

    return (
        <div className="flex flex-col h-full text-slate-300">
            {/* Top Bar: Method & URL */}
            <div className="flex-none p-6 pb-0">
                <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-xl">
                    <select
                        value={testMethod}
                        onChange={e => setTestMethod(e.target.value)}
                        className={`bg-slate-800 border-none rounded-lg px-4 py-2.5 text-xs font-black outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${testMethod === 'GET' ? 'text-emerald-400' : 'text-indigo-400'}`}
                    >
                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                    </select>
                    <input
                        value={testUrl}
                        onChange={e => setTestUrl(e.target.value)}
                        placeholder="https://api.example.com/resource"
                        className="flex-1 bg-transparent border-none px-3 py-2 text-sm font-mono text-white outline-none placeholder-slate-600"
                    />
                    <button
                        onClick={runTest}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                        {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        <span>{loading ? 'Sending...' : 'Send'}</span>
                    </button>
                </div>
            </div>

            {/* Main Split Area */}
            <div className="flex-1 overflow-hidden p-6 grid grid-cols-2 gap-6">

                {/* LEFT: Request Setup */}
                <div className="flex flex-col min-h-0 bg-slate-900/30 border border-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-800 bg-slate-900/50 px-2 space-x-1 shrink-0">
                        {[
                            { id: 'params', label: 'Params' },
                            { id: 'auth', label: 'Auth' },
                            { id: 'headers', label: 'Headers' },
                            { id: 'body', label: 'Body' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveReqTab(t.id)}
                                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeReqTab === t.id ? 'border-indigo-500 text-white bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-950/30">
                        {activeReqTab === 'params' && (
                            <KeyValueTable data={params} setData={setParams} onAdd={() => addRow(setParams)} onUpdate={(i, f, v) => updateRow(setParams, i, f, v)} onRemove={(i) => removeRow(setParams, i)} />
                        )}
                        {activeReqTab === 'headers' && (
                            <KeyValueTable data={testHeaders} setData={setTestHeaders} onAdd={() => addRow(setTestHeaders)} onUpdate={(i, f, v) => updateRow(setTestHeaders, i, f, v)} onRemove={(i) => removeRow(setTestHeaders, i)} />
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
                                {selectedProfileId && (
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 mr-3" /> Using Project Profile: {authProfiles.find(p => p.id === selectedProfileId)?.name}
                                    </div>
                                )}
                            </div>
                        )}
                        {activeReqTab === 'body' && (
                            <div className="h-full flex flex-col">
                                <div className="flex items-center space-x-2 mb-3 bg-slate-900 w-fit p-1 rounded-lg border border-slate-800">
                                    <button className="text-indigo-300 px-3 py-1 bg-indigo-500/10 rounded-md text-xs font-bold">JSON</button>
                                </div>
                                <textarea
                                    value={testBody}
                                    onChange={e => setTestBody(e.target.value)}
                                    className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 outline-none resize-none focus:border-indigo-500/50 transition-colors"
                                    placeholder='{ "key": "value" }'
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
                                { id: 'history', label: `History` } // (${history.length})
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveResTab(t.id)}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeResTab === t.id ? 'border-emerald-500 text-white bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        {result && (
                            <div className="flex items-center space-x-4 pr-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded ${result.status < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {result.status} {result.statusText}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{result.duration}ms</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{Math.round(JSON.stringify(result.data).length / 1024 * 10) / 10} KB</span>
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
                                <button
                                    onClick={() => { if (onUpdateExamples) onUpdateExamples(result.data); alert("Saved to examples!"); }}
                                    className="absolute right-6 top-4 z-10 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Save as Example
                                </button>
                                <pre className="p-6 text-xs font-mono text-blue-300 leading-relaxed h-full overflow-auto whitespace-pre-wrap break-all focus:outline-none" tabIndex={0}>
                                    {typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : String(result.data)}
                                </pre>
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
                                    <div key={log.id} onClick={() => setResult({ status: log.response_status, data: log.response_body, duration: log.duration, headers: log.response_headers })} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-indigo-500/50 transition-all cursor-pointer group flex justify-between items-center shadow-lg hover:shadow-indigo-500/10">
                                        <div className="flex items-center space-x-4 overflow-hidden">
                                            <span className={`w-12 text-center text-[10px] font-black py-1 rounded-lg ${log.response_status < 300 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'} shrink-0`}>{log.response_status}</span>
                                            <div className="min-w-0">
                                                <div className="text-white text-xs font-bold truncate flex items-center">
                                                    <span className="text-slate-500 mr-2">{log.method}</span>
                                                    {log.url}
                                                </div>
                                                <div className="text-slate-500 text-[10px] mt-0.5">{new Date(log.created_at).toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-400" />
                                    </div>
                                ))}
                                {history.length === 0 && (
                                    <div className="py-20 text-center text-slate-600 italic text-sm">No activity records found</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function KeyValueTable({ data, onAdd, onUpdate, onRemove }) {
    return (
        <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 mb-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <div className="col-span-1 text-center">Active</div>
                <div className="col-span-4">Key</div>
                <div className="col-span-6">Value</div>
                <div className="col-span-1"></div>
            </div>
            {data.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center group">
                    <div className="col-span-1 flex justify-center">
                        <input type="checkbox" checked={row.active} onChange={e => onUpdate(i, 'active', e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                    </div>
                    <div className="col-span-4">
                        <input value={row.key} onChange={e => { onUpdate(i, 'key', e.target.value); if (i === data.length - 1) onAdd(); }} placeholder="Key" className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-slate-600" />
                    </div>
                    <div className="col-span-6">
                        <input value={row.value} onChange={e => { onUpdate(i, 'value', e.target.value); if (i === data.length - 1) onAdd(); }} placeholder="Value" className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-slate-600" />
                    </div>
                    <div className="col-span-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onRemove(i)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            ))}
            <button onClick={onAdd} className="mt-4 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center px-2">
                <Plus className="w-3 h-3 mr-1" /> Add New Row
            </button>
        </div>
    );
}

// --- TEST DRAWER COMPONENT ---
function TestDrawer({ api: targetApi, project, onClose, onRefresh }) {
    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose}>
            <div
                className="w-[1000px] bg-slate-900 border-l border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] h-full flex flex-col animate-slide-in-right overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500 opacity-20" />

                {/* Header */}
                <div className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                            <Activity className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2 mb-0.5">
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Advanced Test Console</span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase">Postman Suite v2</span>
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight">{api.name || "Ad-hoc Explorer"}</h2>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={onClose} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all border border-white/5 active:scale-90">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Body */}
                <div className="flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
                    <AdvancedApiTester
                        api={targetApi}
                        project={project}
                        onUpdateExamples={async (sample) => {
                            try {
                                const bodyStr = typeof sample === 'object' ? JSON.stringify(sample, null, 4) : sample;

                                // Prepare update for api_catalog
                                const updatedApi = { ...targetApi };
                                const responses = [...(targetApi.responses || [])];
                                const successIdx = responses.findIndex(r => r.code >= 200 && r.code < 300);

                                if (successIdx > -1) {
                                    responses[successIdx] = { ...responses[successIdx], body: bodyStr };
                                } else {
                                    responses.push({ code: 200, description: 'Success', body: bodyStr });
                                }

                                updatedApi.responses = responses;

                                await api.saveSubApi(updatedApi);
                                alert("Response saved as success example!");
                                if (onRefresh) onRefresh();
                                if (onClose) onClose();
                            } catch (e) {
                                alert("Failed to save example: " + e.message);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// --- SUB-API DRAWER COMPONENT ---
function SubApiDrawer({ api, project, onClose, onSave, services = [], allApis = [], modules = [] }) {
    const projectSettings = project.settings || {};
    const authProfiles = project.authProfiles || [];
    const projectId = project.id;

    const [localApi, setLocalApi] = useState(JSON.parse(JSON.stringify(api)));
    const [activeTab, setActiveTab] = useState(api.initialTab || 'design'); // design, request, response, downstream, channels, docs

    const tabs = [
        { id: 'design', label: 'Design', icon: FileText },
        { id: 'request', label: 'Request', icon: Box },
        { id: 'response', label: 'Response', icon: CheckCircle },
        { id: 'downstream', label: 'Downstream', icon: Database },
        { id: 'channels', label: 'Channels', icon: Share2 },
        { id: 'docs', label: 'Docs', icon: MessageSquare },
        { id: 'mapper', label: 'Mapper', icon: GitBranch },
    ];

    // Local state for text editing to allow invalid JSON while typing
    const [localRequestBody, setLocalRequestBody] = useState(() => {
        let val = api.request?.body;
        if (!val) val = api.request;
        if (!val) val = api.request_body;
        if (val && typeof val === 'object') return JSON.stringify(val, null, 4);
        return val || "";
    });

    // --- SubApiDrawer ---
    const [requestError, setRequestError] = useState(null); // Local state for JSON validation error

    // Wrapper for onSave to block saving if validation fails
    const handleSaveValidated = () => {
        if (requestError) {
            alert("Please fix JSON errors in Request Body before saving.");
            return;
        }
        // Ensure localApi.request is synced with final text
        let finalBody = localRequestBody;
        try {
            if (finalBody.trim().startsWith('{') || finalBody.trim().startsWith('[')) {
                finalBody = JSON.parse(finalBody);
            }
        } catch (e) { }

        onSave({ ...localApi, request: finalBody });
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}>
            <div
                className="w-[800px] bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col animate-slide-in-right"
                onClick={e => e.stopPropagation()}
            >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500 opacity-20" />

                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Editing Endpoint</div>
                        <h2 className="text-lg font-bold text-white max-w-sm truncate">{localApi.name || "Untitled Endpoint"}</h2>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button onClick={handleSaveValidated} className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${requestError ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`} disabled={!!requestError}>
                            <Save className="w-4 h-4" /> <span>Save</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 space-x-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">

                    {/* TAB: DESIGN */}
                    {activeTab === 'design' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Method</label>
                                    <select
                                        value={localApi.method}
                                        onChange={e => setLocalApi({ ...localApi, method: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-indigo-300 font-mono outline-none focus:border-indigo-500"
                                    >
                                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Endpoint URL</label>
                                    <input
                                        value={localApi.url}
                                        onChange={e => setLocalApi({ ...localApi, url: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500"
                                        placeholder="/resource"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Name</label>
                                    <input
                                        value={localApi.name}
                                        onChange={e => setLocalApi({ ...localApi, name: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Parent Service (Root API)</label>
                                    <select
                                        value={localApi.rootApiId || ""}
                                        onChange={e => setLocalApi({ ...localApi, rootApiId: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                                        disabled={services.length === 0} // Can't change if no services passed (or simple edit where context is fixed)
                                    >
                                        <option value="">Select Service</option>
                                        {services.map(svc => (
                                            <option key={svc.id} value={svc.id}>{svc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Category</label>
                                    <select
                                        value={localApi.category || ""}
                                        onChange={e => setLocalApi({ ...localApi, category: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Select Category</option>
                                        {(projectSettings?.categories || []).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Version</label>
                                    <input
                                        value={localApi.version || ""}
                                        onChange={e => setLocalApi({ ...localApi, version: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                                <textarea
                                    value={localApi.description}
                                    onChange={e => setLocalApi({ ...localApi, description: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 h-24 resize-none outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Created By</label>
                                    <input value={localApi.createdBy || ""} onChange={e => setLocalApi({ ...localApi, createdBy: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label>
                                    <select value={localApi.status || "Draft"} onChange={e => setLocalApi({ ...localApi, status: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500">
                                        <option>Draft</option><option>Active</option><option>Deprecated</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Provider System (Southbound)</label>
                                <select
                                    value={localApi.providerSystem || ""}
                                    onChange={e => setLocalApi({ ...localApi, providerSystem: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select Provider System</option>
                                    {(projectSettings.channels?.southbound || []).map(ch => (
                                        <option key={ch} value={ch}>{ch}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* TAB: REQUEST */}
                    {activeTab === 'request' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Request Body (JSON)</label>
                                <textarea
                                    value={localRequestBody}
                                    onChange={e => {
                                        const newValue = e.target.value;
                                        setLocalRequestBody(newValue);

                                        // Validate
                                        try {
                                            if (newValue.trim()) {
                                                if (newValue.trim().startsWith('{') || newValue.trim().startsWith('[')) {
                                                    JSON.parse(newValue);
                                                }
                                            }
                                            setRequestError(null);
                                        } catch (err) {
                                            setRequestError(err.message);
                                        }
                                    }}
                                    className={`w-full bg-slate-900 border rounded-lg p-4 text-xs font-mono h-64 resize-none outline-none focus:border-indigo-500 ${requestError ? 'border-red-500/50 text-red-300' : 'border-slate-700 text-emerald-400'}`}
                                    placeholder='{ "key": "value" }'
                                />
                                {requestError && (
                                    <div className="mt-2 text-[10px] text-red-400 font-bold bg-red-500/10 p-2 rounded border border-red-500/20 flex items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 animate-pulse" />
                                        Syntax Error: {requestError}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Headers</label>
                                </div>
                                <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                                    {(!localApi.headers || localApi.headers.length === 0) && <div className="p-3 text-xs text-slate-500 text-center">No headers defined</div>}
                                    {(localApi.headers || []).map((h, i) => (
                                        <div key={i} className="flex border-b border-slate-800 last:border-0 p-2 text-sm">
                                            <div className="w-1/3 font-mono text-slate-400">{h.key}</div>
                                            <div className="flex-1 font-mono text-slate-200">{h.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: RESPONSE */}
                    {activeTab === 'response' && (
                        <div className="space-y-6 animate-fade-in">
                            {(localApi.responses || []).length === 0 && <div className="text-center py-6 border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">No responses defined</div>}
                            {(localApi.responses || []).map((resp, idx) => (
                                <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                                    <div className="px-4 py-2 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                                        <div className="flex items-center space-x-3">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${resp.code < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{resp.code}</span>
                                            <span className="text-sm font-medium text-slate-300">{resp.description}</span>
                                        </div>
                                    </div>
                                    <div className="p-0">
                                        <textarea
                                            readOnly
                                            value={resp.body}
                                            className="w-full bg-slate-950 p-4 text-xs font-mono text-blue-300 h-32 resize-none outline-none border-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB: DOWNSTREAM */}
                    {activeTab === 'downstream' && (
                        <DownstreamEditor localApi={localApi} setLocalApi={setLocalApi} projectSettings={projectSettings} allApis={allApis} modules={modules} />
                    )}

                    {/* TAB: CHANNELS */}
                    {activeTab === 'channels' && (
                        <ChannelsEditor localApi={localApi} setLocalApi={setLocalApi} projectSettings={projectSettings} />
                    )}


                    {/* TAB: DOCS */}
                    {activeTab === 'docs' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Swagger URL</label>
                                <input value={localApi.swaggerUrl || ""} onChange={e => setLocalApi({ ...localApi, swaggerUrl: e.target.value })} placeholder="https://api.example.com/swagger.json" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500 font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Swagger API Name (Operation ID)</label>
                                <input value={localApi.swaggerApiName || ""} onChange={e => setLocalApi({ ...localApi, swaggerApiName: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Design Document Link</label>
                                    <input value={localApi.designDoc || ""} onChange={e => setLocalApi({ ...localApi, designDoc: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Reference Link</label>
                                    <input value={localApi.referenceLink || ""} onChange={e => setLocalApi({ ...localApi, referenceLink: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Remarks & Notes</label>
                                <textarea
                                    value={localApi.remarks || ""}
                                    onChange={e => setLocalApi({ ...localApi, remarks: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 h-32 resize-none outline-none focus:border-indigo-500"
                                    placeholder="Add implementation notes, caveats, or developer remarks..."
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB: MAPPER */}
                    {activeTab === 'mapper' && (
                        <DesignMapper localApi={localApi} setLocalApi={setLocalApi} />
                    )}
                </div>
            </div>
        </div>
    );
}

function DownstreamEditor({ localApi, setLocalApi, projectSettings, allApis = [], modules = [] }) {
    const [showAdd, setShowAdd] = useState(false);
    const [mode, setMode] = useState('existing'); // 'existing' | 'new'
    const [selectedExistingId, setSelectedExistingId] = useState("");
    const [newDs, setNewDs] = useState({ name: "", url: "", method: "GET", authType: "None", description: "", priority: 1, providerSystem: "" });

    // Filter out APIs that are already mapped to avoid duplicates
    const availableApis = allApis.filter(a => !localApi.downstream?.some(d => d.id === a.id) && a.id !== localApi.id);

    const addExisting = () => {
        const existingApi = allApis.find(a => a.id === selectedExistingId);
        if (!existingApi) return;

        const ds = [...(localApi.downstream || []), {
            id: existingApi.id,
            name: existingApi.name,
            url: existingApi.url,
            method: existingApi.method,
            providerSystem: existingApi.providerSystem,
            authType: 'None', // Inherit or default
            description: existingApi.description,
            priority: 1,
            isExisting: true
        }];
        setLocalApi({ ...localApi, downstream: ds });
        setShowAdd(false);
        setSelectedExistingId("");
    };

    const add = () => {
        if (!newDs.name) return;
        const ds = [...(localApi.downstream || []), { ...newDs, id: Date.now(), isExisting: false }];
        setLocalApi({ ...localApi, downstream: ds });
        setShowAdd(false);
        setNewDs({ name: "", url: "", method: "GET", authType: "None", description: "", priority: 1, providerSystem: "" });
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Mapped Systems & Downstream APIs</h3>
                <button onClick={() => setShowAdd(true)} className="text-xs text-indigo-400 hover:text-white flex items-center space-x-1"><Plus className="w-3 h-3" /> <span>Add Mapping</span></button>
            </div>

            {showAdd && (
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3">
                    <div className="flex space-x-4 border-b border-slate-700 pb-2 mb-2">
                        <button onClick={() => setMode('existing')} className={`text-xs font-bold ${mode === 'existing' ? 'text-indigo-400' : 'text-slate-500'}`}>Select Existing</button>
                        <button onClick={() => setMode('new')} className={`text-xs font-bold ${mode === 'new' ? 'text-indigo-400' : 'text-slate-500'}`}>Create New</button>
                        <button onClick={() => setMode('swagger')} className={`text-xs font-bold ${mode === 'swagger' ? 'text-pink-400' : 'text-slate-500'}`}>From Swagger</button>
                    </div>

                    {mode === 'existing' ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Select API</label>
                                <select value={selectedExistingId} onChange={e => setSelectedExistingId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none">
                                    <option value="">-- Choose API --</option>
                                    {availableApis.map(api => (
                                        <option key={api.id} value={api.id}>{api.name} ({api.providerSystem || 'Ext'})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2"><button onClick={() => setShowAdd(false)} className="text-xs text-slate-400">Cancel</button><button onClick={addExisting} disabled={!selectedExistingId} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded disabled:opacity-50">Add Selected</button></div>
                        </div>
                    ) : mode === 'new' ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-1">
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">API Name</label>
                                    <input value={newDs.name} onChange={e => setNewDs({ ...newDs, name: e.target.value })} placeholder="Get Balance" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Provider System</label>
                                    <select value={newDs.providerSystem} onChange={e => setNewDs({ ...newDs, providerSystem: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none">
                                        <option value="">Select System</option>
                                        {(projectSettings?.channels?.southbound || []).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <input value={newDs.url} onChange={e => setNewDs({ ...newDs, url: e.target.value })} placeholder="Endpoint URL" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 outline-none" />
                                </div>
                                <div className="col-span-1">
                                    <select value={newDs.method} onChange={e => setNewDs({ ...newDs, method: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none">
                                        {['GET', 'POST', 'PUT', 'DELETE'].map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <select value={newDs.authType} onChange={e => setNewDs({ ...newDs, authType: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none">
                                        <option value="None">Auth: None</option><option value="Basic">Auth: Basic</option><option value="OAuth2">Auth: OAuth2</option><option value="API Key">Auth: API Key</option>
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <input type="number" min="1" value={newDs.priority} onChange={e => setNewDs({ ...newDs, priority: parseInt(e.target.value) })} placeholder="Priority" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                                </div>
                            </div>

                            <textarea value={newDs.description} onChange={e => setNewDs({ ...newDs, description: e.target.value })} placeholder="Description / Purpose" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 h-16 resize-none outline-none" />

                            <div className="flex justify-end gap-2"><button onClick={() => setShowAdd(false)} className="text-xs text-slate-400">Cancel</button><button onClick={add} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded">Create & Map</button></div>
                        </div>
                    ) : (
                        <SwaggerDownstreamForm
                            modules={modules}
                            environments={projectSettings?.environments || []}
                            onCancel={() => setShowAdd(false)}
                            onAdd={(apiData) => {
                                const ds = [...(localApi.downstream || []), { ...apiData, id: Date.now(), isExisting: false }];
                                setLocalApi({ ...localApi, downstream: ds });
                                setShowAdd(false);
                            }}
                        />
                    )}
                </div>
            )}

            <div className="space-y-2">
                {(localApi.downstream || []).length === 0 && !showAdd && <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">No maps</div>}
                {(localApi.downstream || []).map(ds => (
                    <div key={ds.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg group hover:border-indigo-500/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded">{ds.providerSystem || 'Ext'}</span>
                                <span className={`text-[10px] font-bold px-1.5 rounded ${ds.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{ds.method || 'GET'}</span>
                                <span className="text-sm font-medium text-white">{ds.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Pri: {ds.priority || 1}</span>
                                <button onClick={() => setLocalApi({ ...localApi, downstream: localApi.downstream.filter(d => d.id !== ds.id) })}><Trash2 className="w-4 h-4 text-slate-600 hover:text-red-400" /></button>
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mb-1 truncate">{ds.url}</div>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-600">
                            {ds.authType && <span className="flex items-center space-x-1"><Lock className="w-3 h-3" /> <span>{ds.authType}</span></span>}
                            {ds.description && <span>{ds.description}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );
}

function ChannelsEditor({ localApi, setLocalApi, projectSettings }) {
    const consumers = localApi.consumers || [];

    const toggleChannel = (name, type) => {
        const exists = consumers.find(c => c.name === name);
        if (exists) {
            setLocalApi({ ...localApi, consumers: consumers.filter(c => c.name !== name) });
        } else {
            setLocalApi({ ...localApi, consumers: [...consumers, { id: Date.now(), name, type, description: "" }] });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Northbound (NB) Selection */}
            <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Northbound Channels (Consumers)</h3>
                <div className="flex flex-wrap gap-2">
                    {(projectSettings?.channels?.northbound || []).map(ch => {
                        const isActive = consumers.find(c => c.name === ch);
                        return (
                            <button
                                key={ch}
                                onClick={() => toggleChannel(ch, 'NB')}
                                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-2 ${isActive
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <span>{ch}</span>
                                {isActive && <CheckCircle className="w-3 h-3" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Southbound (SB) Selection */}
            <div className="pt-4 border-t border-slate-800">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Southbound Channels (Providers)</h3>
                <div className="flex flex-wrap gap-2">
                    {(projectSettings?.channels?.southbound || []).map(ch => {
                        const isActive = consumers.find(c => c.name === ch);
                        return (
                            <button
                                key={ch}
                                onClick={() => toggleChannel(ch, 'SB')}
                                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-2 ${isActive
                                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <span>{ch}</span>
                                {isActive && <CheckCircle className="w-3 h-3" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="pt-6 border-t border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Mapped Channels List</h3>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-0.5 rounded-full">{consumers.length} Active</span>
                </div>

                <div className="space-y-2">
                    {consumers.length === 0 && (
                        <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl text-xs text-slate-500">
                            No channels mapped. Click the tags above to add.
                        </div>
                    )}
                    {consumers.map(ds => (
                        <div key={ds.id} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <Laptop className="w-3.5 h-3.5 text-slate-600" />
                                    <span className="text-sm font-medium text-white">{ds.name}</span>
                                    <span className="text-[10px] bg-slate-800 px-1 rounded text-slate-400">{ds.type}</span>
                                </div>
                                {ds.description && <div className="text-xs text-slate-500 mt-1 pl-6">{ds.description}</div>}
                            </div>
                            <button onClick={() => setLocalApi({ ...localApi, consumers: localApi.consumers.filter(d => d.id !== ds.id) })}><Trash2 className="w-4 h-4 text-slate-600 hover:text-red-400" /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// NB→SB Mapping Matrix View
function NbSbMappingView({ project, onExportLLD }) {
    const allApis = project.systems?.flatMap(s =>
        s.rootApis?.flatMap(r => r.subApis?.map(a => ({
            ...a,
            serviceName: r.name,
            systemName: s.name
        }))) || []
    ) || [];

    const mappedApis = allApis.filter(a =>
        (a.consumers && a.consumers.length > 0) || (a.downstream && a.downstream.length > 0)
    );

    const nbChannels = [...new Set(allApis.flatMap(a => (a.consumers || []).map(c => c.name)))];
    const sbSystems = [...new Set(allApis.flatMap(a => (a.downstream || []).map(d => d.providerSystem || d.name).filter(Boolean)))];

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">NB → SB Mapping</h2>
                    <p className="text-slate-400 text-sm mt-1">Northbound consumer to southbound provider mapping across all APIs</p>
                </div>
                <button
                    onClick={onExportLLD}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                >
                    <FileText className="w-4 h-4" />
                    <span>Export LLD JSON</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Total APIs</div>
                    <div className="text-3xl font-bold text-white">{allApis.length}</div>
                </div>
                <div className="bg-slate-900 border border-indigo-500/20 rounded-xl p-4">
                    <div className="text-xs font-bold text-indigo-400 uppercase mb-1">NB Channels</div>
                    <div className="text-3xl font-bold text-indigo-400">{nbChannels.length}</div>
                    <div className="text-xs text-slate-500 mt-1 truncate">{nbChannels.join(', ') || '—'}</div>
                </div>
                <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4">
                    <div className="text-xs font-bold text-emerald-400 uppercase mb-1">SB Systems</div>
                    <div className="text-3xl font-bold text-emerald-400">{sbSystems.length}</div>
                    <div className="text-xs text-slate-500 mt-1 truncate">{sbSystems.join(', ') || '—'}</div>
                </div>
            </div>

            {/* Mapping Table */}
            {mappedApis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
                    <Share2 className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No mappings yet</p>
                    <p className="text-sm">Add NB channels and downstream SB APIs to each endpoint to see the mapping here.</p>
                </div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/80">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{mappedApis.length} Mapped APIs</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left">API</th>
                                    <th className="px-4 py-3 text-left">Service / System</th>
                                    <th className="px-4 py-3 text-left">Method</th>
                                    <th className="px-4 py-3 text-left">NB Consumers</th>
                                    <th className="px-4 py-3 text-left">SB Providers</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mappedApis.map((a, idx) => (
                                    <tr key={a.id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-900/30'}`}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-white">{a.name}</div>
                                            <div className="text-xs text-slate-500 font-mono truncate max-w-[200px]">{a.url}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-300">{a.serviceName}</div>
                                            <div className="text-xs text-slate-500">{a.systemName}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : a.method === 'POST' ? 'bg-blue-500/10 text-blue-400' : a.method === 'DELETE' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{a.method}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {(a.consumers || []).length === 0
                                                    ? <span className="text-slate-600 text-xs">—</span>
                                                    : (a.consumers || []).map(c => (
                                                        <span key={c.name} className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] rounded-full font-medium">{c.name}</span>
                                                    ))
                                                }
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {(a.downstream || []).length === 0
                                                    ? <span className="text-slate-600 text-xs">—</span>
                                                    : (a.downstream || []).map(d => (
                                                        <span key={d.id || d.name} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] rounded-full font-medium">{d.providerSystem || d.name}</span>
                                                    ))
                                                }
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'Active' || a.status === 'Published' ? 'bg-emerald-500/10 text-emerald-400' : a.status === 'Draft' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>{a.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// Main Workspace Component (The Dashboard)
export default function ProjectDashboard({ project, onBack, onRefresh }) {
    const [currentView, setCurrentView] = useState('dashboard'); // dashboard, settings
    const [selectedSystemId, setSelectedSystemId] = useState(project.systems?.[0]?.id);
    const [selectedRootId, setSelectedRootId] = useState(null);
    const [selectedModuleId, setSelectedModuleId] = useState(null); // NEW: Module Selection
    const [selectedAuthView, setSelectedAuthView] = useState(false);
    const [isCreatingRoot, setIsCreatingRoot] = useState(false); // Modal state
    const [selectedSubApi, setSelectedSubApi] = useState(null);
    const [testApiTarget, setTestApiTarget] = useState(null); // New for dedicated test drawer
    const [expandedApiId, setExpandedApiId] = useState(null); // NEW: Track In-place expansion
    const [systemViewMode, setSystemViewMode] = useState('services'); // 'services' (cards) | 'apis' (flat list)
    const [mainPromptConfig, setMainPromptConfig] = useState(null);

    // Filters
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterChannel, setFilterChannel] = useState('All');
    const [searchQuery, setSearchQuery] = useState(''); // NEW: Search Filter

    // Update derived state when project changes (e.g. after refresh)
    useEffect(() => {
        if (!selectedSystemId && project.systems?.length > 0) {
            setSelectedSystemId(project.systems[0].id);
        }
    }, [project]);

    const activeSystem = project.systems?.find(s => s.id === selectedSystemId);
    const activeRoot = activeSystem?.rootApis?.find(r => r.id === selectedRootId);
    const activeModule = project.modules?.find(m => m.id === selectedModuleId); // NEW: Active Module

    // Flatten all APIs for filtering and downstream selection
    const allSystemApis = project.systems?.flatMap(s => s.rootApis?.flatMap(r => r.subApis)) || [];

    const handleCreateSystem = async () => {
        setMainPromptConfig({
            title: "New System",
            placeholder: "e.g. CRM, Billing, VAS",
            onConfirm: async (name) => {
                if (!name) return;
                try {
                    await api.createSystem(project.id, name);
                    setMainPromptConfig(null);
                    onRefresh();
                } catch (e) { alert("Failed to create system"); }
            }
        });
    };

    const handleCreateModule = async () => {
        setMainPromptConfig({
            title: "New Module",
            placeholder: "e.g. Core Banking, eShop",
            onConfirm: async (name) => {
                if (!name) return;
                try {
                    await api.createModule({ projectId: project.id, name, description: 'New Module', swagger: '' });
                    setMainPromptConfig(null);
                    onRefresh();
                } catch (e) { alert('Failed to create module'); }
            }
        });
    };

    const handleUpdateModule = async (id, data) => {
        try {
            await api.updateModule(id, data);
            onRefresh();
        } catch (e) {
            alert("Failed to save module");
        }
    };

    const handleCreateRootApi = async (name, version, context, desc) => {
        if (!activeSystem) return;
        try {
            await api.createRootApi({
                systemId: activeSystem.id,
                name, version, context, description: desc
            });
            setIsCreatingRoot(false);
            onRefresh();
        } catch (e) {
            alert('Failed to create service');
        }
    };

    const handleUpdateSubApi = async (updatedApi) => {
        // Validation: Must have a rootApiId
        const parentId = updatedApi.rootApiId || activeRoot?.id;
        if (!parentId) {
            alert("Please select a Parent Service for this API");
            return;
        }

        try {
            await api.saveSubApi({ ...updatedApi, rootApiId: parentId });
            setSelectedSubApi(null);
            onRefresh();
        } catch (e) {
            alert('Failed to save endpoint');
        }
    };

    const handleUpdateSettings = async (newSettings) => {
        try {
            await api.updateProjectSettings(project.id, newSettings);
            onRefresh();
        } catch (e) {
            alert('Failed to update settings');
        }
    };

    const handleExposeWso2 = async (apiId) => {
        if (!confirm("Are you sure you want to expose this API to WSO2 APIM Gateway?")) return;
        try {
            const res = await api.publishToWso2(apiId);
            // res could be { success: true, wso2Id... } or { error... }
            if (res.success) {
                alert(`API Published Successfully!\nWSO2 ID: ${res.wso2Id}\nContext: ${res.context}`);
                onRefresh();
            } else {
                alert(`Failed to Publish: ${res.details || res.error}`);
            }
        } catch (e) {
            alert(`Error: ${e.message}`);
        }
    };

    // Swagger Modal State
    const [showSwaggerModal, setShowSwaggerModal] = useState(null);
    const [swaggerSpec, setSwaggerSpec] = useState(null);

    useEffect(() => {
        if (showSwaggerModal && project.type === 'WSO2_REMOTE') {
            // Fetch dynamic swagger
            setSwaggerSpec(null); // Reset

            // Fallback: If wso2_id is missing (stale state), try to extract from composite ID
            let targetId = showSwaggerModal.wso2_id;
            if (!targetId && showSwaggerModal.id) {
                // Composite ID format: "UUID_op_INDEX" or just "UUID"
                targetId = showSwaggerModal.id.split('_op_')[0];
            }

            if (!targetId) {
                alert("Cannot determine WSO2 API ID");
                return;
            }

            api.getWso2ApiSwagger(project.id, targetId)
                .then(setSwaggerSpec)
                .catch(err => {
                    alert('Failed to load Swagger: ' + err.message);
                    setShowSwaggerModal(null);
                });
        }
    }, [showSwaggerModal]);


    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-[260px] bg-slate-900/90 border-r border-slate-800 flex flex-col backdrop-blur-xl shrink-0">
                <div className="p-6 flex items-center space-x-3 cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={onBack}>
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                        <ArrowRight className="text-white w-4 h-4 rotate-180" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Project</div>
                        <div className="text-sm font-bold text-white truncate max-w-[140px]">{project.name}</div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-2">
                    <div className="px-3 mb-2 flex items-center justify-between group">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Systems</h3>
                        <button onClick={handleCreateSystem} className="text-slate-500 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="space-y-0.5">
                        {project.systems?.map(sys => (
                            <button
                                key={sys.id}
                                onClick={() => { setSelectedSystemId(sys.id); setSelectedRootId(null); setSelectedModuleId(null); setSelectedAuthView(false); setCurrentView('dashboard'); setSystemViewMode('services'); }}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-3 group ${selectedSystemId === sys.id && !selectedModuleId && !selectedAuthView && currentView === 'dashboard'
                                    ? 'bg-slate-800 text-white shadow-md'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                                    }`}
                            >
                                <Box className={`w-4 h-4 ${selectedSystemId === sys.id && !selectedModuleId && !selectedAuthView ? 'text-indigo-400' : 'text-slate-600'}`} />
                                <span className="truncate flex-1 text-sm font-medium">{sys.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Modules Section */}
                    <div className="px-3 mt-6 mb-2 flex items-center justify-between group">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modules</h3>
                        <button onClick={handleCreateModule} className="text-slate-500 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="space-y-0.5">
                        {project.modules?.map(mod => (
                            <button
                                key={mod.id}
                                onClick={() => { setSelectedModuleId(mod.id); setSelectedSystemId(null); setSelectedAuthView(false); setCurrentView('dashboard'); }}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-3 group ${selectedModuleId === mod.id && !selectedAuthView
                                    ? 'bg-slate-800 text-white shadow-md'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                                    }`}
                            >
                                <BookOpen className={`w-4 h-4 ${selectedModuleId === mod.id && !selectedAuthView ? 'text-pink-400' : 'text-slate-600'}`} />
                                <span className="truncate flex-1 text-sm font-medium">{mod.name}</span>
                            </button>
                        ))}
                        {(project.modules || []).length === 0 && (
                            <div className="px-3 py-2 text-xs text-slate-600 italic">No modules defined</div>
                        )}
                    </div>

                    {/* Authentications Section */}
                    <div className="px-3 mt-6 mb-2 flex items-center justify-between group">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authentication</h3>
                    </div>
                    <div className="space-y-0.5">
                        <button
                            onClick={() => { setSelectedAuthView(true); setSelectedModuleId(null); setSelectedSystemId(null); setCurrentView('dashboard'); }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-3 group ${selectedAuthView
                                ? 'bg-slate-800 text-white shadow-md'
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                                }`}
                        >
                            <Key className={`w-4 h-4 ${selectedAuthView ? 'text-emerald-400' : 'text-slate-600'}`} />
                            <span className="truncate flex-1 text-sm font-medium">Saved Profiles</span>
                        </button>
                        <button
                            onClick={() => { setSelectedAuthView(false); setSelectedModuleId(null); setSelectedSystemId(null); setCurrentView('testLogs'); }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-3 group ${currentView === 'testLogs'
                                ? 'bg-slate-800 text-white shadow-md'
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                                }`}
                        >
                            <History className={`w-4 h-4 ${currentView === 'testLogs' ? 'text-indigo-400' : 'text-slate-600'}`} />
                            <span className="truncate flex-1 text-sm font-medium">Test History</span>
                        </button>
                    </div>
                </div>

                <div className="p-2 border-t border-slate-800">
                    <button
                        onClick={() => { setSelectedAuthView(false); setSelectedModuleId(null); setSelectedSystemId(null); setCurrentView('nbsbMap'); }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mb-1 ${currentView === 'nbsbMap' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <Share2 className="w-4 h-4" />
                        <span className="text-sm font-medium">NB→SB Map</span>
                    </button>
                    <button
                        onClick={() => setCurrentView('settings')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'settings' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm font-medium">Project Settings</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 transition-all overflow-hidden">
                {currentView === 'settings' ? (
                    <ProjectSettings settings={project.settings} onUpdate={handleUpdateSettings} />
                ) : currentView === 'testLogs' ? (
                    <TestLogsManager project={project} />
                ) : currentView === 'nbsbMap' ? (
                    <NbSbMappingView project={project} onExportLLD={async () => {
                        try {
                            const lld = await api.getLLDExport(project.id);
                            const blob = new Blob([JSON.stringify(lld, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${project.name.replace(/\s+/g, '_')}_LLD_${new Date().toISOString().slice(0, 10)}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                        } catch (e) {
                            alert('LLD Export failed: ' + e.message);
                        }
                    }} />
                ) : selectedAuthView ? (
                    <AuthProfilesManager project={project} onRefresh={onRefresh} />
                ) : selectedModuleId && activeModule ? (
                    <ModuleViewer
                        module={activeModule}
                        environments={project.settings?.environments || ['DEV', 'SIT', 'UAT', 'PROD']}
                        onUpdate={handleUpdateModule}
                        project={project}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 z-10 shrink-0">
                            <div className="flex items-center space-x-2 text-sm">
                                {selectedRootId && activeRoot ? (
                                    <>
                                        <button onClick={() => setSelectedRootId(null)} className="text-slate-400 hover:text-white transition-colors">{activeSystem?.name}</button>
                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                        <span className="text-indigo-400 font-semibold">{activeRoot.name}</span>
                                    </>
                                ) : (
                                    <h1 className="text-xl font-bold text-white">{activeSystem?.name || "System Dashboard"}</h1>
                                )}
                            </div>

                            {!selectedRootId && activeSystem && (
                                <div className="flex items-center space-x-4">
                                    <div className="relative group">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search services or APIs..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-slate-900 border border-slate-800 focus:border-indigo-500/50 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 outline-none w-64 transition-all"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
                                        <button
                                            onClick={() => setSystemViewMode('services')}
                                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${systemViewMode === 'services' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            <Grid className="w-3.5 h-3.5" /> <span>Services</span>
                                        </button>
                                        <button
                                            onClick={() => setSystemViewMode('apis')}
                                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${systemViewMode === 'apis' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            <LayoutList className="w-3.5 h-3.5" /> <span>All APIs</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </header>

                        <div className="flex-1 overflow-y-auto p-8">
                            {!selectedRootId && activeSystem && systemViewMode === 'services' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                    {/* Create New Root API Card */}
                                    {!searchQuery && (
                                        <button
                                            onClick={() => setIsCreatingRoot(true)}
                                            className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-600 hover:text-slate-400 bg-slate-900/30 min-h-[140px]"
                                        >
                                            <Plus className="w-8 h-8 mb-2" />
                                            <span className="font-medium">Create New Service</span>
                                        </button>
                                    )}

                                    {activeSystem.rootApis?.filter(svc => {
                                        if (!searchQuery) return true;
                                        const query = searchQuery.toLowerCase();
                                        const svcMatch = svc.name.toLowerCase().includes(query) || svc.description?.toLowerCase().includes(query);
                                        const apiMatch = svc.subApis?.some(api =>
                                            api.name.toLowerCase().includes(query) ||
                                            api.url.toLowerCase().includes(query) ||
                                            api.description?.toLowerCase().includes(query)
                                        );
                                        return svcMatch || apiMatch;
                                    }).map(api => (
                                        <div
                                            key={api.id}
                                            onClick={() => setSelectedRootId(api.id)}
                                            className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer transition-all hover:shadow-2xl hover:shadow-indigo-500/10"
                                        >
                                            <div className="flex justify-between items-start mb-2 gap-4">
                                                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors leading-tight truncate flex-1" title={api.name}>{api.name}</h3>
                                                <span className="text-[10px] font-black bg-slate-800 text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter shrink-0">{api.version}</span>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2 h-10">{api.description}</p>
                                            <div className="mt-6 flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                                    <span className="text-xs font-bold text-slate-400 tracking-wide uppercase">{api.subApis?.length || 0} Endpoints</span>
                                                </div>
                                                <div className="p-2 bg-slate-800/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!selectedRootId && activeSystem && systemViewMode === 'apis' && (
                                <div className="animate-fade-in space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="text-sm text-slate-400 mr-2">Filters:</div>
                                            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-300 outline-none">
                                                <option value="All">All Categories</option>
                                                {(project.settings?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-300 outline-none">
                                                <option value="All">All Channels</option>
                                                <optgroup label="Northbound">
                                                    {(project.settings?.channels?.northbound || []).map(c => <option key={c} value={c}>{c}</option>)}
                                                </optgroup>
                                                <optgroup label="Southbound">
                                                    {(project.settings?.channels?.southbound || []).map(c => <option key={c} value={c}>{c}</option>)}
                                                </optgroup>
                                            </select>
                                        </div>

                                        <button
                                            onClick={() => setSelectedSubApi({
                                                id: `temp_${Date.now()}`,
                                                name: "New Endpoint",
                                                method: "GET", url: "",
                                                downstream: [], consumers: [],
                                                authentication: { type: "None" },
                                                // Pre-select first service if available
                                                rootApiId: activeSystem.rootApis?.[0]?.id
                                            })}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 shadow-lg shadow-indigo-500/20"
                                        >
                                            <Plus className="w-4 h-4" /> <span>Add Endpoint</span>
                                        </button>
                                    </div>

                                    {/* Flat List Table Header */}
                                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-900/50 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <div className="col-span-3">Name</div>
                                        <div className="col-span-1 text-center">Method</div>
                                        <div className="col-span-3">URL</div>
                                        <div className="col-span-1 text-center">Service</div>
                                        <div className="col-span-1 text-center">System</div>
                                        <div className="col-span-1 text-center">Status</div>
                                        <div className="col-span-2 text-right px-4">Actions</div>
                                    </div>

                                    {/* List */}
                                    <div className="space-y-1">
                                        {activeSystem.rootApis?.flatMap(svc => svc.subApis?.map(apiItem => ({ ...apiItem, _svcName: svc.name })) || [])
                                            .filter(apiItem => {
                                                // Category Filter
                                                if (filterCategory !== 'All' && apiItem.module !== filterCategory) return false;

                                                // Channel Filter
                                                if (filterChannel !== 'All') {
                                                    const nbMatch = apiItem.consumers?.some(c => c.name === filterChannel);
                                                    const sbMatch = apiItem.downstream?.some(d => d.name === filterChannel);
                                                    const provMatch = apiItem.providerSystem === filterChannel;
                                                    if (!nbMatch && !sbMatch && !provMatch) return false;
                                                }

                                                // NEW: Search Filter
                                                if (searchQuery) {
                                                    const query = searchQuery.toLowerCase();
                                                    const matches =
                                                        apiItem.name.toLowerCase().includes(query) ||
                                                        apiItem.url.toLowerCase().includes(query) ||
                                                        apiItem.description?.toLowerCase().includes(query) ||
                                                        apiItem._svcName.toLowerCase().includes(query);
                                                    if (!matches) return false;
                                                }

                                                return true;
                                            })
                                            .map(apiItem => (
                                                <div key={apiItem.id} className="space-y-1">
                                                    <div
                                                        onClick={() => setExpandedApiId(expandedApiId === apiItem.id ? null : apiItem.id)}
                                                        className={`grid grid-cols-12 gap-4 px-4 py-3 border transition-all items-center cursor-pointer rounded-lg ${expandedApiId === apiItem.id ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                                    >
                                                        <div className="col-span-3 flex items-center space-x-2 min-w-0">
                                                            <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${expandedApiId === apiItem.id ? 'rotate-90 text-indigo-400' : ''} shrink-0`} />
                                                            <span className="font-medium text-white truncate" title={apiItem.name}>{apiItem.name}</span>
                                                        </div>
                                                        <div className="col-span-1 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${apiItem.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{apiItem.method}</span>
                                                        </div>
                                                        <div className="col-span-3 font-mono text-xs text-slate-400 truncate" title={apiItem.url}>{apiItem.url}</div>
                                                        <div className="col-span-1 text-[10px] text-indigo-400 font-bold uppercase truncate text-center">{apiItem._svcName}</div>
                                                        <div className="col-span-1 text-[10px] text-slate-400 font-bold text-center">{apiItem.providerSystem || '-'}</div>
                                                        <div className="col-span-1 text-center"><span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{apiItem.status || 'Draft'}</span></div>
                                                        <div className="col-span-2 flex justify-end px-2 space-x-1">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setTestApiTarget(apiItem); }}
                                                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors flex items-center space-x-2 group"
                                                                title="Advanced API Test"
                                                            >
                                                                <Play className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setShowSwaggerModal(apiItem); }}
                                                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition-colors flex items-center space-x-2 group"
                                                                title="View Swagger"
                                                            >
                                                                <FileJson className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setSelectedSubApi(apiItem); }}
                                                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors flex items-center space-x-2 group"
                                                                title="View Details"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleExposeWso2(apiItem.id); }}
                                                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-sky-400 transition-colors flex items-center space-x-2 group"
                                                                title="Expose to WSO2"
                                                            >
                                                                <Globe className="w-4 h-4" />
                                                            </button>


                                                        </div>
                                                    </div>

                                                    {/* Child Tree (Downstream APIs) */}
                                                    {expandedApiId === apiItem.id && (
                                                        <div className="ml-8 mb-4 mt-1 border-l-2 border-indigo-500/20 pl-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                                                                <ArrowRight className="w-3 h-3 text-indigo-500" />
                                                                <span>Downstream Dependencies</span>
                                                            </div>
                                                            {(!apiItem.downstream || apiItem.downstream.length === 0) ? (
                                                                <div className="text-[10px] text-slate-600 italic py-2 pl-5 flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                                                    No downstream dependencies mapped for this endpoint
                                                                </div>
                                                            ) : (
                                                                apiItem.downstream.map(ds => (
                                                                    <div key={ds.id} className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-800/20 border border-slate-800/50 rounded-xl items-center hover:bg-slate-800/40 transition-colors">
                                                                        <div className="col-span-4 flex items-center space-x-3">
                                                                            <Database className="w-3.5 h-3.5 text-slate-500" />
                                                                            <span className="text-xs font-semibold text-slate-300">{ds.name}</span>
                                                                        </div>
                                                                        <div className="col-span-1">
                                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${ds.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{ds.method}</span>
                                                                        </div>
                                                                        <div className="col-span-4 font-mono text-[10px] text-slate-500 truncate">{ds.url}</div>
                                                                        <div className="col-span-2">
                                                                            <span className="px-2 py-0.5 rounded-full bg-slate-900/50 border border-slate-700/50 text-[9px] text-slate-500 font-bold uppercase">{ds.providerSystem || 'Ext'}</span>
                                                                        </div>
                                                                        <div className="col-span-1 text-[9px] text-slate-600 font-bold">{ds.authType}</div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {selectedRootId && activeRoot && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-indigo-600/20 p-2 rounded-xl">
                                                <LayersIcon className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-white leading-tight">Endpoints</h2>
                                                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{activeRoot.name} Service</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedSubApi({ id: `temp_${Date.now()}`, name: "New Endpoint", method: "GET", url: "", downstream: [], consumers: [], authentication: { type: "None" } })}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all shadow-lg shadow-indigo-500/20"
                                        >
                                            <Plus className="w-4 h-4" /> <span>Add Endpoint</span>
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {activeRoot.subApis?.filter(sub => {
                                            if (!searchQuery) return true;
                                            const query = searchQuery.toLowerCase();
                                            return (
                                                sub.name.toLowerCase().includes(query) ||
                                                sub.url.toLowerCase().includes(query) ||
                                                sub.description?.toLowerCase().includes(query)
                                            );
                                        }).map(sub => (
                                            <div key={sub.id} className="space-y-1">
                                                <div
                                                    onClick={() => setExpandedApiId(expandedApiId === sub.id ? null : sub.id)}
                                                    className={`flex items-center justify-between p-4 border transition-all cursor-pointer rounded-xl ${expandedApiId === sub.id ? 'bg-indigo-500/5 border-indigo-500/30 shadow-inner' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                                                >
                                                    <div className="flex items-center space-x-4 min-w-0">
                                                        <ChevronRight className={`w-4 h-4 text-slate-500 transition-all duration-300 ${expandedApiId === sub.id ? 'rotate-90 text-indigo-400' : ''} shrink-0`} />
                                                        <span className={`px-2 py-1 rounded text-[10px] font-extrabold tracking-tight shrink-0 ${sub.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{sub.method}</span>
                                                        <div className="min-w-0">
                                                            <div className="text-white text-sm font-bold truncate" title={sub.name}>{sub.name}</div>
                                                            <div className="text-slate-500 text-[11px] font-mono mt-0.5 truncate" title={sub.url}>{sub.url}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setTestApiTarget(sub); }}
                                                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors flex items-center space-x-2 group"
                                                        >
                                                            <Play className="w-4 h-4" />
                                                            <span className="text-[10px] font-bold uppercase hidden group-hover:inline">Test API</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setShowSwaggerModal(sub); }}
                                                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition-colors flex items-center space-x-2 group"
                                                        >
                                                            <FileJson className="w-4 h-4" />
                                                            <span className="text-[10px] font-bold uppercase hidden group-hover:inline">Swagger</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedSubApi(sub); }}
                                                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors flex items-center space-x-2 group"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            <span className="text-[10px] font-bold uppercase hidden group-hover:inline">View Details</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Child Tree (Downstream APIs) */}
                                                {expandedApiId === sub.id && (
                                                    <div className="ml-8 mb-4 mt-1 border-l-2 border-indigo-500/20 pl-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2 mb-4 opacity-70">
                                                            <ArrowRight className="w-3 h-3 text-indigo-500" />
                                                            <span>Downstream Dependencies</span>
                                                        </div>

                                                        {(!sub.downstream || sub.downstream.length === 0) ? (
                                                            <div className="text-[11px] text-slate-600 italic py-2 flex items-center gap-3">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                                                No dependencies mapped for this endpoint
                                                            </div>
                                                        ) : (
                                                            <div className="grid gap-2">
                                                                {sub.downstream.map(ds => (
                                                                    <div key={ds.id} className="flex items-center justify-between px-5 py-3.5 bg-slate-800/20 border border-slate-800/40 rounded-2xl hover:bg-slate-800/40 transition-all group">
                                                                        <div className="flex items-center space-x-4">
                                                                            <div className="p-2 bg-slate-900/50 rounded-lg border border-slate-800 group-hover:border-slate-700 transition-colors">
                                                                                <Database className="w-4 h-4 text-slate-500" />
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-xs font-bold text-slate-300">{ds.name}</div>
                                                                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ds.url}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center space-x-4">
                                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${ds.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{ds.method}</span>
                                                                            <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{ds.providerSystem || 'Ext'}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main >

            {/* Swagger Modal */}
            {showSwaggerModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
                    <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                        <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileJson className="w-5 h-5 text-amber-500" />
                                Swagger UI: {showSwaggerModal.name}
                            </h3>
                            <button onClick={() => setShowSwaggerModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-white p-4">
                            {swaggerSpec ? (
                                <SwaggerUI spec={swaggerSpec} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                                    <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></div>
                                    Loading Definition...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {
                isCreatingRoot && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Create New API Service</h3>
                                <button onClick={() => setIsCreatingRoot(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                handleCreateRootApi(
                                    formData.get('name'),
                                    formData.get('version'),
                                    formData.get('context'),
                                    formData.get('description')
                                );
                            }} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Service Name</label>
                                    <input name="name" required placeholder="e.g. Payment Gateway" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Context</label>
                                        <input name="context" required placeholder="/api/v1/payments" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Version</label>
                                        <input name="version" defaultValue="v1.0.0" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                                    <textarea name="description" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none h-24 resize-none"></textarea>
                                </div>
                                <div className="pt-4 flex justify-end space-x-3">
                                    <button type="button" onClick={() => setIsCreatingRoot(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20">Create Service</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                testApiTarget && (
                    <TestDrawer
                        api={testApiTarget}
                        project={project}
                        onRefresh={onRefresh}
                        onClose={() => setTestApiTarget(null)}
                    />
                )
            }
            {
                selectedSubApi && (
                    <SubApiDrawer
                        api={selectedSubApi}
                        onClose={() => setSelectedSubApi(null)}
                        onSave={handleUpdateSubApi}
                        project={project}
                        services={activeSystem?.rootApis || []}
                        allApis={allSystemApis}
                        modules={project.modules || []}
                    />
                )
            }

            <PromptModal
                isOpen={!!mainPromptConfig}
                title={mainPromptConfig?.title}
                placeholder={mainPromptConfig?.placeholder}
                onConfirm={mainPromptConfig?.onConfirm}
                onCancel={() => setMainPromptConfig(null)}
            />
        </div >
    );
}

function AuthProfilesManager({ project, onRefresh }) {
    const [profiles, setProfiles] = useState(project.authProfiles || []);
    const [isAdding, setIsAdding] = useState(false);
    const [newProfile, setNewProfile] = useState({ name: '', type: 'Bearer', details: {} });

    useEffect(() => {
        setProfiles(project.authProfiles || []);
    }, [project.authProfiles]);

    const handleCreate = async () => {
        if (!newProfile.name) return alert("Name is required");
        try {
            await api.createAuthProfile(project.id, newProfile);
            setIsAdding(false);
            setNewProfile({ name: '', type: 'Bearer', details: {} });
            onRefresh();
        } catch (e) {
            alert("Failed to create profile");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure?")) return;
        try {
            await api.deleteAuthProfile(id);
            onRefresh();
        } catch (e) {
            alert("Failed to delete profile");
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
            <div className="p-8 pb-4 shrink-0 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Authentication Profiles</h1>
                    <p className="text-slate-400 text-sm">Manage reusable security configurations for API testing.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Plus className="w-5 h-5" /> <span>Create Profile</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {profiles.map(profile => (
                        <div key={profile.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-500/10 rounded-xl">
                                    <Shield className="w-6 h-6 text-emerald-400" />
                                </div>
                                <button
                                    onClick={() => handleDelete(profile.id)}
                                    className="text-slate-600 hover:text-red-400 transition-colors p-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">{profile.name}</h3>
                            <span className="text-[10px] font-black bg-slate-800 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-tighter mb-4 inline-block">{profile.type}</span>

                            <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                                {profile.type === 'Bearer' && (
                                    <div className="text-[10px] font-mono text-slate-500 truncate">Token: {profile.details?.token?.substring(0, 15)}...</div>
                                )}
                                {profile.type === 'Basic' && (
                                    <div className="text-[10px] font-mono text-slate-500">User: {profile.details?.username}</div>
                                )}
                                {profile.type === 'API Key' && (
                                    <div className="text-[10px] font-mono text-slate-500">Key: {profile.details?.key}</div>
                                )}
                            </div>
                        </div>
                    ))}
                    {profiles.length === 0 && !isAdding && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
                            <Key className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-medium">No saved authentication profiles</p>
                            <p className="text-xs mt-1">Create one to quickly apply it during tests</p>
                        </div>
                    )}
                </div>
            </div>

            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl animate-scale-in">
                        <div className="p-8 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">New Auth Profile</h3>
                            <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white p-2"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Profile Name</label>
                                <input
                                    value={newProfile.name}
                                    onChange={e => setNewProfile({ ...newProfile, name: e.target.value })}
                                    placeholder="e.g. Staging Admin"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Auth Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Bearer', 'Basic', 'API Key'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setNewProfile({ ...newProfile, type: t, details: {} })}
                                            className={`py-2 text-[10px] font-bold border rounded-lg transition-all ${newProfile.type === t ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-black' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 space-y-4">
                                {newProfile.type === 'Bearer' && (
                                    <input
                                        value={newProfile.details.token || ""}
                                        onChange={e => setNewProfile({ ...newProfile, details: { ...newProfile.details, token: e.target.value } })}
                                        placeholder="Bearer Token"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:border-emerald-500"
                                    />
                                )}
                                {newProfile.type === 'Basic' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <input value={newProfile.details.username || ""} onChange={e => setNewProfile({ ...newProfile, details: { ...newProfile.details, username: e.target.value } })} placeholder="Username" className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none text-white" />
                                        <input value={newProfile.details.password || ""} onChange={e => setNewProfile({ ...newProfile, details: { ...newProfile.details, password: e.target.value } })} type="password" placeholder="Password" className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none text-white" />
                                    </div>
                                )}
                                {newProfile.type === 'API Key' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <input value={newProfile.details.key || ""} onChange={e => setNewProfile({ ...newProfile, details: { ...newProfile.details, key: e.target.value } })} placeholder="Header Name" className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none text-white" />
                                        <input value={newProfile.details.value || ""} onChange={e => setNewProfile({ ...newProfile, details: { ...newProfile.details, value: e.target.value } })} placeholder="Value" className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm outline-none text-white" />
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 flex justify-end space-x-4">
                                <button onClick={() => setIsAdding(false)} className="px-6 py-3 text-slate-400 hover:text-white font-bold transition-all">Cancel</button>
                                <button onClick={handleCreate} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all">Save Profile</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TestLogsManager({ project }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await api.getTestLogs(project.id);
            setLogs(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
            <div className="p-8 border-b border-slate-900 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Execution Logs</h1>
                    <p className="text-slate-400 text-sm">Review recent API test executions and results.</p>
                </div>
                <button
                    onClick={loadLogs}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg"
                >
                    <Activity className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* List */}
                <div className="w-1/3 border-r border-slate-900 overflow-y-auto p-4 space-y-3">
                    {logs.map(log => (
                        <div
                            key={log.id}
                            onClick={() => setSelectedLog(log)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedLog?.id === log.id ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg' : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${log.response_status < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {log.response_status}
                                </span>
                                <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-xs font-bold text-white truncate mb-1">{log.method} {log.url}</div>
                            <div className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">Duration: {log.duration} • By {log.tested_by}</div>
                        </div>
                    ))}
                    {logs.length === 0 && !loading && (
                        <div className="py-20 text-center text-slate-600">
                            <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No test logs found</p>
                        </div>
                    )}
                </div>

                {/* Detail */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-950/50">
                    {selectedLog ? (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">Log Details</h2>
                                <span className="text-[10px] font-mono text-slate-500">{selectedLog.id}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Request</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">URL</span>
                                            <span className="text-white font-mono">{selectedLog.url}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Method</span>
                                            <span className="text-indigo-400 font-black">{selectedLog.method}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Headers</span>
                                        <pre className="bg-slate-900 rounded-xl p-4 text-[10px] text-slate-400 overflow-x-auto border border-slate-800">
                                            {JSON.stringify(selectedLog.request_headers, null, 2)}
                                        </pre>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Response</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Status</span>
                                            <span className={selectedLog.response_status < 300 ? 'text-emerald-400' : 'text-red-400'}>{selectedLog.response_status}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Duration</span>
                                            <span className="text-white font-mono">{selectedLog.duration}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Body</span>
                                        <pre className="bg-slate-900 rounded-xl p-4 text-[10px] text-blue-300 overflow-x-auto border border-slate-800 max-h-60 overflow-y-auto">
                                            {JSON.stringify(selectedLog.response_body, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-700">
                            <Layers className="w-16 h-16 mb-4 opacity-10" />
                            <p className="text-lg font-medium">Select a log execution to view details</p>
                            <p className="text-sm">Comprehensive breakdown of payloads and audit trails.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ProjectSettings({ settings, onUpdate }) {


    const [localSettings, setLocalSettings] = useState(settings || { categories: [], channels: [] });
    const [activeTab, setActiveTab] = useState('categories');
    const [promptConfig, setPromptConfig] = useState(null);

    const tabs = [
        { id: 'categories', label: 'Categories', icon: Tag },
        { id: 'channels', label: 'Channels', icon: Share2 },
        { id: 'marketSegments', label: 'Market Segments', icon: LayoutGrid },
        { id: 'environments', label: 'Environments', icon: Globe },
    ];

    const addItem = (type, subType = null) => {
        setPromptConfig({
            mode: 'add',
            type,
            subType,
            title: `New ${subType || type}`,
            placeholder: `e.g. ${type === 'environments' ? 'STAGING' : 'New ' + (subType || type)}`
        });
    };

    const editItem = (type, oldVal, subType = null) => {
        setPromptConfig({
            mode: 'edit',
            type,
            subType,
            oldValue: oldVal,
            title: `Edit ${subType || type}`,
            initialValue: oldVal
        });
    };

    const deleteItem = (type, val, subType = null) => {
        if (!confirm(`Are you sure you want to delete "${val}"?`)) return;

        setLocalSettings(prev => {
            let upd;
            if (subType) {
                upd = {
                    ...prev,
                    channels: {
                        ...prev.channels,
                        [subType]: prev.channels?.[subType]?.filter(v => v !== val)
                    }
                };
            } else {
                upd = { ...prev, [type]: prev[type]?.filter(v => v !== val) };
            }
            onUpdate(upd);
            return upd;
        });
    };

    const handleConfirmPrompt = (val) => {
        if (!val || !promptConfig) return;
        const { type, subType, mode, oldValue } = promptConfig;

        setLocalSettings(prev => {
            let upd;
            if (subType) {
                const list = [...(prev.channels?.[subType] || [])];
                if (mode === 'edit') {
                    const idx = list.indexOf(oldValue);
                    if (idx !== -1) list[idx] = val;
                } else {
                    list.push(val);
                }
                upd = {
                    ...prev,
                    channels: { ...prev.channels, [subType]: list }
                };
            } else {
                const list = [...(prev[type] || [])];
                if (mode === 'edit') {
                    const idx = list.indexOf(oldValue);
                    if (idx !== -1) list[idx] = val;
                } else {
                    list.push(val);
                }
                upd = { ...prev, [type]: list };
            }
            onUpdate(upd);
            return upd;
        });
        setPromptConfig(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Project Configuration Header */}
            <div className="p-8 pb-4 shrink-0">
                <h1 className="text-3xl font-bold text-white mb-2">Project Configuration</h1>
                <p className="text-slate-400">Manage global list of values (LOVs) and environment mappings.</p>
            </div>

            {/* Config Tabs */}
            <div className="px-8 border-b border-slate-800 flex space-x-8 shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Config Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl animate-fade-in">
                    {activeTab === 'categories' && (
                        <SettingsSection title="API Categories" description="Tags used to group APIs (e.g. Mobile, CRM, Billing, VAS)">
                            <div className="flex flex-wrap gap-3">
                                {localSettings.categories?.map(cat => (
                                    <ConfigChip
                                        key={cat}
                                        value={cat}
                                        color="indigo"
                                        onEdit={() => editItem('categories', cat)}
                                        onDelete={() => deleteItem('categories', cat)}
                                    />
                                ))}
                                <button
                                    onClick={() => addItem('categories')}
                                    className="border-2 border-dashed border-slate-700 text-slate-500 px-4 py-2 rounded-xl text-sm hover:border-indigo-500/50 hover:text-indigo-400 transition-all flex items-center space-x-2"
                                >
                                    <Plus className="w-4 h-4" /> <span>Add Category</span>
                                </button>
                            </div>
                        </SettingsSection>
                    )}

                    {activeTab === 'channels' && (
                        <div className="space-y-6">
                            <SettingsSection title="Northbound Channels" description="Consumer systems that will call your APIs">
                                <div className="flex flex-wrap gap-3">
                                    {localSettings.channels?.northbound?.map(ch => (
                                        <ConfigChip
                                            key={ch}
                                            value={ch}
                                            color="emerald"
                                            onEdit={() => editItem('channels', ch, 'northbound')}
                                            onDelete={() => deleteItem('channels', ch, 'northbound')}
                                        />
                                    ))}
                                    <button
                                        onClick={() => addItem('channels', 'northbound')}
                                        className="border-2 border-dashed border-slate-700 text-slate-500 px-4 py-2 rounded-xl text-sm hover:border-emerald-500/50 hover:text-emerald-400 transition-all flex items-center space-x-2"
                                    >
                                        <Plus className="w-4 h-4" /> <span>Add Channel</span>
                                    </button>
                                </div>
                            </SettingsSection>

                            <SettingsSection title="Southbound Providers" description="Provider systems that your APIs will integrate with">
                                <div className="flex flex-wrap gap-3">
                                    {localSettings.channels?.southbound?.map(ch => (
                                        <ConfigChip
                                            key={ch}
                                            value={ch}
                                            color="cyan"
                                            onEdit={() => editItem('channels', ch, 'southbound')}
                                            onDelete={() => deleteItem('channels', ch, 'southbound')}
                                        />
                                    ))}
                                    <button
                                        onClick={() => addItem('channels', 'southbound')}
                                        className="border-2 border-dashed border-slate-700 text-slate-500 px-4 py-2 rounded-xl text-sm hover:border-cyan-500/50 hover:text-cyan-400 transition-all flex items-center space-x-2"
                                    >
                                        <Plus className="w-4 h-4" /> <span>Add Provider</span>
                                    </button>
                                </div>
                            </SettingsSection>
                        </div>
                    )}

                    {activeTab === 'marketSegments' && (
                        <SettingsSection title="Market Segments" description="Target segments or business verticals (e.g. Retail, Enterprise, SME)">
                            <div className="flex flex-wrap gap-3">
                                {localSettings.marketSegments?.map(seg => (
                                    <ConfigChip
                                        key={seg}
                                        value={seg}
                                        color="orange"
                                        onEdit={() => editItem('marketSegments', seg)}
                                        onDelete={() => deleteItem('marketSegments', seg)}
                                    />
                                ))}
                                <button
                                    onClick={() => addItem('marketSegments')}
                                    className="border-2 border-dashed border-slate-700 text-slate-500 px-4 py-2 rounded-xl text-sm hover:border-orange-500/50 hover:text-orange-400 transition-all flex items-center space-x-2"
                                >
                                    <Plus className="w-4 h-4" /> <span>Add Segment</span>
                                </button>
                            </div>
                        </SettingsSection>
                    )}

                    {activeTab === 'environments' && (
                        <SettingsSection title="Environments" description="Deployment stages for your API lifecycle">
                            <div className="flex flex-wrap gap-3">
                                {(localSettings.environments || ['DEV', 'SIT', 'UAT', 'PROD']).map(env => (
                                    <ConfigChip
                                        key={env}
                                        value={env}
                                        color="pink"
                                        onEdit={() => editItem('environments', env)}
                                        onDelete={() => deleteItem('environments', env)}
                                    />
                                ))}
                                <button
                                    onClick={() => addItem('environments')}
                                    className="border-2 border-dashed border-slate-700 text-slate-500 px-4 py-2 rounded-xl text-sm hover:border-pink-500/50 hover:text-pink-400 transition-all flex items-center space-x-2"
                                >
                                    <Plus className="w-4 h-4" /> <span>Add Environment</span>
                                </button>
                            </div>
                        </SettingsSection>
                    )}
                </div>
            </div>

            <PromptModal
                isOpen={!!promptConfig}
                title={promptConfig?.title}
                placeholder={promptConfig?.placeholder}
                onConfirm={handleConfirmPrompt}
                onCancel={() => setPromptConfig(null)}
            />
        </div>
    )
}

function SettingsSection({ title, description, children }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="mb-5">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-sm text-slate-500">{description}</p>
            </div>
            {children}
        </div>
    )
}

function ConfigChip({ value, color, onEdit, onDelete }) {
    const colorClasses = {
        indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20",
        emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20",
        cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20",
        orange: "bg-orange-500/10 text-orange-300 border-orange-500/20 hover:bg-orange-500/20",
        pink: "bg-pink-500/10 text-pink-300 border-pink-500/20 hover:bg-pink-500/20"
    };

    return (
        <div className={`group relative flex items-center space-x-2 border px-4 py-2 rounded-xl text-sm font-medium transition-all ${colorClasses[color] || colorClasses.indigo}`}>
            <span>{value}</span>
            <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 hover:text-white transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

function ModuleViewer({ module, environments = [], onUpdate, project }) {
    const [isEditing, setIsEditing] = useState(false);
    const [spec, setSpec] = useState(module.swagger_content || "");
    const [url, setUrl] = useState(module.swagger_url || "");
    const [envUrls, setEnvUrls] = useState(typeof module.env_urls === 'string' ? JSON.parse(module.env_urls) : module.env_urls || {});
    const [name, setName] = useState(module.name);

    // View Select: 'swagger' or 'list'
    const [viewMode, setViewMode] = useState('list'); // Default to list as requested
    const [selectedEnv, setSelectedEnv] = useState((environments && environments.length > 0) ? environments[0] : 'DEV');
    const [loadSwaggerRequested, setLoadSwaggerRequested] = useState(false);

    useEffect(() => {
        setSpec(module.swagger_content || "");
        setUrl(module.swagger_url || "");
        setEnvUrls(typeof module.env_urls === 'string' ? JSON.parse(module.env_urls) : module.env_urls || {});
        setName(module.name);
    }, [module]);

    const handleSave = () => {
        onUpdate(module.id, { name, swagger: spec, swaggerUrl: url, envUrls });
        setIsEditing(false);
    };

    // Determine current Display URL based on environment selection
    // If specific Env mapping exists, use it. Else fallback to default URL or empty
    const currentDisplayUrl = envUrls[selectedEnv] || url;

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Module Header */}
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
                    {/* View Mode Switches */}
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

            {/* Content */}
            {isEditing ? (
                <div className="flex-1 flex flex-col bg-slate-950 p-6 animate-fade-in text-white space-y-4 overflow-y-auto">
                    <div className="flex flex-col">
                        <label className="text-slate-400 text-xs font-bold uppercase mb-2">Environment URLs</label>
                        <div className="grid grid-cols-2 gap-4">
                            {environments.map(env => (
                                <div key={env}>
                                    <label className="text-[10px] text-indigo-400 font-bold mb-1 block">{env}</label>
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
                        <label className="text-slate-400 text-xs font-bold uppercase mb-2">Default / Fallback Swagger URL</label>
                        <input
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 font-mono text-sm text-blue-400 outline-none focus:border-indigo-500"
                            placeholder="https://petstore.swagger.io/v2/swagger.json"
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
                    {/* Environment Selector Bar for Viewer */}
                    <div className="h-10 border-b border-slate-200 bg-slate-50 flex items-center px-4 justify-between shrink-0">
                        <div className="flex items-center space-x-2">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase">Environment:</span>
                            <select
                                value={selectedEnv}
                                onChange={e => { setSelectedEnv(e.target.value); setLoadSwaggerRequested(false); }}
                                className="bg-transparent text-xs font-bold text-indigo-600 outline-none cursor-pointer hover:text-indigo-800"
                            >
                                {environments.map(env => <option key={env} value={env}>{env}</option>)}
                            </select>
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
                        <ModuleApiCatalog module={module} project={project} />
                    )}
                </div>
            )
            }
        </div >
    );
}

function ModuleApiCatalog({ module, project }) {
    const [apis, setApis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApi, setSelectedApi] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

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
            alert("Failed to save API");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to remove this API from the catalog?")) return;
        try {
            await api.deleteModuleApi(id);
            loadApis();
        } catch (e) {
            alert("Failed to delete API");
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
            {/* Catalog Sub-Header */}
            <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200 shrink-0">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">API Catalog</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Manage APIs associated with this module for downstream mapping.</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center space-x-2 transition-all shadow-md shadow-indigo-500/10"
                >
                    <Plus className="w-3.5 h-3.5" /> <span>Add Module API</span>
                </button>
            </div>

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
                        {apis.map(apiItem => (
                            <div
                                key={apiItem.id}
                                onClick={() => setSelectedApi({
                                    id: apiItem.id,
                                    name: apiItem.api_name,
                                    url: apiItem.url,
                                    method: apiItem.http_method,
                                    description: apiItem.description,
                                    headers: apiItem.headers,
                                    request_body: apiItem.request_body,
                                    response_body: apiItem.response_body,
                                    authentication: apiItem.authentication,
                                    swaggerRef: apiItem.swagger_reference
                                })}
                                className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-lg transition-all group cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${apiItem.http_method === 'GET' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}`}>{apiItem.http_method}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(apiItem.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 mb-1 truncate">{apiItem.api_name}</h4>
                                <p className="text-xs text-slate-500 font-mono truncate mb-3">{apiItem.url}</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">
                                        {apiItem.swagger_reference && <><BookOpen className="w-3 h-3 mr-1" /> Linked</>}
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
                    onClose={() => { setSelectedApi(null); setIsCreating(false); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function SwaggerDownstreamForm({ modules, environments = [], onCancel, onAdd }) {
    const [selectedModuleId, setSelectedModuleId] = useState("");
    const [selectedEnv, setSelectedEnv] = useState(environments[0] || "");
    const [apiName, setApiName] = useState("");
    const [error, setError] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [notFound, setNotFound] = useState(false);

    const handleSearchAndAdd = async () => {
        if (!selectedModuleId || !apiName) {
            setError("Please select a module and enter API Name");
            return;
        }

        setError("");
        setNotFound(false);
        setIsSearching(true);

        const module = modules.find(m => m.id === selectedModuleId);
        if (!module) {
            setIsSearching(false);
            return;
        }

        const query = apiName.trim().toLowerCase();
        let foundApi = null;

        try {
            let spec = null;
            const content = module.swagger_content;

            if (content) {
                spec = typeof content === 'string' ? JSON.parse(content) : content;
            } else if (module.swagger_url) {
                // If content missing but URL exists, try a quick fetch (might fail due to CORS)
                try {
                    const res = await fetch(module.swagger_url);
                    if (res.ok) {
                        spec = await res.json();
                    }
                } catch (e) {
                    console.warn("Could not fetch swagger from URL for verification", e);
                }
            }

            if (spec && spec.paths) {
                for (const [path, methods] of Object.entries(spec.paths)) {
                    for (const [method, op] of Object.entries(methods)) {
                        const opId = (op.operationId || "").toLowerCase();
                        const summary = (op.summary || "").toLowerCase();
                        const description = (op.description || "").toLowerCase();
                        const pathLower = path.toLowerCase();

                        // Match if query is exact operationId, or contained in summary/path/description
                        if (opId === query || summary.includes(query) || pathLower.includes(query) || description.includes(query)) {
                            foundApi = {
                                name: op.summary || op.operationId || path,
                                url: path,
                                method: method.toUpperCase(),
                                description: op.description || op.summary || "",
                                api_swagger_status: true,
                                providerSystem: module.name
                            };
                            break;
                        }
                    }
                    if (foundApi) break;
                }
            }
        } catch (e) {
            console.error("Swagger search error", e);
        }

        setIsSearching(false);

        if (foundApi) {
            // Apply environment base URL if available
            const envUrls = typeof module.env_urls === 'string' ? JSON.parse(module.env_urls) : (module.env_urls || {});
            let swaggerUrl = envUrls[selectedEnv] || module.swagger_url || "";

            // Basic attempt to get base URL from swagger URL (strips filename if it ends in .json or .yaml)
            let baseUrl = swaggerUrl.replace(/\/(swagger|openapi)\.(json|yaml|yml)$/i, "").replace(/\/$/, "");

            // If the path already has a slash and baseUrl exists, ensure we don't double slash
            const fullUrl = baseUrl ? (baseUrl + (foundApi.url.startsWith('/') ? foundApi.url : '/' + foundApi.url)) : foundApi.url;

            onAdd({
                ...foundApi,
                url: fullUrl,
                authType: "None",
                priority: 1
            });
        } else {
            setNotFound(true);
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded text-[10px] font-bold">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Source Module</label>
                    <select
                        value={selectedModuleId}
                        onChange={e => { setSelectedModuleId(e.target.value); setNotFound(false); }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                    >
                        <option value="">-- Choose --</option>
                        {modules.map(mod => (
                            <option key={mod.id} value={mod.id}>{mod.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Target Environment</label>
                    <select
                        value={selectedEnv}
                        onChange={e => setSelectedEnv(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                    >
                        {environments.map(env => (
                            <option key={env} value={env}>{env}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Search API (Operation ID / Summary)</label>
                <div className="flex gap-2">
                    <input
                        value={apiName}
                        onChange={e => { setApiName(e.target.value); setNotFound(false); }}
                        placeholder="e.g. getUserProfile"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                    <button
                        onClick={handleSearchAndAdd}
                        disabled={isSearching || !selectedModuleId || !apiName}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-xs font-bold disabled:opacity-50 transition-all flex items-center space-x-2"
                    >
                        {isSearching ? <Activity className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        <span>Verify</span>
                    </button>
                </div>
            </div>

            {notFound && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center space-y-3">
                    <p className="text-xs text-amber-300 font-medium">API "{apiName}" not found in {modules.find(m => m.id === selectedModuleId)?.name} Swagger.</p>
                    <button
                        onClick={() => onAdd({
                            name: apiName,
                            url: "",
                            method: "GET",
                            authType: "None",
                            description: "Manual Entry (Not Found in Swagger)",
                            providerSystem: modules.find(m => m.id === selectedModuleId)?.name || "Ext",
                            priority: 1,
                            api_swagger_status: false
                        })}
                        className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold transition-all"
                    >
                        Add Manually Anyway
                    </button>
                </div>
            )}

            {!notFound && !isSearching && (
                <p className="text-[10px] text-slate-500 bg-slate-900/50 p-2 rounded">
                    Validation ensures the endpoint exists in the vendor's Swagger documentation before adding it to your system dependency list.
                </p>
            )}

            <div className="flex justify-end pt-2">
                <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-300 px-4 py-2">Cancel</button>
            </div>
        </div>
    );
}

function PromptModal({ isOpen, title, placeholder, initialValue = "", onConfirm, onCancel }) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) setValue(initialValue);
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-8 animate-scale-in">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-500 text-sm mb-6">Enter the required information below to proceed.</p>

                <div className="space-y-4">
                    <input
                        autoFocus
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={placeholder}
                        onKeyDown={e => e.key === 'Enter' && value && onConfirm(value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                    />

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(value)}
                            disabled={!value}
                            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            Create / Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModuleApiDrawer({ api: initialApi, moduleId, project, onClose, onSave }) {
    const [localApi, setLocalApi] = useState(initialApi || {
        name: "",
        url: "",
        method: "GET",
        description: "",
        headers: {},
        request_body: {},
        response_body: {},
        authentication: { type: 'None' },
        swaggerRef: ""
    });
    const [activeTab, setActiveTab] = useState('info'); // info, headers, request, response, test

    const handleSave = () => {
        if (!localApi.name || !localApi.url) {
            alert("Name and URL are required");
            return;
        }
        onSave(localApi);
    };

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
                                // If half-typed, just update as string if we want to allow editing, 
                                // but for display we just show.
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
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/70 backdrop-blur-md transition-all" onClick={onClose}>
            <div className="w-[600px] bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col animate-slide-in-right" onClick={e => e.stopPropagation()}>
                {/* Header */}
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

                {/* Tabs Selector */}
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

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col min-h-0 bg-slate-900/50">
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
                    {activeTab === 'response' && renderJsonEditor('response_body', 'Sample Response')}
                    {activeTab === 'test' && (
                        <AdvancedApiTester
                            api={localApi}
                            project={project}
                            onUpdateExamples={(sample) => {
                                setLocalApi({ ...localApi, response_body: sample });
                            }}
                        />
                    )}
                </div>

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

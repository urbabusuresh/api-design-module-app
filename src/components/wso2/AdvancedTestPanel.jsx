import React, { useState, useEffect } from 'react';
import { Play, Activity, Plus, Trash2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../api';

// Replaces {{varName}} tokens with values from the provided env map.
function resolveEnvVars(str, envVars) {
    if (!str) return str;
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => envVars[key] ?? `{{${key}}}`);
}

const METHOD_COLORS = {
    GET: 'text-emerald-400 bg-emerald-500/10',
    POST: 'text-blue-400 bg-blue-500/10',
    PUT: 'text-amber-400 bg-amber-500/10',
    DELETE: 'text-red-400 bg-red-500/10',
    PATCH: 'text-purple-400 bg-purple-500/10'
};

export default function AdvancedTestPanel({ apiItem, project }) {
    const defaultMethod = apiItem.method || 'GET';
    const defaultUrl = apiItem.url || '';

    const [method, setMethod] = useState(defaultMethod);
    const [url, setUrl] = useState(defaultUrl);
    const [activeTab, setActiveTab] = useState('headers'); // headers | body | env
    const [headers, setHeaders] = useState([
        { key: 'Content-Type', value: 'application/json', active: true },
        { key: '', value: '', active: true }
    ]);
    const [body, setBody] = useState('');
    const [bodyFormat, setBodyFormat] = useState('json'); // json | xml | text
    // Environment variables: {{baseUrl}}, {{token}}, etc.
    const [envVars, setEnvVars] = useState([
        { key: 'baseUrl', value: '' },
        { key: 'token', value: '' },
        { key: '', value: '' }
    ]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [resultTab, setResultTab] = useState('body'); // body | headers | info

    const projectId = project?.id;

    useEffect(() => {
        loadHistory();
    }, [apiItem.id, projectId]);

    const loadHistory = async () => {
        if (!projectId) return;
        try {
            const logs = await api.getTestLogs(projectId);
            setHistory((logs || []).filter(l => l.api_id === apiItem.id || l.url === apiItem.url).slice(0, 20));
        } catch (e) {
            console.error('Failed to load test history', e);
        }
    };

    const buildEnvMap = () => {
        const m = {};
        envVars.forEach(v => { if (v.key) m[v.key] = v.value; });
        return m;
    };

    const runTest = async () => {
        setLoading(true);
        setResult(null);
        try {
            const envMap = buildEnvMap();
            const resolvedUrl = resolveEnvVars(url, envMap);
            const finalHeaders = {};
            headers.filter(h => h.active && h.key).forEach(h => {
                finalHeaders[resolveEnvVars(h.key, envMap)] = resolveEnvVars(h.value, envMap);
            });

            // Inject Bearer token from {{token}} env var
            if (envMap.token && !finalHeaders['Authorization']) {
                finalHeaders['Authorization'] = `Bearer ${envMap.token}`;
            }

            let resolvedBody = resolveEnvVars(body, envMap);
            let parsedBody;
            if (method !== 'GET' && resolvedBody) {
                try { parsedBody = JSON.parse(resolvedBody); } catch (_) { parsedBody = resolvedBody; }
            }

            const data = await api.testEndpoint({
                apiId: apiItem.id,
                url: resolvedUrl,
                method,
                headers: finalHeaders,
                body: method !== 'GET' ? parsedBody : undefined
            }, projectId);

            setResult(data);
            setResultTab('body');
            loadHistory();
        } catch (e) {
            setResult({ error: e.message });
        } finally {
            setLoading(false);
        }
    };

    const addRow = (setter) => setter(prev => [...prev, { key: '', value: '', active: true }]);
    const updateRow = (setter, idx, field, val) => setter(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    const removeRow = (setter, idx) => setter(prev => prev.filter((_, i) => i !== idx));

    const statusColor = (s) => {
        if (!s) return 'text-slate-400';
        if (s < 300) return 'text-emerald-400';
        if (s < 400) return 'text-amber-400';
        return 'text-red-400';
    };

    const prettySize = (str) => {
        if (!str) return '0 B';
        const bytes = new TextEncoder().encode(JSON.stringify(str)).length;
        return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
    };

    return (
        <div className="flex flex-col h-full text-slate-300 space-y-4">
            {/* URL Bar */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-2">
                <select
                    value={method}
                    onChange={e => setMethod(e.target.value)}
                    className={`bg-slate-800 rounded-lg px-3 py-2 text-xs font-black border-none outline-none ${METHOD_COLORS[method] || 'text-slate-300'}`}
                >
                    {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                </select>
                <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://api.example.com/resource  (supports {{baseUrl}})"
                    className="flex-1 bg-transparent text-sm font-mono text-white outline-none placeholder-slate-600 px-2"
                />
                <button
                    onClick={runTest}
                    disabled={loading}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-indigo-500/20"
                >
                    {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span>{loading ? 'Sending…' : 'Send'}</span>
                </button>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 overflow-hidden">
                {/* Request panel */}
                <div className="flex flex-col bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
                    <div className="flex border-b border-slate-800 bg-slate-900/60 shrink-0">
                        {['headers', 'body', 'env'].map(t => (
                            <button key={t} onClick={() => setActiveTab(t)}
                                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === t ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                                {t === 'env' ? 'Env Vars' : t}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3">
                        {activeTab === 'headers' && (
                            <KeyValueEditor rows={headers} setRows={setHeaders}
                                onAdd={() => addRow(setHeaders)}
                                onUpdate={(i, f, v) => updateRow(setHeaders, i, f, v)}
                                onRemove={i => removeRow(setHeaders, i)} />
                        )}

                        {activeTab === 'body' && (
                            <div className="space-y-2 h-full">
                                <div className="flex items-center space-x-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Format:</span>
                                    {['json', 'xml', 'text'].map(f => (
                                        <button key={f} onClick={() => setBodyFormat(f)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${bodyFormat === f ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
                                            {f.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    placeholder={bodyFormat === 'json' ? '{\n  "key": "value"\n}' : bodyFormat === 'xml' ? '<root>\n  <key>value</key>\n</root>' : 'Plain text body'}
                                    className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-200 resize-none outline-none focus:border-indigo-500"
                                />
                            </div>
                        )}

                        {activeTab === 'env' && (
                            <div className="space-y-2">
                                <p className="text-[10px] text-slate-500 mb-2">Define variables used as <code className="text-indigo-400">{`{{varName}}`}</code> in the URL, headers, and body.</p>
                                <KeyValueEditor rows={envVars} setRows={setEnvVars}
                                    onAdd={() => addRow(setEnvVars)}
                                    onUpdate={(i, f, v) => updateRow(setEnvVars, i, f, v)}
                                    onRemove={i => removeRow(setEnvVars, i)}
                                    keyPlaceholder="variable name"
                                    valuePlaceholder="value" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Response panel */}
                <div className="flex flex-col bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
                    {result ? (
                        <>
                            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-2 shrink-0">
                                <div className="flex items-center space-x-3">
                                    {result.error
                                        ? <span className="text-red-400 flex items-center gap-1 text-xs font-bold"><AlertCircle className="w-3.5 h-3.5" /> Error</span>
                                        : <>
                                            <span className={`text-sm font-black ${statusColor(result.status)}`}>{result.status}</span>
                                            <span className="text-xs text-slate-500">{result.statusText}</span>
                                            <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{result.duration}</span>
                                            <span className="text-xs text-slate-500">{prettySize(result.data)}</span>
                                        </>
                                    }
                                </div>
                                <div className="flex space-x-1">
                                    {['body', 'headers', 'history'].map(t => (
                                        <button key={t} onClick={() => setResultTab(t)}
                                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${resultTab === t ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3">
                                {resultTab === 'body' && (
                                    <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap break-all">
                                        {result.error
                                            ? result.error
                                            : JSON.stringify(result.data, null, 2)}
                                    </pre>
                                )}
                                {resultTab === 'headers' && (
                                    <div className="space-y-1">
                                        {Object.entries(result.headers || {}).map(([k, v]) => (
                                            <div key={k} className="flex text-xs">
                                                <span className="text-indigo-400 font-mono w-40 shrink-0">{k}:</span>
                                                <span className="text-slate-300 font-mono truncate">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {resultTab === 'history' && (
                                    <HistoryList history={history} />
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-2">
                            <Play className="w-10 h-10 opacity-20" />
                            <p className="text-sm">Hit Send to see the response</p>
                            {history.length > 0 && (
                                <button onClick={() => setResultTab('history')} className="text-xs text-indigo-400 hover:underline">
                                    View history ({history.length})
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function KeyValueEditor({ rows, onAdd, onUpdate, onRemove, keyPlaceholder = 'key', valuePlaceholder = 'value' }) {
    return (
        <div className="space-y-1.5">
            {rows.map((row, i) => (
                <div key={i} className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={row.active !== false}
                        onChange={e => onUpdate(i, 'active', e.target.checked)}
                        className="accent-indigo-500 shrink-0"
                    />
                    <input value={row.key || ''} onChange={e => onUpdate(i, 'key', e.target.value)}
                        placeholder={keyPlaceholder}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500" />
                    <input value={row.value || ''} onChange={e => onUpdate(i, 'value', e.target.value)}
                        placeholder={valuePlaceholder}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500" />
                    <button onClick={() => onRemove(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
            <button onClick={onAdd} className="flex items-center space-x-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors pt-1">
                <Plus className="w-3 h-3" /> <span>Add row</span>
            </button>
        </div>
    );
}

function HistoryList({ history }) {
    if (!history || history.length === 0) {
        return <p className="text-xs text-slate-600 text-center py-6">No test history yet.</p>;
    }
    return (
        <div className="space-y-2">
            {history.map(log => (
                <div key={log.id} className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                        <span className={`font-bold shrink-0 ${log.response_status < 300 ? 'text-emerald-400' : 'text-red-400'}`}>{log.response_status}</span>
                        <span className="font-mono text-slate-400 truncate">{log.method} {log.url}</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{log.duration}</span>
                        {log.response_status < 300
                            ? <CheckCircle className="w-3 h-3 text-emerald-500" />
                            : <AlertCircle className="w-3 h-3 text-red-500" />}
                    </div>
                </div>
            ))}
        </div>
    );
}

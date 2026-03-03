import React, { useState } from 'react';
import { GitCompare, X, Play, Activity, Copy, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ResponseDiffTool
 * Runs the same API in two different environments and compares responses side-by-side.
 */
export function ResponseDiffTool({ apis = [], environments = [], project, onClose }) {
    const [leftEnv, setLeftEnv] = useState(environments[0] || 'DEV');
    const [rightEnv, setRightEnv] = useState(environments[1] || environments[0] || 'SIT');
    const [selectedApiId, setSelectedApiId] = useState(apis[0]?.id || '');
    const [leftResult, setLeftResult] = useState(null);
    const [rightResult, setRightResult] = useState(null);
    const [running, setRunning] = useState(false);
    const [copied, setCopied] = useState(null);

    const selectedApi = apis.find(a => a.id === selectedApiId);

    const getBaseUrl = (env) => {
        if (!selectedApi) return '';
        const envContextApis = typeof selectedApi.env_context_apis === 'string'
            ? JSON.parse(selectedApi.env_context_apis || '{}')
            : (selectedApi.env_context_apis || {});
        return envContextApis[env] || '';
    };

    const callApi = async (env) => {
        if (!selectedApi) return null;
        const baseUrl = getBaseUrl(env);
        const url = baseUrl
            ? baseUrl.replace(/\/$/, '') + (selectedApi.url?.startsWith('/') ? selectedApi.url : '/' + (selectedApi.url || ''))
            : selectedApi.url;

        if (!url) return { error: 'No URL configured for this environment', status: null, body: null, duration: 0 };

        const start = Date.now();
        try {
            const res = await fetch('/api/test-endpoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Project-Id': project?.id || '' },
                body: JSON.stringify({
                    url,
                    method: selectedApi.http_method || selectedApi.method || 'GET',
                    headers: selectedApi.headers || {},
                    bodyFormat: selectedApi.body_format || selectedApi.bodyFormat || 'json'
                }),
                signal: AbortSignal.timeout(10000)
            });
            const data = await res.json();
            return { status: data.status, body: data.data, duration: Date.now() - start, error: null };
        } catch (err) {
            return { error: err.message, status: null, body: null, duration: Date.now() - start };
        }
    };

    const runDiff = async () => {
        if (!selectedApi) { toast.error('Select an API first'); return; }
        if (leftEnv === rightEnv) { toast.error('Select different environments to compare'); return; }
        setRunning(true);
        setLeftResult(null);
        setRightResult(null);
        try {
            const [l, r] = await Promise.all([callApi(leftEnv), callApi(rightEnv)]);
            setLeftResult(l);
            setRightResult(r);
        } finally {
            setRunning(false);
        }
    };

    const formatBody = (body) => {
        if (!body) return '(empty)';
        try { return JSON.stringify(typeof body === 'string' ? JSON.parse(body) : body, null, 2); }
        catch { return String(body); }
    };

    const copyResult = (side) => {
        const data = side === 'left' ? leftResult : rightResult;
        if (!data) return;
        navigator.clipboard.writeText(formatBody(data.body));
        setCopied(side);
        setTimeout(() => setCopied(null), 2000);
        toast.success('Copied!');
    };

    const statusColor = (status) => {
        if (!status) return 'text-slate-500';
        if (status >= 200 && status < 300) return 'text-emerald-400';
        if (status >= 400 && status < 500) return 'text-amber-400';
        return 'text-red-400';
    };

    // Line-by-line diff highlighter
    const diffLines = (left, right) => {
        const lLines = left.split('\n');
        const rLines = right.split('\n');
        const maxLen = Math.max(lLines.length, rLines.length);
        return Array.from({ length: maxLen }, (_, i) => ({
            left: lLines[i] ?? '',
            right: rLines[i] ?? '',
            changed: (lLines[i] ?? '') !== (rLines[i] ?? '')
        }));
    };

    const leftStr = leftResult ? formatBody(leftResult.body) : '';
    const rightStr = rightResult ? formatBody(rightResult.body) : '';
    const lines = (leftResult && rightResult) ? diffLines(leftStr, rightStr) : [];
    const diffCount = lines.filter(l => l.changed).length;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[1000px] max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                            <GitCompare className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Response Diff Tool</h3>
                            <p className="text-[10px] text-slate-500">Compare API responses across environments side-by-side</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Controls */}
                <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1">API</label>
                        <select
                            value={selectedApiId}
                            onChange={e => setSelectedApiId(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                        >
                            {apis.map(a => (
                                <option key={a.id} value={a.id}>{a.api_name || a.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Left Environment</label>
                        <select value={leftEnv} onChange={e => setLeftEnv(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500">
                            {environments.map(e => <option key={e}>{e}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Right Environment</label>
                        <select value={rightEnv} onChange={e => setRightEnv(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500">
                            {environments.map(e => <option key={e}>{e}</option>)}
                        </select>
                    </div>
                    <div className="self-end">
                        <button
                            onClick={runDiff}
                            disabled={running || !selectedApiId}
                            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-900/20"
                        >
                            {running ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{running ? 'Running...' : 'Compare'}</span>
                        </button>
                    </div>
                </div>

                {/* Diff Count Summary */}
                {lines.length > 0 && (
                    <div className="px-6 py-2 border-b border-slate-800 flex items-center gap-4 bg-slate-950/30">
                        {diffCount === 0 ? (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
                                <Check className="w-3 h-3" /> Responses are identical
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5">
                                <AlertCircle className="w-3 h-3" /> {diffCount} line{diffCount !== 1 ? 's' : ''} differ
                            </span>
                        )}
                        <span className="text-[10px] text-slate-600">· Highlighted rows show differences</span>
                    </div>
                )}

                {/* Side-by-side panels */}
                <div className="flex-1 overflow-hidden flex min-h-0">
                    {/* Left panel */}
                    <div className="flex-1 flex flex-col border-r border-slate-800">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/40 border-b border-slate-800 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{leftEnv}</span>
                                {leftResult && (
                                    <span className={`text-[9px] font-bold ${statusColor(leftResult.status)}`}>
                                        {leftResult.error ? 'ERROR' : `${leftResult.status} · ${leftResult.duration}ms`}
                                    </span>
                                )}
                            </div>
                            {leftResult?.body && (
                                <button onClick={() => copyResult('left')} className="text-slate-600 hover:text-white transition-colors">
                                    {copied === 'left' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-auto p-3 font-mono text-[10px] leading-5">
                            {!leftResult && !running && (
                                <div className="h-full flex items-center justify-center text-slate-700 text-xs">Run comparison to see results</div>
                            )}
                            {leftResult?.error && (
                                <div className="text-red-400 text-xs p-3 bg-red-500/10 rounded-lg">{leftResult.error}</div>
                            )}
                            {lines.length > 0 && lines.map((line, i) => (
                                <div key={i} className={`px-2 py-0.5 rounded ${line.changed ? 'bg-amber-500/10 text-amber-300' : 'text-slate-400'}`}>
                                    <span className="select-none text-slate-700 mr-3 w-6 inline-block text-right">{i + 1}</span>
                                    {line.left || '\u00A0'}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right panel */}
                    <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/40 border-b border-slate-800 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{rightEnv}</span>
                                {rightResult && (
                                    <span className={`text-[9px] font-bold ${statusColor(rightResult.status)}`}>
                                        {rightResult.error ? 'ERROR' : `${rightResult.status} · ${rightResult.duration}ms`}
                                    </span>
                                )}
                            </div>
                            {rightResult?.body && (
                                <button onClick={() => copyResult('right')} className="text-slate-600 hover:text-white transition-colors">
                                    {copied === 'right' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-auto p-3 font-mono text-[10px] leading-5">
                            {!rightResult && !running && (
                                <div className="h-full flex items-center justify-center text-slate-700 text-xs">Run comparison to see results</div>
                            )}
                            {rightResult?.error && (
                                <div className="text-red-400 text-xs p-3 bg-red-500/10 rounded-lg">{rightResult.error}</div>
                            )}
                            {lines.length > 0 && lines.map((line, i) => (
                                <div key={i} className={`px-2 py-0.5 rounded ${line.changed ? 'bg-amber-500/10 text-amber-300' : 'text-slate-400'}`}>
                                    <span className="select-none text-slate-700 mr-3 w-6 inline-block text-right">{i + 1}</span>
                                    {line.right || '\u00A0'}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-800 text-[9px] text-slate-600">
                    Both environments are called simultaneously · Timeout: 10s · Changed lines highlighted in amber
                </div>
            </div>
        </div>
    );
}

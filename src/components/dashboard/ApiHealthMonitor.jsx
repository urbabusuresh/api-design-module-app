import React, { useState, useCallback } from 'react';
import { Activity, Check, X, Clock, RefreshCcw, Globe, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ApiHealthMonitor
 * Pings all APIs in a list and shows live status (green/red/yellow) + response time.
 * Can be used inside ModuleViewer or ProjectDashboard.
 */
export function ApiHealthMonitor({ apis = [], baseUrl = '', project, onClose, selectedEnv = 'DEV' }) {
    const [results, setResults] = useState({});
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);

    const resolveVariables = useCallback((val) => {
        if (!val || typeof val !== 'string') return val;
        try {
            const gv = project.global_variables || project.globalVariables || {};
            const parsedGv = typeof gv === 'string' ? JSON.parse(gv) : gv;
            let pool = {};
            if (selectedEnv && parsedGv[selectedEnv]) pool = parsedGv[selectedEnv];
            else if (typeof parsedGv === 'object' && !Array.isArray(parsedGv)) pool = parsedGv;

            return val.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                return pool[key] !== undefined ? pool[key] : `{{${key}}}`;
            });
        } catch (e) { return val; }
    }, [project, selectedEnv]);

    const ping = useCallback(async (apiItem) => {
        const rawUrl = resolveVariables(apiItem.url || '');
        const url = (rawUrl.startsWith('http') || !baseUrl)
            ? rawUrl
            : baseUrl.replace(/\/$/, '') + '/' + rawUrl.replace(/^\//, '');

        if (!url) return { status: 'skipped', duration: 0, error: 'No URL configured' };

        const start = Date.now();
        try {
            const res = await fetch('/api/test-endpoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Project-Id': project?.id || '' },
                body: JSON.stringify({
                    url,
                    method: apiItem.http_method || apiItem.method || 'GET',
                    headers: {},
                    bodyFormat: apiItem.body_format || apiItem.bodyFormat || 'json'
                }),
                signal: AbortSignal.timeout(8000)
            });
            const data = await res.json();
            const duration = Date.now() - start;
            const httpStatus = data.status || 0;
            return {
                status: httpStatus >= 200 && httpStatus < 400 ? 'up' : httpStatus >= 400 && httpStatus < 500 ? 'warn' : 'down',
                duration,
                httpStatus,
                error: null
            };
        } catch (err) {
            return { status: 'down', duration: Date.now() - start, error: err.message };
        }
    }, [baseUrl, project]);

    const runHealthCheck = async () => {
        if (!apis.length) { toast.error('No APIs to check'); return; }
        setRunning(true);
        setResults({});
        setProgress(0);

        const total = apis.length;
        // Run in batches of 3 concurrently
        for (let i = 0; i < total; i += 3) {
            const batch = apis.slice(i, i + 3);
            const batchResults = await Promise.all(batch.map(a => ping(a)));
            setResults(prev => {
                const next = { ...prev };
                batch.forEach((a, idx) => { next[a.id] = batchResults[idx]; });
                return next;
            });
            setProgress(Math.min(i + 3, total));
        }
        setRunning(false);
        toast.success('Health check complete!');
    };

    const up = Object.values(results).filter(r => r.status === 'up').length;
    const down = Object.values(results).filter(r => r.status === 'down').length;
    const warn = Object.values(results).filter(r => r.status === 'warn').length;
    const done = Object.keys(results).length;

    const statusColor = { up: 'text-emerald-400', warn: 'text-amber-400', down: 'text-red-400', skipped: 'text-slate-500' };
    const statusBg = { up: 'bg-emerald-500/10 border-emerald-500/20', warn: 'bg-amber-500/10 border-amber-500/20', down: 'bg-red-500/10 border-red-500/20', skipped: 'bg-slate-800 border-slate-700' };
    const statusIcon = { up: Check, warn: AlertCircle, down: X, skipped: Globe };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[750px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Activity className="w-4.5 h-4.5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">API Health Monitor</h3>
                            <p className="text-[10px] text-slate-500">Ping all endpoints and check live availability</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Summary Bar */}
                {done > 0 && (
                    <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800 flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-400">{up} UP</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-bold text-amber-400">{warn} WARN</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <WifiOff className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-xs font-bold text-red-400">{down} DOWN</span>
                        </div>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-4">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-300"
                                style={{ width: `${(done / apis.length) * 100}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{done}/{apis.length}</span>
                    </div>
                )}

                {/* API List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {apis.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-600">
                            <Globe className="w-10 h-10 mb-3 opacity-30" />
                            <p className="text-sm">No APIs available to check</p>
                        </div>
                    ) : apis.map(apiItem => {
                        const res = results[apiItem.id];
                        const Icon = res ? statusIcon[res.status] : Globe;
                        return (
                            <div key={apiItem.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${res ? statusBg[res.status] : 'bg-slate-800/40 border-slate-800'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${res ? (res.status === 'up' ? 'bg-emerald-500/20' : res.status === 'warn' ? 'bg-amber-500/20' : 'bg-red-500/20') : 'bg-slate-700'}`}>
                                    {running && !res ? (
                                        <Activity className="w-3 h-3 text-indigo-400 animate-spin" />
                                    ) : (
                                        <Icon className={`w-3 h-3 ${res ? statusColor[res.status] : 'text-slate-500'}`} />
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${(apiItem.http_method || apiItem.method) === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {apiItem.http_method || apiItem.method || 'GET'}
                                        </span>
                                        <span className="text-sm font-semibold text-white truncate">{apiItem.api_name || apiItem.name}</span>
                                    </div>
                                    <div className="text-[9px] font-mono text-slate-500 truncate mt-0.5">{apiItem.url}</div>
                                </div>
                                {res && (
                                    <div className="flex items-center gap-3 shrink-0">
                                        {res.httpStatus && (
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded ${res.status === 'up' ? 'bg-emerald-500/10 text-emerald-400' : res.status === 'warn' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {res.httpStatus}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                                            <Clock className="w-2.5 h-2.5" />
                                            <span>{res.duration}ms</span>
                                        </div>
                                        {res.error && (
                                            <span className="text-[9px] text-red-400 truncate max-w-[120px]" title={res.error}>{res.error}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                    <p className="text-[10px] text-slate-600">{apis.length} endpoints · Timeout: 8s · Runs up to 3 concurrent pings</p>
                    <button
                        onClick={runHealthCheck}
                        disabled={running}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-900/20"
                    >
                        {running ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                        <span>{running ? `Checking... ${progress}/${apis.length}` : 'Run Health Check'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

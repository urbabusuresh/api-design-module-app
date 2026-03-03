import React, { useState } from 'react';
import { Play, Plus, Trash2, ChevronDown, ChevronRight, CheckCircle, X, Activity, ArrowRight, Copy, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * CollectionRunner
 * Runs multiple APIs in sequence with optional response chaining.
 * Chain syntax: {{PREV.body.token}} pulls a field from previous API response.
 */
export function CollectionRunner({ apis = [], project, baseUrl = '', onClose }) {
    const [steps, setSteps] = useState(
        apis.map(a => ({
            id: a.id,
            name: a.api_name || a.name,
            url: a.url,
            method: a.http_method || a.method || 'GET',
            body: '',
            headers: {},
            enabled: true,
            result: null
        }))
    );
    const [running, setRunning] = useState(false);
    const [currentStep, setCurrentStep] = useState(-1);
    const [chainData, setChainData] = useState({});
    const [expandedStep, setExpandedStep] = useState(null);
    const [delay, setDelay] = useState(300);

    const resolveChain = (val, data) => {
        if (!val || typeof val !== 'string') return val;
        return val.replace(/\{\{PREV\.([^}]+)\}\}/g, (_, path) => {
            try {
                const parts = path.split('.');
                let cur = data;
                for (const p of parts) cur = cur?.[p];
                return cur !== undefined ? String(cur) : `{{PREV.${path}}}`;
            } catch { return `{{PREV.${path}}}`; }
        });
    };

    const runAll = async () => {
        const activeSteps = steps.filter(s => s.enabled);
        if (!activeSteps.length) { toast.error('Enable at least one step'); return; }

        setRunning(true);
        setCurrentStep(0);
        let prevResponse = {};
        const updatedSteps = [...steps];

        for (let i = 0; i < activeSteps.length; i++) {
            const step = activeSteps[i];
            const stepIdx = steps.findIndex(s => s.id === step.id);
            setCurrentStep(i);

            updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], result: { status: 'running' } };
            setSteps([...updatedSteps]);

            try {
                const resolvedUrl = resolveChain(
                    baseUrl ? baseUrl.replace(/\/$/, '') + (step.url?.startsWith('/') ? step.url : '/' + (step.url || '')) : step.url,
                    prevResponse
                );
                const resolvedBody = resolveChain(step.body, prevResponse);

                const start = Date.now();
                const res = await fetch('/api/test-endpoint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Project-Id': project?.id || '' },
                    body: JSON.stringify({
                        url: resolvedUrl,
                        method: step.method,
                        headers: step.headers,
                        body: resolvedBody ? (() => { try { return JSON.parse(resolvedBody); } catch { return resolvedBody; } })() : undefined
                    })
                });
                const data = await res.json();
                const duration = Date.now() - start;

                const result = { status: data.status, data: data.data, duration, passed: data.status < 400 };
                updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], result };
                setSteps([...updatedSteps]);

                prevResponse = typeof data.data === 'object' ? (data.data || {}) : {};
                setChainData(prev => ({ ...prev, [step.id]: prevResponse }));
            } catch (err) {
                updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], result: { status: 'error', error: err.message, passed: false } };
                setSteps([...updatedSteps]);
            }

            if (i < activeSteps.length - 1) await new Promise(r => setTimeout(r, delay));
        }

        setRunning(false);
        setCurrentStep(-1);
        const pass = updatedSteps.filter(s => s.result?.passed).length;
        const fail = updatedSteps.filter(s => s.result && !s.result.passed).length;
        toast.success(`Run complete: ${pass} passed, ${fail} failed`);
    };

    const passed = steps.filter(s => s.result?.passed).length;
    const failed = steps.filter(s => s.result && !s.result.passed && s.result.status !== 'running').length;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[800px] max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                            <Play className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Collection Runner</h3>
                            <p className="text-[10px] text-slate-500">Run APIs in sequence · Chain responses with <span className="font-mono text-indigo-300">{'{{PREV.body.field}}'}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Summary */}
                {(passed + failed) > 0 && (
                    <div className="px-6 py-2 bg-slate-950/40 border-b border-slate-800 flex items-center gap-4">
                        <span className="text-[10px] font-bold text-emerald-400">{passed} PASSED</span>
                        <span className="text-[10px] font-bold text-red-400">{failed} FAILED</span>
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(passed / steps.length) * 100}%` }} />
                        </div>
                    </div>
                )}

                {/* Steps */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {steps.map((step, idx) => {
                        const isRunning = running && currentStep === idx;
                        const res = step.result;
                        return (
                            <div key={step.id} className={`border rounded-xl transition-all ${!step.enabled ? 'opacity-40 border-slate-800' : res?.passed === false ? 'border-red-500/30 bg-red-500/5' : res?.passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-800/30'}`}>
                                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}>
                                    <input type="checkbox" checked={step.enabled} onChange={e => { e.stopPropagation(); setSteps(steps.map((s, i) => i === idx ? { ...s, enabled: e.target.checked } : s)); }} className="w-3.5 h-3.5 accent-indigo-500" />
                                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-black text-slate-400">{idx + 1}</div>
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${step.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{step.method}</span>
                                    <span className="text-sm font-medium text-white flex-1 truncate">{step.name}</span>
                                    {isRunning && <Activity className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
                                    {res && !isRunning && (
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${res.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {res.status} · {res.duration}ms
                                        </span>
                                    )}
                                    {expandedStep === step.id ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                                </div>
                                {expandedStep === step.id && (
                                    <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-3">
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Override Body (supports {'{{PREV.field}}'})</label>
                                            <textarea
                                                value={step.body}
                                                onChange={e => setSteps(steps.map((s, i) => i === idx ? { ...s, body: e.target.value } : s))}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-indigo-300 h-20 resize-none outline-none focus:border-indigo-500"
                                                placeholder='{ "key": "value" } or {"token": "{{PREV.body.access_token}}"}'
                                            />
                                        </div>
                                        {res?.data && (
                                            <div>
                                                <label className="text-[9px] font-bold text-emerald-500 uppercase mb-1 block flex items-center gap-1">
                                                    Response
                                                    <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(res.data, null, 2)); toast.success('Copied!'); }} className="ml-auto">
                                                        <Copy className="w-2.5 h-2.5 text-slate-500 hover:text-white" />
                                                    </button>
                                                </label>
                                                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-blue-300 h-24 overflow-auto">
                                                    {typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : String(res.data)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] text-slate-500 font-bold">Delay between steps:</label>
                        <select value={delay} onChange={e => setDelay(Number(e.target.value))} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white outline-none">
                            <option value={0}>None</option>
                            <option value={300}>300ms</option>
                            <option value={500}>500ms</option>
                            <option value={1000}>1s</option>
                            <option value={2000}>2s</option>
                        </select>
                    </div>
                    <button
                        onClick={runAll}
                        disabled={running}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-indigo-900/20"
                    >
                        {running ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{running ? 'Running...' : `Run ${steps.filter(s => s.enabled).length} APIs`}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

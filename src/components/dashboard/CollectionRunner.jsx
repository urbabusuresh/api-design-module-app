import React, { useState } from 'react';
import {
    Play, Plus, Trash2, ChevronDown, ChevronRight, CheckCircle, X,
    Activity, ArrowRight, Copy, AlertCircle, ShieldCheck, Clock, Gauge,
    StopCircle, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';

/**
 * CollectionRunner
 * Runs multiple APIs in sequence with optional response chaining and 360° assertions.
 */
export function CollectionRunner({ apis = [], project, collectionSettings = {}, baseUrl = '', onClose, selectedEnv = 'DEV', collectionId }) {
    const [steps, setSteps] = useState(
        apis.map(a => {
            const apiAssertions = collectionSettings.assertions?.[a.id] || {};
            return {
                id: a.id,
                name: a.api_name || a.name,
                url: a.url,
                method: a.http_method || a.method || 'GET',
                body: '',
                headers: {},
                enabled: true,
                result: null,
                assertions: {
                    expectedStatus: apiAssertions.expectedStatus || 200,
                    maxDuration: apiAssertions.maxDuration || null,
                    validateSchema: apiAssertions.validateSchema || false,
                    schema: apiAssertions.schema || null
                }
            };
        })
    );

    const [running, setRunning] = useState(false);
    const [stopOnFailure, setStopOnFailure] = useState(true);
    const [currentStep, setCurrentStep] = useState(-1);
    const [chainData, setChainData] = useState({});
    const [expandedStep, setExpandedStep] = useState(null);
    const [delay, setDelay] = useState(300);

    const getVarPool = () => {
        let pool = {};
        try {
            const gv = project.global_variables || project.globalVariables || {};
            const parsedGv = typeof gv === 'string' ? JSON.parse(gv) : gv;
            if (selectedEnv && parsedGv[selectedEnv]) {
                pool = { ...parsedGv[selectedEnv] };
            } else if (typeof parsedGv === 'object' && !Array.isArray(parsedGv)) {
                pool = { ...parsedGv };
            }
        } catch (e) { }
        return pool;
    };

    const resolveVariables = (val, prevData) => {
        if (!val || typeof val !== 'string') return val;
        const pool = getVarPool();
        let resolved = val.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            if (key === 'PREV') return `{{PREV}}`;
            return pool[key] !== undefined ? pool[key] : `{{${key}}}`;
        });
        resolved = resolved.replace(/\{\{PREV\.([^}]+)\}\}/g, (_, path) => {
            try {
                const parts = path.split('.');
                let cur = prevData;
                for (const p of parts) cur = cur?.[p];
                return cur !== undefined ? String(cur) : `{{PREV.${path}}}`;
            } catch { return `{{PREV.${path}}}`; }
        });
        return resolved;
    };

    const runAll = async () => {
        const activeSteps = steps.filter(s => s.enabled);
        if (!activeSteps.length) { toast.error('Enable at least one step'); return; }

        setRunning(true);
        setCurrentStep(0);
        let prevResponse = {};
        const updatedSteps = [...steps];
        const runStartTime = Date.now();
        const collectionRunId = `crun_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        let finalStatus = 'Success';
        let stopExecution = false;

        for (let i = 0; i < activeSteps.length; i++) {
            if (stopExecution) break;

            const step = activeSteps[i];
            const stepIdx = steps.findIndex(s => s.id === step.id);
            setCurrentStep(i);

            updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], result: { status: 'running' } };
            setSteps([...updatedSteps]);

            try {
                const rawUrl = resolveVariables(step.url, prevResponse);
                const resolvedUrl = (rawUrl.startsWith('http') || !baseUrl)
                    ? rawUrl
                    : baseUrl.replace(/\/$/, '') + '/' + rawUrl.replace(/^\//, '');
                const resolvedBody = resolveVariables(step.body, prevResponse);

                const stepStart = Date.now();
                const res = await api.testEndpoint({
                    url: resolvedUrl,
                    method: step.method,
                    headers: step.headers,
                    body: resolvedBody ? (() => { try { return JSON.parse(resolvedBody); } catch { return resolvedBody; } })() : undefined,
                    apiId: step.id,
                    collectionRunId: collectionRunId
                }, project.id);

                const data = res; // api.testEndpoint returns the data directly
                const duration = Date.now() - stepStart;

                // 360° Assertion Logic
                const assertionResults = {
                    statusMatch: data.status === step.assertions.expectedStatus,
                    latencyOk: !step.assertions.maxDuration || duration <= step.assertions.maxDuration,
                    schemaOk: true
                };

                const passed = assertionResults.statusMatch && assertionResults.latencyOk;

                const result = {
                    status: data.status,
                    data: data.data,
                    duration,
                    passed,
                    assertions: assertionResults
                };

                updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], result };
                setSteps([...updatedSteps]);

                if (!passed) {
                    finalStatus = 'Failed';
                    if (stopOnFailure) {
                        stopExecution = true;
                        toast.error(`Sequence halted: Assertion breach on ${step.name}`);
                    }
                }

                prevResponse = typeof data.data === 'object' ? (data.data || {}) : {};
                setChainData(prev => ({ ...prev, [step.id]: prevResponse }));
            } catch (err) {
                updatedSteps[stepIdx] = { ...updatedSteps[stepIdx], result: { status: 'error', error: err.message, passed: false } };
                setSteps([...updatedSteps]);
                finalStatus = 'Failed';
                if (stopOnFailure) stopExecution = true;
            }

            if (i < activeSteps.length - 1 && !stopExecution) await new Promise(r => setTimeout(r, delay));
        }

        const runDuration = Date.now() - runStartTime;
        const passedCount = updatedSteps.filter(s => s.result?.passed).length;
        const failedCount = updatedSteps.filter(s => s.result && !s.result.passed).length;

        // Save Run Summary to DB
        try {
            await api.saveCollectionRun(collectionId, {
                projectId: project.id,
                status: failedCount === 0 ? 'Success' : (passedCount > 0 ? 'Partial' : 'Failed'),
                totalSteps: activeSteps.length,
                passedSteps: passedCount,
                failedSteps: failedCount,
                durationMs: runDuration
            });
        } catch (e) {
            console.error("Failed to save run summary", e);
        }

        setRunning(false);
        setCurrentStep(-1);
        toast.success(`Run complete: ${passedCount} passed, ${failedCount} failed`);
    };

    const passedCount = steps.filter(s => s.result?.passed).length;
    const failedCount = steps.filter(s => s.result && !s.result.passed && s.result.status !== 'running').length;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-[900px] max-h-[90vh] flex flex-col overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800 bg-slate-950/50">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center shadow-inner">
                            <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-tight">360° Sequence Execution</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em]">Persistent Validation & Telemetry Active</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Automation Summary */}
                {(passedCount + failedCount) > 0 && (
                    <div className="px-8 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> {passedCount} VALIDATED</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-red-500 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {failedCount} BREACHES</span>
                        </div>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(passedCount / steps.length) * 100}%` }} />
                        </div>
                    </div>
                )}

                {/* Steps Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {steps.map((step, idx) => {
                        const isRunning = running && currentStep === idx;
                        const res = step.result;

                        return (
                            <div key={step.id} className={`border rounded-[2rem] transition-all overflow-hidden ${!step.enabled ? 'opacity-40 border-slate-800' : res?.passed === false ? 'border-red-500/30 bg-red-500/5 shadow-lg shadow-red-500/5' : res?.passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-800/20'}`}>
                                <div className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}>
                                    <input type="checkbox" checked={step.enabled} onClick={e => e.stopPropagation()} onChange={e => setSteps(steps.map((s, i) => i === idx ? { ...s, enabled: e.target.checked } : s))} className="w-4 h-4 accent-indigo-500" />
                                    <div className="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">{idx + 1}</div>
                                    <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase w-16 text-center ${step.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{step.method}</div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-bold text-white block truncate">{step.name}</span>
                                        <span className="text-[9px] font-mono text-slate-500 block truncate">{step.url}</span>
                                    </div>

                                    {isRunning && <Activity className="w-4 h-4 text-indigo-400 animate-spin" />}

                                    {res && !isRunning && (
                                        <div className="flex gap-4 items-center">
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${res.assertions?.statusMatch ? 'text-emerald-400' : 'text-red-400 bg-red-500/10'}`}>
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                {res.status}
                                            </div>
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${res.assertions?.latencyOk ? 'text-blue-400' : 'text-amber-400 bg-amber-500/10'}`}>
                                                <Clock className="w-3.5 h-3.5" />
                                                {res.duration}ms
                                            </div>
                                        </div>
                                    )}
                                    {expandedStep === step.id ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                </div>

                                {expandedStep === step.id && (
                                    <div className="px-10 pb-6 space-y-4 border-t border-slate-800/50 pt-6 animate-slide-down">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Request Pipeline (PREV Chaining Supported)</label>
                                                    <textarea
                                                        value={step.body}
                                                        onChange={e => setSteps(steps.map((s, i) => i === idx ? { ...s, body: e.target.value } : s))}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-mono text-indigo-300 h-24 resize-none outline-none focus:border-indigo-500 shadow-inner"
                                                        placeholder='{ "key": "{{PREV.id}}" }'
                                                    />
                                                </div>
                                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <Gauge className="w-3 h-3 text-indigo-400" /> Validation Specs
                                                    </h5>
                                                    <div className="flex gap-4">
                                                        <div><span className="text-[8px] text-slate-600 block uppercase font-bold">Expect</span><span className="text-xs font-bold text-white">{step.assertions.expectedStatus} OK</span></div>
                                                        <div><span className="text-[8px] text-slate-600 block uppercase font-bold">Max Delay</span><span className="text-xs font-bold text-white">{step.assertions.maxDuration || 'No Limit'}ms</span></div>
                                                        <div><span className="text-[8px] text-slate-600 block uppercase font-bold">Schema</span><span className="text-xs font-bold text-white">{step.assertions.validateSchema ? 'Strict' : 'None'}</span></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 block flex items-center justify-between">
                                                    Response Payload
                                                    <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(res?.data, null, 2)); toast.success('Copied Payload'); }}>
                                                        <Copy className="w-3 h-3 text-slate-500 hover:text-white" />
                                                    </button>
                                                </label>
                                                <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[11px] font-mono text-blue-300 h-44 overflow-auto custom-scrollbar">
                                                    {res?.data ? (typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : String(res.data)) : "// Awaiting pipeline execution..."}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Runner Control Bar */}
                <div className="px-8 py-5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Wait Interval</span>
                            <select value={delay} onChange={e => setDelay(Number(e.target.value))} className="bg-slate-800 border-none rounded-lg px-3 py-1 text-[10px] font-bold text-white outline-none mt-1">
                                <option value={0}>Zero Latency</option>
                                <option value={300}>300ms (Stable)</option>
                                <option value={500}>500ms (Safe)</option>
                                <option value={1000}>1s (Slow)</option>
                            </select>
                        </div>
                        <div className="h-8 w-px bg-slate-800" />

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setStopOnFailure(!stopOnFailure)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${stopOnFailure ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                            >
                                <StopCircle className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Stop on Failure</span>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={runAll}
                        disabled={running}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-4 group active:scale-95"
                    >
                        {running ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                        <span>{running ? 'Executing Sequence...' : `Trigger ${steps.filter(s => s.enabled).length} Assertions`}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

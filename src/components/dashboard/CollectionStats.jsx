import React, { useState, useEffect } from 'react';
import {
    Activity, Clock, CheckCircle, AlertCircle, BarChart3,
    ArrowUpRight, ArrowDownRight, Zap, Target, History,
    Calendar, ChevronRight, X
} from 'lucide-react';
import { api } from '../../api';

/**
 * CollectionStats
 * Provides a 360° analytics view of collection run history, success trends, and performance.
 */
export function CollectionStats({ project, onClose }) {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRun, setSelectedRun] = useState(null);

    useEffect(() => {
        loadStats();
    }, [project.id]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await api.getCollectionRuns(project.id);
            setRuns(data);
        } catch (e) {
            console.error("Failed to load collection stats", e);
        } finally {
            setLoading(false);
        }
    };

    const calculateAggregates = () => {
        if (!runs.length) return { avgDuration: 0, successRate: 0, totalTests: 0, breachCount: 0 };
        const totalDuration = runs.reduce((acc, run) => acc + run.duration_ms, 0);
        const totalPassed = runs.reduce((acc, run) => acc + run.passed_steps, 0);
        const totalSteps = runs.reduce((acc, run) => acc + run.total_steps, 0);
        const breaches = runs.filter(r => r.failed_steps > 0).length;

        return {
            avgDuration: Math.round(totalDuration / runs.length),
            successRate: Math.round((totalPassed / totalSteps) * 100) || 0,
            totalTests: runs.length,
            breachCount: breaches
        };
    };

    const stats = calculateAggregates();

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-slate-950 w-[800px] h-full shadow-2xl border-l border-slate-800 flex flex-col animate-slide-left overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-8 border-b border-slate-900 bg-slate-900/20">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <BarChart3 className="w-8 h-8 text-indigo-500" />
                                Execution Intelligence
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">360° Quality & Performance Telemetry</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-2xl text-slate-500 hover:text-white transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Meta Cards */}
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Avg Latency', value: `${stats.avgDuration}ms`, icon: Clock, color: 'text-indigo-400' },
                            { label: 'Health Score', value: `${stats.successRate}%`, icon: Zap, color: 'text-emerald-400' },
                            { label: 'Total Runs', value: stats.totalTests, icon: History, color: 'text-blue-400' },
                            { label: 'Breaches', value: stats.breachCount, icon: AlertCircle, color: 'text-rose-400' },
                        ].map((item, i) => (
                            <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                                <item.icon className={`w-4 h-4 ${item.color} mb-2`} />
                                <div className="text-xl font-black text-white">{item.value}</div>
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-6">Historical Batch Executions</h3>

                    {loading ? (
                        <div className="py-20 text-center">
                            <Activity className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Aggregating run data...</span>
                        </div>
                    ) : runs.map((run, idx) => (
                        <div
                            key={run.id}
                            className={`group flex items-center justify-between p-6 bg-slate-900/40 border border-slate-800 rounded-[2rem] hover:border-indigo-500/30 transition-all cursor-pointer ${selectedRun?.id === run.id ? 'border-indigo-500/50 bg-indigo-500/5' : ''}`}
                        >
                            <div className="flex items-center gap-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${run.status === 'Success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {run.status === 'Success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{run.collection_name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] text-slate-500 font-mono">{new Date(run.created_at).toLocaleString()}</span>
                                        <div className="w-1 h-1 rounded-full bg-slate-800" />
                                        <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{run.passed_steps}/{run.total_steps} PASSED</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm font-black text-white">{run.duration_ms}ms</div>
                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Total Delay</div>
                            </div>
                        </div>
                    ))}

                    {runs.length === 0 && !loading && (
                        <div className="py-20 text-center border-2 border-dashed border-slate-900 rounded-[3rem]">
                            <History className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">No execution history found</p>
                        </div>
                    )}
                </div>

                {/* Footer Trace */}
                <div className="p-8 border-t border-slate-900 bg-slate-950 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Real-time Telemetry Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

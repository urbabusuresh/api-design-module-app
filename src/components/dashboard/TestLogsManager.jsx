import React, { useState, useEffect } from 'react';
import {
    Search, Activity, ChevronLeft, ChevronRight, History, Clock, Laptop, X,
    LayoutGrid, Box, CheckCircle, Globe, Shield, Layers
} from 'lucide-react';
import { api } from '../../api';

export function TestLogsManager({ project }) {
    const [logs, setLogs] = useState({ logs: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [methodFilter, setMethodFilter] = useState("all");
    const [moduleFilter, setModuleFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [detailTab, setDetailTab] = useState('overview');

    useEffect(() => {
        loadLogs();
    }, [page, statusFilter, methodFilter, moduleFilter, searchTerm]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const response = await api.getTestLogs(project.id, {
                search: searchTerm,
                status: statusFilter,
                method: methodFilter,
                moduleId: moduleFilter,
                page,
                limit: pageSize
            });
            setLogs(response);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const isPaginated = !Array.isArray(logs) && logs.logs;
    const displayLogs = isPaginated ? logs.logs : (Array.isArray(logs) ? logs : []);

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
            <div className="px-8 py-4 border-b border-slate-900 bg-slate-900/50 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search by URL, method or user..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-400 outline-none"
                    >
                        <option value="all">All Status</option>
                        <option value="success">Success (2xx)</option>
                        <option value="error">Error (4xx/5xx)</option>
                    </select>
                    <select
                        value={methodFilter}
                        onChange={e => { setMethodFilter(e.target.value); setPage(1); }}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-400 outline-none"
                    >
                        <option value="all">All Methods</option>
                        {['GET', 'POST', 'PUT', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                        value={moduleFilter}
                        onChange={e => { setModuleFilter(e.target.value); setPage(1); }}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-bold text-indigo-400 outline-none border-indigo-500/20"
                    >
                        <option value="all">All Modules</option>
                        {project.modules?.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={loadLogs}
                        className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all"
                    >
                        <Activity className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* List */}
                <div className="w-1/3 border-r border-slate-900 overflow-y-auto p-4 space-y-3">
                    {displayLogs.map(log => (
                        <div
                            key={log.id}
                            onClick={() => setSelectedLog(log)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedLog?.id === log.id ? 'bg-indigo-600/10 border-indigo-500/50 shadow-lg' : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${log.response_status < 400 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {log.response_status}
                                </span>
                                <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-xs font-bold text-white truncate mb-1">{log.method} {log.url}</div>
                            <div className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">Duration: {log.duration} • By {log.tested_by}</div>
                        </div>
                    ))}
                    {isPaginated && (
                        <div className="pt-4 flex items-center justify-between">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] font-bold text-slate-500">PAGE {page} OF {Math.ceil(logs.total / pageSize)}</span>
                            <button
                                disabled={page >= Math.ceil(logs.total / pageSize)}
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    {displayLogs.length === 0 && !loading && (
                        <div className="py-20 text-center text-slate-600">
                            <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No test logs found</p>
                        </div>
                    )}
                </div>

                {/* Detail */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/50">
                    {selectedLog ? (
                        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                            {/* Detail Header \u0026 Tabs */}
                            <div className="p-8 pb-0 border-b border-slate-900 shrink-0">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className={`px-2 py-1 rounded text-xs font-black ${selectedLog.response_status < 400 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {selectedLog.response_status}
                                            </span>
                                            <h2 className="text-xl font-bold text-white truncate max-w-xl">{selectedLog.method} {selectedLog.url}</h2>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(selectedLog.created_at).toLocaleString()}</span>
                                            <span className="flex items-center gap-1"><Laptop className="w-3 h-3" /> {selectedLog.tested_by || 'Anonymous'}</span>
                                            <span className="flex items-center gap-1 font-mono text-indigo-400">{selectedLog.id}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedLog(null)}
                                        className="p-2 hover:bg-slate-900 rounded-xl text-slate-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex space-x-8">
                                    {[
                                        { id: 'overview', label: 'Overview', icon: LayoutGrid },
                                        { id: 'request', label: 'Request', icon: Box },
                                        { id: 'response', label: 'Response', icon: CheckCircle },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setDetailTab(tab.id)}
                                            className={`flex items-center space-x-2 py-4 text-xs font-bold border-b-2 transition-all uppercase tracking-widest ${detailTab === tab.id
                                                ? 'border-indigo-500 text-indigo-400'
                                                : 'border-transparent text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            <tab.icon className="w-3.5 h-3.5" />
                                            <span>{tab.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Detail Content */}
                            <div className="flex-1 overflow-y-auto p-8">
                                {detailTab === 'overview' && (
                                    <div className="grid grid-cols-2 gap-8 animate-fade-in">
                                        <div className="space-y-6">
                                            <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-6">
                                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                                                    Execution Summary
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                                        <span className="text-slate-500 font-medium">Status</span>
                                                        <span className={`font-black ${selectedLog.response_status < 400 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {selectedLog.response_status} {selectedLog.response_status < 400 ? 'OK' : 'Error'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                                        <span className="text-slate-500 font-medium">Duration</span>
                                                        <span className="text-white font-mono">{selectedLog.duration}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                                        <span className="text-slate-500 font-medium">Tested By</span>
                                                        <span className="text-indigo-400 font-black uppercase tracking-tighter">{selectedLog.tested_by || 'Dev Machine'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-6">
                                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                                                    Target Endpoint
                                                </h3>
                                                <div className="space-y-3">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Method</span>
                                                        <span className="text-indigo-400 font-black">{selectedLog.method}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">URL Path</span>
                                                        <span className="text-white font-mono break-all text-sm leading-relaxed">{selectedLog.url}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {detailTab === 'request' && (
                                    <div className="space-y-8 animate-fade-in">
                                        <div>
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                                                Sent Headers
                                            </h3>
                                            <pre className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-[11px] text-slate-400 overflow-x-auto shadow-inner leading-relaxed">
                                                {JSON.stringify(selectedLog.request_headers, null, 2)}
                                            </pre>
                                        </div>
                                        {selectedLog.request_body && Object.keys(selectedLog.request_body).length > 0 && (
                                            <div>
                                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <Box className="w-3.5 h-3.5 text-indigo-400" />
                                                    Sent Payload
                                                </h3>
                                                <pre className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-[11px] text-indigo-300 overflow-x-auto shadow-inner leading-relaxed">
                                                    {JSON.stringify(selectedLog.request_body, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {detailTab === 'response' && (
                                    <div className="space-y-8 animate-fade-in">
                                        <div>
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Shield className="w-3.5 h-3.5 text-pink-400" />
                                                Received Headers
                                            </h3>
                                            <pre className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-[11px] text-slate-400 overflow-x-auto shadow-inner leading-relaxed">
                                                {JSON.stringify(selectedLog.response_headers, null, 2)}
                                            </pre>
                                        </div>
                                        <div>
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                                Received Body
                                            </h3>
                                            <pre className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-[11px] text-blue-300 overflow-x-auto shadow-inner max-h-[500px] overflow-y-auto leading-relaxed">
                                                {JSON.stringify(selectedLog.response_body, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}
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

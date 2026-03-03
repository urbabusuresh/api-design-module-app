import React, { useState } from 'react';
import { Share2, FileText, Lock } from 'lucide-react';

const NB_SB_AUTH_COLORS = {
    'None': 'bg-slate-700/50 text-slate-400',
    'Bearer': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    'Basic': 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    'OAuth2': 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    'API Key': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

export function NbSbMappingView({ project, onExportLLD }) {
    const [filterNb, setFilterNb] = useState('All');
    const [filterSb, setFilterSb] = useState('All');

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

    const authTypeCounts = {};
    allApis.forEach(a => {
        (a.downstream || []).forEach(d => {
            const t = d.authType || 'None';
            authTypeCounts[t] = (authTypeCounts[t] || 0) + 1;
        });
    });

    const filteredApis = mappedApis.filter(a => {
        if (filterNb !== 'All' && !(a.consumers || []).some(c => c.name === filterNb)) return false;
        if (filterSb !== 'All' && !(a.downstream || []).some(d => (d.providerSystem || d.name) === filterSb)) return false;
        return true;
    });

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Share2 className="w-6 h-6 text-indigo-400" />
                        NB → SB Mapping
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Northbound consumer to southbound provider mapping with authentication details</p>
                </div>
                <button
                    onClick={onExportLLD}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                >
                    <FileText className="w-4 h-4" />
                    <span>Export LLD JSON</span>
                </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total APIs</div>
                    <div className="text-3xl font-black text-white">{allApis.length}</div>
                    <div className="text-xs text-slate-600 mt-1">{mappedApis.length} mapped</div>
                </div>
                <div className="bg-slate-900 border border-indigo-500/20 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1">NB Channels</div>
                    <div className="text-3xl font-black text-indigo-400">{nbChannels.length}</div>
                    <div className="text-xs text-slate-500 mt-1 truncate">{nbChannels.join(', ') || '—'}</div>
                </div>
                <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">SB Systems</div>
                    <div className="text-3xl font-black text-emerald-400">{sbSystems.length}</div>
                    <div className="text-xs text-slate-500 mt-1 truncate">{sbSystems.join(', ') || '—'}</div>
                </div>
                <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4">
                    <div className="text-[10px] font-bold text-amber-400 uppercase mb-1">Auth Types Used</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {Object.keys(authTypeCounts).length === 0 ? (
                            <span className="text-slate-600 text-xs">—</span>
                        ) : Object.entries(authTypeCounts).map(([type, count]) => (
                            <span key={type} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${NB_SB_AUTH_COLORS[type] || NB_SB_AUTH_COLORS['None']}`}>{type}×{count}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Filter:</span>
                <select value={filterNb} onChange={e => setFilterNb(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500"
                >
                    <option value="All">All NB Channels</option>
                    {nbChannels.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterSb} onChange={e => setFilterSb(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500"
                >
                    <option value="All">All SB Systems</option>
                    {sbSystems.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-[10px] text-slate-500 ml-auto">{filteredApis.length} of {mappedApis.length} APIs shown</span>
            </div>

            {mappedApis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500">
                    <Share2 className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No mappings yet</p>
                    <p className="text-sm mt-1">Add NB channels and downstream SB APIs to each endpoint to see the mapping here.</p>
                </div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{filteredApis.length} Mapped APIs</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <Lock className="w-3 h-3" /> Auth type shown per SB connection
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left">API Endpoint</th>
                                    <th className="px-4 py-3 text-left">Service / System</th>
                                    <th className="px-4 py-3 text-left">Method</th>
                                    <th className="px-4 py-3 text-left">NB Consumers</th>
                                    <th className="px-4 py-3 text-left">SB Providers + Auth</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredApis.map((a, idx) => (
                                    <tr key={a.id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-900/30'}`}>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-white">{a.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">{a.url}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-300 text-xs font-medium">{a.serviceName}</div>
                                            <div className="text-[10px] text-slate-500">{a.systemName}</div>
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
                                            <div className="flex flex-col gap-1.5">
                                                {(a.downstream || []).length === 0
                                                    ? <span className="text-slate-600 text-xs">—</span>
                                                    : (a.downstream || []).map(d => (
                                                        <div key={d.id || d.name} className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] rounded-full font-medium">{d.providerSystem || d.name}</span>
                                                            {d.authType && d.authType !== 'None' && (
                                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${NB_SB_AUTH_COLORS[d.authType] || NB_SB_AUTH_COLORS['None']}`}>
                                                                    <Lock className="w-2.5 h-2.5 inline mr-0.5" />{d.authType}
                                                                </span>
                                                            )}
                                                            {d.method && (
                                                                <span className="text-[9px] text-slate-600 font-mono">{d.method}</span>
                                                            )}
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'Active' || a.status === 'Published' ? 'bg-emerald-500/10 text-emerald-400' : a.status === 'Draft' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>{a.status || 'Draft'}</span>
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

import React, { useMemo } from 'react';
import {
    Activity, Box, Layers, BookOpen, Globe, TrendingUp,
    CheckCircle, AlertCircle, Clock, Archive, BarChart2
} from 'lucide-react';

const METHOD_COLORS = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
    PATCH: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
};

const STATUS_COLORS = {
    Active: 'text-emerald-400',
    Draft: 'text-slate-400',
    'Under Review': 'text-indigo-400',
    Deprecated: 'text-orange-400',
    Retired: 'text-red-400',
};

const STATUS_ICONS = {
    Active: CheckCircle,
    Draft: Clock,
    'Under Review': AlertCircle,
    Deprecated: AlertCircle,
    Retired: Archive,
};

function StatCard({ icon: Icon, label, value, color = 'text-indigo-400', sub }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl bg-slate-800/80 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <div className="text-2xl font-black text-white">{value}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
                {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
            </div>
        </div>
    );
}

function BreakdownBar({ label, count, total, colorClass }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
                <span className={`font-bold ${colorClass}`}>{label}</span>
                <span className="text-slate-400 font-mono">{count} <span className="text-slate-600">({pct}%)</span></span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${colorClass.replace('text-', 'bg-').replace('/40', '/60')}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

export function ProjectStatsPanel({ project }) {
    const stats = useMemo(() => {
        const allApis = [];
        (project.systems || []).forEach(sys => {
            (sys.rootApis || []).forEach(svc => {
                (svc.subApis || []).forEach(api => allApis.push(api));
            });
        });

        const totalEndpoints = allApis.length;
        const totalSystems = (project.systems || []).length;
        const totalServices = (project.systems || []).reduce((sum, sys) => sum + (sys.rootApis?.length || 0), 0);
        const totalModules = (project.modules || []).length;

        // Method breakdown
        const methods = {};
        allApis.forEach(api => {
            const m = api.method || 'GET';
            methods[m] = (methods[m] || 0) + 1;
        });

        // Status breakdown
        const statuses = {};
        allApis.forEach(api => {
            const s = api.status || 'Draft';
            statuses[s] = (statuses[s] || 0) + 1;
        });

        // Tag cloud
        const tagCounts = {};
        allApis.forEach(api => {
            (api.tags || []).forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        // Top tagged endpoints
        const taggedApis = allApis.filter(a => a.tags?.length > 0).length;

        // Downstream connectivity
        const withDownstream = allApis.filter(a => a.downstream?.length > 0).length;

        return { totalEndpoints, totalSystems, totalServices, totalModules, methods, statuses, tagCounts, taggedApis, withDownstream, allApis };
    }, [project]);

    const sortedMethods = Object.entries(stats.methods).sort((a, b) => b[1] - a[1]);
    const sortedStatuses = Object.entries(stats.statuses).sort((a, b) => b[1] - a[1]);
    const sortedTags = Object.entries(stats.tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);

    return (
        <div className="flex-1 overflow-y-auto p-8 animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white mb-1">{project.name}</h1>
                <p className="text-slate-500 text-sm">{project.description || 'Project Overview & Statistics'}</p>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard icon={Globe} label="Total Endpoints" value={stats.totalEndpoints} color="text-indigo-400" />
                <StatCard icon={Box} label="Systems" value={stats.totalSystems} color="text-blue-400" />
                <StatCard icon={Layers} label="Services" value={stats.totalServices} color="text-purple-400" />
                <StatCard icon={BookOpen} label="Modules" value={stats.totalModules} color="text-pink-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Method Breakdown */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <BarChart2 className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">By HTTP Method</h3>
                    </div>
                    <div className="space-y-3">
                        {sortedMethods.length === 0 && (
                            <p className="text-xs text-slate-600 italic">No endpoints yet</p>
                        )}
                        {sortedMethods.map(([method, count]) => {
                            const colorMap = { GET: 'text-emerald-400', POST: 'text-blue-400', PUT: 'text-amber-400', DELETE: 'text-red-400', PATCH: 'text-purple-400' };
                            return (
                                <BreakdownBar
                                    key={method}
                                    label={method}
                                    count={count}
                                    total={stats.totalEndpoints}
                                    colorClass={colorMap[method] || 'text-slate-400'}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">By Status</h3>
                    </div>
                    <div className="space-y-3">
                        {sortedStatuses.length === 0 && (
                            <p className="text-xs text-slate-600 italic">No endpoints yet</p>
                        )}
                        {sortedStatuses.map(([status, count]) => (
                            <BreakdownBar
                                key={status}
                                label={status}
                                count={count}
                                total={stats.totalEndpoints}
                                colorClass={STATUS_COLORS[status] || 'text-slate-400'}
                            />
                        ))}
                    </div>
                </div>

                {/* Connectivity Stats */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Connectivity</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-800">
                            <span className="text-xs text-slate-400">Endpoints with Downstream</span>
                            <span className="text-sm font-black text-amber-400">{stats.withDownstream}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-800">
                            <span className="text-xs text-slate-400">Tagged Endpoints</span>
                            <span className="text-sm font-black text-indigo-400">{stats.taggedApis}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-xs text-slate-400">Total Tags Used</span>
                            <span className="text-sm font-black text-pink-400">{Object.keys(stats.tagCounts).length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tag Cloud */}
            {sortedTags.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Tag Cloud</h3>
                        <span className="text-[10px] text-slate-600">({Object.keys(stats.tagCounts).length} unique tags)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {sortedTags.map(([tag, count]) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-bold text-indigo-300"
                            >
                                {tag}
                                <span className="text-[9px] text-indigo-500 font-black">{count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Systems Overview */}
            {(project.systems || []).length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-4">Systems Overview</h3>
                    <div className="space-y-2">
                        {(project.systems || []).map(sys => {
                            const svcCount = sys.rootApis?.length || 0;
                            const epCount = (sys.rootApis || []).reduce((sum, svc) => sum + (svc.subApis?.length || 0), 0);
                            const methodCounts = {};
                            (sys.rootApis || []).forEach(svc => {
                                (svc.subApis || []).forEach(api => {
                                    const m = api.method || 'GET';
                                    methodCounts[m] = (methodCounts[m] || 0) + 1;
                                });
                            });
                            return (
                                <div key={sys.id} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <Box className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm font-bold text-white">{sys.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-1.5">
                                            {Object.entries(methodCounts).map(([m, c]) => {
                                                const cls = METHOD_COLORS[m] || 'bg-slate-800 text-slate-400 border-slate-700';
                                                return (
                                                    <span key={m} className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${cls}`}>
                                                        {m} {c}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <span className="text-[10px] text-slate-500">{svcCount} services, {epCount} endpoints</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {stats.totalEndpoints === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                        <Globe className="w-8 h-8 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-400 mb-1">No Endpoints Yet</h3>
                    <p className="text-sm text-slate-600">Select a system from the sidebar and start adding services and endpoints.</p>
                </div>
            )}
        </div>
    );
}

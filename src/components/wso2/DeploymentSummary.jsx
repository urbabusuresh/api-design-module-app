import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertCircle, Clock, RefreshCw, ArrowRight, Globe } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import ConfirmModal from '../dashboard/ConfirmModal.jsx';

const STATUS_CONFIG = {
    PUBLISHED: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
    CREATED: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Clock },
    DEPRECATED: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertCircle },
    RETIRED: { color: 'text-slate-500', bg: 'bg-slate-700/20 border-slate-700', icon: AlertCircle },
    PROTOTYPED: { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Activity },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.CREATED;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
            <Icon className="w-3 h-3" />
            {status}
        </span>
    );
}

/**
 * DeploymentSummary
 * Shows all APIs in the WSO2 project grouped by their lifecycle status,
 * and allows promoting (Smart Launch) an individual API or promoting it to
 * a target WSO2 environment.
 *
 * Props:
 *   project     - the current WSO2_REMOTE project object
 */
export default function DeploymentSummary({ project }) {
    const apis = project?.systems?.[0]?.services?.[0]?.subApis || [];
    const [loading, setLoading] = useState(false);
    const [promotingId, setPromotingId] = useState(null);
    const [targetProjectId, setTargetProjectId] = useState('');
    const [allProjects, setAllProjects] = useState([]);
    const [results, setResults] = useState({}); // apiId -> { status, message }
    const [confirmConfig, setConfirmConfig] = useState(null); // { title, message, onConfirm, type }

    useEffect(() => {
        api.getProjects().then(list => {
            setAllProjects((list || []).filter(p => p.type === 'WSO2_REMOTE' && p.id !== project.id));
        }).catch(() => { });
    }, [project.id]);

    const grouped = {
        PUBLISHED: [],
        CREATED: [],
        PROTOTYPED: [],
        DEPRECATED: [],
        RETIRED: [],
        OTHER: []
    };

    apis.forEach(a => {
        const st = a.status?.toUpperCase();
        if (grouped[st]) grouped[st].push(a);
        else grouped.OTHER.push(a);
    });

    const handleSmartLaunch = async (wso2Api) => {
        setConfirmConfig({
            title: 'Smart Launch',
            message: `Smart Launch "${wso2Api.name}"? This will create, document and publish the API in the target WSO2 environment.`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await api.smartLaunchWso2Api(project.id, wso2Api.id);
                    setResults(prev => ({ ...prev, [wso2Api.id]: { ok: true, message: `Launched: ${res.status}` } }));
                } catch (e) {
                    setResults(prev => ({ ...prev, [wso2Api.id]: { ok: false, message: e.message } }));
                } finally {
                    setLoading(false);
                }
            },
            type: 'primary'
        });
    };

    const handlePromote = async (wso2Api) => {
        if (!targetProjectId) { toast.error('Select a target environment first.'); return; }

        setConfirmConfig({
            title: 'Promote API',
            message: `Promote "${wso2Api.name}" to the selected WSO2 environment?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    const wso2Id = wso2Api.wso2_id || wso2Api.id.split('_op_')[0];
                    const res = await api.promoteWso2Api(project.id, wso2Id, targetProjectId);
                    setResults(prev => ({ ...prev, [wso2Api.id]: { ok: true, message: `Promoted: ${res.status}` } }));
                } catch (e) {
                    setResults(prev => ({ ...prev, [wso2Api.id]: { ok: false, message: e.message } }));
                } finally {
                    setLoading(false);
                }
            },
            type: 'primary'
        });
    };

    const totalApis = apis.length;
    const publishedCount = grouped.PUBLISHED.length;
    const health = totalApis > 0 ? Math.round((publishedCount / totalApis) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Summary header */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">Deployment Summary</h2>
                <p className="text-slate-400 text-sm">Track API lifecycle status across this WSO2 gateway workspace.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total APIs" value={totalApis} color="text-white" />
                <StatCard label="Published" value={grouped.PUBLISHED.length} color="text-emerald-400" />
                <StatCard label="In Progress" value={grouped.CREATED.length + grouped.PROTOTYPED.length} color="text-blue-400" />
                <StatCard label="Publish Rate" value={`${health}%`} color={health > 70 ? 'text-emerald-400' : health > 30 ? 'text-amber-400' : 'text-red-400'} />
            </div>

            {/* Environment Promotion Target Selector */}
            {allProjects.length > 0 && (
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Promote Target:</span>
                    <select
                        value={targetProjectId}
                        onChange={e => setTargetProjectId(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500"
                    >
                        <option value="">— Select target WSO2 environment —</option>
                        {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            )}

            {/* API list by status */}
            {Object.entries(grouped).filter(([, list]) => list.length > 0).map(([status, list]) => (
                <div key={status} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800">
                        <StatusBadge status={status === 'OTHER' ? 'CREATED' : status} />
                        <span className="text-xs font-bold text-slate-400">{list.length} APIs</span>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                        {list.map(a => (
                            <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/30 transition-colors">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{a.name}</div>
                                    <div className="text-xs text-slate-500 font-mono truncate">{a.url}</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                    {results[a.id] && (
                                        <span className={`text-[10px] font-bold ${results[a.id].ok ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {results[a.id].message}
                                        </span>
                                    )}
                                    {allProjects.length > 0 && (
                                        <button
                                            onClick={() => handlePromote(a)}
                                            disabled={loading || !targetProjectId}
                                            title="Promote to target environment"
                                            className="flex items-center gap-1 px-3 py-1 bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 border border-sky-500/20 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
                                        >
                                            <ArrowRight className="w-3 h-3" />
                                            Promote
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {apis.length === 0 && (
                <div className="flex flex-col items-center py-20 text-slate-600 space-y-2">
                    <Activity className="w-10 h-10 opacity-20" />
                    <p className="text-sm">No APIs found in this workspace.</p>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={!!confirmConfig}
                title={confirmConfig?.title}
                message={confirmConfig?.message}
                type={confirmConfig?.type}
                onConfirm={async () => {
                    await confirmConfig.onConfirm();
                    setConfirmConfig(null);
                }}
                onCancel={() => setConfirmConfig(null)}
            />
        </div>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">{label}</div>
            <div className={`text-3xl font-black ${color}`}>{value}</div>
        </div>
    );
}

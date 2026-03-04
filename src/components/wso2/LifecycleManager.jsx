import React, { useState, useEffect } from 'react';
import { GitBranch, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import ConfirmModal from '../dashboard/ConfirmModal.jsx';

const LifecycleManager = ({ apiItem, project, onUpdate }) => {
    const [lifecycle, setLifecycle] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [changing, setChanging] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); // action string

    useEffect(() => {
        loadLifecycle();
        loadHistory();
    }, [apiItem]);

    const loadLifecycle = async () => {
        try {
            setLoading(true);
            let targetId = apiItem.wso2_id || apiItem.id.split('_op_')[0];
            const data = await api.getWso2ApiLifecycle(project.id, targetId);
            setLifecycle(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            setHistoryLoading(true);
            let targetId = apiItem.wso2_id || apiItem.id;
            const data = await api.getWso2LifecycleHistory(project.id, targetId);
            setHistory(Array.isArray(data?.list) ? data.list : []);
        } catch (e) {
            // lifecycle-history might not be supported on all WSO2 versions — fail silently
            console.warn("Lifecycle history unavailable:", e.message);
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    // WSO2 returns transitions as { event, targetState } objects
    const getEventString = (action) => (typeof action === 'object' ? action.event : action);

    const handleStateChange = (action) => {
        setConfirmAction(getEventString(action));
    };

    const confirmStateChange = async () => {
        if (!confirmAction) return;
        try {
            setChanging(true);
            let targetId = apiItem.wso2_id || apiItem.id;
            await api.changeWso2ApiLifecycle(project.id, targetId, confirmAction);
            await loadLifecycle();
            if (onUpdate) onUpdate();
        } catch (e) {
            toast.error('Failed to change lifecycle: ' + e.message);
        } finally {
            setChanging(false);
            setConfirmAction(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!lifecycle) {
        return (
            <div className="text-center text-slate-500 py-10">
                Lifecycle information not available
            </div>
        );
    }

    const getStateColor = (state) => {
        switch (state) {
            case 'PUBLISHED': return 'text-emerald-400 bg-emerald-500/10';
            case 'CREATED': return 'text-blue-400 bg-blue-500/10';
            case 'PROTOTYPED': return 'text-amber-400 bg-amber-500/10';
            case 'DEPRECATED': return 'text-orange-400 bg-orange-500/10';
            case 'RETIRED': return 'text-red-400 bg-red-500/10';
            case 'BLOCKED': return 'text-slate-400 bg-slate-500/10';
            default: return 'text-slate-400 bg-slate-500/10';
        }
    };

    const getActionLabel = (action) => {
        const labels = {
            'Publish': 'Publish API',
            'Deploy as a Prototype': 'Deploy Prototype',
            'Demote to Created': 'Demote to Created',
            'Deprecate': 'Deprecate API',
            'Retire': 'Retire API',
            'Block': 'Block API',
            'Re-Publish': 'Re-Publish'
        };
        return labels[action] || action;
    };

    return (
        <div className="space-y-6">
            {/* Current State */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Current Lifecycle State
                </h3>
                <div className="flex items-center justify-between">
                    <div>
                        <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold uppercase ${getStateColor(lifecycle.state)}`}>
                            {lifecycle.state}
                        </span>
                    </div>
                    {lifecycle.availableTransitions && lifecycle.availableTransitions.length > 0 && (
                        <span className="text-xs text-slate-500">
                            {lifecycle.availableTransitions.length} actions available
                        </span>
                    )}
                </div>
            </div>

            {/* Available Actions */}
            {lifecycle.availableTransitions && lifecycle.availableTransitions.length > 0 && (
                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-300 uppercase mb-4">Available Actions</h3>
                    <div className="grid gap-3">
                        {lifecycle.availableTransitions.map((action, idx) => {
                            // WSO2 returns {event, targetState} or plain string
                            const eventStr = typeof action === 'object' ? action.event : action;
                            const targetStr = typeof action === 'object' ? action.targetState : '';
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleStateChange(action)}
                                    disabled={changing}
                                    className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white">
                                            {getActionLabel(eventStr)}
                                        </span>
                                        {targetStr && (
                                            <span className="text-[10px] text-slate-500 font-mono">→ {targetStr}</span>
                                        )}
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Checklist Items */}
            {lifecycle.checkItems && lifecycle.checkItems.length > 0 && (
                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-300 uppercase mb-4">Checklist</h3>
                    <div className="space-y-2">
                        {lifecycle.checkItems.map((item, idx) => (
                            <div key={idx} className="flex items-start space-x-3 text-sm">
                                {item.value ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                                )}
                                <span className={item.value ? 'text-slate-300' : 'text-slate-500'}>
                                    {item.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Lifecycle History */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Lifecycle History
                </h3>
                <div className="space-y-4">
                    {historyLoading ? (
                        <div className="py-4 text-center text-xs text-slate-500 italic">Loading history...</div>
                    ) : history.length > 0 ? (
                        history.map((item, idx) => (
                            <div key={idx} className="relative pl-6 pb-4 last:pb-0">
                                {idx !== history.length - 1 && (
                                    <div className="absolute left-[7px] top-4 bottom-0 w-px bg-slate-800" />
                                )}
                                <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                </div>
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-bold text-slate-200">
                                        Changed to <span className="text-indigo-400">{item.postState}</span>
                                    </p>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {new Date(item.updatedTime).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    by <span className="text-slate-400 font-medium">{item.user}</span>
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="py-4 text-center text-xs text-slate-500 italic">No history available for this API.</div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={!!confirmAction}
                title="API Lifecycle Transition"
                message={`Are you sure you want to perform "${confirmAction}" on this API? This will change its visibility and status on the WSO2 Gateway.`}
                onConfirm={confirmStateChange}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    );
};

export default LifecycleManager;

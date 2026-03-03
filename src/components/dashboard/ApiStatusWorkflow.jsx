import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Clock, XCircle, AlertTriangle, Send, X, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['Draft', 'Review', 'Active', 'Deprecated', 'Retired'];

const STATUS_CONFIG = {
    Draft:      { color: 'text-slate-400',   bg: 'bg-slate-800',         border: 'border-slate-700',  icon: Clock,         desc: 'Work in progress — not ready for use' },
    Review:     { color: 'text-blue-400',     bg: 'bg-blue-500/10',       border: 'border-blue-500/30', icon: MessageSquare, desc: 'Under review — pending approval' },
    Active:     { color: 'text-emerald-400',  bg: 'bg-emerald-500/10',    border: 'border-emerald-500/30', icon: CheckCircle,  desc: 'Live and available for use' },
    Deprecated: { color: 'text-amber-400',    bg: 'bg-amber-500/10',      border: 'border-amber-500/30', icon: AlertTriangle, desc: 'Still functional but superseded — avoid new use' },
    Retired:    { color: 'text-red-400',      bg: 'bg-red-500/10',        border: 'border-red-500/30', icon: XCircle,       desc: 'No longer available' },
};

const TRANSITIONS = {
    Draft:      ['Review', 'Active'],
    Review:     ['Active', 'Draft'],
    Active:     ['Deprecated', 'Retired'],
    Deprecated: ['Retired', 'Active'],
    Retired:    [],
};

/**
 * ApiStatusWorkflow
 * Visual workflow to move an API through status states with optional comment.
 */
export function ApiStatusWorkflow({ currentStatus = 'Draft', apiName = '', onTransition, onClose }) {
    const [targetStatus, setTargetStatus] = useState(null);
    const [comment, setComment] = useState('');
    const [confirming, setConfirming] = useState(false);

    const available = TRANSITIONS[currentStatus] || [];

    const handleSelect = (status) => {
        setTargetStatus(status);
        setConfirming(true);
    };

    const handleConfirm = () => {
        if (!targetStatus) return;
        onTransition?.(targetStatus, comment.trim());
        toast.success(`Status changed to ${targetStatus}`);
        onClose?.();
    };

    const currentCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.Draft;
    const CurrentIcon = currentCfg.icon;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[520px]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div>
                        <h3 className="text-sm font-bold text-white">API Status Workflow</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[360px]">{apiName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Current Status */}
                    <div>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2">Current Status</p>
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${currentCfg.bg} ${currentCfg.border}`}>
                            <CurrentIcon className={`w-4 h-4 ${currentCfg.color}`} />
                            <span className={`text-sm font-bold ${currentCfg.color}`}>{currentStatus}</span>
                        </div>
                        <p className="text-[9px] text-slate-600 mt-1.5">{currentCfg.desc}</p>
                    </div>

                    {/* Workflow timeline */}
                    <div>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-3">Workflow</p>
                        <div className="flex items-center gap-1 flex-wrap">
                            {STATUSES.map((s, i) => {
                                const cfg = STATUS_CONFIG[s];
                                const Icon = cfg.icon;
                                const isCurrent = s === currentStatus;
                                const isPast = STATUSES.indexOf(s) < STATUSES.indexOf(currentStatus);
                                return (
                                    <React.Fragment key={s}>
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all
                                            ${isCurrent ? `${cfg.bg} ${cfg.border} border ${cfg.color}` : isPast ? 'text-slate-600' : 'text-slate-700'}`}>
                                            <Icon className="w-3 h-3" />
                                            <span>{s}</span>
                                        </div>
                                        {i < STATUSES.length - 1 && <ArrowRight className="w-3 h-3 text-slate-800 shrink-0" />}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* Transition buttons */}
                    {available.length > 0 ? (
                        <div>
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2">Move To</p>
                            <div className="flex gap-2 flex-wrap">
                                {available.map(s => {
                                    const cfg = STATUS_CONFIG[s];
                                    const Icon = cfg.icon;
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => handleSelect(s)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all hover:opacity-90 ${cfg.bg} ${cfg.border} ${cfg.color}`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            {s}
                                            <ArrowRight className="w-3 h-3 opacity-60" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-xs text-slate-600 py-4 border border-dashed border-slate-800 rounded-xl">
                            No further transitions available from <span className="font-bold text-slate-500">{currentStatus}</span>
                        </div>
                    )}

                    {/* Confirmation + Comment */}
                    {confirming && targetStatus && (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 animate-fade-in">
                            <p className="text-xs text-white font-semibold">
                                Confirm transition: <span className={STATUS_CONFIG[currentStatus]?.color}>{currentStatus}</span>
                                <ArrowRight className="w-3 h-3 inline mx-1.5 text-slate-500" />
                                <span className={STATUS_CONFIG[targetStatus]?.color}>{targetStatus}</span>
                            </p>
                            <div>
                                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Approval Comment (optional)</label>
                                <textarea
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    placeholder="Reason for status change..."
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 outline-none focus:border-indigo-500 resize-none h-16"
                                />
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => setConfirming(false)} className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 transition-colors">Cancel</button>
                                <button
                                    onClick={handleConfirm}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${STATUS_CONFIG[targetStatus]?.bg} ${STATUS_CONFIG[targetStatus]?.border} border ${STATUS_CONFIG[targetStatus]?.color}`}
                                >
                                    <Send className="w-3 h-3" />
                                    Confirm &rarr; {targetStatus}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

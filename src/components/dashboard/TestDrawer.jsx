import React from 'react';
import { Activity, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';
import { AdvancedApiTester } from './AdvancedApiTester';

export function TestDrawer({ api: targetApi, project, onClose, onRefresh, selectedEnv }) {
    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose}>
            <div
                className="w-[1000px] bg-slate-900 border-l border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] h-full flex flex-col animate-slide-in-right overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500 opacity-20" />

                <div className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                            <Activity className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2 mb-0.5">
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Advanced Test Console</span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase">Postman Suite v2</span>
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight">{targetApi.name || "Ad-hoc Explorer"}</h2>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={onClose} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all border border-white/5 active:scale-90">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
                    <AdvancedApiTester
                        api={targetApi}
                        project={project}
                        selectedEnv={selectedEnv}
                        onUpdateExamples={async (sample) => {
                            try {
                                const bodyStr = typeof sample === 'object' ? JSON.stringify(sample, null, 4) : sample;

                                const updatedApi = { ...targetApi };
                                const responses = [...(targetApi.responses || [])];
                                const successIdx = responses.findIndex(r => r.code >= 200 && r.code < 300);

                                if (successIdx > -1) {
                                    responses[successIdx] = { ...responses[successIdx], body: bodyStr };
                                } else {
                                    responses.push({ code: 200, description: 'Success', body: bodyStr });
                                }

                                updatedApi.responses = responses;

                                await api.saveSubApi(updatedApi);
                                toast.success("Response saved as success example!");
                                if (onRefresh) onRefresh();
                                if (onClose) onClose();
                            } catch (e) {
                                toast.error("Failed to save example: " + e.message);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

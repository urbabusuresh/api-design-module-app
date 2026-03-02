import React, { useState, useEffect } from 'react';
import { Shield, Zap, Wrench, Lock, Key, Globe, Layout, ChevronRight, AlertTriangle } from 'lucide-react';
import { api } from '../../api';

const PoliciesPanel = ({ apiItem, project }) => {
    const [activeTab, setActiveTab] = useState('throttling');
    const [policies, setPolicies] = useState([]);
    const [mediationPolicies, setMediationPolicies] = useState([]);
    const [clientCerts, setClientCerts] = useState([]);
    const [endpointCerts, setEndpointCerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [activeTab, apiItem]);

    const loadData = async () => {
        try {
            setLoading(true);
            let targetId = apiItem.wso2_id || apiItem.id.split('_op_')[0];

            if (activeTab === 'throttling') {
                const data = await api.getWso2ThrottlingPolicies(project.id, 'advanced');
                setPolicies(data.list || []);
            } else if (activeTab === 'mediation') {
                const data = await api.getWso2MediationPolicies(project.id, targetId);
                setMediationPolicies(data.list || []);
            } else if (activeTab === 'certificates') {
                const [clientData, endpointData] = await Promise.all([
                    api.getWso2ClientCertificates(project.id, targetId).catch(() => ({ list: [] })),
                    api.getWso2EndpointCertificates(project.id, targetId).catch(() => ({ list: [] }))
                ]);
                setClientCerts(clientData.list || []);
                setEndpointCerts(endpointData.list || []);
            }
        } catch (e) {
            console.error("Failed to load policy data", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Inner Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-6">
                <button
                    onClick={() => setActiveTab('throttling')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'throttling' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Zap className="w-3.5 h-3.5" />
                    Throttling
                </button>
                <button
                    onClick={() => setActiveTab('mediation')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'mediation' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Wrench className="w-3.5 h-3.5" />
                    Mediation
                </button>
                <button
                    onClick={() => setActiveTab('certificates')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'certificates' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Lock className="w-3.5 h-3.5" />
                    Security
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <span>Loading policy details...</span>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeTab === 'throttling' && (
                        <div className="grid grid-cols-1 gap-3">
                            {policies.length > 0 ? (
                                policies.map((policy) => (
                                    <div key={policy.policyId} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                                                <Zap className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-wider">{policy.displayName || policy.policyName}</h4>
                                                <p className="text-xs text-slate-500 max-w-sm truncate">{policy.description || "No description provided."}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 px-2 py-1 rounded lowercase">
                                                {policy.defaultLimit?.requestCount || "Unlimited"} reqs / {policy.defaultLimit?.unitTime} {policy.defaultLimit?.timeUnit}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-slate-500 text-sm italic">No throttling policies configured.</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'mediation' && (
                        <div className="space-y-4">
                            <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-4">
                                <Wrench className="w-5 h-5 text-indigo-400 mt-0.5" />
                                <div className="text-xs text-slate-400 leading-relaxed">
                                    Mediation policies allow you to intercept the request/response flow to perform transformations or validatons using sequences.
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {mediationPolicies.length > 0 ? (
                                    mediationPolicies.map((med) => (
                                        <div key={med.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                <span className="text-sm font-bold text-slate-200">{med.name}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{med.type}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-slate-500 text-sm italic">No mediation policies found.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'certificates' && (
                        <div className="space-y-6">
                            {/* Client Certificates */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Client Certificates (mTLS)</h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {clientCerts.length > 0 ? (
                                        clientCerts.map((cert) => (
                                            <div key={cert.alias} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Key className="w-4 h-4 text-emerald-400" />
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-200 block">{cert.alias}</span>
                                                        <span className="text-[10px] text-slate-500 uppercase">Tier: {cert.tier}</span>
                                                    </div>
                                                </div>
                                                <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Details</button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl text-slate-600 text-xs italic">
                                            No client certificates uploaded.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Endpoint Certificates */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Endpoint Certificates</h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {endpointCerts.length > 0 ? (
                                        endpointCerts.map((cert) => (
                                            <div key={cert.alias} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Globe className="w-4 h-4 text-blue-400" />
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-200 block">{cert.alias}</span>
                                                        <span className="text-[10px] text-slate-500 truncate max-w-xs block">{cert.endpoint}</span>
                                                    </div>
                                                </div>
                                                <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300">View</button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 bg-slate-900/20 border border-dashed border-slate-800 rounded-xl text-slate-600 text-xs italic">
                                            No endpoint certificates uploaded.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Threat Protection - Point 4 */}
            <div className="mt-8 pt-6 border-t border-slate-800/50">
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-amber-500 mb-1">Threat Protection</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            API-level security policies like SQL Injection protection, XML/JSON threat validation, and Bot detection are enabled via the Admin Portal.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PoliciesPanel;

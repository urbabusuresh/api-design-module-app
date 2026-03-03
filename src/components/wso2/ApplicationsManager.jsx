import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Key, RefreshCw, Layers, Shield, ExternalLink, Activity } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

const ApplicationsManager = ({ project }) => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newApp, setNewApp] = useState({ name: '', throttlingPolicy: 'Unlimited', description: '', tokenType: 'JWT' });
    const [creating, setCreating] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [keyLoading, setKeyLoading] = useState(false);

    useEffect(() => {
        loadApplications();
    }, [project]);

    const loadApplications = async () => {
        try {
            setLoading(true);
            const data = await api.getWso2Applications(project.id);
            setApplications(data.list || []);
        } catch (e) {
            console.error("Failed to load applications", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateApp = async (e) => {
        e.preventDefault();
        try {
            setCreating(true);
            await api.createWso2Application(project.id, newApp);
            setShowCreateModal(false);
            setNewApp({ name: '', throttlingPolicy: 'Unlimited', description: '', tokenType: 'JWT' });
            await loadApplications();
        } catch (e) {
            toast.error("Failed to create application: " + e.message);
        } finally {
            setCreating(false);
        }
    };

    const handleGenerateKeys = async (appId, keyType) => {
        try {
            setKeyLoading(true);
            await api.generateWso2ApplicationKeys(project.id, appId, keyType);
            await loadApplications(); // Refresh to get key info if possible (though WSO2 Dev Portal API usually needed for full key retrieval)
            toast.success(`${keyType} keys generated successfully!`);
        } catch (e) {
            toast.error(`Failed to generate ${keyType} keys: ` + e.message);
        } finally {
            setKeyLoading(false);
        }
    };

    if (loading && !applications.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p>Loading applications...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Applications</h2>
                    <p className="text-slate-400 text-sm">Create and manage applications to consume APIs.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Create Application
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {applications.length > 0 ? (
                    applications.map((app) => (
                        <div
                            key={app.applicationId}
                            className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all group"
                        >
                            <div className="p-6 flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-indigo-500/10 rounded-xl">
                                        <Layers className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                {app.name}
                                            </h3>
                                            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] uppercase font-bold rounded">
                                                {app.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 max-w-xl mb-4">
                                            {app.description || "No description provided."}
                                        </p>
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Shield className="w-3.5 h-3.5 text-slate-600" />
                                                <span>Tier: <span className="text-slate-300">{app.throttlingPolicy}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Key className="w-3.5 h-3.5 text-slate-600" />
                                                <span>Token: <span className="text-slate-300">{app.tokenType}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <Activity className="w-3.5 h-3.5 text-slate-600" />
                                                <span>Workflow: <span className="text-slate-300">{app.workflowStatus}</span></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => handleGenerateKeys(app.applicationId, 'PRODUCTION')}
                                        disabled={keyLoading}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 border border-transparent rounded-lg text-xs font-bold text-slate-300 transition-all"
                                    >
                                        <Key className="w-3 h-3" />
                                        Generate Prod Keys
                                    </button>
                                    <button
                                        onClick={() => handleGenerateKeys(app.applicationId, 'SANDBOX')}
                                        disabled={keyLoading}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30 border border-transparent rounded-lg text-xs font-bold text-slate-300 transition-all"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Generate Sandbox Keys
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>Created by: <span className="text-slate-400 font-medium">{app.owner}</span></span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                                        View Subscriptions
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                    <button className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl text-slate-500">
                        <Layers className="w-12 h-12 mb-4 opacity-10" />
                        <p className="text-lg font-medium">No applications found</p>
                        <p className="text-sm">Create your first application to start subscribing to APIs.</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 px-6 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 rounded-xl transition-all font-bold"
                        >
                            Get Started
                        </button>
                    </div>
                )}
            </div>

            {/* Create Application Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
                    <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white">New Application</h3>
                        </div>
                        <form onSubmit={handleCreateApp} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">App Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newApp.name}
                                    onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-all"
                                    placeholder="e.g. Mobile Banking App"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Shared Quota</label>
                                <select
                                    value={newApp.throttlingPolicy}
                                    onChange={(e) => setNewApp({ ...newApp, throttlingPolicy: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none"
                                >
                                    <option value="Unlimited">Unlimited</option>
                                    <option value="10Min">10 Requests Per Minute</option>
                                    <option value="20Min">20 Requests Per Minute</option>
                                    <option value="50Min">50 Requests Per Minute</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                                <textarea
                                    value={newApp.description}
                                    onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-all h-24 resize-none"
                                    placeholder="Tell us about this application..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-2 text-slate-400 hover:text-white transition-colors font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-xl font-bold transition-all"
                                >
                                    {creating ? 'Creating...' : 'Create Application'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplicationsManager;

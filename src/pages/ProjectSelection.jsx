import React, { useState } from 'react';
import { Plus, Folder, ArrowRight, Settings, Box, Globe, Trash2, Search, LogOut } from 'lucide-react';

export default function ProjectSelection({ projects, onSelect, onCreate, onImportWso2, onDelete, user, onLogout }) {
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '', moduleName: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const handleSubmit = () => {
        if (!formData.name) return;
        onCreate(formData);
        setShowModal(false);
        setFormData({ name: '', description: '', moduleName: '' });
    };

    // WSO2 Modal State
    const [showWso2Modal, setShowWso2Modal] = useState(false);
    const [wso2Data, setWso2Data] = useState({ name: '', url: 'https://localhost:9443', env: 'DEV', username: 'admin', password: 'admin' });

    const handleCreateWso2 = async () => {
        if (!wso2Data.name || !wso2Data.url) return;
        try {
            await onImportWso2(wso2Data);
            setShowWso2Modal(false);
            setWso2Data({ name: '', url: 'https://localhost:9443', env: 'DEV', username: 'admin', password: 'admin' });
        } catch (e) {
            alert('Failed to create WSO2 workspace');
        }
    };

    const filteredProjects = (projects || []).filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">

            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Box className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-white">
                            Raptr<span className="text-indigo-400">DXP</span>
                            <span className="text-slate-600 font-medium mx-2">/</span>
                            <span className="text-slate-400 font-medium">Workspaces</span>
                        </h1>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <div className="relative group hidden md:block">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 w-64 transition-all"
                            />
                        </div>
                        <div className="h-6 w-px bg-slate-800 mx-2 hidden md:block" />

                        {/* User Info & Logout */}
                        {user && (
                            <div className="flex items-center gap-4 mr-4 border-r border-slate-800 pr-4">
                                <div className="text-right hidden sm:block">
                                    <div className="text-xs font-bold text-white">{user.username}</div>
                                    <div className="text-[10px] text-slate-500 uppercase">{user.role || 'User'}</div>
                                </div>
                                <button
                                    onClick={onLogout}
                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setShowWso2Modal(true)}

                            title="Import/Sync WSO2"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-lg transition-colors border border-transparent hover:border-sky-400/20"
                        >
                            <Globe className="w-4 h-4" />
                            <span className="hidden sm:inline">Connect WSO2</span>
                        </button>

                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New Project</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">

                {filteredProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20 animate-fade-in-up">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-inner shadow-black/50">
                            <Folder className="w-8 h-8 text-slate-700" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-300 mb-1">No projects found</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto">
                            {searchTerm ? `No matches for "${searchTerm}"` : "Get started by creating a new workspace or connecting to WSO2."}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-6 text-indigo-400 hover:text-indigo-300 text-sm font-medium hover:underline underline-offset-4"
                            >
                                Create your first project &rarr;
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in-up">
                        {filteredProjects.map(project => {
                            const isWso2 = project.type === 'WSO2_REMOTE';
                            return (
                                <div
                                    key={project.id}
                                    onClick={() => onSelect(project)}
                                    className={`group bg-slate-900 border ${isWso2 ? 'border-sky-900/50 hover:border-sky-500/50' : 'border-slate-800 hover:border-indigo-500/50'} rounded-xl p-4 cursor-pointer transition-all hover:shadow-xl hover:shadow-indigo-500/10 relative flex flex-col h-48 select-none`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-sm shadow-black/20 ${isWso2 ? 'bg-sky-900/20 text-sky-400 group-hover:bg-sky-600 group-hover:text-white' : 'bg-slate-800 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                            {isWso2 ? <Globe className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
                                                    onDelete(project.id);
                                                }
                                            }}
                                            className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                                            title="Delete Project"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <h3 className={`text-base font-bold ${isWso2 ? 'text-sky-100' : 'text-slate-200'} group-hover:text-white mb-1 truncate pr-2`}>{project.name}</h3>
                                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed flex-1">{project.description}</p>

                                    <div className="pt-3 mt-2 border-t border-slate-800/50 flex items-center gap-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                                        {isWso2 ? (
                                            <div className="flex items-center gap-1.5 text-sky-500">
                                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></div>
                                                <span>Remote Gateway</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-1.5">
                                                    <Settings className="w-3 h-3" />
                                                    <span>{project.settings?.categories?.length || 0} Cats</span>
                                                </div>
                                                <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                                                <div className="flex items-center gap-1.5">
                                                    <Box className="w-3 h-3" />
                                                    <span>{project.systems?.length || 0} Sys</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-slate-900 border border-slate-700 p-0 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden transform transition-all scale-100">
                        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-indigo-500" />
                                New Workspace
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Project Name</label>
                                <input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="e.g. Finance API Hub"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-24 resize-none transition-all placeholder:text-slate-600"
                                    placeholder="Briefly describe this workspace..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-indigo-400 uppercase mb-1.5">Initial Module (Optional)</label>
                                <input
                                    value={formData.moduleName}
                                    onChange={e => setFormData({ ...formData, moduleName: e.target.value })}
                                    className="w-full bg-slate-950 border border-indigo-500/20 rounded-lg px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="e.g. Payments Core"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95">Create Project</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create WSO2 Modal */}
            {showWso2Modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-slate-900 border border-sky-900/50 p-0 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden transform transition-all scale-100">
                        <div className="px-6 py-4 border-b border-sky-900/30 bg-slate-900/50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Globe className="w-5 h-5 text-sky-400" />
                                Connect WSO2 Workspace
                            </h2>
                            <button onClick={() => setShowWso2Modal(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Workspace Name</label>
                                <input
                                    value={wso2Data.name}
                                    onChange={e => setWso2Data({ ...wso2Data, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="e.g. Production Gateway"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-sky-400 uppercase mb-1.5">Environment</label>
                                    <select
                                        value={wso2Data.env}
                                        onChange={e => setWso2Data({ ...wso2Data, env: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-sky-500 outline-none"
                                    >
                                        <option value="DEV">Development</option>
                                        <option value="SIT">SIT / Test</option>
                                        <option value="UAT">UAT</option>
                                        <option value="PROD">Production</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">WSO2 URL</label>
                                    <input
                                        value={wso2Data.url}
                                        onChange={e => setWso2Data({ ...wso2Data, url: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-sky-500 outline-none"
                                        placeholder="https://localhost:9443"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Admin Credentials</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        value={wso2Data.username}
                                        onChange={e => setWso2Data({ ...wso2Data, username: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-sky-500 outline-none"
                                        placeholder="Username"
                                    />
                                    <input
                                        type="password"
                                        value={wso2Data.password}
                                        onChange={e => setWso2Data({ ...wso2Data, password: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:border-sky-500 outline-none"
                                        placeholder="Password"
                                    />
                                </div>
                                <div className="text-[10px] text-slate-500 mt-2 bg-slate-950 p-2 rounded border border-slate-800">
                                    Credentials are stored locally in the database to auto-refresh access tokens.
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setShowWso2Modal(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleCreateWso2} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-sky-500/20 transition-all hover:scale-105 active:scale-95">Connect Workspace</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

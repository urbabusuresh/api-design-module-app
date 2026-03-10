import React, { useState } from 'react';
import {
    Plus, Folder, Box, Globe, Trash2, Search, LogOut,
    Server, BookOpen, Key, ChevronRight, Check, Layers, Shield,
    Zap, X, Lock, ArrowUpRight, Activity, Waypoints, Network, Workflow, Play as PlayIcon, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/dashboard/ConfirmModal.jsx';

export default function ProjectSelection({ projects, onSelect, onCreate, onImportWso2, onDelete, user, onLogout }) {
    const [showModal, setShowModal] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '', description: '', systems: [], modules: [], authProfiles: [], moduleName: ''
    });
    const [tempSystem, setTempSystem] = useState('');
    const [tempModule, setTempModule] = useState('');
    const [tempAuth, setTempAuth] = useState({ name: '', type: 'Bearer' });
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const [showWso2Modal, setShowWso2Modal] = useState(false);
    const [wso2Data, setWso2Data] = useState({ name: '', url: 'https://localhost:9443', env: 'DEV', username: 'admin', password: 'admin' });
    const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }

    const resetWizard = () => {
        setWizardStep(1);
        setFormData({ name: '', description: '', systems: [], modules: [], authProfiles: [], moduleName: '' });
        setTempSystem(''); setTempModule(''); setTempAuth({ name: '', type: 'Bearer' });
    };

    const handleCloseModal = () => { setShowModal(false); resetWizard(); };

    const handleSubmit = async () => {
        if (!formData.name) return;
        setIsCreating(true);
        try { await onCreate(formData); handleCloseModal(); }
        finally { setIsCreating(false); }
    };

    const handleCreateWso2 = async () => {
        if (!wso2Data.name || !wso2Data.url) return;
        try {
            await onImportWso2(wso2Data);
            setShowWso2Modal(false);
            setWso2Data({ name: '', url: 'https://localhost:9443', env: 'DEV', username: 'admin', password: 'admin' });
        } catch { toast.error('Failed to create WSO2 workspace'); }
    };

    const filteredProjects = (projects || []).filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const WIZARD_STEPS = [
        { id: 1, label: 'Project Info', icon: Folder },
        { id: 2, label: 'Systems', icon: Server },
        { id: 3, label: 'Modules', icon: BookOpen },
        { id: 4, label: 'Auth', icon: Shield },
    ];

    const canProceed = () => wizardStep === 1 ? formData.name.trim().length > 0 : true;

    const addSystem = () => {
        if (tempSystem.trim()) {
            setFormData(f => ({ ...f, systems: [...f.systems, tempSystem.trim()] }));
            setTempSystem('');
        }
    };
    const addModule = () => {
        if (tempModule.trim()) {
            setFormData(f => ({ ...f, modules: [...f.modules, tempModule.trim()] }));
            setTempModule('');
        }
    };
    const addAuth = () => {
        if (tempAuth.name.trim()) {
            setFormData(f => ({ ...f, authProfiles: [...f.authProfiles, { ...tempAuth, id: Date.now() }] }));
            setTempAuth({ name: '', type: 'Bearer' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-red-500/30 scrollbar-thin">
            {/* Ambient glow - Professional Navy/Blue foundation */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-600/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-1/4 w-[800px] h-[500px] bg-indigo-900/10 rounded-full blur-[150px]" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/40 border border-red-500/30">
                            <Waypoints className="text-white w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-base font-black tracking-tight text-white leading-none">
                                <span className="text-red-700 font-extrabold">KNOT</span><span className="text-red-500 font-bold"><span className="logo-ai-highlight inline-block">A</span>P<span className="logo-ai-highlight inline-block">I</span></span>
                            </h1>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Design Studio</p>
                        </div>
                        <div className="hidden sm:block h-6 w-px bg-slate-800 mx-3" />
                        <span className="hidden sm:block text-slate-500 font-medium text-sm">Workspaces</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group hidden md:block">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-red-500 transition-colors" />
                            <input
                                type="text" placeholder="Search workspaces..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="bg-slate-950/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/10 w-64 transition-all placeholder:text-slate-700"
                            />
                        </div>

                        {user && (
                            <div className="flex items-center gap-3 pl-2 border-l border-slate-800 ml-2">
                                <div className="hidden sm:flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600/50 to-violet-600/50 border border-indigo-500/30 flex items-center justify-center">
                                        <span className="text-[10px] font-black text-indigo-300">{(user.username || 'U')[0].toUpperCase()}</span>
                                    </div>
                                    <div className="hidden lg:block">
                                        <div className="text-xs font-bold text-white leading-none">{user.username}</div>
                                        <div className="text-[9px] text-slate-500 uppercase tracking-wider">{user.role || 'User'}</div>
                                    </div>
                                </div>
                                {user.canManageUsers && (
                                    <button onClick={() => window.location.hash = '/admin/users'} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors" title="User Management">
                                        <Shield className="w-4 h-4" />
                                    </button>
                                )}
                                <button onClick={onLogout} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-400 transition-colors" title="Sign Out">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header >

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-6 relative">
                {
                    filteredProjects.length === 0 && !searchTerm ? (
                        <div className="text-center mt-12 animate-fade-in-up">
                            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-700/20 to-red-900/20 border border-red-500/20 rounded-3xl flex items-center justify-center animate-float relative overflow-visible">
                                <div className="absolute inset-0 bg-red-600/10 blur-2xl rounded-full scale-150 animate-pulse pointer-events-none" />
                                <Activity className="w-10 h-10 text-red-500 relative z-10" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-3">
                                Welcome to <span className="text-red-700 font-black">KNOT</span><span className="text-red-500 font-bold tracking-tight"><span className="logo-ai-highlight inline-block">A</span>P<span className="logo-ai-highlight inline-block">I</span></span>
                            </h2>
                            <p className="text-slate-400 text-base max-w-md mx-auto leading-relaxed">
                                Enterprise API design and orchestration platform. Create your first workspace to get started.
                            </p>
                            <div className="flex items-center justify-center gap-4 mt-8">
                                <button onClick={() => setShowModal(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded-xl font-bold shadow-xl shadow-red-900/30 transition-all hover:scale-105"
                                >
                                    <Plus className="w-5 h-5" /> Create First Project
                                </button>
                                <button onClick={() => setShowWso2Modal(true)}
                                    className="flex items-center gap-2 px-6 py-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl font-bold transition-all"
                                >
                                    <Activity className="w-5 h-5 text-red-500" /> Connect WSO2
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {filteredProjects.length > 0 && (
                                <div className="flex items-center justify-between mb-4 animate-fade-in">
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Your Workspaces</h2>
                                        <p className="text-slate-500 text-xs mt-0.5">{filteredProjects.length} workspace{filteredProjects.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setShowWso2Modal(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-xl transition-colors border border-red-500/20 hover:border-red-500/40"
                                            title="Connect WSO2 Workspace"
                                        >
                                            <Activity className="w-4 h-4 animate-pulse" /> Connect WSO2
                                        </button>
                                        <button onClick={() => setShowModal(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-900/20 transition-all transform active:scale-95"
                                            title="New Workspace"
                                        >
                                            <Plus className="w-4 h-4" /> New Project
                                        </button>
                                    </div>
                                </div>
                            )}
                            {filteredProjects.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-800/60 rounded-3xl animate-fade-in">
                                    <Search className="w-12 h-12 text-slate-700 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-400 mb-1">No results</h3>
                                    <button onClick={() => setSearchTerm('')} className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm font-medium">Clear search</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {filteredProjects.map((project, idx) => (
                                        <ProjectCard key={project.id} project={project} isWso2={project.type === 'WSO2_REMOTE'} onSelect={onSelect} onDelete={onDelete} setConfirmDelete={setConfirmDelete} idx={idx} />
                                    ))}
                                </div>
                            )}
                        </>
                    )
                }
            </main >

            {/* Wizard Create Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
                        <div className="bg-slate-900 border border-slate-700/60 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500" />

                            <div className="px-8 pt-7 pb-5">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h2 className="text-xl font-black text-white">Create Workspace</h2>
                                        <p className="text-slate-500 text-xs mt-1">Step {wizardStep} of {WIZARD_STEPS.length}</p>
                                    </div>
                                    <button onClick={handleCloseModal} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                                </div>

                                <div className="flex items-center gap-1">
                                    {WIZARD_STEPS.map((step, i) => {
                                        const Icon = step.icon;
                                        const isActive = step.id === wizardStep;
                                        const isDone = step.id < wizardStep;
                                        return (
                                            <React.Fragment key={step.id}>
                                                <button
                                                    onClick={() => isDone && setWizardStep(step.id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : isDone ? 'bg-emerald-500/15 text-emerald-400 cursor-pointer hover:bg-emerald-500/25' : 'bg-slate-800 text-slate-500'}`}
                                                >
                                                    {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                                                    <span className="hidden sm:inline">{step.label}</span>
                                                </button>
                                                {i < WIZARD_STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="px-8 pb-5 min-h-[260px]">
                                {wizardStep === 1 && (
                                    <div className="space-y-4 animate-step-in">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Workspace Name <span className="text-red-400">*</span></label>
                                            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 outline-none text-sm placeholder:text-slate-600"
                                                placeholder="e.g. Finance API Hub, Core Banking" autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                                            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500/60 outline-none h-20 resize-none text-sm placeholder:text-slate-600"
                                                placeholder="Describe the purpose of this workspace..."
                                            />
                                        </div>
                                        <div className="p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Quick Setup Wizard</span>
                                            </div>
                                            <p className="text-xs text-slate-400">Next steps let you pre-configure <strong className="text-slate-300">Systems</strong>, <strong className="text-slate-300">Modules</strong>, and <strong className="text-slate-300">Auth Profiles</strong> or skip to create empty workspace.</p>
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 2 && (
                                    <div className="space-y-4 animate-step-in">
                                        <p className="text-xs text-slate-400 flex items-center gap-2"><Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Systems represent integration domains. Add more later.</p>
                                        <div className="flex gap-2">
                                            <input value={tempSystem} onChange={e => setTempSystem(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && addSystem()}
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500/60 outline-none text-sm placeholder:text-slate-600"
                                                placeholder="e.g. CRM, Billing, VAS" autoFocus
                                            />
                                            <button onClick={addSystem} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all active:scale-95"><Plus className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 min-h-[52px]">
                                            {formData.systems.length === 0 && <p className="text-slate-600 text-xs italic self-center w-full text-center">No systems added (optional)</p>}
                                            {formData.systems.map((sys, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-slate-800 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium animate-fade-in">
                                                    <Server className="w-3 h-3 text-indigo-400" /><span>{sys}</span>
                                                    <button onClick={() => setFormData(f => ({ ...f, systems: f.systems.filter((_, j) => j !== i) }))} className="text-slate-500 hover:text-red-400 ml-0.5"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-600 uppercase font-bold tracking-wider mb-2">Quick Templates</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {['CRM', 'Billing', 'VAS', 'Core Banking', 'Identity', 'Messaging', 'Payments', 'eKYC'].map(t => (
                                                    <button key={t} onClick={() => !formData.systems.includes(t) && setFormData(f => ({ ...f, systems: [...f.systems, t] }))}
                                                        disabled={formData.systems.includes(t)}
                                                        className="px-2.5 py-1 text-[10px] font-bold border border-slate-700 text-slate-500 rounded-lg hover:border-indigo-500/50 hover:text-indigo-400 transition-all disabled:opacity-30"
                                                    >+ {t}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 3 && (
                                    <div className="space-y-4 animate-step-in">
                                        <p className="text-xs text-slate-400 flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-pink-400 shrink-0" /> Modules hold SB system swagger catalogs for downstream mapping.</p>
                                        <div className="flex gap-2">
                                            <input value={tempModule} onChange={e => setTempModule(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && addModule()}
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:border-pink-500/60 outline-none text-sm placeholder:text-slate-600"
                                                placeholder="e.g. Core Banking APIs, Payment Module" autoFocus
                                            />
                                            <button onClick={addModule} className="px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold transition-all active:scale-95"><Plus className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 min-h-[52px]">
                                            {formData.modules.length === 0 && <p className="text-slate-600 text-xs italic self-center w-full text-center">No modules added (optional)</p>}
                                            {formData.modules.map((mod, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 text-pink-200 px-3 py-1.5 rounded-xl text-xs font-medium animate-fade-in">
                                                    <BookOpen className="w-3 h-3 text-pink-400" /><span>{mod}</span>
                                                    <button onClick={() => setFormData(f => ({ ...f, modules: f.modules.filter((_, j) => j !== i) }))} className="text-pink-500/60 hover:text-red-400 ml-0.5"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl">
                                            <p className="text-[10px] text-slate-500"><strong className="text-pink-400">Tip:</strong> Link each module to a Swagger URL after creation to auto-import SB system APIs for downstream mapping.</p>
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 4 && (
                                    <div className="space-y-4 animate-step-in">
                                        <p className="text-xs text-slate-400 flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Pre-configure reusable auth profiles for API testing.</p>
                                        <div className="flex gap-2">
                                            <input value={tempAuth.name} onChange={e => setTempAuth({ ...tempAuth, name: e.target.value })}
                                                onKeyDown={e => e.key === 'Enter' && addAuth()}
                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:border-emerald-500/60 outline-none text-xs placeholder:text-slate-600"
                                                placeholder="Profile name (e.g. Prod Admin Token)" autoFocus
                                            />
                                            <select value={tempAuth.type} onChange={e => setTempAuth({ ...tempAuth, type: e.target.value })}
                                                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold outline-none focus:border-emerald-500/60"
                                            >
                                                <option value="Bearer">Bearer</option>
                                                <option value="Basic">Basic</option>
                                                <option value="API Key">API Key</option>
                                                <option value="OAuth2">OAuth2</option>
                                            </select>
                                            <button onClick={addAuth} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all active:scale-95"><Plus className="w-4 h-4" /></button>
                                        </div>
                                        <div className="space-y-2 min-h-[80px]">
                                            {formData.authProfiles.length === 0 && <p className="text-slate-600 text-xs italic text-center py-4">No auth profiles added (optional)</p>}
                                            {formData.authProfiles.map((profile, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl animate-fade-in">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center"><Key className="w-3.5 h-3.5 text-emerald-400" /></div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white">{profile.name}</div>
                                                            <div className="text-[10px] text-emerald-400 font-bold uppercase">{profile.type}</div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setFormData(f => ({ ...f, authProfiles: f.authProfiles.filter((_, j) => j !== i) }))} className="text-slate-600 hover:text-red-400"><X className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="px-8 py-5 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between">
                                <div className="flex gap-1">
                                    {WIZARD_STEPS.map(s => (
                                        <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${s.id === wizardStep ? 'w-6 bg-indigo-500' : s.id < wizardStep ? 'w-3 bg-emerald-500' : 'w-3 bg-slate-700'}`} />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    {wizardStep > 1 && (
                                        <button onClick={() => setWizardStep(s => s - 1)} className="px-3 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">Back</button>
                                    )}
                                    <button onClick={handleCloseModal} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                                    {wizardStep < WIZARD_STEPS.length ? (
                                        <button onClick={() => setWizardStep(s => s + 1)} disabled={!canProceed()}
                                            className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                        >Next <ChevronRight className="w-4 h-4" /></button>
                                    ) : (
                                        <button onClick={handleSubmit} disabled={!canProceed() || isCreating}
                                            className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl transition-all disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                        >
                                            {isCreating ? (
                                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</>
                                            ) : (
                                                <><Zap className="w-4 h-4" />Create Workspace</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* WSO2 Connect Modal */}
            {
                showWso2Modal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
                        <div className="bg-slate-900 border border-red-900/40 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden animate-scale-in">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-blue-600" />
                            <div className="px-7 py-6 border-b border-red-900/30 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center"><Activity className="w-5 h-5 text-red-500 animate-pulse" /></div>
                                    <div>
                                        <h2 className="text-base font-black text-white">Connect WSO2 Gateway</h2>
                                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Remote API Manager</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowWso2Modal(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-7 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Workspace Name</label>
                                    <input value={wso2Data.name} onChange={e => setWso2Data({ ...wso2Data, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500/60 outline-none placeholder:text-slate-600" placeholder="e.g. Production Gateway" autoFocus
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">Environment</label>
                                        <select value={wso2Data.env} onChange={e => setWso2Data({ ...wso2Data, env: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-500/50"
                                        >
                                            <option value="DEV">Development</option>
                                            <option value="SIT">SIT / Test</option>
                                            <option value="UAT">UAT</option>
                                            <option value="PROD">Production</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">WSO2 URL</label>
                                        <input value={wso2Data.url} onChange={e => setWso2Data({ ...wso2Data, url: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none font-mono focus:border-red-500/50" placeholder="https://localhost:9443"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Admin Credentials</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input value={wso2Data.username} onChange={e => setWso2Data({ ...wso2Data, username: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none" placeholder="Username"
                                        />
                                        <input type="password" value={wso2Data.password} onChange={e => setWso2Data({ ...wso2Data, password: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none" placeholder="Password"
                                        />
                                    </div>
                                    <div className="flex items-start gap-2 mt-2 text-[10px] text-slate-600 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                                        <Lock className="w-3 h-3 shrink-0 mt-0.5 text-slate-500" />
                                        Credentials stored locally for token refresh only.
                                    </div>
                                </div>
                            </div>
                            <div className="px-7 py-5 bg-slate-950/30 border-t border-slate-800/60 flex justify-end gap-3">
                                <button onClick={() => setShowWso2Modal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleCreateWso2}
                                    className="px-6 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-red-500/30"
                                >
                                    <Activity className="w-4 h-4 animate-pulse" /> Connect Workspace
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Delete Workspace"
                message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone and all associated data will be permanently removed.`}
                confirmText="Delete Workspace"
                onConfirm={() => {
                    onDelete(confirmDelete.id);
                    setConfirmDelete(null);
                }}
                onCancel={() => setConfirmDelete(null)}
            />
        </div >
    );
}

function ProjectCard({ project, isWso2, onSelect, onDelete, setConfirmDelete, idx }) {
    return (
        <div
            onClick={() => onSelect(project)}
            className={`group relative cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden animate-fade-in-up bg-slate-900/50 backdrop-blur-sm
                ${isWso2
                    ? 'border-red-900/30 hover:border-red-500/50 hover:bg-slate-900/80 shadow-sm hover:shadow-xl hover:shadow-red-900/20'
                    : 'border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 shadow-sm hover:shadow-xl hover:shadow-blue-900/20'
                }`}
            style={{ animationDelay: `${idx * 50}ms` }}
        >
            {/* Subtle top ambient glow */}
            <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r ${isWso2 ? 'from-transparent via-red-500/50 to-transparent' : 'from-transparent via-blue-500/30 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            {/* Corner glow effect */}
            <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${isWso2 ? 'bg-red-500/10' : 'bg-blue-500/10'}`} />

            <div className="p-5 flex flex-col h-full relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm border
                        ${isWso2 ? 'bg-gradient-to-br from-red-600/10 to-red-900/30 border-red-500/20 text-red-400 group-hover:from-red-600 group-hover:to-red-800 group-hover:text-white group-hover:border-red-500'
                            : 'bg-gradient-to-br from-blue-600/10 to-blue-900/20 border-blue-500/20 text-blue-400 group-hover:from-blue-600 group-hover:to-blue-800 group-hover:text-white group-hover:border-blue-500'}`}>
                        {isWso2 ? <Activity className="w-5 h-5 animate-pulse" /> : <Waypoints className="w-4 h-4" />}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                            onClick={e => { e.stopPropagation(); onSelect(project, false, 'test'); }}
                            className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded-lg transition-colors"
                            title="360° Test Collections"
                        >
                            <PlayIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); setConfirmDelete({ id: project.id, name: project.name }); }}
                            className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg transition-colors"
                            title="Delete Workspace"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1">
                    <h3 className={`text-base font-bold mb-1 line-clamp-1 transition-colors ${isWso2 ? 'text-red-50 group-hover:text-white' : 'text-slate-200 group-hover:text-white'}`} title={project.name}>
                        {project.name}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed h-8 font-medium">
                        {project.description || 'No description provided'}
                    </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                    {isWso2 ? (
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-red-400/90 uppercase tracking-wider group-hover:text-red-400 transition-colors">Remote Gateway</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-400 transition-colors">
                            <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50">
                                <Server className="w-3 h-3 text-blue-400/80" /><span>{project.systems?.length || 0} Sys</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50">
                                <BookOpen className="w-3 h-3 text-pink-400/80" /><span>{project.modules?.length || 0} Mod</span>
                            </div>
                        </div>
                    )}
                    <div className="flex-1 flex justify-center">
                        {project.latest_run ? (
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider
                                ${project.latest_run.status === 'Completed' && project.latest_run.passed === project.latest_run.total
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}>
                                <Activity className="w-2.5 h-2.5" />
                                <span>{project.latest_run.passed}/{project.latest_run.total} PASSED</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-800 bg-slate-900/50 text-slate-500 text-[9px] font-bold uppercase tracking-wider">
                                <Activity className="w-2.5 h-2.5 opacity-50" />
                                <span>No Run Data</span>
                            </div>
                        )}
                    </div>

                    <div className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100 
                        ${isWso2 ? 'bg-red-500/10 text-red-400 group-hover:bg-red-500/20'
                            : 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20'}`}>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useCallback } from 'react';
import {
    Server, Activity, Search, Plus, Settings, ChevronRight, ArrowRight,
    Database, X, Layers, Box, Globe, LayoutGrid, FileText,
    Shield, Code, MessageSquare, Tag, FileJson, CheckCircle, Share2, Laptop,
    Edit2, LayoutList, Grid, Lock, BookOpen, Layers as LayersIcon,
    Eye, Key, History, Play, GitBranch, Copy, Clock, Trash2,
    Sun, Moon, SlidersHorizontal, Waypoints, Network
} from 'lucide-react';
import toast from 'react-hot-toast';
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { api } from '../api';
import DesignMapper from '../components/DesignMapper.jsx';
import ConfirmModal from '../components/dashboard/ConfirmModal.jsx';
import { Tooltip } from 'react-tooltip';

// Extracted Components
import { AdvancedApiTester } from '../components/dashboard/AdvancedApiTester';
import { AuthProfilesManager } from '../components/dashboard/AuthProfilesManager';
import { TestLogsManager } from '../components/dashboard/TestLogsManager';
import { ProjectSettings, PromptModal } from '../components/dashboard/ProjectSettings';
import { SubApiDrawer } from '../components/dashboard/SubApiDrawer';
import { ModuleViewer } from '../components/dashboard/ModuleViewer';
import { NbSbMappingView } from '../components/dashboard/NbSbMappingView';
import { TestDrawer } from '../components/dashboard/TestDrawer';
import { EnvVariableManager } from '../components/dashboard/EnvVariableManager';
import { Wso2ExposeDrawer } from '../components/dashboard/Wso2ExposeDrawer';
import { CollectionsManager } from '../components/dashboard/CollectionsManager';
import { useTheme } from '../ThemeContext.jsx';

// Main Workspace Component (The Dashboard)
export default function ProjectDashboard({ project, onBack, onRefresh, allProjects, mode = 'full' }) {
    const { theme, toggleTheme } = useTheme();
    const [currentView, setCurrentView] = useState('dashboard'); // dashboard, settings, testLogs, nbsbMap
    const [selectedSystemId, setSelectedSystemId] = useState(project.systems?.[0]?.id);
    const [selectedRootId, setSelectedRootId] = useState(null);
    const [selectedModuleId, setSelectedModuleId] = useState(null);
    const [selectedAuthView, setSelectedAuthView] = useState(false);
    const [isCreatingRoot, setIsCreatingRoot] = useState(false);
    const [selectedSubApi, setSelectedSubApi] = useState(null);
    const [testApiTarget, setTestApiTarget] = useState(null);
    const [expandedApiId, setExpandedApiId] = useState(null);
    const [systemViewMode, setSystemViewMode] = useState('services'); // 'services' (cards) | 'apis' (flat list)
    const [mainPromptConfig, setMainPromptConfig] = useState(null);
    const [showEnvManager, setShowEnvManager] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState(null); // { title, message, onConfirm, type }
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

    // Filters
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterChannel, setFilterChannel] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const environments = project.settings?.environments || ['DEV', 'SIT', 'UAT', 'PROD'];
    const [selectedEnv, setSelectedEnv] = useState(environments[0]);

    // Update derived state when project changes (e.g. after refresh)
    useEffect(() => {
        if (!selectedSystemId && project.systems?.length > 0) {
            setSelectedSystemId(project.systems[0].id);
        }
    }, [project]);

    // Keyboard Shortcuts: Esc to close open panels
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                if (showEnvManager) { setShowEnvManager(false); return; }
                if (selectedSubApi) { setSelectedSubApi(null); return; }
                if (testApiTarget) { setTestApiTarget(null); return; }
                if (mainPromptConfig) { setMainPromptConfig(null); return; }
                if (isCreatingRoot) { setIsCreatingRoot(false); return; }
                if (confirmConfig) { setConfirmConfig(null); return; }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [showEnvManager, selectedSubApi, testApiTarget, mainPromptConfig, isCreatingRoot]);

    const activeSystem = project.systems?.find(s => s.id === selectedSystemId);
    const activeRoot = activeSystem?.rootApis?.find(r => r.id === selectedRootId);
    const activeModule = project.modules?.find(m => m.id === selectedModuleId);

    const handleCreateSystem = async () => {
        setMainPromptConfig({
            title: "New System",
            placeholder: "e.g. CRM, Billing, VAS",
            onConfirm: async (name) => {
                if (!name) return;
                try {
                    await api.createSystem(project.id, name);
                    setMainPromptConfig(null);
                    onRefresh();
                } catch (e) { toast.error("Failed to create system"); }
            }
        });
    };

    const handleCreateModule = async () => {
        setMainPromptConfig({
            title: "New Module",
            placeholder: "e.g. Core Banking, eShop",
            onConfirm: async (name) => {
                if (!name) return;
                try {
                    await api.createModule({ projectId: project.id, name, description: 'New Module', swagger: '' });
                    setMainPromptConfig(null);
                    onRefresh();
                } catch (e) { toast.error('Failed to create module'); }
            }
        });
    };

    const handleUpdateModule = async (id, data) => {
        try {
            await api.updateModule(id, data);
            onRefresh();
        } catch (e) {
            toast.error("Failed to save module");
        }
    };

    const handleDeleteModule = async (id, name) => {
        setConfirmConfig({
            title: 'Delete Module',
            message: `Are you sure you want to delete module "${name}"? This action cannot be undone.`,
            onConfirm: async () => {
                try {
                    await api.deleteModule(id);
                    if (selectedModuleId === id) setSelectedModuleId(null);
                    onRefresh();
                    toast.success("Module deleted");
                } catch (e) { toast.error("Failed to delete module"); }
            },
            type: 'danger'
        });
    };

    const handleUpdateSystem = async (id, currentName) => {
        setMainPromptConfig({
            title: "Rename System",
            placeholder: currentName,
            onConfirm: async (name) => {
                if (!name) return;
                try {
                    await api.updateSystem(id, name);
                    setMainPromptConfig(null);
                    onRefresh();
                } catch (e) { toast.error("Failed to rename system"); }
            }
        });
    };

    const handleDeleteSystem = async (id, name) => {
        setConfirmConfig({
            title: 'Delete System',
            message: `Are you sure you want to delete system "${name}" and all its APIs? This will permanently remove all associated endpoints.`,
            onConfirm: async () => {
                try {
                    await api.deleteSystem(id);
                    if (selectedSystemId === id) setSelectedSystemId(null);
                    onRefresh();
                    toast.success("System deleted");
                } catch (e) { toast.error("Failed to delete system"); }
            },
            type: 'danger'
        });
    };

    const handleCreateRootApi = async (name, version, context, desc) => {
        if (!activeSystem) return;
        try {
            await api.createRootApi({
                systemId: activeSystem.id,
                name, version, context, description: desc
            });
            setIsCreatingRoot(false);
            onRefresh();
        } catch (e) {
            toast.error('Failed to create service');
        }
    };

    const handleUpdateSubApi = async (parentId, updatedApi) => {
        if (!updatedApi.name || !updatedApi.url) {
            toast.error('Name and URL are required');
            return;
        }

        try {
            await api.saveSubApi({ ...updatedApi, rootApiId: parentId });
            setSelectedSubApi(null);
            onRefresh();
        } catch (e) {
            toast.error('Failed to save endpoint');
        }
    };

    const handleDuplicateSubApi = async (parentId, apiItem) => {
        const toastId = toast.loading(`Duplicating ${apiItem.name}...`);
        try {
            // Remove DB specific fields and give new name
            const { id, created_at, updated_at, ...rest } = apiItem;
            const copy = {
                ...rest,
                name: `${apiItem.name} (Copy)`,
                rootApiId: parentId
            };

            await api.saveSubApi(copy);
            toast.success("Endpoint duplicated", { id: toastId });
            onRefresh();
        } catch (e) {
            toast.error("Duplicate failed: " + e.message, { id: toastId });
        }
    };

    const handleCreateRoot = async (newRoot) => {
        try {
            await api.createRootApi({ ...newRoot, systemId: selectedSystemId });
            setIsCreatingRoot(false);
            onRefresh();
        } catch (e) {
            toast.error('Failed to create service');
        }
    };

    const getSearchResults = () => {
        if (!searchQuery) return { systems: [], services: [], endpoints: [], modules: [], moduleApis: [] };
        const query = searchQuery.toLowerCase();
        const results = {
            systems: [],
            services: [],
            endpoints: [],
            modules: [],
            moduleApis: []
        };

        // Search Systems
        project.systems?.forEach(sys => {
            if (sys.name.toLowerCase().includes(query) || sys.description?.toLowerCase().includes(query)) {
                results.systems.push(sys);
            }

            // Search Services & Endpoints within Systems
            sys.rootApis?.forEach(svc => {
                if (svc.name.toLowerCase().includes(query) || svc.description?.toLowerCase().includes(query)) {
                    results.services.push({ ...svc, _sys: sys });
                }

                svc.subApis?.forEach(apiItem => {
                    if (apiItem.name.toLowerCase().includes(query) || apiItem.url.toLowerCase().includes(query) || apiItem.description?.toLowerCase().includes(query)) {
                        results.endpoints.push({ ...apiItem, _svc: svc, _sys: sys });
                    }
                });
            });
        });

        // Search Modules
        project.modules?.forEach(mod => {
            if (mod.name.toLowerCase().includes(query)) {
                results.modules.push(mod);
            }
        });

        return results;
    };

    const searchResults = getSearchResults();

    const handleUpdateSettings = async (newSettings) => {
        console.log("[ProjectDashboard] Updating settings:", newSettings);
        try {
            await api.updateProjectSettings(project.id, newSettings);
            console.log("[ProjectDashboard] Settings updated successfully, refreshing...");
            onRefresh();
        } catch (e) {
            console.error("[ProjectDashboard] Failed to update settings:", e);
            toast.error('Failed to update settings');
        }
    };

    const handleUpdateVariables = async (variables) => {
        try {
            await api.updateProjectVariables(project.id, variables);
            onRefresh();
            toast.success("Project variables saved");
        } catch (e) {
            toast.error("Failed to update variables");
        }
    };

    const [wso2ExposeApi, setWso2ExposeApi] = useState(null);

    const handleExposeWso2 = (item, type = 'endpoint') => {
        // Add type to the item so the drawer knows what it's dealing with
        setWso2ExposeApi({ ...item, _isService: type === 'service' });
    };

    // Swagger Modal State
    const [showSwaggerModal, setShowSwaggerModal] = useState(null);
    const [swaggerSpec, setSwaggerSpec] = useState(null);

    useEffect(() => {
        if (showSwaggerModal && project.type === 'WSO2_REMOTE') {
            setSwaggerSpec(null);
            let targetId = showSwaggerModal.wso2_id;
            if (!targetId && showSwaggerModal.id) {
                targetId = showSwaggerModal.id.split('_op_')[0];
            }

            if (!targetId) {
                toast.error("Cannot determine WSO2 API ID");
                return;
            }

            api.getWso2ApiSwagger(project.id, targetId)
                .then(setSwaggerSpec)
                .catch(err => {
                    toast.error('Failed to load Swagger: ' + err.message);
                    setShowSwaggerModal(null);
                });
        }
    }, [showSwaggerModal]);

    if (mode === 'test') {
        return (
            <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
                <header className="fixed top-0 left-0 right-0 h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-8 z-50">
                    <div
                        className="flex items-center space-x-3 cursor-pointer hover:bg-slate-800/50 transition-colors group px-3 py-1.5 rounded-xl border border-transparent hover:border-slate-700"
                        onClick={onBack}
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-red-700 to-red-900 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-red-900/20">
                            <Waypoints className="text-white w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] opacity-80 leading-tight">Return to Workspaces</div>
                            <div className="text-sm font-black text-white flex items-center gap-3">
                                {project.name}
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-mono text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                    360° Test Arena
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 p-1 rounded-lg shadow-inner">
                            <Globe className="w-3.5 h-3.5 text-slate-500 ml-2" />
                            <select
                                value={selectedEnv}
                                onChange={(e) => setSelectedEnv(e.target.value)}
                                className="bg-transparent border-none text-[10px] font-bold text-slate-300 outline-none pr-6 pl-1 py-1 cursor-pointer hover:text-white transition-colors uppercase tracking-widest"
                            >
                                {environments.map(env => (
                                    <option key={env} value={env} className="bg-slate-900 text-white">{env}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </header>
                <main className="flex-1 mt-16 overflow-hidden">
                    <CollectionsManager project={project} onRefresh={onRefresh} selectedEnv={selectedEnv} />
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className={`${isSidebarExpanded ? 'w-[260px]' : 'w-20'} transition-all duration-300 bg-slate-900/90 border-r border-slate-800 flex flex-col backdrop-blur-xl shrink-0`}>
                <div className="p-4 flex items-center justify-between border-b border-slate-800/60">
                    <div className={`flex items-center space-x-3 cursor-pointer hover:bg-slate-800/50 transition-colors group ${isSidebarExpanded ? '' : 'justify-center w-full'}`} onClick={onBack}>
                        <div className="w-8 h-8 bg-gradient-to-br from-red-700 to-red-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-950/40 group-hover:scale-110 transition-transform border border-red-500/20"
                            data-tooltip-id="sidebar-tooltip" data-tooltip-content={!isSidebarExpanded ? "Back to Workspaces" : ""}>
                            <Waypoints className="text-white w-4 h-4" />
                        </div>
                        {isSidebarExpanded && (
                            <div>
                                <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] opacity-80 mb-0.5">Workspace</div>
                                <div className="text-sm font-black text-white truncate max-w-[140px] group-hover:text-red-400 transition-colors">{project.name}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-3 scrollbar-thin">
                    {/* Systems Section */}
                    {isSidebarExpanded ? (
                        <div className="px-5 mb-2 flex items-center justify-between group/section">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Systems</h3>
                            </div>
                            <button onClick={handleCreateSystem} className="text-slate-600 hover:text-blue-400 transition-colors opacity-0 group-hover/section:opacity-100 p-1 hover:bg-white/5 rounded-md" title="Add System">
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center mb-2">
                            <button onClick={handleCreateSystem} className="p-2 text-slate-400 hover:text-blue-400 bg-slate-800/50 rounded-lg" data-tooltip-id="sidebar-tooltip" data-tooltip-content="Add System">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="space-y-1 mb-6 px-2">
                        {project.systems?.map(sys => (
                            <div key={sys.id} className="relative group/item">
                                <button
                                    onClick={() => { setSelectedSystemId(sys.id); setSelectedRootId(null); setSelectedModuleId(null); setSelectedAuthView(false); setCurrentView('dashboard'); setSystemViewMode('services'); }}
                                    className={`w-full text-left p-2 rounded-xl transition-all duration-200 flex items-center ${isSidebarExpanded ? 'space-x-3 px-3' : 'justify-center'} group 
                                        ${selectedSystemId === sys.id && !selectedModuleId && !selectedAuthView && currentView === 'dashboard'
                                            ? 'bg-blue-600/10 text-white border border-blue-500/20 shadow-sm'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                                        }`}
                                    data-tooltip-id="sidebar-tooltip" data-tooltip-content={!isSidebarExpanded ? sys.name : ""}
                                >
                                    <Box className={`shrink-0 ${isSidebarExpanded ? 'w-4 h-4' : 'w-5 h-5'} ${selectedSystemId === sys.id && !selectedModuleId && !selectedAuthView ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                                    {isSidebarExpanded && <span className="truncate flex-1 text-sm font-medium pr-8">{sys.name}</span>}
                                    {isSidebarExpanded && selectedSystemId === sys.id && !selectedModuleId && !selectedAuthView && currentView === 'dashboard' && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                    )}
                                </button>
                                {isSidebarExpanded && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-sm rounded-md px-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateSystem(sys.id, sys.name); }} className="p-1 hover:text-indigo-400 text-slate-400 transition-colors">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSystem(sys.id, sys.name); }} className="p-1 hover:text-red-400 text-slate-400 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Modules Section */}
                    {isSidebarExpanded ? (
                        <div className="px-5 mb-2 flex items-center justify-between group/section">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modules</h3>
                            </div>
                            <button onClick={handleCreateModule} className="text-slate-600 hover:text-pink-400 transition-colors opacity-0 group-hover/section:opacity-100 p-1 hover:bg-slate-800 rounded-md" title="Add Module">
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center mb-2">
                            <button onClick={handleCreateModule} className="p-2 text-slate-400 hover:text-pink-400 bg-slate-800/50 rounded-lg" data-tooltip-id="sidebar-tooltip" data-tooltip-content="Add Module">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="space-y-1 mb-6 px-2">
                        {project.modules?.map(mod => (
                            <div key={mod.id} className="relative group/item">
                                <button
                                    onClick={() => { setSelectedModuleId(mod.id); setSelectedSystemId(null); setSelectedAuthView(false); setCurrentView('dashboard'); }}
                                    className={`w-full text-left p-2 rounded-xl transition-all duration-200 flex items-center ${isSidebarExpanded ? 'space-x-3 px-3' : 'justify-center'} group 
                                        ${selectedModuleId === mod.id && !selectedAuthView
                                            ? 'bg-pink-500/10 text-white border border-pink-500/20 shadow-sm'
                                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                                        }`}
                                    data-tooltip-id="sidebar-tooltip" data-tooltip-content={!isSidebarExpanded ? mod.name : ""}
                                >
                                    <BookOpen className={`shrink-0 ${isSidebarExpanded ? 'w-4 h-4' : 'w-5 h-5'} ${selectedModuleId === mod.id && !selectedAuthView ? 'text-pink-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
                                    {isSidebarExpanded && <span className="truncate flex-1 text-sm font-medium pr-4">{mod.name}</span>}
                                    {isSidebarExpanded && selectedModuleId === mod.id && !selectedAuthView && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
                                    )}
                                </button>
                                {isSidebarExpanded && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-sm rounded-md px-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id, mod.name); }} className="p-1 hover:text-red-400 text-slate-400 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Security Section */}
                    {isSidebarExpanded && (
                        <div className="px-5 mb-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Security</h3>
                        </div>
                    )}
                    <div className="space-y-1 mb-1 px-2">
                        <button
                            onClick={() => { setSelectedAuthView(true); setSelectedModuleId(null); setSelectedSystemId(null); setCurrentView('dashboard'); }}
                            className={`w-full text-left p-2 rounded-xl transition-all duration-200 flex items-center ${isSidebarExpanded ? 'space-x-3 px-3' : 'justify-center'} group 
                                ${selectedAuthView
                                    ? 'bg-emerald-500/10 text-white border border-emerald-500/20 shadow-sm'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                                }`}
                            data-tooltip-id="sidebar-tooltip" data-tooltip-content={!isSidebarExpanded ? "Auth Profiles" : ""}
                        >
                            <Key className={`shrink-0 ${isSidebarExpanded ? 'w-4 h-4' : 'w-5 h-5'} ${selectedAuthView ? 'text-emerald-400' : 'text-slate-600'}`} />
                            {isSidebarExpanded && <span className="truncate flex-1 text-sm font-medium">Auth Profiles</span>}
                        </button>
                        <button
                            onClick={() => { setSelectedAuthView(false); setSelectedModuleId(null); setSelectedSystemId(null); setCurrentView('testLogs'); }}
                            className={`w-full text-left p-2 rounded-xl transition-all duration-200 flex items-center ${isSidebarExpanded ? 'space-x-3 px-3' : 'justify-center'} group 
                                ${currentView === 'testLogs'
                                    ? 'bg-white/5 text-white border border-white/10 shadow-sm'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                                }`}
                            data-tooltip-id="sidebar-tooltip" data-tooltip-content={!isSidebarExpanded ? "Test History" : ""}
                        >
                            <History className={`shrink-0 ${isSidebarExpanded ? 'w-4 h-4' : 'w-5 h-5'} ${currentView === 'testLogs' ? 'text-blue-400' : 'text-slate-600'}`} />
                            {isSidebarExpanded && <span className="truncate flex-1 text-sm font-medium">Test History</span>}
                        </button>
                    </div>

                    {/* Additional Views */}
                    <button
                        onClick={() => { setSelectedAuthView(false); setSelectedModuleId(null); setSelectedSystemId(null); setCurrentView('collections'); }}
                        className={`w-full flex items-center ${isSidebarExpanded ? 'space-x-3 px-3' : 'justify-center'} p-2 rounded-xl transition-all duration-200 group
                                ${currentView === 'collections' ? 'bg-indigo-600/10 text-white border border-indigo-500/20 shadow-sm' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'}`}
                        data-tooltip-id="sidebar-tooltip" data-tooltip-content={!isSidebarExpanded ? "Collections" : ""}
                    >
                        <LayoutList className={`shrink-0 ${isSidebarExpanded ? 'w-4 h-4' : 'w-5 h-5'} ${currentView === 'collections' ? 'text-indigo-400' : 'text-slate-600'}`} />
                        {isSidebarExpanded && <span className="text-sm font-medium truncate">Test Collections</span>}
                    </button>
                    <button
                        onClick={() => { setSelectedAuthView(false); setSelectedModuleId(null); setSelectedSystemId(null); setCurrentView('nbsbMap'); }}
                        className={`w-full flex items-center ${isSidebarExpanded ? 'space-x-3 px-3' : 'justify-center'} p-2 rounded-xl transition-all duration-200 group
                                ${currentView === 'nbsbMap' ? 'bg-blue-600/10 text-white border border-blue-500/20 shadow-sm' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200 border border-transparent'}`}
                        data-tooltip-id="sidebar-tooltip" data-tooltip-content={!isSidebarExpanded ? "NB→SB Mapping" : ""}
                    >
                        <Share2 className={`shrink-0 ${isSidebarExpanded ? 'w-4 h-4' : 'w-5 h-5'} ${currentView === 'nbsbMap' ? 'text-blue-400' : 'text-slate-600'}`} />
                        {isSidebarExpanded && <span className="text-sm font-medium truncate">NB→SB Mapping</span>}
                    </button>
                </div>

                <div className="p-3 border-t border-slate-800 space-y-1">
                    <div className={`flex items-center gap-1`}>
                        <button
                            onClick={() => setCurrentView('settings')}
                            className={`flex ${isSidebarExpanded ? 'flex-1 items-center space-x-3 px-4 py-2.5' : 'w-10 h-10 items-center justify-center p-0 mx-auto'} rounded-xl transition-colors 
                                ${currentView === 'settings' ? 'bg-white/5 text-white border border-white/10' : 'hover:bg-white/5 text-slate-400 border border-transparent'}`}
                            data-tooltip-id="sidebar-tooltip" data-tooltip-content={!isSidebarExpanded ? "Project Settings" : ""}
                        >
                            <Settings className={`shrink-0 ${isSidebarExpanded ? 'w-4 h-4' : 'w-5 h-5'}`} />
                            {isSidebarExpanded && <span className="text-sm font-medium truncate">Project Settings</span>}
                        </button>
                        <button
                            onClick={toggleTheme}
                            className={`${isSidebarExpanded ? 'p-2.5' : 'hidden'} rounded-xl hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors border border-transparent shrink-0`}
                            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Sidebar Toggle Button */}
                <button
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    className="absolute -right-3.5 top-20 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-1 rounded-full border border-slate-700 shadow-lg z-50 transition-colors"
                >
                    <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isSidebarExpanded ? 'rotate-180' : ''}`} />
                </button>
            </aside >
            <Tooltip id="sidebar-tooltip" place="right" className="!bg-slate-800 !text-xs !font-bold !rounded-lg !px-3 !py-1.5 z-50" />



            {/* Main Content */}
            <main className="flex-1 flex flex-col relative bg-slate-950 transition-all overflow-hidden">
                {currentView === 'settings' ? (
                    <ProjectSettings
                        project={project}
                        settings={project.settings}
                        variables={project.globalVariables}
                        onUpdate={handleUpdateSettings}
                        onUpdateVariables={handleUpdateVariables}
                    />
                ) : currentView === 'testLogs' ? (
                    <TestLogsManager project={project} />
                ) : currentView === 'collections' ? (
                    <CollectionsManager project={project} onRefresh={onRefresh} selectedEnv={selectedEnv} />
                ) : currentView === 'nbsbMap' ? (
                    <NbSbMappingView project={project} onExportLLD={async () => {
                        try {
                            const lld = await api.getLLDExport(project.id);
                            const blob = new Blob([JSON.stringify(lld, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${project.name.replace(/\s+/g, '_')}_LLD_${new Date().toISOString().slice(0, 10)}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                        } catch (e) {
                            toast.error('LLD Export failed: ' + e.message);
                        }
                    }} />
                ) : selectedAuthView ? (
                    <AuthProfilesManager project={project} onRefresh={onRefresh} />
                ) : selectedModuleId && activeModule ? (
                    <ModuleViewer
                        module={activeModule}
                        environments={environments}
                        selectedEnv={selectedEnv}
                        onUpdate={handleUpdateModule}
                        onUpdateSettings={handleUpdateSettings}
                        onRefresh={onRefresh}
                        project={project}
                    />
                ) : (
                    <>
                        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 z-10 shrink-0">
                            <div className="flex items-center space-x-2 text-sm">
                                {selectedRootId && activeRoot ? (
                                    <>
                                        <button onClick={() => setSelectedRootId(null)} className="text-slate-400 hover:text-white transition-colors">{activeSystem?.name}</button>
                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                        <span className="text-red-500 font-bold">{activeRoot.name}</span>
                                    </>
                                ) : (
                                    <h1 className="text-xl font-bold text-white">{activeSystem?.name || "System Dashboard"}</h1>
                                )}
                            </div>

                            <div className="flex items-center space-x-4">
                                {/* Environment Switcher */}
                                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                                    <Globe className="w-3.5 h-3.5 text-slate-500 ml-2" />
                                    <select
                                        value={selectedEnv}
                                        onChange={(e) => setSelectedEnv(e.target.value)}
                                        className="bg-transparent border-none text-[10px] font-bold text-slate-300 outline-none pr-6 pl-1 py-1 cursor-pointer hover:text-white transition-colors uppercase tracking-widest"
                                    >
                                        {environments.map(env => (
                                            <option key={env} value={env} className="bg-slate-900 text-white">{env}</option>
                                        ))}
                                    </select>
                                </div>

                                {!selectedRootId && activeSystem && (
                                    <>
                                        <div className="relative group">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Search services or APIs..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 outline-none w-64 transition-all"
                                            />
                                            {searchQuery && (
                                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
                                            <button
                                                onClick={() => setSystemViewMode('services')}
                                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${systemViewMode === 'services' ? 'bg-red-700 text-white shadow-lg shadow-red-900/40' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                <Waypoints className="w-3.5 h-3.5" /> <span>Services</span>
                                            </button>
                                            <button
                                                onClick={() => setSystemViewMode('apis')}
                                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${systemViewMode === 'apis' ? 'bg-red-700 text-white shadow-lg shadow-red-900/40' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                <Network className="w-3.5 h-3.5" /> <span>All APIs</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-8">
                            {searchQuery ? (
                                <div className="space-y-8 animate-fade-in pb-20">
                                    <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white mb-1">Search Results</h2>
                                            <p className="text-xs text-slate-500 font-medium">Showing matches for "{searchQuery}"</p>
                                        </div>
                                        <button onClick={() => setSearchQuery('')} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                            <X className="w-3.5 h-3.5" /> Clear Search
                                        </button>
                                    </div>

                                    {/* Systems Results */}
                                    {searchResults.systems.length > 0 && (
                                        <section>
                                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500" /> Systems ({searchResults.systems.length})
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {searchResults.systems.map(sys => (
                                                    <button
                                                        key={sys.id}
                                                        onClick={() => { setSelectedSystemId(sys.id); setSelectedModuleId(null); setSelectedAuthView(false); setCurrentView('dashboard'); setSearchQuery(''); }}
                                                        className="group bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-indigo-500/50 text-left transition-all"
                                                    >
                                                        <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{sys.name}</div>
                                                        <div className="text-[10px] text-slate-500 mt-1 line-clamp-1 italic">{sys.description || 'System'}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* Services Results */}
                                    {searchResults.services.length > 0 && (
                                        <section>
                                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-pink-500" /> Services ({searchResults.services.length})
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {searchResults.services.map(svc => (
                                                    <button
                                                        key={svc.id}
                                                        onClick={() => { setSelectedSystemId(svc._sys.id); setSelectedRootId(svc.id); setSelectedModuleId(null); setSelectedAuthView(false); setCurrentView('dashboard'); setSearchQuery(''); }}
                                                        className="group bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-pink-500/50 text-left transition-all"
                                                    >
                                                        <div className="text-sm font-bold text-white group-hover:text-pink-400 transition-colors">{svc.name}</div>
                                                        <div className="text-[10px] text-slate-500 mt-1">System: <span className="font-bold text-slate-400 uppercase">{svc._sys.name}</span></div>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* Endpoints Results */}
                                    {searchResults.endpoints.length > 0 && (
                                        <section>
                                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Endpoints ({searchResults.endpoints.length})
                                            </h3>
                                            <div className="space-y-2">
                                                {searchResults.endpoints.map(ep => (
                                                    <button
                                                        key={ep.id}
                                                        onClick={() => { setSelectedSystemId(ep._sys.id); setSelectedRootId(ep._svc.id); setExpandedApiId(ep.id); setSystemViewMode('apis'); setSelectedModuleId(null); setSelectedAuthView(false); setCurrentView('dashboard'); setSearchQuery(''); }}
                                                        className="w-full group bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-emerald-500/50 text-left transition-all flex items-center justify-between"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{ep.method}</span>
                                                                <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">{ep.name}</div>
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 mt-1 font-mono truncate">{ep.url}</div>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 flex flex-col items-end">
                                                            <div className="font-bold text-slate-400 uppercase">{ep._svc.name}</div>
                                                            <div className="text-[9px] opacity-70">{ep._sys.name}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* Modules Results */}
                                    {searchResults.modules.length > 0 && (
                                        <section>
                                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-amber-500" /> Modules ({searchResults.modules.length})
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {searchResults.modules.map(mod => (
                                                    <button
                                                        key={mod.id}
                                                        onClick={() => { setSelectedModuleId(mod.id); setSelectedSystemId(null); setSelectedAuthView(false); setCurrentView('dashboard'); setSearchQuery(''); }}
                                                        className="group bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-amber-500/50 text-left transition-all"
                                                    >
                                                        <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{mod.name}</div>
                                                        <div className="text-[10px] text-slate-500 mt-1">Status: <span className="text-amber-500 font-bold">Catalog</span></div>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {searchResults.systems.length === 0 && searchResults.services.length === 0 && searchResults.endpoints.length === 0 && searchResults.modules.length === 0 && (
                                        <div className="py-20 flex flex-col items-center justify-center text-slate-600">
                                            <Search className="w-16 h-16 opacity-10 mb-4" />
                                            <p className="font-medium text-lg">No Results Found</p>
                                            <p className="text-sm">Try adjusting your search terms or filters.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {!selectedRootId && activeSystem && systemViewMode === 'services' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                            {!searchQuery && (
                                                <button
                                                    onClick={() => setIsCreatingRoot(true)}
                                                    className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-600 hover:text-slate-400 bg-slate-900/30 min-h-[140px]"
                                                >
                                                    <Plus className="w-8 h-8 mb-2" />
                                                    <span className="font-medium">Create New Service</span>
                                                </button>
                                            )}

                                            {activeSystem.rootApis?.filter(svc => {
                                                if (!searchQuery) return true;
                                                const query = searchQuery.toLowerCase();
                                                const svcMatch = svc.name.toLowerCase().includes(query) || svc.description?.toLowerCase().includes(query);
                                                const apiMatch = svc.subApis?.some(api =>
                                                    api.name.toLowerCase().includes(query) ||
                                                    api.url.toLowerCase().includes(query) ||
                                                    api.description?.toLowerCase().includes(query)
                                                );
                                                return svcMatch || apiMatch;
                                            }).map(api => (
                                                <div
                                                    key={api.id}
                                                    onClick={() => setSelectedRootId(api.id)}
                                                    className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer transition-all hover:shadow-2xl hover:shadow-indigo-500/10"
                                                >
                                                    <div className="flex justify-between items-start mb-2 gap-4">
                                                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors leading-tight truncate flex-1" title={api.name}>{api.name}</h3>
                                                        <div className="flex items-center space-x-2 shrink-0">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleExposeWso2(api, 'service'); }}
                                                                className="relative p-2 hover:bg-red-500/10 rounded-lg transition-colors group/btn"
                                                                title="Expose Service to WSO2"
                                                            >
                                                                <span className="absolute inset-0 flex items-center justify-center">
                                                                    <span className="absolute w-6 h-6 rounded-full bg-red-500/20 animate-ping" />
                                                                </span>
                                                                <Activity className="relative w-4 h-4 text-red-500 group-hover/btn:text-red-400 transition-colors" />
                                                            </button>
                                                            <span className="text-[10px] font-black bg-slate-800 text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter">{api.version}</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-500 line-clamp-2 h-10">{api.description}</p>
                                                    <div className="mt-6 flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                                            <span className="text-xs font-bold text-slate-400 tracking-wide uppercase">{api.subApis?.length || 0} Endpoints</span>
                                                        </div>
                                                        <div className="p-2 bg-slate-800/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ArrowRight className="w-4 h-4 text-indigo-400" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {!selectedRootId && activeSystem && systemViewMode === 'apis' && (
                                        <div className="animate-fade-in space-y-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="text-sm text-slate-400 mr-2">Filters:</div>
                                                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-300 outline-none">
                                                        <option value="All">All Categories</option>
                                                        {(project.settings?.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-300 outline-none">
                                                        <option value="All">All Channels</option>
                                                        <optgroup label="Northbound">
                                                            {(project.settings?.channels?.northbound || []).map(c => <option key={c} value={c}>{c}</option>)}
                                                        </optgroup>
                                                        <optgroup label="Southbound">
                                                            {(project.settings?.channels?.southbound || []).map(c => <option key={c} value={c}>{c}</option>)}
                                                        </optgroup>
                                                    </select>
                                                </div>

                                                <button
                                                    onClick={() => setSelectedSubApi({
                                                        id: `temp_${Date.now()}`,
                                                        name: "New Endpoint",
                                                        method: "GET", url: "",
                                                        downstream: [], consumers: [],
                                                        authentication: { type: "None" },
                                                        rootApiId: activeSystem.rootApis?.[0]?.id
                                                    })}
                                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 shadow-lg shadow-indigo-500/20"
                                                >
                                                    <Plus className="w-4 h-4" /> <span>Add Endpoint</span>
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-900/50 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                <div className="col-span-3">Name</div>
                                                <div className="col-span-1 text-center">Method</div>
                                                <div className="col-span-3">URL</div>
                                                <div className="col-span-1 text-center">Service</div>
                                                <div className="col-span-1 text-center">System</div>
                                                <div className="col-span-1 text-center">Status</div>
                                                <div className="col-span-2 text-right px-4">Actions</div>
                                            </div>

                                            <div className="space-y-1">
                                                {activeSystem.rootApis?.flatMap(svc => svc.subApis?.map(apiItem => ({ ...apiItem, _svcName: svc.name })) || [])
                                                    .filter(apiItem => {
                                                        if (filterCategory !== 'All' && apiItem.module !== filterCategory) return false;
                                                        if (filterChannel !== 'All') {
                                                            const nbMatch = apiItem.consumers?.some(c => c.name === filterChannel);
                                                            const sbMatch = apiItem.downstream?.some(d => d.name === filterChannel);
                                                            const provMatch = apiItem.providerSystem === filterChannel;
                                                            if (!nbMatch && !sbMatch && !provMatch) return false;
                                                        }
                                                        if (searchQuery) {
                                                            const query = searchQuery.toLowerCase();
                                                            const matches =
                                                                apiItem.name.toLowerCase().includes(query) ||
                                                                apiItem.url.toLowerCase().includes(query) ||
                                                                apiItem.description?.toLowerCase().includes(query) ||
                                                                apiItem._svcName.toLowerCase().includes(query);
                                                            if (!matches) return false;
                                                        }
                                                        return true;
                                                    })
                                                    .map(apiItem => (
                                                        <div key={apiItem.id} className="space-y-1">
                                                            <div
                                                                onClick={() => setExpandedApiId(expandedApiId === apiItem.id ? null : apiItem.id)}
                                                                className={`grid grid-cols-12 gap-4 px-4 py-3 border transition-all items-center cursor-pointer rounded-lg ${expandedApiId === apiItem.id ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                                            >
                                                                <div className="col-span-3 flex items-center space-x-2 min-w-0">
                                                                    <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${expandedApiId === apiItem.id ? 'rotate-90 text-indigo-400' : ''} shrink-0`} />
                                                                    <div className="flex flex-col min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium text-white truncate" title={apiItem.name}>{apiItem.name}</span>
                                                                            {apiItem.is_auth_api && <Key className="w-3 h-3 text-amber-500 shrink-0" title="Authentication API" />}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-1 text-center">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${apiItem.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{apiItem.method}</span>
                                                                </div>
                                                                <div className="col-span-3 font-mono text-xs text-slate-400 truncate" title={apiItem.url}>{apiItem.url}</div>
                                                                <div className="col-span-1 text-[10px] text-indigo-400 font-bold uppercase truncate text-center">{apiItem._svcName}</div>
                                                                <div className="col-span-1 text-[10px] text-slate-400 font-bold text-center">{apiItem.providerSystem || '-'}</div>
                                                                <div className="col-span-1 text-center">
                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm ${apiItem.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                                        apiItem.status === 'Draft' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                                                                            apiItem.status === 'Deprecated' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                                                apiItem.status === 'Retired' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                                                    'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                                        }`}>
                                                                        {apiItem.status || 'Draft'}
                                                                    </span>
                                                                </div>
                                                                <div className="col-span-2 flex justify-end px-2 space-x-1">
                                                                    <button onClick={(e) => { e.stopPropagation(); setTestApiTarget(apiItem); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors" title="Test API"><Play className="w-4 h-4" /></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setShowSwaggerModal(apiItem); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition-colors" title="View Swagger"><FileJson className="w-4 h-4" /></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedSubApi(apiItem); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                                                                    <button onClick={(e) => { e.stopPropagation(); handleExposeWso2(apiItem); }} className="relative p-2 hover:bg-red-500/10 rounded-lg transition-colors group" title="Expose to WSO2">
                                                                        <span className="absolute inset-0 flex items-center justify-center">
                                                                            <span className="absolute w-6 h-6 rounded-full bg-red-500/20 animate-ping" />
                                                                        </span>
                                                                        <Activity className="relative w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {expandedApiId === apiItem.id && (
                                                                <div className="ml-8 mb-4 mt-1 border-l-2 border-indigo-500/20 pl-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                                                                        <ArrowRight className="w-3 h-3 text-indigo-500" />
                                                                        <span>Downstream Dependencies</span>
                                                                    </div>
                                                                    {(!apiItem.downstream || apiItem.downstream.length === 0) ? (
                                                                        <div className="text-[10px] text-slate-600 italic py-2 pl-5 flex items-center gap-2">
                                                                            No downstream dependencies mapped
                                                                        </div>
                                                                    ) : (
                                                                        apiItem.downstream.map(ds => (
                                                                            <div key={ds.id} className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-800/20 border border-slate-800/50 rounded-xl items-center">
                                                                                <div className="col-span-4 flex items-center space-x-3">
                                                                                    <Database className="w-3.5 h-3.5 text-slate-500" />
                                                                                    <span className="text-xs font-semibold text-slate-300">{ds.name}</span>
                                                                                </div>
                                                                                <div className="col-span-1">
                                                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${ds.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{ds.method}</span>
                                                                                </div>
                                                                                <div className="col-span-4 font-mono text-[10px] text-slate-500 truncate">{ds.url}</div>
                                                                                <div className="col-span-2">
                                                                                    <span className="px-2 py-0.5 rounded-full bg-slate-900/50 border border-slate-700/50 text-[9px] text-slate-500 font-bold uppercase">{ds.providerSystem || 'Ext'}</span>
                                                                                </div>
                                                                                <div className="col-span-1 text-[9px] text-slate-600 font-bold">{ds.authType}</div>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedRootId && activeRoot && (
                                        <div className="animate-fade-in">
                                            <div className="flex justify-between items-center mb-6">
                                                <div className="flex items-center space-x-3">
                                                    <div className="bg-indigo-600/20 p-2 rounded-xl">
                                                        <LayersIcon className="w-5 h-5 text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-2xl font-bold text-white leading-tight">Endpoints</h2>
                                                        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{activeRoot.name} Service</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedSubApi({ id: `temp_${Date.now()}`, name: "New Endpoint", method: "GET", url: "", downstream: [], consumers: [], authentication: { type: "None" } })}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all shadow-lg shadow-indigo-500/20"
                                                >
                                                    <Plus className="w-4 h-4" /> <span>Add Endpoint</span>
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {activeRoot.subApis?.filter(sub => {
                                                    if (!searchQuery) return true;
                                                    const query = searchQuery.toLowerCase();
                                                    return (
                                                        sub.name.toLowerCase().includes(query) ||
                                                        sub.url.toLowerCase().includes(query) ||
                                                        sub.description?.toLowerCase().includes(query)
                                                    );
                                                }).map(sub => (
                                                    <div key={sub.id} className="space-y-1">
                                                        <div
                                                            onClick={() => setExpandedApiId(expandedApiId === sub.id ? null : sub.id)}
                                                            className={`flex items-center justify-between p-4 border transition-all cursor-pointer rounded-xl ${expandedApiId === sub.id ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                                                        >
                                                            <div className="flex items-center space-x-4 min-w-0">
                                                                <ChevronRight className={`w-4 h-4 text-slate-500 transition-all ${expandedApiId === sub.id ? 'rotate-90 text-indigo-400' : ''} shrink-0`} />
                                                                <span className={`px-2 py-1 rounded text-[10px] font-extrabold tracking-tight shrink-0 ${sub.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{sub.method}</span>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-white text-sm font-bold truncate flex items-center gap-2" title={sub.name}>
                                                                        {sub.name}
                                                                        <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest leading-none ${sub.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                            sub.status === 'Draft' ? 'bg-slate-800 text-slate-500' :
                                                                                sub.status === 'Deprecated' ? 'bg-orange-500/10 text-orange-400' :
                                                                                    sub.status === 'Retired' ? 'bg-red-500/10 text-red-400' :
                                                                                        'bg-indigo-500/10 text-indigo-400'
                                                                            }`}>
                                                                            {sub.status || 'Draft'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-slate-500 text-[11px] font-mono mt-0.5 truncate" title={sub.url}>{sub.url}</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <button onClick={(e) => { e.stopPropagation(); handleDuplicateSubApi(activeRoot?.id, sub); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors" title="Duplicate API"><Copy className="w-4 h-4" /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); setTestApiTarget(sub); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors" title="Test API"><Play className="w-4 h-4" /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); setShowSwaggerModal(sub); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition-colors" title="Swagger"><FileJson className="w-4 h-4" /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); setSelectedSubApi(sub); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>

                                                        {expandedApiId === sub.id && (
                                                            <div className="ml-8 mb-4 mt-1 border-l-2 border-indigo-500/20 pl-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2 mb-4 opacity-70">
                                                                    <ArrowRight className="w-3 h-3 text-indigo-500" />
                                                                    <span>Downstream Dependencies</span>
                                                                </div>

                                                                {(!sub.downstream || sub.downstream.length === 0) ? (
                                                                    <div className="text-[11px] text-slate-600 italic py-2 flex items-center gap-3">
                                                                        No dependencies mapped for this endpoint
                                                                    </div>
                                                                ) : (
                                                                    <div className="grid gap-2">
                                                                        {sub.downstream.map(ds => (
                                                                            <div key={ds.id} className="flex items-center justify-between px-5 py-3.5 bg-slate-800/20 border border-slate-800/40 rounded-2xl">
                                                                                <div className="flex items-center space-x-4">
                                                                                    <Database className="w-4 h-4 text-slate-500" />
                                                                                    <div>
                                                                                        <div className="text-xs font-bold text-slate-300">{ds.name}</div>
                                                                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ds.url}</div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center space-x-4">
                                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${ds.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{ds.method}</span>
                                                                                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-[10px] text-slate-400 font-bold uppercase">{ds.providerSystem || 'Ext'}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Swagger Modal */}
            {
                showSwaggerModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
                        <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                            <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <FileJson className="w-5 h-5 text-amber-500" />
                                    Swagger UI: {showSwaggerModal.name}
                                </h3>
                                <button onClick={() => setShowSwaggerModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto bg-white p-4">
                                {swaggerSpec ? (
                                    <SwaggerUI spec={swaggerSpec} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                                        <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                                        Loading Definition...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isCreatingRoot && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Create New API Service</h3>
                                <button onClick={() => setIsCreatingRoot(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                handleCreateRootApi(
                                    formData.get('name'),
                                    formData.get('version'),
                                    formData.get('context'),
                                    formData.get('description')
                                );
                            }} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Service Name</label>
                                    <input name="name" required placeholder="e.g. Payment Gateway" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Context</label>
                                        <input name="context" required placeholder="/api/v1/payments" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Version</label>
                                        <input name="version" defaultValue="v1.0.0" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                                    <textarea name="description" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none h-24 resize-none"></textarea>
                                </div>
                                <div className="pt-4 flex justify-end space-x-3">
                                    <button type="button" onClick={() => setIsCreatingRoot(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20">Create Service</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                mainPromptConfig && (
                    <PromptModal
                        isOpen={!!mainPromptConfig}
                        title={mainPromptConfig.title}
                        placeholder={mainPromptConfig.placeholder}
                        onConfirm={mainPromptConfig.onConfirm}
                        onCancel={() => setMainPromptConfig(null)}
                    />
                )
            }

            {
                testApiTarget && (
                    <TestDrawer
                        api={testApiTarget}
                        project={project}
                        selectedEnv={selectedEnv}
                        onRefresh={onRefresh}
                        onClose={() => setTestApiTarget(null)}
                    />
                )
            }

            {
                selectedSubApi && (
                    <SubApiDrawer
                        api={selectedSubApi}
                        onClose={() => setSelectedSubApi(null)}
                        onSave={(updatedApi) => handleUpdateSubApi(updatedApi.rootApiId || selectedSubApi.rootApiId, updatedApi)}
                        project={project}
                        selectedEnv={selectedEnv}
                        services={activeSystem?.rootApis || []}
                        allApis={project.systems?.flatMap(s => s.rootApis?.flatMap(r => r.subApis)) || []}
                        modules={project.modules || []}
                    />
                )
            }

            <Wso2ExposeDrawer
                isOpen={!!wso2ExposeApi}
                onClose={(shouldRefresh) => {
                    setWso2ExposeApi(null);
                    if (shouldRefresh === true) onRefresh();
                }}
                selectedApi={wso2ExposeApi}
                allProjects={allProjects}
            />

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={!!confirmConfig}
                title={confirmConfig?.title || "Confirmation"}
                message={confirmConfig?.message || "Are you sure?"}
                type={confirmConfig?.type || "danger"}
                onConfirm={async () => {
                    await confirmConfig.onConfirm();
                    setConfirmConfig(null);
                }}
                onCancel={() => setConfirmConfig(null)}
            />
        </div >
    );
}

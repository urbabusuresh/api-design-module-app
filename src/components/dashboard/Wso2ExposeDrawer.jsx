import React, { useState, useEffect } from 'react';
import { X, Activity, Server, Layers, ArrowRight, ChevronDown, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';

export function Wso2ExposeDrawer({ isOpen, onClose, selectedApi, allProjects }) {
    const [wso2Projects, setWso2Projects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [exposeMode, setExposeMode] = useState('individual'); // 'individual' | 'existing'
    const [existingApis, setExistingApis] = useState([]);
    const [selectedExistingApi, setSelectedExistingApi] = useState('');
    const [loadingApis, setLoadingApis] = useState(false);
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        if (isOpen && allProjects) {
            const remotes = allProjects.filter(p => p.type === 'WSO2_REMOTE');
            setWso2Projects(remotes);
            if (remotes.length > 0 && !selectedProject) {
                setSelectedProject(remotes[0].id);
            }
        }

        // Auto-set mode based on what we're exposing
        if (isOpen && selectedApi) {
            if (selectedApi._isService) {
                setExposeMode('individual');
            } else {
                setExposeMode('existing');
            }
        }
    }, [isOpen, allProjects, selectedApi]);

    useEffect(() => {
        if (selectedProject && exposeMode === 'existing') {
            fetchExistingApis(selectedProject);
        }
    }, [selectedProject, exposeMode]);

    const fetchExistingApis = async (projectId) => {
        setLoadingApis(true);
        try {
            // Note: Use api wrapper if it exists, otherwise manual fetch
            const apis = await api.getWso2ProjectApis(projectId);
            setExistingApis(apis);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch existing APIs from WSO2");
        } finally {
            setLoadingApis(false);
        }
    };

    const handlePublish = async () => {
        if (!selectedProject) {
            toast.error("Please select a WSO2 target project.");
            return;
        }

        if (exposeMode === 'existing' && !selectedExistingApi) {
            toast.error("Please select an existing API service to append to.");
            return;
        }

        setPublishing(true);
        try {
            // Using the smart launch endpoint that handles targeting a specific WSO2 remote config
            // In the future this might accept exposeMode and selectedExistingApi to handle updates!
            const res = await api.publishToWso2Advanced({
                targetProjectId: selectedProject,
                apiId: selectedApi.id,
                mode: exposeMode,
                existingWso2ApiId: selectedExistingApi
            });

            if (res.success) {
                toast.success(`Published Successfully to WSO2! ID: ${res.wso2Id || 'Updated'}`);
                onClose(true); // pass true to indicate a refresh might be needed
            } else {
                toast.error(`Publish Failed: ${res.details || res.error || 'Unknown error'}`);
            }
        } catch (error) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setPublishing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99]"
                onClick={() => onClose()}
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-[450px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-[100]" style={{ animation: 'slideInRight 0.25s ease-out' }}>
                <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
                    <div className="flex items-center space-x-2">
                        <div className="relative p-2 bg-red-500/10 rounded-lg">
                            <span className="absolute inset-0 flex items-center justify-center">
                                <span className="absolute w-8 h-8 rounded-full bg-red-500/10 animate-ping" />
                            </span>
                            <Activity className="relative w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-sm font-black text-white">Expose to WSO2 AM</h2>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${selectedApi?._isService ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
                                    {selectedApi?._isService ? 'Service' : 'Endpoint'}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate max-w-[280px]">Publishing {selectedApi?.name || selectedApi?.api_name || 'API'}</p>
                        </div>
                    </div>
                    <button onClick={() => onClose()} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* 1. Select WSO2 Remote Target */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Server className="w-3.5 h-3.5" /> Target WSO2 Environment
                        </label>
                        <div className="relative">
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-500 appearance-none"
                            >
                                {wso2Projects.length === 0 && <option value="">No WSO2 projects available</option>}
                                {wso2Projects.map(proj => (
                                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                <ArrowRight className="w-4 h-4 rotate-90" />
                            </div>
                        </div>
                        {wso2Projects.length === 0 && (
                            <p className="text-[10px] text-red-400 mt-1 pl-1">Configure a remote WSO2 workspace from the dashboard</p>
                        )}
                    </div>

                    {/* 2. Expose Strategy */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" /> Exposure Strategy
                        </label>

                        <div className={selectedApi?._isService ? "grid grid-cols-1" : "grid grid-cols-2 gap-2"}>
                            <div
                                onClick={() => setExposeMode('individual')}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${exposeMode === 'individual' ? 'bg-sky-500/10 border-sky-500/50 text-sky-400 shadow-lg shadow-sky-500/20' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-900'}`}
                            >
                                <div className="font-black text-xs mb-1 uppercase tracking-wider">{selectedApi?._isService ? 'Full Service (New API)' : 'Create New API'}</div>
                                <div className="text-[9px] leading-tight opacity-70">
                                    {selectedApi?._isService ? "Publish all endpoints as a bundled API in WSO2" : "Create a separate WSO2 API for this endpoint"}
                                </div>
                            </div>

                            {!selectedApi?._isService && (
                                <div
                                    onClick={() => setExposeMode('existing')}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${exposeMode === 'existing' ? 'bg-sky-500/10 border-sky-500/50 text-sky-400 shadow-lg shadow-sky-500/20' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-900'}`}
                                >
                                    <div className="font-black text-xs mb-1 uppercase tracking-wider">Add to Existing</div>
                                    <div className="text-[9px] leading-tight opacity-70">
                                        Append this into an existing WSO2 service
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Existing API Selector (Conditional) */}
                    {exposeMode === 'existing' && (
                        <div className="space-y-2 animate-fade-in p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                            <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                                <span>Select Target API</span>
                                {loadingApis && <Loader className="w-3 h-3 animate-spin text-sky-400" />}
                            </label>
                            <select
                                disabled={loadingApis}
                                value={selectedExistingApi}
                                onChange={(e) => setSelectedExistingApi(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-500"
                            >
                                <option value="">-- Choose an API --</option>
                                {/* WSO2 returns { id, name } in their list format */}
                                {[...new Map(existingApis.map(a => [a.id, a])).values()].map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                            {!loadingApis && existingApis.length === 0 && (
                                <p className="text-[10px] text-slate-500 italic mt-1">No APIs found in this WSO2 environment.</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <button
                        onClick={handlePublish}
                        disabled={publishing || wso2Projects.length === 0 || (exposeMode === 'existing' && !selectedExistingApi)}
                        className="w-full flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white py-2 rounded-lg font-bold text-sm shadow-lg shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                        {publishing ? <Loader className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        <span>{publishing ? 'Publishing...' : 'Publish to WSO2 AM'}</span>
                    </button>
                </div>
            </div>
        </>
    );
}

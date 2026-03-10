import React, { useState, useEffect } from 'react';
import {
    Play, Trash2, FolderOpen, ChevronRight, Activity,
    Layers, Search, AlertCircle, X, Bookmark, ArrowRight,
    Settings, List, Edit3, Save, CheckCircle, Plus, ChevronDown, ChevronLeft,
    History, Terminal, Database, Box, Globe, GripVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';
import { CollectionRunner } from './CollectionRunner';
import { CollectionEditorModal } from './CollectionEditorModal';
import { AdvancedApiTester } from './AdvancedApiTester';
import { TestLogsManager } from './TestLogsManager';
import { CollectionStats } from './CollectionStats';
import { Target } from 'lucide-react';

export function CollectionsManager({ project, onRefresh, selectedEnv }) {
    const [collections, setCollections] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeRunner, setActiveRunner] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingCollection, setEditingCollection] = useState(null);
    const [isEditing, setIsEditing] = useState(null);
    const [editName, setEditName] = useState('');
    const [isStatsOpen, setIsStatsOpen] = useState(false);

    // New UI State
    const [selectedItem, setSelectedItem] = useState({ type: 'welcome' }); // { type: 'welcome' | 'collection' | 'api' | 'history', id: ... }
    const [expandedColls, setExpandedColls] = useState(new Set());
    const [projectApisMap, setProjectApisMap] = useState({}); // { id: apiObject }
    const [apisLoading, setApisLoading] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);

    useEffect(() => {
        loadCollections();
        loadAllProjectApis();
    }, [project.id]);

    const loadCollections = async () => {
        try {
            const data = await api.getCollections(project.id);
            setCollections(data);
        } catch (e) {
            console.error("Failed to load collections", e);
        }
    };

    const loadAllProjectApis = async () => {
        setApisLoading(true);
        try {
            const apisMap = {};
            // 1. Modules
            for (const mod of (project.modules || [])) {
                try {
                    const modApis = await api.getModuleApis(mod.id);
                    modApis.forEach(a => { apisMap[a.id] = { ...a, source: 'module', moduleId: mod.id }; });
                } catch (e) { console.error(e); }
            }
            // 2. Systems
            for (const sys of (project.systems || [])) {
                for (const svc of (sys.rootApis || [])) {
                    if (svc.subApis) {
                        svc.subApis.forEach(a => { apisMap[a.id] = { ...a, source: 'system', systemId: sys.id }; });
                    }
                }
            }
            setProjectApisMap(apisMap);
        } catch (e) {
            console.error("Failed to load project APIs", e);
        } finally {
            setApisLoading(false);
        }
    };

    const toggleColl = (id) => {
        setExpandedColls(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRunCollection = (collection) => {
        const apis = collection.apiIds.map(id => projectApisMap[id]).filter(Boolean);
        if (apis.length === 0) {
            toast.error("No valid APIs found in this collection");
            return;
        }
        setActiveRunner({ apis, collection });
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete collection "${name}"?`)) return;
        try {
            await api.deleteCollection(id);
            toast.success("Collection deleted");
            if (selectedItem.type === 'collection' && selectedItem.id === id) {
                setSelectedItem({ type: 'welcome' });
            }
            loadCollections();
        } catch (e) {
            toast.error("Delete failed");
        }
    };

    const handleRename = async (collection) => {
        if (!editName.trim()) return;
        try {
            await api.updateCollection(collection.id, {
                name: editName.trim(),
                apiIds: collection.apiIds
            });
            setIsEditing(null);
            setEditName('');
            loadCollections();
        } catch (e) { toast.error("Rename failed"); }
    };

    const filteredCollections = collections.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // Drag and Drop Logic for Reordering
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Add a ghost image or styling if needed
    };

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const newApiIds = [...selectedItem.data.apiIds];
        const [movedItem] = newApiIds.splice(draggedIndex, 1);
        newApiIds.splice(dropIndex, 0, movedItem);

        // Immediate UI update
        const updatedCollection = { ...selectedItem.data, apiIds: newApiIds };
        setSelectedItem({ ...selectedItem, data: updatedCollection });

        // Update collections list to sync sidebar if expanded
        setCollections(prev => prev.map(c => c.id === updatedCollection.id ? updatedCollection : c));

        try {
            await api.updateCollection(updatedCollection.id, {
                name: updatedCollection.name,
                apiIds: newApiIds,
                settings: updatedCollection.settings
            });
            toast.success("Execution Priority Updated", {
                icon: '🚀',
                style: { borderRadius: '12px', background: '#1e293b', color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }
            });
        } catch (err) {
            toast.error("Failed to sync sequence");
            loadCollections(); // Revert
        }

        setDraggedIndex(null);
    };

    const methodColors = {
        GET: 'text-emerald-400 bg-emerald-400/10',
        POST: 'text-indigo-400 bg-indigo-400/10',
        PUT: 'text-amber-400 bg-amber-400/10',
        DELETE: 'text-rose-400 bg-rose-400/10',
        PATCH: 'text-cyan-400 bg-cyan-400/10'
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950 animate-fade-in">
            {/* Sidebar + Content Layout */}
            <div className="flex-1 flex overflow-hidden">

                {/* Side Sidebar: Postman Style */}
                <aside className="w-80 border-r border-slate-900 flex flex-col bg-slate-900/30">
                    <header className="p-4 border-b border-slate-900">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Collections</h2>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="p-1.5 hover:bg-indigo-500/10 text-indigo-400 rounded-lg transition-all"
                                title="New Collection"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsStatsOpen(true)}
                                className="p-1.5 hover:bg-emerald-500/10 text-emerald-400 rounded-lg transition-all ml-1"
                                title="Execution Intelligence"
                            >
                                <Target className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Filter..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50"
                            />
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1 custom-scrollbar">
                        {/* History Entry */}
                        <button
                            onClick={() => setSelectedItem({ type: 'history' })}
                            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all ${selectedItem.type === 'history' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'}`}
                        >
                            <History className="w-4 h-4" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Test History</span>
                        </button>

                        <div className="h-px bg-slate-900 my-4 mx-2" />

                        {apisLoading && collections.length === 0 && (
                            <div className="p-4 text-center">
                                <Activity className="w-5 h-5 animate-spin mx-auto text-indigo-500/50 mb-2" />
                                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Scanning infrastructure...</span>
                            </div>
                        )}

                        {filteredCollections.map(coll => (
                            <div key={coll.id} className="space-y-0.5">
                                <div
                                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selectedItem.type === 'collection' && selectedItem.id === coll.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                                    onClick={() => {
                                        setSelectedItem({ type: 'collection', id: coll.id, data: coll });
                                        if (!expandedColls.has(coll.id)) toggleColl(coll.id);
                                    }}
                                >
                                    <div className="flex items-center space-x-2.5 min-w-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleColl(coll.id); }}
                                            className="p-0.5 hover:bg-slate-700 rounded transition-colors"
                                        >
                                            {expandedColls.has(coll.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                        </button>
                                        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                                        <span className="text-[11px] font-bold truncate uppercase tracking-tight">{coll.name}</span>
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingCollection(coll); }}
                                            className="p-1 hover:text-white"
                                        >
                                            <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(coll.id, coll.name); }}
                                            className="p-1 hover:text-red-400"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {expandedColls.has(coll.id) && (
                                    <div className="ml-6 border-l border-slate-800 pl-1 space-y-0.5 animate-slide-down">
                                        {coll.apiIds.map(apiId => {
                                            const apiData = projectApisMap[apiId];
                                            if (!apiData) return null;
                                            const method = apiData.method || apiData.http_method || 'GET';
                                            return (
                                                <button
                                                    key={apiId}
                                                    onClick={() => setSelectedItem({ type: 'api', id: apiId, collectionId: coll.id, data: apiData })}
                                                    className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded-lg text-left transition-all group ${selectedItem.type === 'api' && selectedItem.id === apiId && selectedItem.collectionId === coll.id ? 'bg-indigo-500/5 text-white' : 'text-slate-500 hover:bg-slate-800/30 hover:text-slate-300'}`}
                                                >
                                                    <span className={`text-[7px] font-black px-1 rounded [font-size:7px] w-8 text-center py-0.5 ${methodColors[method] || methodColors.GET}`}>
                                                        {method}
                                                    </span>
                                                    <span className="text-[10px] font-medium truncate flex-1">{apiData.name || apiData.api_name}</span>
                                                </button>
                                            );
                                        })}
                                        {coll.apiIds.length === 0 && (
                                            <div className="px-3 py-2 text-[9px] text-slate-600 font-bold italic uppercase tracking-widest">
                                                Empty Collection
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-900 bg-slate-950 text-center">
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">{collections.length} Collections Active</p>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col min-h-0 bg-slate-950">
                    {selectedItem.type === 'welcome' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-fade-in">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-10 animate-pulse" />
                                <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl relative">
                                    <Bookmark className="w-16 h-16 text-indigo-500 opacity-50" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">Test Infrastructure</h2>
                            <p className="text-slate-400 max-w-sm mb-12 text-sm leading-relaxed">
                                Select a collection to run batch tests, or choose an API from the sidebar to perform targeted executions with history mapping.
                            </p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3"
                            >
                                <Plus className="w-4 h-4" />
                                Create First Collection
                            </button>
                        </div>
                    )}

                    {selectedItem.type === 'collection' && (
                        <div className="flex-1 flex flex-col p-10 overflow-y-auto animate-fade-in">
                            <div className="flex items-center justify-between mb-12">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <FolderOpen className="w-6 h-6 text-indigo-400" />
                                        <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{selectedItem.data.name}</h2>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5"><List className="w-3.5 h-3.5" /> {selectedItem.data.apiIds.length} Endpoints</span>
                                        <div className="w-1 h-1 rounded-full bg-slate-800" />
                                        <span className="flex items-center gap-1.5 text-emerald-500"><Database className="w-3.5 h-3.5" /> Persistent Cloud Storage</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRunCollection(selectedItem.data)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-3xl text-xs font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-indigo-600/20 flex items-center gap-4 group"
                                >
                                    <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Run Entire Collection
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {selectedItem.data.apiIds.map((apiId, idx) => {
                                    const apiData = projectApisMap[apiId];
                                    if (!apiData) return null;
                                    const method = apiData.method || apiData.http_method || 'GET';
                                    return (
                                        <div
                                            key={apiId}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, idx)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleDrop(e, idx)}
                                            onClick={() => setSelectedItem({ type: 'api', id: apiId, collectionId: selectedItem.id, data: apiData })}
                                            className={`flex items-center justify-between p-6 bg-slate-900 border rounded-3xl transition-all cursor-pointer group hover:bg-slate-900/50 
                                                ${draggedIndex === idx ? 'opacity-40 scale-95 border-indigo-500/50' : 'border-slate-800 hover:border-indigo-500/30'}
                                            `}
                                        >
                                            <div className="flex items-center space-x-6 min-w-0">
                                                <div className="flex items-center gap-4">
                                                    <GripVertical className="w-4 h-4 text-slate-700 group-hover:text-slate-500 cursor-grab active:cursor-grabbing transition-colors" />
                                                    <div className="text-slate-700 font-mono text-sm group-hover:text-indigo-500/50 transition-colors w-6">{(idx + 1).toString().padStart(2, '0')}</div>
                                                </div>
                                                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black w-20 text-center uppercase tracking-widest border border-white/5 shadow-inner ${methodColors[method] || methodColors.GET}`}>
                                                    {method}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{apiData.name || apiData.api_name}</h3>
                                                    <p className="text-[10px] font-mono text-slate-500 truncate">{apiData.url}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-950 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedItem.data.apiIds.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-900 rounded-[3rem] text-slate-600">
                                    <X className="w-12 h-12 mb-4 opacity-10" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No APIs added yet</p>
                                    <button
                                        onClick={() => setEditingCollection(selectedItem.data)}
                                        className="mt-6 text-xs text-indigo-400 hover:text-indigo-300 underline font-bold transition-all"
                                    >
                                        Edit Collection Content
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedItem.type === 'api' && (
                        <div className="flex-1 flex flex-col animate-fade-in overflow-hidden">
                            <header className="px-8 py-4 border-b border-slate-900 bg-slate-900/20 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setSelectedItem({ type: 'collection', id: selectedItem.collectionId, data: collections.find(c => c.id === selectedItem.collectionId) })}
                                        className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">{selectedItem.data.name || selectedItem.data.api_name}</h3>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Endpoint Testbed</p>
                                    </div>
                                </div>
                            </header>
                            <div className="flex-1 overflow-y-auto">
                                <AdvancedApiTester
                                    api={selectedItem.data}
                                    project={project}
                                    selectedEnv={selectedEnv}
                                    moduleId={selectedItem.data.moduleId}
                                />
                            </div>
                        </div>
                    )}

                    {selectedItem.type === 'history' && (
                        <div className="flex-1 overflow-hidden animate-fade-in">
                            <TestLogsManager project={project} />
                        </div>
                    )}
                </main>
            </div>

            {activeRunner && (
                <CollectionRunner
                    apis={activeRunner.apis}
                    project={project}
                    collectionId={activeRunner.collection.id}
                    collectionSettings={activeRunner.collection.settings || {}}
                    selectedEnv={selectedEnv}
                    onClose={() => setActiveRunner(null)}
                />
            )}

            {(isCreating || editingCollection) && (
                <CollectionEditorModal
                    project={project}
                    collection={editingCollection}
                    onClose={() => { setIsCreating(false); setEditingCollection(null); }}
                    onRefresh={() => { loadCollections(); onRefresh(); }}
                />
            )}

            {isStatsOpen && (
                <CollectionStats
                    project={project}
                    onClose={() => setIsStatsOpen(false)}
                />
            )}
        </div>
    );
}

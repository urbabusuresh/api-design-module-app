import React, { useState, useEffect } from 'react';
import {
    X, Search, ChevronRight, ChevronDown, CheckSquare, Square,
    Box, Layers, Globe, Zap, Save, Plus, Folder, Activity,
    ShieldCheck, Settings2, TestTube, AlertCircle, FileJson, GripVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';

export function CollectionEditorModal({ project, collection, onClose, onRefresh }) {
    const [activeTab, setActiveTab] = useState('endpoints'); // 'endpoints' | 'assertions'
    const [name, setName] = useState(collection?.name || '');
    const [selectedApiIds, setSelectedApiIds] = useState(collection?.apiIds || []);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [assertionSettings, setAssertionSettings] = useState(collection?.settings?.assertions || {}); // { apiId: { expectedStatus: 200, schema: "...", etc } }

    const [availableApis, setAvailableApis] = useState({ systems: [], modules: [] });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGroups, setExpandedGroups] = useState(new Set());

    useEffect(() => {
        loadAllAvailableApis();
    }, []);

    const loadAllAvailableApis = async () => {
        setLoading(true);
        try {
            const modulesWithApis = [];
            for (const mod of (project.modules || [])) {
                try {
                    const apis = await api.getModuleApis(mod.id);
                    if (apis.length > 0) {
                        modulesWithApis.push({ ...mod, apis });
                    }
                } catch (e) {
                    console.error(`Failed to load APIs for module ${mod.name}`, e);
                }
            }

            const systemsWithApis = (project.systems || []).map(sys => ({
                ...sys,
                services: (sys.rootApis || []).map(svc => ({
                    ...svc,
                    apis: svc.subApis || []
                })).filter(svc => svc.apis.length > 0)
            })).filter(sys => sys.services.length > 0);

            setAvailableApis({ systems: systemsWithApis, modules: modulesWithApis });
        } catch (e) {
            toast.error("Failed to load available APIs");
        } finally {
            setLoading(false);
        }
    };

    const toggleApi = (apiId) => {
        setSelectedApiIds(prev => {
            if (prev.includes(apiId)) return prev.filter(id => id !== apiId);
            return [...prev, apiId];
        });
    };

    const handleReorder = (dragIndex, dropIndex) => {
        if (dragIndex === dropIndex) return;
        const next = [...selectedApiIds];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(dropIndex, 0, moved);
        setSelectedApiIds(next);
    };

    const updateAssertion = (apiId, field, value) => {
        setAssertionSettings(prev => ({
            ...prev,
            [apiId]: {
                ...(prev[apiId] || { expectedStatus: 200, validateSchema: false }),
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Collection name is required");
            return;
        }

        const collectionData = {
            name: name.trim(),
            apiIds: selectedApiIds,
            settings: {
                assertions: assertionSettings
            }
        };

        try {
            if (collection) {
                await api.updateCollection(collection.id, collectionData);
                toast.success("Collection updated");
            } else {
                await api.createCollection(project.id, collectionData);
                toast.success("Collection created");
            }
            onRefresh();
            onClose();
        } catch (e) {
            toast.error("Failed to save collection");
        }
    };

    // Helper to get API details for selected IDs (Respects Order)
    const getSelectedApisData = () => {
        const allApis = [];
        availableApis.modules.forEach(m => {
            m.apis.forEach(a => { allApis.push({ ...a, source: `Module: ${m.name}` }); });
        });
        availableApis.systems.forEach(s => {
            s.services.forEach(svc => {
                svc.apis.forEach(a => { allApis.push({ ...a, source: `${s.name} > ${svc.name}` }); });
            });
        });

        return selectedApiIds.map(id => allApis.find(a => a.id === id)).filter(Boolean);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in">
                {/* Header */}
                <header className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-500/20 rounded-xl">
                            <Folder className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">{collection ? 'Refactor Collection' : 'Architect Solution'}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">360° Quality Perspective Engaged</p>
                        </div>
                    </div>

                    <div className="flex bg-slate-800 p-1 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('endpoints')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'endpoints' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Endpoints
                        </button>
                        <button
                            onClick={() => setActiveTab('assertions')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'assertions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            360° Assertions
                        </button>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-1 flex flex-col min-h-0">
                    {activeTab === 'endpoints' ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Collection Info */}
                            <div className="p-8 border-b border-slate-800">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Collection Identity</label>
                                <input
                                    autoFocus
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. CORE-BANKING-REGRESSION-SUITE"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-indigo-500 transition-all shadow-inner uppercase placeholder-slate-700"
                                />
                            </div>

                            {/* API Picker */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="px-8 py-4 flex justify-between items-center bg-slate-900/30">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Select Targets ({selectedApiIds.size})</h4>
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Search APIs..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500/50 w-48 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar">
                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4">
                                            <Activity className="w-8 h-8 animate-spin text-indigo-500" />
                                            <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Scanning Grid...</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Systems/Modules render logic remains same but with updated styling */}
                                            {availableApis.systems.map(sys => (
                                                <div key={sys.id} className="space-y-2">
                                                    <button onClick={() => setExpandedGroups(prev => { const n = new Set(prev); n.has(sys.id) ? n.delete(sys.id) : n.add(sys.id); return n; })} className="w-full flex items-center justify-between p-3 bg-slate-800/20 rounded-xl hover:bg-slate-800/40 transition-colors">
                                                        <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">{sys.name}</span>
                                                        <ChevronDown className="w-4 h-4 text-slate-600" />
                                                    </button>
                                                    {expandedGroups.has(sys.id) && sys.services.map(svc => (
                                                        <div key={svc.id} className="ml-4 space-y-2 py-2 border-l border-slate-800 pl-4 text-slate-500">
                                                            <div className="text-[10px] font-black uppercase mb-2">{svc.name}</div>
                                                            {svc.apis.filter(a => !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase())).map(apiItem => (
                                                                <ApiSelectCard key={apiItem.id} api={apiItem} isSelected={selectedApiIds.includes(apiItem.id)} onToggle={() => toggleApi(apiItem.id)} />
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                            {availableApis.modules.map(mod => (
                                                <div key={mod.id} className="space-y-2">
                                                    <button onClick={() => setExpandedGroups(prev => { const n = new Set(prev); n.has(mod.id) ? n.delete(mod.id) : n.add(mod.id); return n; })} className="w-full flex items-center justify-between p-3 bg-slate-800/20 rounded-xl hover:bg-slate-800/40 transition-colors">
                                                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-tight">{mod.name}</span>
                                                        <ChevronDown className="w-4 h-4 text-slate-600" />
                                                    </button>
                                                    {expandedGroups.has(mod.id) && (
                                                        <div className="ml-4 space-y-2 py-2 border-l border-slate-800 pl-4">
                                                            {mod.apis.filter(a => !searchTerm || (a.api_name || a.name).toLowerCase().includes(searchTerm.toLowerCase())).map(apiItem => (
                                                                <ApiSelectCard key={apiItem.id} api={apiItem} isSelected={selectedApiIds.includes(apiItem.id)} onToggle={() => toggleApi(apiItem.id)} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ASSERTIONS TAB */
                        <div className="flex-1 flex flex-col min-h-0 bg-slate-950/20 animate-fade-in">
                            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-indigo-400" /> Validation Engine
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Define success criteria for each endpoint in the sequence</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                {selectedApiIds.size === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-600 border-2 border-dashed border-slate-800 rounded-[3rem]">
                                        <AlertCircle className="w-12 h-12 mb-4 opacity-10" />
                                        <p className="text-sm font-bold uppercase tracking-widest">No APIs selected yet</p>
                                        <button onClick={() => setActiveTab('endpoints')} className="mt-4 text-indigo-400 hover:text-indigo-300 underline text-xs font-bold">Back to Endpoints</button>
                                    </div>
                                ) : (
                                    getSelectedApisData().map((apiData, idx) => (
                                        <div
                                            key={apiData.id}
                                            draggable
                                            onDragStart={(e) => { setDraggedIndex(idx); e.dataTransfer.effectAllowed = 'move'; }}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => { e.preventDefault(); handleReorder(draggedIndex, idx); setDraggedIndex(null); }}
                                            className={`bg-slate-900 border rounded-3xl p-6 shadow-xl relative overflow-hidden group transition-all
                                                ${draggedIndex === idx ? 'opacity-40 scale-95 border-indigo-500/50' : 'border-slate-800 hover:border-indigo-500/20'}
                                            `}
                                        >
                                            <div className="absolute top-4 left-4 flex items-center gap-3">
                                                <GripVertical className="w-4 h-4 text-slate-700 group-hover:text-indigo-500/50 cursor-grab" />
                                                <span className="text-[10px] font-mono text-slate-700">{(idx + 1).toString().padStart(2, '0')}</span>
                                            </div>
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                                                <TestTube className="w-16 h-16" />
                                            </div>

                                            <div className="flex items-center gap-4 mb-6">
                                                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white ${apiData.method === 'GET' ? 'bg-emerald-500' : 'bg-indigo-500'}`}>{apiData.method || 'GET'}</div>
                                                <div className="flex-1">
                                                    <h5 className="text-sm font-bold text-white uppercase tracking-tight">{apiData.name || apiData.api_name}</h5>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase">{apiData.source}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Status Code Assertion</label>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="number"
                                                                value={assertionSettings[apiData.id]?.expectedStatus || 200}
                                                                onChange={e => updateAssertion(apiData.id, 'expectedStatus', parseInt(e.target.value))}
                                                                className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-indigo-400 font-black text-xs outline-none focus:border-indigo-500"
                                                            />
                                                            <span className="text-[10px] font-bold text-slate-600 uppercase italic">Expected HTTP Response</span>
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Performance Threshold</label>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="number"
                                                                placeholder="500"
                                                                value={assertionSettings[apiData.id]?.maxDuration || ''}
                                                                onChange={e => updateAssertion(apiData.id, 'maxDuration', parseInt(e.target.value))}
                                                                className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-black text-xs outline-none focus:border-amber-500"
                                                            />
                                                            <span className="text-[10px] font-bold text-slate-600 uppercase italic">Max Latency (ms)</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className={`p-4 rounded-2xl border transition-all ${assertionSettings[apiData.id]?.validateSchema ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-slate-950 border-slate-800'}`}>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <FileJson className="w-4 h-4 text-indigo-400" />
                                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">JSON Schema Validation</span>
                                                            </div>
                                                            <button
                                                                onClick={() => updateAssertion(apiData.id, 'validateSchema', !assertionSettings[apiData.id]?.validateSchema)}
                                                                className={`w-10 h-5 rounded-full relative transition-all ${assertionSettings[apiData.id]?.validateSchema ? 'bg-indigo-600' : 'bg-slate-800'}`}
                                                            >
                                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${assertionSettings[apiData.id]?.validateSchema ? 'right-1' : 'left-1'}`} />
                                                            </button>
                                                        </div>
                                                        {assertionSettings[apiData.id]?.validateSchema && (
                                                            <textarea
                                                                placeholder='{"type": "object", "required": ["id", "status"]}'
                                                                value={assertionSettings[apiData.id]?.schema || ''}
                                                                onChange={e => updateAssertion(apiData.id, 'schema', e.target.value)}
                                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] font-mono text-blue-300 h-24 resize-none outline-none focus:border-indigo-500"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="px-8 py-6 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700">
                            <TestTube className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{selectedApiIds.size} Enpoints Active</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 hover:text-white transition-all text-[11px] uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 text-[11px] uppercase tracking-[0.15em] active:scale-95"
                        >
                            <Save className="w-4 h-4" />
                            <span>Commit Infrastructure</span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function ApiSelectCard({ api, isSelected, onToggle }) {
    const name = api.name || api.api_name;
    const method = api.method || api.http_method || 'GET';
    const url = api.url || '';
    const methodColors = {
        GET: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        POST: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
        PUT: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        DELETE: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
        PATCH: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
    };
    return (
        <div onClick={onToggle} className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer group ${isSelected ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700'}`}>
            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-700'}`}>
                {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${methodColors[method] || methodColors.GET}`}>{method}</span>
                    <h5 className="text-[11px] font-bold text-slate-200 truncate uppercase tracking-tight">{name}</h5>
                </div>
                <p className="text-[9px] font-mono text-slate-600 truncate">{url}</p>
            </div>
        </div>
    );
}

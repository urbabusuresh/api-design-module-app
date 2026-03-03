import React, { useState } from 'react';
import {
    Plus, Trash2, Lock, CheckCircle, Laptop, Save, X,
    FileText, Box, Database, Share2, MessageSquare, GitBranch, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import DesignMapper from '../DesignMapper.jsx';
import { SwaggerDownstreamForm } from './SwaggerDownstreamForm';
import { WsdlDownstreamForm } from './WsdlDownstreamForm';
import { AdvancedApiTester } from './AdvancedApiTester';

export function SubApiDrawer({ api, project, onClose, onSave, services = [], allApis = [], modules = [], selectedEnv }) {
    const projectSettings = project.settings || {};
    const [localApi, setLocalApi] = useState(JSON.parse(JSON.stringify(api)));
    const [activeTab, setActiveTab] = useState(api.initialTab || 'design');
    const [bodyFormat, setBodyFormat] = useState(api.bodyFormat || (api.request_body?.includes('<?xml') ? 'xml' : 'json'));

    const tabs = [
        { id: 'design', label: 'Design', icon: FileText },
        { id: 'request', label: 'Request', icon: Box },
        { id: 'response', label: 'Response', icon: CheckCircle },
        { id: 'downstream', label: 'Downstream', icon: Database },
        { id: 'channels', label: 'Channels', icon: Share2 },
        { id: 'docs', label: 'Docs', icon: MessageSquare },
        { id: 'mapper', label: 'Mapper', icon: GitBranch },
        { id: 'test', label: 'Test', icon: Activity },
    ];

    const [localRequestBody, setLocalRequestBody] = useState(() => {
        let val = api.request?.body || api.request || api.request_body;
        if (val && typeof val === 'object') return JSON.stringify(val, null, 4);
        return val || "";
    });

    const [requestError, setRequestError] = useState(null);

    const handleSaveValidated = () => {
        if (bodyFormat === 'json' && requestError) {
            toast.error("Please fix JSON errors in Request Body before saving.");
            return;
        }
        let finalBody = localRequestBody;
        if (bodyFormat === 'json') {
            try {
                if (finalBody.trim().startsWith('{') || finalBody.trim().startsWith('[')) {
                    finalBody = JSON.parse(finalBody);
                }
            } catch (e) { }
        }

        onSave({ ...localApi, request: finalBody, bodyFormat });
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}>
            <div
                className="w-[800px] bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col animate-slide-in-right"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500 opacity-20" />

                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
                    <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Editing Endpoint</div>
                        <h2 className="text-lg font-bold text-white max-w-sm truncate">{localApi.name || "Untitled Endpoint"}</h2>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button onClick={handleSaveValidated} className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${requestError ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`} disabled={!!requestError}>
                            <Save className="w-4 h-4" /> <span>Save</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 space-x-6">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
                    {activeTab === 'design' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Method</label>
                                    <select
                                        value={localApi.method}
                                        onChange={e => setLocalApi({ ...localApi, method: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-indigo-300 font-mono outline-none focus:border-indigo-500"
                                    >
                                        {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Endpoint URL</label>
                                    <input
                                        value={localApi.url}
                                        onChange={e => setLocalApi({ ...localApi, url: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500"
                                        placeholder="/resource"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Name</label>
                                    <input
                                        value={localApi.name}
                                        onChange={e => setLocalApi({ ...localApi, name: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Parent Service (Root API)</label>
                                    <select
                                        value={localApi.rootApiId || ""}
                                        onChange={e => setLocalApi({ ...localApi, rootApiId: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                                        disabled={services.length === 0}
                                    >
                                        <option value="">Select Service</option>
                                        {services.map(svc => (
                                            <option key={svc.id} value={svc.id}>{svc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Category</label>
                                    <select
                                        value={localApi.category || ""}
                                        onChange={e => setLocalApi({ ...localApi, category: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Select Category</option>
                                        {(projectSettings?.categories || []).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Version</label>
                                    <input
                                        value={localApi.version || ""}
                                        onChange={e => setLocalApi({ ...localApi, version: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                                <textarea
                                    value={localApi.description}
                                    onChange={e => setLocalApi({ ...localApi, description: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 h-24 resize-none outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Created By</label>
                                    <input value={localApi.createdBy || ""} onChange={e => setLocalApi({ ...localApi, createdBy: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label>
                                    <select value={localApi.status || "Draft"} onChange={e => setLocalApi({ ...localApi, status: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500">
                                        <option>Draft</option>
                                        <option>Under Review</option>
                                        <option>Active</option>
                                        <option>Deprecated</option>
                                        <option>Retired</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Provider System (Southbound)</label>
                                <select
                                    value={localApi.providerSystem || ""}
                                    onChange={e => setLocalApi({ ...localApi, providerSystem: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select Provider System</option>
                                    {(projectSettings.channels?.southbound || []).map(ch => (
                                        <option key={ch} value={ch}>{ch}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'request' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Request Body</label>
                                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                                        <button
                                            onClick={() => setBodyFormat('json')}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${bodyFormat === 'json' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            JSON
                                        </button>
                                        <button
                                            onClick={() => setBodyFormat('xml')}
                                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${bodyFormat === 'xml' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            XML/SOAP
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={localRequestBody}
                                    onChange={e => {
                                        const newValue = e.target.value;
                                        setLocalRequestBody(newValue);
                                        if (bodyFormat === 'json') {
                                            try {
                                                if (newValue.trim()) {
                                                    if (newValue.trim().startsWith('{') || newValue.trim().startsWith('[')) {
                                                        JSON.parse(newValue);
                                                    }
                                                }
                                                setRequestError(null);
                                            } catch (err) {
                                                setRequestError(err.message);
                                            }
                                        } else {
                                            setRequestError(null);
                                        }
                                    }}
                                    className={`w-full bg-slate-900 border rounded-lg p-4 text-xs font-mono h-64 resize-none outline-none focus:border-indigo-500 ${bodyFormat === 'json' && requestError ? 'border-red-500/50 text-red-300' : (bodyFormat === 'xml' ? 'border-amber-500/30 text-amber-100' : 'border-slate-700 text-emerald-400')}`}
                                    placeholder={bodyFormat === 'json' ? '{ "key": "value" }' : '<?xml version="1.0" encoding="UTF-8"?>\n<soap:Envelope ...>'}
                                />
                                {bodyFormat === 'json' && requestError && (
                                    <div className="mt-2 text-[10px] text-red-400 font-bold bg-red-500/10 p-2 rounded border border-red-500/20 flex items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 animate-pulse" />
                                        Syntax Error: {requestError}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Headers</label>
                                </div>
                                <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                                    {(!localApi.headers || localApi.headers.length === 0) && <div className="p-3 text-xs text-slate-500 text-center">No headers defined</div>}
                                    {(localApi.headers || []).map((h, i) => (
                                        <div key={i} className="flex border-b border-slate-800 last:border-0 p-2 text-sm">
                                            <div className="w-1/3 font-mono text-slate-400">{h.key}</div>
                                            <div className="flex-1 font-mono text-slate-200">{h.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'response' && (
                        <div className="space-y-6 animate-fade-in">
                            {(localApi.responses || []).length === 0 && <div className="text-center py-6 border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">No responses defined</div>}
                            {(localApi.responses || []).map((resp, idx) => (
                                <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                                    <div className="px-4 py-2 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                                        <div className="flex items-center space-x-3">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${resp.code < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{resp.code}</span>
                                            <span className="text-sm font-medium text-slate-300">{resp.description}</span>
                                        </div>
                                    </div>
                                    <div className="p-0">
                                        <textarea
                                            readOnly
                                            value={resp.body}
                                            className="w-full bg-slate-950 p-4 text-xs font-mono text-blue-300 h-32 resize-none outline-none border-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'downstream' && (
                        <DownstreamEditor localApi={localApi} setLocalApi={setLocalApi} projectSettings={projectSettings} allApis={allApis} modules={modules} />
                    )}

                    {activeTab === 'channels' && (
                        <ChannelsEditor localApi={localApi} setLocalApi={setLocalApi} projectSettings={projectSettings} />
                    )}

                    {activeTab === 'docs' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Swagger URL</label>
                                <input value={localApi.swaggerUrl || ""} onChange={e => setLocalApi({ ...localApi, swaggerUrl: e.target.value })} placeholder="https://api.example.com/swagger.json" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500 font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Swagger API Name (Operation ID)</label>
                                <input value={localApi.swaggerApiName || ""} onChange={e => setLocalApi({ ...localApi, swaggerApiName: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Design Document Link</label>
                                    <input value={localApi.designDoc || ""} onChange={e => setLocalApi({ ...localApi, designDoc: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Reference Link</label>
                                    <input value={localApi.referenceLink || ""} onChange={e => setLocalApi({ ...localApi, referenceLink: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Remarks & Notes</label>
                                <textarea
                                    value={localApi.remarks || ""}
                                    onChange={e => setLocalApi({ ...localApi, remarks: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 h-32 resize-none outline-none focus:border-indigo-500"
                                    placeholder="Add implementation notes, caveats, or developer remarks..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'mapper' && (
                        <DesignMapper localApi={localApi} setLocalApi={setLocalApi} />
                    )}

                    {activeTab === 'test' && (
                        <div className="flex-1 min-h-0">
                            <AdvancedApiTester
                                api={localApi}
                                project={project}
                                selectedEnv={selectedEnv}
                                onUpdateExamples={(sample) => {
                                    setLocalApi({ ...localApi, responses: sample });
                                    toast.success("Response saved as sample!");
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function DownstreamEditor({ localApi, setLocalApi, projectSettings, allApis = [], modules = [] }) {
    const [showAdd, setShowAdd] = useState(false);
    const [mode, setMode] = useState('existing');
    const [selectedExistingId, setSelectedExistingId] = useState("");
    const [newDs, setNewDs] = useState({ name: "", url: "", method: "GET", authType: "None", description: "", priority: 1, providerSystem: "" });

    const availableApis = allApis.filter(a => !localApi.downstream?.some(d => d.id === a.id) && a.id !== localApi.id);

    const addExisting = () => {
        const existingApi = allApis.find(a => a.id === selectedExistingId);
        if (!existingApi) return;

        const ds = [...(localApi.downstream || []), {
            id: existingApi.id,
            name: existingApi.name,
            url: existingApi.url,
            method: existingApi.method,
            providerSystem: existingApi.providerSystem,
            authType: 'None',
            description: existingApi.description,
            priority: 1,
            isExisting: true
        }];
        setLocalApi({ ...localApi, downstream: ds });
        setShowAdd(false);
        setSelectedExistingId("");
    };

    const add = () => {
        if (!newDs.name) return;
        const ds = [...(localApi.downstream || []), { ...newDs, id: Date.now(), isExisting: false }];
        setLocalApi({ ...localApi, downstream: ds });
        setShowAdd(false);
        setNewDs({ name: "", url: "", method: "GET", authType: "None", description: "", priority: 1, providerSystem: "" });
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-500 uppercase">Mapped Systems & Downstream APIs</h3>
                <button onClick={() => setShowAdd(true)} className="text-xs text-indigo-400 hover:text-white flex items-center space-x-1"><Plus className="w-3 h-3" /> <span>Add Mapping</span></button>
            </div>

            {showAdd && (
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3">
                    <div className="flex space-x-4 border-b border-slate-700 pb-2 mb-2">
                        <button onClick={() => setMode('existing')} className={`text-xs font-bold ${mode === 'existing' ? 'text-indigo-400' : 'text-slate-500'}`}>Select Existing</button>
                        <button onClick={() => setMode('new')} className={`text-xs font-bold ${mode === 'new' ? 'text-indigo-400' : 'text-slate-500'}`}>Create New</button>
                        <button onClick={() => setMode('swagger')} className={`text-xs font-bold ${mode === 'swagger' ? 'text-pink-400' : 'text-slate-500'}`}>From Swagger</button>
                        <button onClick={() => setMode('wsdl')} className={`text-xs font-bold ${mode === 'wsdl' ? 'text-amber-400' : 'text-slate-500'}`}>From WSDL</button>
                    </div>

                    {mode === 'existing' ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Select API</label>
                                <select value={selectedExistingId} onChange={e => setSelectedExistingId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none">
                                    <option value="">-- Choose API --</option>
                                    {availableApis.map(api => (
                                        <option key={api.id} value={api.id}>{api.name} ({api.providerSystem || 'Ext'})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2"><button onClick={() => setShowAdd(false)} className="text-xs text-slate-400">Cancel</button><button onClick={addExisting} disabled={!selectedExistingId} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded disabled:opacity-50">Add Selected</button></div>
                        </div>
                    ) : mode === 'new' ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-1">
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">API Name</label>
                                    <input value={newDs.name} onChange={e => setNewDs({ ...newDs, name: e.target.value })} placeholder="Get Balance" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Provider System</label>
                                    <select value={newDs.providerSystem} onChange={e => setNewDs({ ...newDs, providerSystem: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none">
                                        <option value="">Select System</option>
                                        {(projectSettings?.channels?.southbound || []).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <input value={newDs.url} onChange={e => setNewDs({ ...newDs, url: e.target.value })} placeholder="Endpoint URL" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 outline-none" />
                                </div>
                                <div className="col-span-1">
                                    <select value={newDs.method} onChange={e => setNewDs({ ...newDs, method: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none">
                                        {['GET', 'POST', 'PUT', 'DELETE'].map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <select value={newDs.authType} onChange={e => setNewDs({ ...newDs, authType: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none">
                                        <option value="None">Auth: None</option><option value="Basic">Auth: Basic</option><option value="OAuth2">Auth: OAuth2</option><option value="API Key">Auth: API Key</option>
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <input type="number" min="1" value={newDs.priority} onChange={e => setNewDs({ ...newDs, priority: parseInt(e.target.value) })} placeholder="Priority" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                                </div>
                            </div>

                            <textarea value={newDs.description} onChange={e => setNewDs({ ...newDs, description: e.target.value })} placeholder="Description / Purpose" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 h-16 resize-none outline-none" />

                            <div className="flex justify-end gap-2"><button onClick={() => setShowAdd(false)} className="text-xs text-slate-400">Cancel</button><button onClick={add} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded">Create & Map</button></div>
                        </div>
                    ) : mode === 'wsdl' ? (
                        <WsdlDownstreamForm
                            onCancel={() => setShowAdd(false)}
                            onAdd={(apiData) => {
                                const ds = [...(localApi.downstream || []), { ...apiData, id: Date.now(), isExisting: false }];
                                setLocalApi({ ...localApi, downstream: ds });
                                setShowAdd(false);
                            }}
                        />
                    ) : (
                        <SwaggerDownstreamForm
                            modules={modules}
                            environments={projectSettings?.environments || []}
                            onCancel={() => setShowAdd(false)}
                            onAdd={(apiData) => {
                                const ds = [...(localApi.downstream || []), { ...apiData, id: Date.now(), isExisting: false }];
                                setLocalApi({ ...localApi, downstream: ds });
                                setShowAdd(false);
                            }}
                        />
                    )}
                </div>
            )}

            <div className="space-y-2">
                {(localApi.downstream || []).length === 0 && !showAdd && <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg text-xs text-slate-500">No maps</div>}
                {(localApi.downstream || []).map(ds => (
                    <div key={ds.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg group hover:border-indigo-500/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded">{ds.providerSystem || 'Ext'}</span>
                                <span className={`text-[10px] font-bold px-1.5 rounded ${ds.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{ds.method || 'GET'}</span>
                                <span className="text-sm font-medium text-white">{ds.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Pri: {ds.priority || 1}</span>
                                <button onClick={() => setLocalApi({ ...localApi, downstream: localApi.downstream.filter(d => d.id !== ds.id) })}><Trash2 className="w-4 h-4 text-slate-600 hover:text-red-400" /></button>
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mb-1 truncate">{ds.url}</div>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-600">
                            {ds.authType && <span className="flex items-center space-x-1"><Lock className="w-3 h-3" /> <span>{ds.authType}</span></span>}
                            {ds.description && <span>{ds.description}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );
}

export function ChannelsEditor({ localApi, setLocalApi, projectSettings }) {
    const consumers = localApi.consumers || [];

    const toggleChannel = (name, type) => {
        const exists = consumers.find(c => c.name === name);
        if (exists) {
            setLocalApi({ ...localApi, consumers: consumers.filter(c => c.name !== name) });
        } else {
            setLocalApi({ ...localApi, consumers: [...consumers, { id: Date.now(), name, type, description: "" }] });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Northbound Channels (Consumers)</h3>
                <div className="flex flex-wrap gap-2">
                    {(projectSettings?.channels?.northbound || []).map(ch => {
                        const isActive = consumers.find(c => c.name === ch);
                        return (
                            <button
                                key={ch}
                                onClick={() => toggleChannel(ch, 'NB')}
                                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-2 ${isActive
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <span>{ch}</span>
                                {isActive && <CheckCircle className="w-3 h-3" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Southbound Channels (Providers)</h3>
                <div className="flex flex-wrap gap-2">
                    {(projectSettings?.channels?.southbound || []).map(ch => {
                        const isActive = consumers.find(c => c.name === ch);
                        return (
                            <button
                                key={ch}
                                onClick={() => toggleChannel(ch, 'SB')}
                                className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center space-x-2 ${isActive
                                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                    }`}
                            >
                                <span>{ch}</span>
                                {isActive && <CheckCircle className="w-3 h-3" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="pt-6 border-t border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Mapped Channels List</h3>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-0.5 rounded-full">{consumers.length} Active</span>
                </div>

                <div className="space-y-2">
                    {consumers.length === 0 && (
                        <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl text-xs text-slate-500">
                            No channels mapped. Click the tags above to add.
                        </div>
                    )}
                    {consumers.map(ds => (
                        <div key={ds.id} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <Laptop className="w-3.5 h-3.5 text-slate-600" />
                                    <span className="text-sm font-medium text-white">{ds.name}</span>
                                    <span className="text-[10px] bg-slate-800 px-1 rounded text-slate-400">{ds.type}</span>
                                </div>
                                {ds.description && <div className="text-xs text-slate-500 mt-1 pl-6">{ds.description}</div>}
                            </div>
                            <button onClick={() => setLocalApi({ ...localApi, consumers: localApi.consumers.filter(d => d.id !== ds.id) })}><Trash2 className="w-4 h-4 text-slate-600 hover:text-red-400" /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

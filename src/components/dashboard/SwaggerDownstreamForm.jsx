import React, { useState } from 'react';
import { Activity, Search } from 'lucide-react';

export function SwaggerDownstreamForm({ modules, environments = [], onCancel, onAdd }) {
    const [selectedModuleId, setSelectedModuleId] = useState("");
    const [selectedEnv, setSelectedEnv] = useState(environments[0] || "");
    const [apiName, setApiName] = useState("");
    const [error, setError] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [notFound, setNotFound] = useState(false);

    const handleSearchAndAdd = async () => {
        if (!selectedModuleId || !apiName) {
            setError("Please select a module and enter API Name");
            return;
        }

        setError("");
        setNotFound(false);
        setIsSearching(true);

        const module = modules.find(m => m.id === selectedModuleId);
        if (!module) {
            setIsSearching(false);
            return;
        }

        const query = apiName.trim().toLowerCase();
        let foundApi = null;

        try {
            let spec = null;
            const content = module.swagger_content;

            if (content) {
                spec = typeof content === 'string' ? JSON.parse(content) : content;
            } else if (module.swagger_url) {
                try {
                    const res = await fetch(module.swagger_url);
                    if (res.ok) {
                        spec = await res.json();
                    }
                } catch (e) {
                    console.warn("Could not fetch swagger from URL for verification", e);
                }
            }

            if (spec && spec.paths) {
                for (const [path, methods] of Object.entries(spec.paths)) {
                    for (const [method, op] of Object.entries(methods)) {
                        const opId = (op.operationId || "").toLowerCase();
                        const summary = (op.summary || "").toLowerCase();
                        const description = (op.description || "").toLowerCase();
                        const pathLower = path.toLowerCase();

                        if (opId === query || summary.includes(query) || pathLower.includes(query) || description.includes(query)) {
                            foundApi = {
                                name: op.summary || op.operationId || path,
                                url: path,
                                method: method.toUpperCase(),
                                description: op.description || op.summary || "",
                                api_swagger_status: true,
                                providerSystem: module.name
                            };
                            break;
                        }
                    }
                    if (foundApi) break;
                }
            }
        } catch (e) {
            console.error("Swagger search error", e);
        }

        setIsSearching(false);

        if (foundApi) {
            const envUrls = typeof module.env_urls === 'string' ? JSON.parse(module.env_urls) : (module.env_urls || {});
            let swaggerUrl = envUrls[selectedEnv] || module.swagger_url || "";
            let baseUrl = swaggerUrl.replace(/\/(swagger|openapi)\.(json|yaml|yml)$/i, "").replace(/\/$/, "");
            const fullUrl = baseUrl ? (baseUrl + (foundApi.url.startsWith('/') ? foundApi.url : '/' + foundApi.url)) : foundApi.url;

            onAdd({
                ...foundApi,
                url: fullUrl,
                authType: "None",
                priority: 1
            });
        } else {
            setNotFound(true);
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2 rounded text-[10px] font-bold">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Source Module</label>
                    <select
                        value={selectedModuleId}
                        onChange={e => { setSelectedModuleId(e.target.value); setNotFound(false); }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                    >
                        <option value="">-- Choose --</option>
                        {modules.map(mod => (
                            <option key={mod.id} value={mod.id}>{mod.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Target Environment</label>
                    <select
                        value={selectedEnv}
                        onChange={e => setSelectedEnv(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                    >
                        {environments.map(env => (
                            <option key={env} value={env}>{env}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Search API (Operation ID / Summary)</label>
                <div className="flex gap-2">
                    <input
                        value={apiName}
                        onChange={e => { setApiName(e.target.value); setNotFound(false); }}
                        placeholder="e.g. getUserProfile"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                    <button
                        onClick={handleSearchAndAdd}
                        disabled={isSearching || !selectedModuleId || !apiName}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-xs font-bold disabled:opacity-50 transition-all flex items-center space-x-2"
                    >
                        {isSearching ? <Activity className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        <span>Verify</span>
                    </button>
                </div>
            </div>

            {notFound && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center space-y-3">
                    <p className="text-xs text-amber-300 font-medium">API "{apiName}" not found in {modules.find(m => m.id === selectedModuleId)?.name} Swagger.</p>
                    <button
                        onClick={() => onAdd({
                            name: apiName,
                            url: "",
                            method: "GET",
                            authType: "None",
                            description: "Manual Entry (Not Found in Swagger)",
                            providerSystem: modules.find(m => m.id === selectedModuleId)?.name || "Ext",
                            priority: 1,
                            api_swagger_status: false
                        })}
                        className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold transition-all"
                    >
                        Add Manually Anyway
                    </button>
                </div>
            )}

            {!notFound && !isSearching && (
                <p className="text-[10px] text-slate-500 bg-slate-900/50 p-2 rounded">
                    Validation ensures the endpoint exists in the vendor's Swagger documentation before adding it to your system dependency list.
                </p>
            )}

            <div className="flex justify-end pt-2">
                <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-300 px-4 py-2">Cancel</button>
            </div>
        </div>
    );
}

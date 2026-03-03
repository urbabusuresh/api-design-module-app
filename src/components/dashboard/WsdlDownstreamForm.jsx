import React, { useState } from 'react';
import { Activity, Search, Globe, Code, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../apiClient';

export function WsdlDownstreamForm({ onCancel, onAdd }) {
    const [wsdlUrl, setWsdlUrl] = useState("");
    const [isParsing, setIsParsing] = useState(false);
    const [operations, setOperations] = useState([]);
    const [endpoint, setEndpoint] = useState("");
    const [error, setError] = useState("");

    const parseWsdl = async () => {
        if (!wsdlUrl.trim()) {
            setError("Please enter a WSDL URL");
            return;
        }

        setError("");
        setIsParsing(true);
        setOperations([]);
        setEndpoint("");

        try {
            // apiClient.fetchWsdl() auto-injects the auth token and uses the correct backend URL
            const data = await apiClient.fetchWsdl(wsdlUrl.trim());

            if (!data.operations || data.operations.length === 0) {
                setError("No operations found in WSDL. Ensure the URL points to a valid WSDL document.");
                return;
            }

            setEndpoint(data.endpoint || wsdlUrl.replace(/\?wsdl$/i, ""));
            setOperations(data.operations);
            toast.success(`Found ${data.operations.length} operation${data.operations.length !== 1 ? 's' : ''}`);
        } catch (err) {
            console.error("WSDL Parse Error:", err);
            setError(err.message || "Failed to fetch or parse WSDL. Check the URL and ensure the server is reachable.");
        } finally {
            setIsParsing(false);
        }
    };


    const handleSelectOperation = (op) => {
        onAdd({
            name: op.name,
            url: endpoint || op.url || "",
            method: "POST",
            description: op.description,
            authType: "None",
            priority: 1,
            bodyFormat: 'xml',
            // Use pre-built SOAP template from server parser
            request: op.soapTemplate,
            providerSystem: ""
        });
        toast.success(`Imported SOAP operation: ${op.name}`);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header badge */}
            <div className="flex items-center space-x-2 text-amber-400 text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 w-fit">
                <Code className="w-3 h-3" />
                <span>WSDL / SOAP Importer</span>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-[10px] font-medium flex items-start space-x-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* URL Input */}
            <div className="space-y-1.5">
                <label className="block text-[10px] uppercase text-slate-500 font-bold">WSDL URL</label>
                <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2 focus-within:border-amber-500/50 transition-colors">
                        <Globe className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                        <input
                            value={wsdlUrl}
                            onChange={e => { setWsdlUrl(e.target.value); setError(""); }}
                            onKeyDown={e => e.key === 'Enter' && parseWsdl()}
                            placeholder="https://example.com/service?wsdl"
                            className="flex-1 bg-transparent border-none py-2 text-sm text-white focus:outline-none font-mono placeholder-slate-600"
                        />
                    </div>
                    <button
                        onClick={parseWsdl}
                        disabled={isParsing || !wsdlUrl.trim()}
                        className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 transition-all flex items-center space-x-2 shadow-lg shadow-amber-900/20 shrink-0"
                    >
                        {isParsing ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>{isParsing ? 'Parsing...' : 'Parse WSDL'}</span>
                    </button>
                </div>
                <p className="text-[9px] text-slate-600">
                    e.g. <span className="font-mono text-slate-500">http://www.dneonline.com/calculator.asmx?WSDL</span>
                </p>
            </div>

            {/* Operations List */}
            {operations.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase text-slate-500 font-bold">
                            Available Operations
                            <span className="ml-2 bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[9px]">{operations.length}</span>
                        </label>
                        {endpoint && (
                            <span className="text-[9px] text-slate-500 font-mono truncate max-w-[220px]" title={endpoint}>
                                Endpoint: {endpoint.split('/').slice(-2).join('/')}
                            </span>
                        )}
                    </div>
                    <div className="max-h-56 overflow-y-auto bg-slate-900/60 rounded-xl border border-slate-800 divide-y divide-slate-800/60">
                        {operations.map((op, idx) => (
                            <div
                                key={idx}
                                className="p-3 hover:bg-amber-500/5 hover:border-l-2 hover:border-l-amber-500 transition-all group cursor-pointer flex justify-between items-center"
                                onClick={() => handleSelectOperation(op)}
                            >
                                <div className="flex items-center space-x-2.5 overflow-hidden">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                    <div className="overflow-hidden">
                                        <div className="text-sm font-semibold text-white truncate">{op.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{op.description}</div>
                                    </div>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-md transition-all shrink-0 ml-2">
                                    Import
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="text-[9px] text-slate-600">
                        Click an operation to import it with a pre-built SOAP Envelope template.
                    </p>
                </div>
            )}

            {/* Empty state hint */}
            {!isParsing && operations.length === 0 && !error && (
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-4 text-center">
                    <Code className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-500">
                        Enter a WSDL URL above and click <strong className="text-slate-400">Parse WSDL</strong>.<br />
                        The server will fetch and extract all operations for you.
                    </p>
                </div>
            )}

            <div className="flex justify-end pt-1">
                <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-300 px-4 py-2 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { Upload, FileJson, X, Check, AlertCircle, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';

/**
 * PostmanImporter
 * Parses Postman Collection v2.1 JSON files and bulk-imports requests into a module catalog.
 */
export function PostmanImporter({ module, onClose, onImported }) {
    const [collection, setCollection] = useState(null);
    const [items, setItems] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [importing, setImporting] = useState(false);
    const [expanded, setExpanded] = useState(new Set());

    const parseCollection = (json) => {
        const extracted = [];
        const walk = (node) => {
            if (Array.isArray(node)) { node.forEach(walk); return; }
            if (node.item) { walk(node.item); return; } // Folder
            if (node.request) {
                const req = node.request;
                const method = typeof req.method === 'string' ? req.method.toUpperCase() : 'GET';
                const rawUrl = req.url?.raw || (typeof req.url === 'string' ? req.url : '');
                const url = rawUrl.replace(/\{\{[^}]+\}\}/g, '{VAR}');
                const parsedUrl = (() => {
                    try { return new URL(rawUrl.replace(/\{\{[^}]+\}\}/g, 'example.com')).pathname; }
                    catch { return url; }
                })();
                const body = req.body?.raw || '';
                const headers = {};
                (req.header || []).forEach(h => { if (h.key && !h.disabled) headers[h.key] = h.value; });
                extracted.push({
                    id: `pm_${Date.now()}_${extracted.length}`,
                    name: node.name || `${method} ${parsedUrl}`,
                    url: parsedUrl || rawUrl,
                    rawUrl,
                    method,
                    body,
                    headers,
                    description: typeof req.description === 'string' ? req.description : '',
                    folder: node._folder || 'Root'
                });
            }
        };
        const withFolders = (node, folderName = 'Root') => {
            if (Array.isArray(node)) { node.forEach(n => withFolders(n, folderName)); return; }
            if (node.item) { node.item.forEach(n => withFolders(n, node.name || folderName)); return; }
            if (node.request) { node._folder = folderName; walk(node); }
        };
        try { withFolders(json.item || []); } catch { walk(json.item || []); }
        return extracted;
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target.result);
                if (!json.item) throw new Error('Not a valid Postman Collection');
                setCollection({ name: json.info?.name || file.name, version: json.info?.schema });
                const parsed = parseCollection(json);
                setItems(parsed);
                setSelected(new Set(parsed.map(p => p.id)));
                toast.success(`Parsed ${parsed.length} requests from "${json.info?.name || file.name}"`);
            } catch (err) {
                toast.error('Failed to parse: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    const toggleAll = () => {
        setSelected(selected.size === items.length ? new Set() : new Set(items.map(i => i.id)));
    };

    const handleImport = async () => {
        const toImport = items.filter(i => selected.has(i.id));
        if (!toImport.length) { toast.error('Select at least one request'); return; }

        setImporting(true);
        try {
            const apiItems = toImport.map(item => ({
                name: item.name,
                url: item.url,
                method: item.method,
                description: item.description || `Imported from Postman: ${item.name}`,
                swaggerRef: '',
                headers: item.headers,
                request_body: item.body ? (() => { try { return JSON.parse(item.body); } catch { return item.body; } })() : {},
                response_body: {},
                authentication: { type: 'None' },
                isAuthApi: false,
                bodyFormat: Object.keys(item.headers).some(h => h.toLowerCase() === 'content-type' && item.headers[h].includes('xml')) ? 'xml' : 'json'
            }));
            await api.addModuleApis(module.id, apiItems);
            toast.success(`Imported ${apiItems.length} requests into ${module.name}!`);
            onImported?.();
            onClose?.();
        } catch (err) {
            toast.error('Import failed: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    // Group by folder
    const byFolder = items.reduce((acc, item) => {
        const f = item.folder || 'Root';
        if (!acc[f]) acc[f] = [];
        acc[f].push(item);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                            <FileJson className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Import from Postman Collection</h3>
                            <p className="text-[10px] text-slate-500">Load a <span className="font-mono text-orange-300">collection.json</span> (v2.1) and select requests to import</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
                </div>

                {/* Drop zone */}
                {!collection ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10">
                        <label className="w-full max-w-sm cursor-pointer">
                            <div className="border-2 border-dashed border-slate-700 hover:border-orange-500/50 rounded-2xl p-10 text-center transition-colors">
                                <Upload className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                                <p className="text-sm font-semibold text-slate-400 mb-1">Drop or click to upload</p>
                                <p className="text-[10px] text-slate-600">Postman Collection v2.1 · JSON format</p>
                            </div>
                            <input type="file" accept=".json" onChange={handleFile} className="hidden" />
                        </label>
                        <p className="text-[9px] text-slate-700 mt-4">Export from Postman: File → Export → Collection v2.1</p>
                    </div>
                ) : (
                    <>
                        {/* Collection Info */}
                        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileJson className="w-3.5 h-3.5 text-orange-400" />
                                <span className="text-sm font-bold text-white">{collection.name}</span>
                                <span className="text-[9px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded font-bold">{items.length} requests</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={toggleAll} className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold">
                                    {selected.size === items.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <span className="text-[9px] text-slate-600">· {selected.size} selected</span>
                            </div>
                        </div>

                        {/* Request List grouped by folder */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {Object.entries(byFolder).map(([folder, folderItems]) => (
                                <div key={folder}>
                                    <button
                                        onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(folder) ? n.delete(folder) : n.add(folder); return n; })}
                                        className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 w-full hover:text-slate-300"
                                    >
                                        {expanded.has(folder) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        {folder} <span className="text-slate-700 font-normal">({folderItems.length})</span>
                                    </button>
                                    {(expanded.has(folder) || !expanded.size) && (
                                        <div className="space-y-1 pl-4 border-l border-slate-800">
                                            {folderItems.map(item => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => setSelected(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; })}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selected.has(item.id) ? 'bg-orange-500/5 border border-orange-500/20' : 'hover:bg-slate-800 border border-transparent'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.has(item.id) ? 'bg-orange-500 border-orange-500' : 'border-slate-600'}`}>
                                                        {selected.has(item.id) && <Check className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>{item.method}</span>
                                                    <span className="text-sm text-white truncate flex-1">{item.name}</span>
                                                    <span className="text-[9px] font-mono text-slate-600 truncate max-w-[150px]">{item.url}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                            <label className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300 flex items-center gap-1 font-bold">
                                <Upload className="w-3 h-3" /> Load different file
                                <input type="file" accept=".json" onChange={e => { setCollection(null); setItems([]); handleFile(e); }} className="hidden" />
                            </label>
                            <button
                                onClick={handleImport}
                                disabled={importing || !selected.size}
                                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-orange-900/20"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{importing ? 'Importing...' : `Import ${selected.size} Requests`}</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

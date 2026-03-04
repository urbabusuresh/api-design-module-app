import React, { useState } from 'react';
import { X, FileJson, FileText, FileSpreadsheet, Download, File, Search } from 'lucide-react';
import { exportToExcel, exportToJSON, exportToPDF, exportToWord } from './LLDExportUtils';

export function LLDExportModal({ isOpen, onClose, apis, projectName }) {
    const [scope, setScope] = useState('all');
    const [format, setFormat] = useState('pdf');
    const [selectedApis, setSelectedApis] = useState(new Set(apis.map(a => a.id)));
    const [search, setSearch] = useState('');

    if (!isOpen) return null;

    const filteredApis = apis.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || (a.url && a.url.toLowerCase().includes(search.toLowerCase())));

    const handleToggleApi = (id) => {
        const next = new Set(selectedApis);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedApis(next);
    };

    const handleExport = async () => {
        const apisToExport = scope === 'all' ? apis : apis.filter(a => selectedApis.has(a.id));

        switch (format) {
            case 'excel':
                exportToExcel(apisToExport, projectName);
                break;
            case 'pdf':
                exportToPDF(apisToExport, projectName);
                break;
            case 'word':
                await exportToWord(apisToExport, projectName);
                break;
            case 'json':
            default:
                exportToJSON(apisToExport, projectName);
                break;
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 w-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-in-up" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Download className="w-5 h-5 text-indigo-400" /> Export LLD
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Generate Low Level Design document with detailed information</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Scope Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Export Scope</label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition-colors ${scope === 'all' ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}>
                                <input type="radio" value="all" checked={scope === 'all'} onChange={() => setScope('all')} className="hidden" />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${scope === 'all' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'}`}>
                                    {scope === 'all' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">All Mapped APIs</div>
                                    <div className="text-[10px] mt-0.5">{apis.length} total endpoints across all systems</div>
                                </div>
                            </label>

                            <label className={`cursor-pointer border rounded-xl p-4 flex items-center gap-3 transition-colors ${scope === 'selected' ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}>
                                <input type="radio" value="selected" checked={scope === 'selected'} onChange={() => setScope('selected')} className="hidden" />
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${scope === 'selected' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'}`}>
                                    {scope === 'selected' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">Selected APIs</div>
                                    <div className="text-[10px] mt-0.5">Choose specific endpoints to include</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* API Selection List (Dynamic) */}
                    {scope === 'selected' && (
                        <div className="space-y-2 animate-fade-in-up">
                            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 focus-within:border-indigo-500 transition-colors">
                                <Search className="w-4 h-4 text-slate-500 mr-2" />
                                <input
                                    className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-slate-600"
                                    placeholder="Search by API name or URL..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="h-40 overflow-y-auto border border-slate-800 rounded-lg bg-slate-950/50 divide-y divide-slate-800">
                                {filteredApis.map(api => (
                                    <label key={api.id} className="flex items-center gap-3 p-3 hover:bg-slate-900/80 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedApis.has(api.id)}
                                            onChange={() => handleToggleApi(api.id)}
                                            className="w-4 h-4 accent-indigo-500"
                                        />
                                        <div className="flex-1 truncate">
                                            <div className="text-xs font-bold text-slate-200 truncate">{api.name}</div>
                                            <div className="text-[10px] font-mono text-slate-500 truncate">{api.url}</div>
                                        </div>
                                        <div className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                            {api.systemName}
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
                                <span>{selectedApis.size} selected</span>
                                <div className="space-x-2">
                                    <button onClick={() => setSelectedApis(new Set(apis.map(a => a.id)))} className="hover:text-indigo-400 transition-colors">Select All</button>
                                    <button onClick={() => setSelectedApis(new Set())} className="hover:text-indigo-400 transition-colors">Clear</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Format Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Format</label>
                        <div className="grid grid-cols-4 gap-3">
                            <FormatOption id="pdf" icon={FileText} label="PDF" current={format} setFormat={setFormat} color="red" />
                            <FormatOption id="word" icon={File} label="Word" current={format} setFormat={setFormat} color="blue" />
                            <FormatOption id="excel" icon={FileSpreadsheet} label="Excel" current={format} setFormat={setFormat} color="emerald" />
                            <FormatOption id="json" icon={FileJson} label="JSON" current={format} setFormat={setFormat} color="indigo" />
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={scope === 'selected' && selectedApis.size === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all"
                    >
                        <Download className="w-4 h-4" /> Export Document
                    </button>
                </div>
            </div>
        </div>
    );
}

function FormatOption({ id, icon, label, current, setFormat, color }) {
    const IconComponent = icon;
    const isSelected = current === id;

    // Simple color mapping for active states
    const borderColors = {
        red: 'border-red-500/50 bg-red-400/10 text-red-400',
        blue: 'border-blue-500/50 bg-blue-400/10 text-blue-400',
        emerald: 'border-emerald-500/50 bg-emerald-400/10 text-emerald-400',
        indigo: 'border-indigo-500/50 bg-indigo-400/10 text-indigo-400'
    };

    const idleColor = 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-900';

    return (
        <button
            onClick={() => setFormat(id)}
            className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-all ${isSelected ? borderColors[color] : idleColor}`}
        >
            <IconComponent className="w-6 h-6 mb-2" />
            <span className="text-xs font-bold">{label}</span>
        </button>
    );
}

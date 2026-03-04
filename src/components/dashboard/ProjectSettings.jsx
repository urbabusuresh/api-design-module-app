import React, { useState, useEffect } from 'react';
import ConfirmModal from './ConfirmModal.jsx';
import { EnvVariableManager } from './EnvVariableManager.jsx';
import {
    Tag, Share2, Globe, LayoutGrid, Plus, Edit2, Trash2, Code, SlidersHorizontal
} from 'lucide-react';

export function ProjectSettings({ project, settings, variables, onUpdate, onUpdateVariables }) {
    const [localSettings, setLocalSettings] = useState(settings || { categories: [], channels: [] });
    const [activeTab, setActiveTab] = useState('categories');
    const [promptConfig, setPromptConfig] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // { type, val, subType }

    const tabs = [
        { id: 'categories', label: 'Categories', icon: Tag },
        { id: 'channels', label: 'Channels', icon: Share2 },
        { id: 'marketSegments', label: 'Market Segments', icon: LayoutGrid },
        { id: 'environments', label: 'Environments', icon: Globe },
        { id: 'variables', label: 'Global Variables', icon: Code },
        { id: 'envContexts', label: 'Env Contexts', icon: SlidersHorizontal },
    ];

    // Convert object -> rows for UI
    const toRows = (obj) => {
        if (!obj || typeof obj !== 'object') return [{ key: '', value: '' }];
        const entries = Object.entries(obj);
        return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }];
    };

    const [varRows, setVarRows] = useState(() => toRows(variables));

    useEffect(() => {
        setVarRows(toRows(variables || {}));
    }, [variables]);

    const handleSaveVariables = () => {
        const obj = {};
        varRows.forEach(r => { if (r.key.trim()) obj[r.key.trim()] = r.value; });
        onUpdateVariables(obj);
    };

    const addVarRow = () => setVarRows(prev => [...prev, { key: '', value: '' }]);
    const updateVarRow = (idx, field, val) => setVarRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    const removeVarRow = (idx) => setVarRows(prev => prev.filter((_, i) => i !== idx));

    const addItem = (type, subType = null) => {
        setPromptConfig({
            mode: 'add',
            type,
            subType,
            title: `New ${subType || type}`,
            placeholder: `e.g. ${type === 'environments' ? 'STAGING' : 'New ' + (subType || type)}`
        });
    };

    const editItem = (type, oldVal, subType = null) => {
        setPromptConfig({
            mode: 'edit',
            type,
            subType,
            oldValue: oldVal,
            title: `Edit ${subType || type}`,
            initialValue: oldVal
        });
    };

    const deleteItem = (type, val, subType = null) => {
        setConfirmDelete({ type, val, subType });
    };

    const confirmDeleteAction = () => {
        if (!confirmDelete) return;
        const { type, val, subType } = confirmDelete;

        setLocalSettings(prev => {
            let upd;
            if (subType) {
                upd = {
                    ...prev,
                    channels: {
                        ...prev.channels,
                        [subType]: prev.channels?.[subType]?.filter(v => v !== val)
                    }
                };
            } else {
                upd = { ...prev, [type]: prev[type]?.filter(v => v !== val) };
            }
            onUpdate(upd);
            return upd;
        });
        setConfirmDelete(null);
    };

    const handleConfirmPrompt = (val) => {
        if (!val || !promptConfig) return;
        const { type, subType, mode, oldValue } = promptConfig;

        setLocalSettings(prev => {
            let upd;
            if (subType) {
                const list = [...(prev.channels?.[subType] || [])];
                if (mode === 'edit') {
                    const idx = list.indexOf(oldValue);
                    if (idx !== -1) list[idx] = val;
                } else {
                    list.push(val);
                }
                upd = {
                    ...prev,
                    channels: { ...prev.channels, [subType]: list }
                };
            } else {
                const list = [...(prev[type] || [])];
                if (mode === 'edit') {
                    const idx = list.indexOf(oldValue);
                    if (idx !== -1) list[idx] = val;
                } else {
                    list.push(val);
                }
                upd = { ...prev, [type]: list };
            }
            onUpdate(upd);
            return upd;
        });
        setPromptConfig(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
            {/* Header */}
            <div className="px-8 pt-6 pb-2 shrink-0 border-b border-slate-800/40 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-white mb-1">Project Configuration</h1>
                        <p className="text-sm text-slate-500">Manage global list of values (LOVs) and environment mappings.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-6 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 pb-3 px-1 text-[11px] uppercase tracking-widest font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-6 scrollbar-thin">
                <div className="max-w-4xl animate-fade-in-up">
                    {activeTab === 'categories' && (
                        <SettingsSection title="API Categories" description="Tags used to group APIs (e.g. Mobile, CRM, Billing, VAS)">
                            <div className="flex flex-wrap gap-3">
                                {localSettings.categories?.map(cat => (
                                    <ConfigChip
                                        key={cat}
                                        value={cat}
                                        color="indigo"
                                        onEdit={() => editItem('categories', cat)}
                                        onDelete={() => deleteItem('categories', cat)}
                                    />
                                ))}
                                <button
                                    onClick={() => addItem('categories')}
                                    className="border-2 border-dashed border-slate-700 text-slate-500 px-4 py-2 rounded-xl text-sm hover:border-indigo-500/50 hover:text-indigo-400 transition-all flex items-center space-x-2"
                                >
                                    <Plus className="w-4 h-4" /> <span>Add Category</span>
                                </button>
                            </div>
                        </SettingsSection>
                    )}

                    {activeTab === 'channels' && (
                        <div className="space-y-6">
                            <SettingsSection title="Northbound Channels" description="Consumer systems that will call your APIs">
                                <div className="flex flex-wrap gap-3">
                                    {localSettings.channels?.northbound?.map(ch => (
                                        <ConfigChip
                                            key={ch}
                                            value={ch}
                                            color="emerald"
                                            onEdit={() => editItem('channels', ch, 'northbound')}
                                            onDelete={() => deleteItem('channels', ch, 'northbound')}
                                        />
                                    ))}
                                    <button
                                        onClick={() => addItem('channels', 'northbound')}
                                        className="border-2 border-dashed border-slate-700 text-slate-500 px-4 py-2 rounded-xl text-sm hover:border-emerald-500/50 hover:text-emerald-400 transition-all flex items-center space-x-2"
                                    >
                                        <Plus className="w-4 h-4" /> <span>Add Channel</span>
                                    </button>
                                </div>
                            </SettingsSection>

                            <SettingsSection title="Southbound Providers" description="Provider systems that your APIs will integrate with">
                                <div className="flex flex-wrap gap-3">
                                    {localSettings.channels?.southbound?.map(ch => (
                                        <ConfigChip
                                            key={ch}
                                            value={ch}
                                            color="cyan"
                                            onEdit={() => editItem('channels', ch, 'southbound')}
                                            onDelete={() => deleteItem('channels', ch, 'southbound')}
                                        />
                                    ))}
                                    <button
                                        onClick={() => addItem('channels', 'southbound')}
                                        className="border-2 border-dashed border-slate-700 text-slate-500 px-4 py-2 rounded-xl text-sm hover:border-cyan-500/50 hover:text-cyan-400 transition-all flex items-center space-x-2"
                                    >
                                        <Plus className="w-4 h-4" /> <span>Add Provider</span>
                                    </button>
                                </div>
                            </SettingsSection>
                        </div>
                    )}

                    {activeTab === 'marketSegments' && (
                        <SettingsSection title="Market Segments" description="Target segments or business verticals (e.g. Retail, Enterprise, SME)">
                            <div className="flex flex-wrap gap-3">
                                {localSettings.marketSegments?.map(seg => (
                                    <ConfigChip
                                        key={seg}
                                        value={seg}
                                        color="orange"
                                        onEdit={() => editItem('marketSegments', seg)}
                                        onDelete={() => deleteItem('marketSegments', seg)}
                                    />
                                ))}
                                <button
                                    onClick={() => addItem('marketSegments')}
                                    className="border-2 border-dashed border-slate-700 text-slate-500 px-4 py-2 rounded-xl text-sm hover:border-orange-500/50 hover:text-orange-400 transition-all flex items-center space-x-2"
                                >
                                    <Plus className="w-4 h-4" /> <span>Add Segment</span>
                                </button>
                            </div>
                        </SettingsSection>
                    )}

                    {activeTab === 'environments' && (
                        <SettingsSection title="Environments" description="Deployment stages for your API lifecycle">
                            <div className="flex flex-wrap gap-3">
                                {(localSettings.environments || ['DEV', 'SIT', 'UAT', 'PROD']).map(env => (
                                    <ConfigChip
                                        key={env}
                                        value={env}
                                        color="pink"
                                        onEdit={() => editItem('environments', env)}
                                        onDelete={() => deleteItem('environments', env)}
                                    />
                                ))}
                                <button
                                    onClick={() => addItem('environments')}
                                    className="border-2 border-dashed border-slate-700 text-slate-500 px-4 py-2 rounded-xl text-sm hover:border-pink-500/50 hover:text-pink-400 transition-all flex items-center space-x-2"
                                >
                                    <Plus className="w-4 h-4" /> <span>Add Environment</span>
                                </button>
                            </div>
                        </SettingsSection>
                    )}

                    {activeTab === 'variables' && (
                        <SettingsSection
                            title="Global Environment Variables"
                            description="Define reusable key-value variables for your project. Use {{variableName}} in API URLs and Headers to auto-substitute values during testing."
                        >
                            <div className="flex flex-col space-y-4">

                                {/* Hint */}
                                <div className="text-[10px] bg-slate-800/60 border border-slate-700 rounded-xl p-3 leading-relaxed space-y-1">
                                    <p><span className="text-indigo-400 font-bold uppercase mr-1">Usage:</span>
                                        <span className="text-slate-400">Define variables here, then reference them using </span>
                                        <code className="text-pink-400 font-bold">{'{{variableName}}'}</code>
                                        <span className="text-slate-400"> in your API URLs and Headers during testing.</span>
                                    </p>
                                    <p className="text-slate-500">
                                        <span className="text-slate-300">Examples: </span>
                                        URL → <code className="text-pink-400">{'{{baseUrl}}/v1/users'}</code>
                                        &nbsp;|&nbsp; Header → <code className="text-pink-400">{'Authorization: {{authToken}}'}</code>
                                        &nbsp;|&nbsp; <code className="text-pink-400">{'X-Channel-Id: {{channelId}}'}</code>
                                    </p>
                                </div>

                                {/* Column Headers */}
                                <div className="grid grid-cols-12 gap-3 px-2 pb-1 border-b border-slate-800">
                                    <div className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Variable Name</div>
                                    <div className="col-span-7 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Value</div>
                                    <div className="col-span-1"></div>
                                </div>

                                {/* Rows */}
                                <div className="space-y-2">
                                    {varRows.map((row, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-3 items-center group animate-fade-in">
                                            <div className="col-span-4">
                                                <input
                                                    value={row.key}
                                                    onChange={e => updateVarRow(idx, 'key', e.target.value)}
                                                    placeholder="e.g. baseUrl"
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-indigo-300 font-mono outline-none focus:border-indigo-500 transition-all placeholder-slate-700"
                                                />
                                            </div>
                                            <div className="col-span-7">
                                                <input
                                                    value={row.value}
                                                    onChange={e => updateVarRow(idx, 'value', e.target.value)}
                                                    placeholder="e.g. https://api-dev.example.com"
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-emerald-300 font-mono outline-none focus:border-emerald-500 transition-all placeholder-slate-700"
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <button
                                                    onClick={() => removeVarRow(idx)}
                                                    disabled={varRows.length === 1}
                                                    className="p-1.5 text-slate-600 hover:text-red-400 disabled:opacity-0 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-400/10"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Add Row Button */}
                                <button
                                    onClick={addVarRow}
                                    className="flex items-center space-x-2 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1.5 hover:bg-indigo-500/5 rounded-xl w-fit"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Variable</span>
                                </button>

                                {/* Save Button */}
                                <div className="flex justify-end pt-2 border-t border-slate-800">
                                    <button
                                        onClick={handleSaveVariables}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
                                    >
                                        Save Variables
                                    </button>
                                </div>
                            </div>
                        </SettingsSection>
                    )}

                    {activeTab === 'envContexts' && (
                        <SettingsSection
                            title="Environment Context Settings"
                            description="Configure specific target URLs and properties for each environment (e.g., specific DEV DB URL, PROD backend URL)."
                        >
                            <div className="h-[600px] w-full animate-fade-in-up">
                                <EnvVariableManager
                                    project={project}
                                    environments={localSettings.environments || ['DEV', 'SIT', 'UAT', 'PROD']}
                                    onSaved={onUpdateVariables}
                                />
                            </div>
                        </SettingsSection>
                    )}
                </div>
            </div>

            <PromptModal
                isOpen={!!promptConfig}
                title={promptConfig?.title}
                placeholder={promptConfig?.placeholder}
                onConfirm={handleConfirmPrompt}
                onCancel={() => setPromptConfig(null)}
            />

            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Confirm Selection"
                message={`Are you sure you want to delete "${confirmDelete?.val}"? This will remove it from the project configuration.`}
                onConfirm={confirmDeleteAction}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    )
}

function SettingsSection({ title, description, children }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="mb-5">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-sm text-slate-500">{description}</p>
            </div>
            {children}
        </div>
    )
}

function ConfigChip({ value, color, onEdit, onDelete }) {
    const colorClasses = {
        indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20",
        emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20",
        cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20",
        orange: "bg-orange-500/10 text-orange-300 border-orange-500/20 hover:bg-orange-500/20",
        pink: "bg-pink-500/10 text-pink-300 border-pink-500/20 hover:bg-pink-500/20"
    };

    return (
        <div className={`group relative flex items-center space-x-2 border px-4 py-2 rounded-xl text-sm font-medium transition-all ${colorClasses[color] || colorClasses.indigo}`}>
            <span>{value}</span>
            <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 hover:text-white transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

export function PromptModal({ isOpen, title, placeholder, initialValue = "", onConfirm, onCancel }) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) setValue(initialValue);
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-8 animate-scale-in">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-500 text-sm mb-6">Enter the required information below to proceed.</p>

                <div className="space-y-4">
                    <input
                        autoFocus
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={placeholder}
                        onKeyDown={e => e.key === 'Enter' && value && onConfirm(value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 text-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                    />

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(value)}
                            disabled={!value}
                            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            Create / Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

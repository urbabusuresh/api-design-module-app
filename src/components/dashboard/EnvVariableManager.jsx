import React, { useState } from 'react';
import { Plus, Trash2, Save, X, Globe, Copy, Eye, EyeOff, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';

/**
 * EnvVariableManager
 * Per-environment variable manager.
 * Variables are stored as project global_variables: { DEV: {k:v}, SIT: {k:v}, ... }
 * Usage in URLs/bodies: {{VARIABLE_NAME}} (resolved in AdvancedApiTester)
 */
export function EnvVariableManager({ project, environments = [], onClose, onSaved }) {
    const initial = typeof project.global_variables === 'string'
        ? JSON.parse(project.global_variables)
        : (project.global_variables || {});

    const [vars, setVars] = useState(initial);
    const [activeEnv, setActiveEnv] = useState(environments[0] || 'DEV');
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [hidden, setHidden] = useState(new Set());

    const envVars = Object.entries(vars[activeEnv] || {}).filter(
        ([k]) => !search || k.toLowerCase().includes(search.toLowerCase())
    );

    const addVar = () => {
        setVars(prev => ({
            ...prev,
            [activeEnv]: { ...(prev[activeEnv] || {}), [`NEW_VAR_${Date.now()}`]: '' }
        }));
    };

    const updateKey = (oldKey, newKey) => {
        setVars(prev => {
            const envMap = { ...(prev[activeEnv] || {}) };
            const val = envMap[oldKey];
            delete envMap[oldKey];
            envMap[newKey] = val;
            return { ...prev, [activeEnv]: envMap };
        });
    };

    const updateVal = (key, val) => {
        setVars(prev => ({
            ...prev,
            [activeEnv]: { ...(prev[activeEnv] || {}), [key]: val }
        }));
    };

    const removeVar = (key) => {
        setVars(prev => {
            const envMap = { ...(prev[activeEnv] || {}) };
            delete envMap[key];
            return { ...prev, [activeEnv]: envMap };
        });
    };

    const copyToEnv = (targetEnv) => {
        setVars(prev => ({
            ...prev,
            [targetEnv]: { ...(prev[activeEnv] || {}) }
        }));
        toast.success(`Copied variables to ${targetEnv}`);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateProjectVariables(project.id, vars);
            toast.success('Environment variables saved!');
            onSaved?.(vars);
            onClose?.();
        } catch (err) {
            toast.error('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleHide = (key) => {
        setHidden(prev => {
            const n = new Set(prev);
            n.has(key) ? n.delete(key) : n.add(key);
            return n;
        });
    };

    const totalVars = Object.keys(vars[activeEnv] || {}).length;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[750px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Environment Variables</h3>
                            <p className="text-[10px] text-slate-500">Use <span className="font-mono text-purple-300">{'{{VARIABLE}}'}</span> in URLs, headers, and request bodies</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
                </div>

                {/* Environment Tabs */}
                <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-800 bg-slate-950/30">
                    {environments.map(env => (
                        <button
                            key={env}
                            onClick={() => setActiveEnv(env)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeEnv === env ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                        >
                            {env}
                            <span className="ml-1.5 text-[8px] opacity-70">{Object.keys(vars[env] || {}).length}</span>
                        </button>
                    ))}
                    {/* Copy to environment dropdown */}
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-[9px] text-slate-600">Copy to:</span>
                        {environments.filter(e => e !== activeEnv).map(env => (
                            <button key={env} onClick={() => copyToEnv(env)} className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded transition-colors flex items-center gap-1">
                                <Copy className="w-2.5 h-2.5" />{env}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search + Add */}
                <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800">
                    <div className="flex-1 flex items-center bg-slate-800 rounded-lg px-3 border border-slate-700">
                        <Search className="w-3 h-3 text-slate-500 mr-2" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Filter variables..."
                            className="flex-1 bg-transparent text-xs text-white py-1.5 outline-none placeholder-slate-600"
                        />
                    </div>
                    <button onClick={addVar} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all">
                        <Plus className="w-3.5 h-3.5" /><span>Add Variable</span>
                    </button>
                </div>

                {/* Variable List */}
                <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
                    {totalVars === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                            <Globe className="w-8 h-8 mb-2 opacity-30" />
                            <p className="text-xs">No variables for {activeEnv}</p>
                            <button onClick={addVar} className="mt-3 text-[10px] text-purple-400 hover:text-purple-300 font-bold">+ Add First Variable</button>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <div className="grid grid-cols-[1fr,1fr,32px] gap-2 px-1 mb-2">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">Variable Name</span>
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">Value ({activeEnv})</span>
                                <span />
                            </div>
                            {(search ? envVars : Object.entries(vars[activeEnv] || {})).map(([key, val]) => (
                                <div key={key} className="grid grid-cols-[1fr,1fr,32px] gap-2 items-center group">
                                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 focus-within:border-purple-500 transition-colors">
                                        <span className="text-purple-400 text-xs mr-1">{'{'}{'{{'}</span>
                                        <input
                                            defaultValue={key}
                                            onBlur={e => { if (e.target.value !== key) updateKey(key, e.target.value); }}
                                            className="flex-1 bg-transparent text-xs text-white py-1.5 outline-none font-mono"
                                        />
                                        <span className="text-purple-400 text-xs">{'}}}'}</span>
                                    </div>
                                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 focus-within:border-purple-500 transition-colors">
                                        <input
                                            type={hidden.has(key) ? 'password' : 'text'}
                                            value={val}
                                            onChange={e => updateVal(key, e.target.value)}
                                            className="flex-1 bg-transparent text-xs text-slate-200 py-1.5 outline-none font-mono"
                                            placeholder="value..."
                                        />
                                        <button onClick={() => toggleHide(key)} className="text-slate-600 hover:text-slate-400 ml-1">
                                            {hidden.has(key) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        </button>
                                    </div>
                                    <button onClick={() => removeVar(key)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                    <p className="text-[9px] text-slate-600">Variables resolve at runtime — changes are live immediately after saving</p>
                    <button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-purple-900/20">
                        <Save className="w-3.5 h-3.5" />
                        <span>{saving ? 'Saving...' : 'Save Variables'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

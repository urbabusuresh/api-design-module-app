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
        <div className="flex flex-col space-y-4 animate-fade-in-up">
            {/* Environment Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex space-x-2">
                    {environments.map(env => (
                        <button
                            key={env}
                            onClick={() => setActiveEnv(env)}
                            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${activeEnv === env
                                ? 'border-purple-500 text-purple-400'
                                : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {env}
                            <span className="ml-2 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-md opacity-80">{Object.keys(vars[env] || {}).length}</span>
                        </button>
                    ))}
                </div>
                {/* Copy to environment dropdown */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Copy to:</span>
                    {environments.filter(e => e !== activeEnv).map(env => (
                        <button key={env} onClick={() => copyToEnv(env)} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-bold">
                            <Copy className="w-3 h-3" />{env}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center justify-between py-1">
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 w-64 focus-within:border-purple-500 transition-colors">
                    <Search className="w-3.5 h-3.5 text-slate-500 mr-2" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Filter variables..."
                        className="flex-1 bg-transparent text-xs text-white outline-none placeholder-slate-600"
                    />
                </div>
            </div>

            {/* Variable List */}
            <div className="space-y-2 pb-4">
                {totalVars === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                        <Globe className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-xs">No variables for {activeEnv}</p>
                        <button onClick={addVar} className="mt-3 text-[10px] text-purple-400 hover:text-purple-300 font-bold">+ Add First Variable</button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-3 px-2 pb-1 border-b border-slate-800">
                            <span className="col-span-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Variable Name</span>
                            <span className="col-span-7 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Value ({activeEnv})</span>
                            <span className="col-span-1" />
                        </div>
                        {(search ? envVars : Object.entries(vars[activeEnv] || {})).map(([key, val]) => (
                            <div key={key} className="grid grid-cols-12 gap-3 items-center group animate-fade-in">
                                <div className="col-span-4 flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 focus-within:border-purple-500 transition-all">
                                    <span className="text-purple-400 text-xs mr-1 opacity-50">{'{'}{'{{'}</span>
                                    <input
                                        defaultValue={key}
                                        onBlur={e => { if (e.target.value !== key) updateKey(key, e.target.value); }}
                                        className="flex-1 w-full bg-transparent py-2.5 text-xs text-purple-300 font-mono outline-none placeholder-slate-700"
                                    />
                                    <span className="text-purple-400 text-xs opacity-50">{'}}}'}</span>
                                </div>
                                <div className="col-span-7 flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 focus-within:border-emerald-500 transition-all">
                                    <input
                                        type={hidden.has(key) ? 'password' : 'text'}
                                        value={val}
                                        onChange={e => updateVal(key, e.target.value)}
                                        className="flex-1 w-full bg-transparent py-2.5 text-xs text-emerald-300 font-mono outline-none placeholder-slate-700"
                                        placeholder="value..."
                                    />
                                    <button onClick={() => toggleHide(key)} className="text-slate-600 hover:text-slate-400 ml-2">
                                        {hidden.has(key) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    <button onClick={() => removeVar(key)} className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-400/10">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Buttons */}
            <button
                onClick={addVar}
                className="flex items-center space-x-2 text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors px-2 py-1.5 hover:bg-purple-500/5 rounded-xl w-fit"
            >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Context Variable</span>
            </button>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
                <p className="text-[10px] text-slate-500">Variables resolve at runtime for the selected environment.</p>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-500/20"
                >
                    {saving ? 'Saving...' : 'Save Variables'}
                </button>
            </div>
        </div>
    );
}


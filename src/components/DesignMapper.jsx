import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Save, ArrowRight, CheckCircle } from 'lucide-react';
import { api } from '../api';
import toast from 'react-hot-toast';

// Transformation types supported between NB field and SB field
const TRANSFORM_TYPES = ['Direct', 'Rename', 'Constant', 'Expression', 'Ignore'];

const DEFAULT_MAPPING = () => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    nbField: '',
    sbField: '',
    transform: 'Direct',
    expression: '',
    note: ''
});

/**
 * DesignMapper - Visual NB→SB field-level mapping editor.
 *
 * Props:
 *   localApi     - the current API object (must include .id and .designMetadata)
 *   setLocalApi  - setter for localApi state (for real-time preview in parent)
 *   onSaved      - optional callback after successful DB persist
 */
export default function DesignMapper({ localApi, setLocalApi, onSaved }) {
    const initial = localApi.designMetadata || { nbPath: '', sbPath: '', mappings: [] };
    const [nbPath, setNbPath] = useState(initial.nbPath || '');
    const [sbPath, setSbPath] = useState(initial.sbPath || '');
    const [mappings, setMappings] = useState(
        (initial.mappings || []).map(m => ({ ...m, id: m.id || Date.now() + Math.random() }))
    );
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const buildMetadata = useCallback(() => ({
        nbPath,
        sbPath,
        mappings: mappings.map(({ id: _id, ...rest }) => rest)
    }), [nbPath, sbPath, mappings]);

    const addMapping = () => setMappings(prev => [...prev, DEFAULT_MAPPING()]);

    const updateMapping = (idx, field, value) =>
        setMappings(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));

    const removeMapping = (idx) =>
        setMappings(prev => prev.filter((_, i) => i !== idx));

    const handleSave = async () => {
        const metadata = buildMetadata();
        setSaving(true);
        setSaved(false);
        try {
            if (localApi.id) {
                await api.saveDesignMetadata(localApi.id, metadata);
            }
            setLocalApi(prev => ({ ...prev, designMetadata: metadata }));
            setSaved(true);
            if (onSaved) onSaved(metadata);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            toast.error('Failed to save design metadata: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Path Headers */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-indigo-500/20 rounded-xl p-4">
                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">
                        NB Resource Path (Consumer)
                    </label>
                    <input
                        value={nbPath}
                        onChange={e => setNbPath(e.target.value)}
                        placeholder="/v1/resource/{id}"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-indigo-300 outline-none focus:border-indigo-500"
                    />
                </div>
                <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4">
                    <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                        SB Backend URL (Provider)
                    </label>
                    <input
                        value={sbPath}
                        onChange={e => setSbPath(e.target.value)}
                        placeholder="https://legacy-system/api/resource"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-emerald-300 outline-none focus:border-emerald-500"
                    />
                </div>
            </div>

            {/* Visual mapping arrow */}
            {(nbPath || sbPath) && (
                <div className="flex items-center justify-center space-x-4 py-2 text-xs font-mono">
                    <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg max-w-[45%] truncate" title={nbPath}>{nbPath || '—'}</span>
                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg max-w-[45%] truncate" title={sbPath}>{sbPath || '—'}</span>
                </div>
            )}

            {/* Field Mappings Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Field Mappings</span>
                    <button
                        onClick={addMapping}
                        className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Field</span>
                    </button>
                </div>

                {mappings.length === 0 ? (
                    <div className="text-center py-10 text-slate-600 text-xs">
                        No field mappings defined. Click "Add Field" to start.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                                    <th className="px-3 py-2 text-left text-indigo-400">NB Field</th>
                                    <th className="px-3 py-2 text-center">→</th>
                                    <th className="px-3 py-2 text-left text-emerald-400">SB Field</th>
                                    <th className="px-3 py-2 text-left">Transform</th>
                                    <th className="px-3 py-2 text-left">Expression / Value</th>
                                    <th className="px-3 py-2 text-left">Note</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {mappings.map((m, idx) => (
                                    <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                        <td className="px-3 py-2">
                                            <input
                                                value={m.nbField}
                                                onChange={e => updateMapping(idx, 'nbField', e.target.value)}
                                                placeholder="request.body.userId"
                                                className="w-full bg-slate-950 border border-indigo-500/20 rounded px-2 py-1 font-mono text-indigo-300 outline-none focus:border-indigo-500"
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-center text-slate-600">
                                            <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                value={m.sbField}
                                                onChange={e => updateMapping(idx, 'sbField', e.target.value)}
                                                placeholder="body.id"
                                                className="w-full bg-slate-950 border border-emerald-500/20 rounded px-2 py-1 font-mono text-emerald-300 outline-none focus:border-emerald-500"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                value={m.transform}
                                                onChange={e => updateMapping(idx, 'transform', e.target.value)}
                                                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none text-[10px] font-bold"
                                            >
                                                {TRANSFORM_TYPES.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            {(m.transform === 'Expression' || m.transform === 'Constant' || m.transform === 'Rename') && (
                                                <input
                                                    value={m.expression}
                                                    onChange={e => updateMapping(idx, 'expression', e.target.value)}
                                                    placeholder={m.transform === 'Constant' ? '"staticValue"' : m.transform === 'Rename' ? 'newFieldName' : 'expr'}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-amber-300 outline-none focus:border-amber-500"
                                                />
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                value={m.note}
                                                onChange={e => updateMapping(idx, 'note', e.target.value)}
                                                placeholder="optional note"
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-400 outline-none focus:border-slate-600"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <button onClick={() => removeMapping(idx)} className="text-slate-600 hover:text-red-400 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Save button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 active:scale-95 ${saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}
                >
                    {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    <span>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save Mapping'}</span>
                </button>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { Sparkles, X, Copy, Check, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * Generates a plausible mock value for a given JSON Schema type/format.
 */
function mockFromSchema(schema, depth = 0) {
    if (!schema || depth > 5) return null;

    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum?.length) return schema.enum[0];

    const type = schema.type || 'string';

    if (type === 'object' || schema.properties) {
        const obj = {};
        const props = schema.properties || {};
        for (const [key, val] of Object.entries(props)) {
            obj[key] = mockFromSchema(val, depth + 1);
        }
        return obj;
    }

    if (type === 'array' || schema.items) {
        const item = mockFromSchema(schema.items || { type: 'string' }, depth + 1);
        return [item, mockFromSchema(schema.items || { type: 'string' }, depth + 1)];
    }

    const fmt = schema.format || '';

    if (type === 'integer' || type === 'number') {
        const min = schema.minimum ?? 1;
        const max = schema.maximum ?? 1000;
        const val = Math.floor(Math.random() * (max - min + 1)) + min;
        return type === 'integer' ? val : parseFloat(val.toFixed(2));
    }

    if (type === 'boolean') return Math.random() > 0.5;

    // string types
    if (fmt === 'date-time' || fmt === 'datetime') return new Date().toISOString();
    if (fmt === 'date') return new Date().toISOString().slice(0, 10);
    if (fmt === 'time') return new Date().toISOString().slice(11, 19);
    if (fmt === 'email') return 'user@example.com';
    if (fmt === 'uri' || fmt === 'url') return 'https://api.example.com/resource/1';
    if (fmt === 'uuid') return generateUUID();
    if (fmt === 'password') return '••••••••';

    // Use property name hints
    return 'sample_value';
}

/**
 * Generates a mock response JSON from a JSON Schema object or sample response body.
 */
function generateMock(schema) {
    if (!schema) return null;
    try {
        if (typeof schema === 'string') {
            schema = JSON.parse(schema);
        }
        // If it looks like a JSON Schema
        if (schema.type || schema.properties || schema.$ref || schema.allOf) {
            return mockFromSchema(schema);
        }
        // If it looks like a sample body, use it as the template
        return deepRandomize(schema);
    } catch {
        return null;
    }
}

/** For a concrete example object, randomize leaf values while keeping structure */
function deepRandomize(obj, depth = 0) {
    if (depth > 5) return obj;
    if (Array.isArray(obj)) return obj.map(item => deepRandomize(item, depth + 1));
    if (obj !== null && typeof obj === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k] = deepRandomize(v, depth + 1);
        }
        return out;
    }
    if (typeof obj === 'number') return Math.floor(Math.random() * 1000) + 1;
    if (typeof obj === 'boolean') return Math.random() > 0.5;
    if (typeof obj === 'string') {
        if (obj.includes('@')) return 'user@example.com';
        if (/^\d{4}-\d{2}-\d{2}/.test(obj)) return new Date().toISOString().slice(0, 10);
        if (/^https?:\/\//.test(obj)) return 'https://api.example.com/resource/1';
        if (/^[0-9a-f-]{36}$/i.test(obj)) return generateUUID();
        return obj; // keep string values as-is (they're descriptive)
    }
    return obj;
}

/**
 * MockResponseGenerator
 * Auto-generates mock responses from a JSON Schema or sample response body.
 */
export function MockResponseGenerator({ responseSchema, onAccept, onClose }) {
    const defaultSchema = `{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "status": { "type": "string", "enum": ["active", "inactive"] },
    "createdAt": { "type": "string", "format": "date-time" }
  }
}`;
    const [schema, setSchema] = useState(() => {
        if (!responseSchema) return defaultSchema;
        if (typeof responseSchema === 'string') return responseSchema;
        return JSON.stringify(responseSchema, null, 2);
    });
    const [mock, setMock] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [count, setCount] = useState(1);

    const generate = () => {
        setError('');
        try {
            let parsed;
            try { parsed = JSON.parse(schema); } catch { throw new Error('Invalid JSON schema'); }
            
            const generated = count === 1
                ? generateMock(parsed)
                : Array.from({ length: count }, () => generateMock(parsed));
            
            setMock(generated);
        } catch (e) {
            setError(e.message);
        }
    };

    const handleCopy = () => {
        if (!mock) return;
        navigator.clipboard.writeText(JSON.stringify(mock, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Mock response copied!');
    };

    const handleAccept = () => {
        if (!mock) return;
        onAccept?.(mock);
        onClose?.();
        toast.success('Mock response applied to response body!');
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-[750px] max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Mock Response Generator</h3>
                            <p className="text-[10px] text-slate-500">Auto-generate realistic mock data from JSON Schema or sample response</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-h-0">
                    {/* Schema input */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">JSON Schema / Sample Response</label>
                            <div className="flex items-center gap-2">
                                <label className="text-[9px] text-slate-600 font-bold">Count:</label>
                                <select
                                    value={count}
                                    onChange={e => setCount(Number(e.target.value))}
                                    className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-white outline-none"
                                >
                                    {[1, 3, 5, 10].map(n => <option key={n} value={n}>{n} record{n > 1 ? 's' : ''}</option>)}
                                </select>
                            </div>
                        </div>
                        <textarea
                            value={schema}
                            onChange={e => setSchema(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-emerald-400 h-48 resize-none outline-none focus:border-violet-500 transition-colors leading-relaxed"
                            spellCheck="false"
                            placeholder='Paste JSON Schema or a sample response body here...'
                        />
                        {error && <p className="text-red-400 text-[10px]">{error}</p>}
                        <button
                            onClick={generate}
                            className="self-start bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-violet-900/20"
                        >
                            <Sparkles className="w-3.5 h-3.5" /> Generate Mock
                        </button>
                    </div>

                    {/* Generated mock output */}
                    {mock !== null && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Generated Mock Response</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={generate} className="text-slate-600 hover:text-slate-300 transition-colors flex items-center gap-1 text-[9px]">
                                        <RefreshCcw className="w-2.5 h-2.5" /> Regenerate
                                    </button>
                                    <button onClick={handleCopy} className="text-slate-600 hover:text-slate-300 transition-colors">
                                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-blue-300 h-48 overflow-auto leading-relaxed">
                                {JSON.stringify(mock, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
                    <p className="text-[9px] text-slate-600">Mock data is generated from your schema structure · Not suitable for production</p>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300 px-4 py-2 transition-colors">Cancel</button>
                        {mock !== null && onAccept && (
                            <button
                                onClick={handleAccept}
                                className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-violet-900/20"
                            >
                                <Check className="w-3.5 h-3.5" /> Apply as Response Body
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

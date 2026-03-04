import React, { useState } from 'react';
import { api } from '../api';
import { Waypoints, Lock } from 'lucide-react';

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const user = await api.login(username, password);
            onLogin(user);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-red-500/30 relative overflow-hidden">
            {/* Ambient Red & Blue Glow */}
            <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] animate-pulse" />

            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 shadow-2xl relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-700/10 border border-red-500/20 mb-6 relative overflow-visible shadow-xl">
                        <div className="absolute inset-0 bg-red-600/10 blur-xl rounded-full scale-150 animate-pulse pointer-events-none" />
                        <Waypoints className="w-10 h-10 text-red-500 relative z-10" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">KNOT<span className="text-red-500 font-bold">API</span></h1>
                    <p className="text-slate-400 mt-2 text-sm">Sign in to access <span className="text-red-700 font-black">KNOT</span><span className="text-red-500 font-bold"><span className="logo-ai-highlight inline-block">A</span>P<span className="logo-ai-highlight inline-block">I</span></span> Design Studio</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl text-center font-bold">{error}</div>}

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identity</label>
                        <input
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 outline-none transition-all placeholder:text-slate-700"
                            placeholder="username or email"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Key</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 outline-none transition-all placeholder:text-slate-700"
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" className="w-full bg-red-700 hover:bg-red-600 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-red-950/40 active:scale-95 group flex items-center justify-center gap-2">
                        <span>Sign into Studio</span>
                        <Waypoints className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                    </button>

                    <div className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest pt-4">
                        System Admin Handshake Required
                    </div>
                </form>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { api } from '../api';
import { Shield, Lock } from 'lucide-react';

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
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 mb-4">
                        <Shield className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
                    <p className="text-slate-400">Sign in to access RaptrDXP Portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center">{error}</div>}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Username</label>
                        <input
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors"
                            placeholder="username"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
                        Sign In
                    </button>

                    <div className="text-center text-xs text-slate-500">
                        Initial admin setup: admin / password123
                    </div>
                </form>
            </div>
        </div>
    );
}

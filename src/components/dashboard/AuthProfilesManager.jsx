import React, { useState, useEffect } from 'react';
import {
    Plus, Shield, Play, Edit2, Trash2, Key, X, Layers, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';
import ConfirmModal from './ConfirmModal.jsx';

export function AuthProfilesManager({ project, onRefresh }) {
    const [profiles, setProfiles] = useState(project.authProfiles || []);
    const [isSaving, setIsSaving] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // id or profile object
    const initialProfileState = {
        name: '',
        type: 'Bearer',
        details: {},
        linkedModuleId: '',
        authApiId: '',
        tokenPath: 'access_token'
    };
    const [formData, setFormData] = useState(initialProfileState);
    const [moduleApis, setModuleApis] = useState([]);
    const [loadingApis, setLoadingApis] = useState(false);

    useEffect(() => {
        setProfiles(project.authProfiles || []);
    }, [project.authProfiles]);

    const handleOpenAdd = () => {
        setEditingProfile(null);
        setFormData(initialProfileState);
        setModuleApis([]);
        setIsSaving(true);
    };

    const handleOpenEdit = async (profile) => {
        setEditingProfile(profile);
        setFormData({
            ...profile,
            details: profile.details || {},
            linkedModuleId: profile.linkedModuleId || '',
            authApiId: profile.authApiId || '',
            tokenPath: profile.tokenPath || 'access_token'
        });
        setIsSaving(true);

        if (profile.linkedModuleId) {
            setLoadingApis(true);
            try {
                const apis = await api.getModuleApis(profile.linkedModuleId);
                setModuleApis(apis);
            } finally {
                setLoadingApis(false);
            }
        } else {
            setModuleApis([]);
        }
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error("Name is required");
            return;
        }
        try {
            if (editingProfile) {
                await api.updateAuthProfile(editingProfile.id, formData);
                toast.success("Profile updated");
            } else {
                await api.createAuthProfile(project.id, formData);
                toast.success("Profile created");
            }
            setIsSaving(false);
            onRefresh();
        } catch (e) {
            toast.error("Failed to save profile");
        }
    };

    const handleDelete = async (id) => {
        setConfirmDelete(id);
    };

    const confirmDeleteAction = async () => {
        if (!confirmDelete) return;
        try {
            await api.deleteAuthProfile(confirmDelete);
            onRefresh();
            toast.success("Profile deleted");
        } catch (e) {
            toast.error("Failed to delete profile");
        } finally {
            setConfirmDelete(null);
        }
    };

    const handleTestProfile = async (profileData = formData) => {
        if (!profileData.linkedModuleId || !profileData.authApiId) {
            toast.success("Static profile format is valid.");
            return;
        }

        const toastId = toast.loading("Testing dynamic authentication...");
        try {
            const authApis = await api.getModuleApis(profileData.linkedModuleId);
            const authApi = authApis.find(a => a.id === profileData.authApiId);

            if (!authApi) {
                toast.error("Linked Auth API not found.", { id: toastId });
                return;
            }

            const authApiHeaders = typeof authApi.headers === 'string' ? JSON.parse(authApi.headers) : (authApi.headers || {});
            const authApiAuth = typeof authApi.authentication === 'string' ? JSON.parse(authApi.authentication) : (authApi.authentication || { type: 'None' });

            if (authApiAuth.type === 'Bearer' && authApiAuth.token) {
                authApiHeaders['Authorization'] = `Bearer ${authApiAuth.token}`;
            } else if (authApiAuth.type === 'Basic' && authApiAuth.username && authApiAuth.password) {
                authApiHeaders['Authorization'] = `Basic ${btoa(`${authApiAuth.username}:${authApiAuth.password}`)}`;
            } else if (authApiAuth.type === 'API Key' && authApiAuth.key && authApiAuth.value) {
                authApiHeaders[authApiAuth.key] = authApiAuth.value;
            }

            const authRes = await api.testEndpoint({
                url: authApi.url,
                method: authApi.http_method || 'POST',
                headers: authApiHeaders,
                body: typeof authApi.request_body === 'string' ? JSON.parse(authApi.request_body) : (authApi.request_body || {})
            }, project.id);

            if (authRes && authRes.status < 400 && !authRes.error) {
                const responseData = authRes.data || authRes.response_body;
                const path = profileData.tokenPath || 'access_token';
                const token = path.split('.').reduce((o, i) => o?.[i], responseData);

                if (token) {
                    toast.success(`Success! Generated token: ${token.substring(0, 15)}...`, { id: toastId });
                } else {
                    toast.error(`Path "${path}" not found.`, { id: toastId, duration: 5000 });
                }
            } else {
                const errMsg = authRes?.data?.message || authRes?.error || authRes?.statusText || "Handshake Failed";
                toast.error(`Auth API failed (${authRes?.status || 500}): ${errMsg}`, { id: toastId });
            }
        } catch (err) {
            toast.error(`Test Error: ${err.message}`, { id: toastId });
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
            <div className="p-8 pb-4 shrink-0 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Authentication Profiles</h1>
                    <p className="text-slate-400 text-sm">Manage reusable security configurations for API testing.</p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Plus className="w-5 h-5" /> <span>Create Profile</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {profiles.map(profile => (
                        <div key={profile.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-emerald-500/10 rounded-xl">
                                    <Shield className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => handleTestProfile(profile)}
                                        title="Test Connection"
                                        className="text-slate-600 hover:text-emerald-400 transition-colors p-2"
                                    >
                                        <Play className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleOpenEdit(profile)}
                                        title="Edit Profile"
                                        className="text-slate-600 hover:text-blue-400 transition-colors p-2"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(profile.id)}
                                        title="Delete Profile"
                                        className="text-slate-600 hover:text-red-400 transition-colors p-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">{profile.name}</h3>
                            <span className="text-[10px] font-black bg-slate-800 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-tighter mb-4 inline-block">{profile.type}</span>

                            <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                                {profile.type === 'Bearer' && (
                                    <div className="text-[10px] font-mono text-slate-500 truncate">Token: {profile.details?.token?.substring(0, 15)}...</div>
                                )}
                                {profile.type === 'Basic' && (
                                    <div className="text-[10px] font-mono text-slate-500">User: {profile.details?.username}</div>
                                )}
                                {profile.type === 'API Key' && (
                                    <div className="text-[10px] font-mono text-slate-500">Key: {profile.details?.key}</div>
                                )}
                                {profile.linkedModuleId && (
                                    <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">
                                            Linked to Module: {project.modules?.find(m => m.id === profile.linkedModuleId)?.name || 'Unknown'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {profiles.length === 0 && !isSaving && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
                            <Key className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-medium">No saved authentication profiles</p>
                            <p className="text-xs mt-1">Create one to quickly apply it during tests</p>
                        </div>
                    )}
                </div>
            </div>

            {isSaving && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all" onClick={() => setIsSaving(false)}>
                    <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full shadow-2xl animate-slide-in-right flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{editingProfile ? 'Edit Auth Profile' : 'New Auth Profile'}</h3>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em]"><span className="text-red-700 font-extrabold">KNOT</span><span className="text-red-500 font-bold"><span className="logo-ai-highlight inline-block">A</span>P<span className="logo-ai-highlight inline-block">I</span></span> Security Engine</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSaving(false)} className="text-slate-500 hover:text-white p-2 hover:bg-slate-800 rounded-xl transition-all"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-900/30">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Profile Identity</label>
                                    <input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Production Billing Gateway"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-emerald-500 outline-none transition-all shadow-inner"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Authentication Mechanism</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['Bearer', 'Basic', 'API Key'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setFormData({ ...formData, type: t, details: {} })}
                                                className={`py-3 text-[10px] font-black border rounded-xl transition-all uppercase tracking-wider ${formData.type === t ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-slate-800 text-slate-500 hover:border-slate-700 bg-slate-950/50'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="animate-fade-in bg-slate-950/50 border border-slate-800/50 rounded-2xl p-6 shadow-inner">
                                    {formData.type === 'Bearer' && (
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Access Token</label>
                                            <input
                                                value={formData.details.token || ""}
                                                onChange={e => setFormData({ ...formData, details: { ...formData.details, token: e.target.value } })}
                                                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-emerald-400 outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                    )}
                                    {formData.type === 'Basic' && (
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Username</label>
                                                <input value={formData.details.username || ""} onChange={e => setFormData({ ...formData, details: { ...formData.details, username: e.target.value } })} placeholder="admin" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none text-white font-bold" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Password</label>
                                                <input value={formData.details.password || ""} onChange={e => setFormData({ ...formData, details: { ...formData.details, password: e.target.value } })} type="password" placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none text-white font-bold" />
                                            </div>
                                        </div>
                                    )}
                                    {formData.type === 'API Key' && (
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Header / Key Name</label>
                                                <input value={formData.details.key || ""} onChange={e => setFormData({ ...formData, details: { ...formData.details, key: e.target.value } })} placeholder="X-API-KEY" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none text-white font-bold" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Secret Value</label>
                                                <input value={formData.details.value || ""} onChange={e => setFormData({ ...formData, details: { ...formData.details, value: e.target.value } })} placeholder="api_key_..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none text-white font-bold" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-800 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-blue-400" />
                                        Dynamic Token Resolution
                                    </h4>
                                    <div className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold border border-blue-500/20 uppercase">Advanced</div>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Source Module</label>
                                        <select
                                            value={formData.linkedModuleId}
                                            onChange={async (e) => {
                                                const mid = e.target.value;
                                                setFormData({ ...formData, linkedModuleId: mid, authApiId: '' });
                                                if (mid) {
                                                    setLoadingApis(true);
                                                    try {
                                                        const apis = await api.getModuleApis(mid);
                                                        setModuleApis(apis);
                                                    } finally {
                                                        setLoadingApis(false);
                                                    }
                                                } else {
                                                    setModuleApis([]);
                                                }
                                            }}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-blue-300 font-bold outline-none focus:border-blue-500 appearance-none shadow-inner"
                                        >
                                            <option value="">No Module Link (Static Only)</option>
                                            {project.modules?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authentication API</label>
                                        <select
                                            value={formData.authApiId}
                                            onChange={e => setFormData({ ...formData, authApiId: e.target.value })}
                                            disabled={!formData.linkedModuleId || loadingApis}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-blue-500 disabled:opacity-30 appearance-none shadow-inner"
                                        >
                                            <option value="">-- Select Token Exchange Endpoint --</option>
                                            {moduleApis.filter(a => a.is_auth_api).map(a => <option key={a.id} value={a.id}>{a.api_name}</option>)}
                                        </select>
                                    </div>
                                    {moduleApis.filter(a => a.is_auth_api).length === 0 && formData.linkedModuleId && !loadingApis && (
                                        <p className="text-[9px] text-amber-500 font-bold mt-2 flex items-center gap-1">
                                            <Shield className="w-3 h-3" /> No APIs tagged as "Auth API" found in this module.
                                        </p>
                                    )}
                                    {formData.authApiId && (
                                        <div className="space-y-2 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 animate-fade-in">
                                            <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Token Projection (JSON Path)</label>
                                            <input
                                                value={formData.tokenPath}
                                                onChange={e => setFormData({ ...formData, tokenPath: e.target.value })}
                                                placeholder="access_token"
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-blue-400 outline-none focus:border-blue-500"
                                            />
                                            <p className="text-[9px] text-slate-500 mt-2 font-medium italic">Example: data.auth.token or access_token</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-between items-center shadow-2xl">
                            <button
                                onClick={() => handleTestProfile()}
                                disabled={!formData.authApiId}
                                className="px-5 py-2.5 text-[10px] font-black uppercase text-blue-400 border border-blue-400/30 rounded-xl hover:bg-blue-400/10 transition-all disabled:opacity-30 flex items-center gap-2"
                            >
                                <Play className="w-4 h-4" /> Test Handshake
                            </button>
                            <div className="flex space-x-3">
                                <button onClick={() => setIsSaving(false)} className="px-6 py-2.5 text-slate-400 hover:text-white font-bold text-xs transition-all">Cancel</button>
                                <button onClick={handleSave} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all text-xs">
                                    {editingProfile ? 'Update Profile' : 'Create Profile'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={!!confirmDelete}
                title="Delete Auth Profile"
                message="Are you sure you want to delete this authentication profile? APIs using this profile for testing may fail to authenticate."
                onConfirm={confirmDeleteAction}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { Shield, User, Key, UserCheck, UserX, Edit2, Check, X, RefreshCw } from 'lucide-react';

function UserManagement({ user, onBack }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // New User Form State
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('viewer');
    const [newCanManage, setNewCanManage] = useState(false);

    // Change Password State
    const [selectedUser, setSelectedUser] = useState('');
    const [changePassword, setChangePassword] = useState('');

    // Editing State
    const [editingUserId, setEditingUserId] = useState(null);
    const [editRole, setEditRole] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editCanManage, setEditCanManage] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (e) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!newUsername || !newPassword) return;

        try {
            await api.createUser({
                username: newUsername,
                password: newPassword,
                role: newRole,
                canManageUsers: newCanManage
            });
            toast.success('User created successfully');
            setNewUsername('');
            setNewPassword('');
            setNewCanManage(false);
            loadUsers();
        } catch (e) {
            toast.error(e.message || 'Failed to create user');
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!selectedUser || !changePassword) return;

        try {
            await api.updatePassword(selectedUser, changePassword);
            toast.success('Password updated successfully');
            setChangePassword('');
            setSelectedUser('');
        } catch (e) {
            toast.error(e.message || 'Failed to update password');
        }
    };

    const handleUpdateUser = async (u) => {
        try {
            const role = editingUserId === u.id ? editRole : u.role;
            const status = editingUserId === u.id ? editStatus : u.status;

            await api.updateUser(u.id, { role, status });
            toast.success('User updated successfully');
            setEditingUserId(null);
            loadUsers();
        } catch (e) {
            toast.error(e.message || 'Failed to update user');
        }
    };

    const toggleStatus = async (u) => {
        try {
            const newStatus = u.status === 'Active' ? 'Inactive' : 'Active';
            await api.updateUser(u.id, { role: u.role, status: newStatus });
            toast.success(`User marked as ${newStatus}`);
            loadUsers();
        } catch (e) {
            toast.error('Failed to toggle status');
        }
    };

    const startEditing = (u) => {
        setEditingUserId(u.id);
        setEditRole(u.role);
        setEditStatus(u.status);
        setEditCanManage(u.canManageUsers);
    };

    if (!user.canManageUsers) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
                <div className="bg-slate-900/50 border border-red-500/30 p-8 rounded-2xl text-center max-w-md">
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h2>
                    <p className="text-slate-400 mb-6">You do not have permission to manage users.</p>
                    <button
                        onClick={onBack}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                            User Management
                        </h1>
                        <p className="text-slate-400">Manage credentials and access levels</p>
                    </div>
                    <button
                        onClick={onBack}
                        className="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded-xl transition-all text-sm"
                    >
                        ← Back to Dashboard
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* User List */}
                    <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-semibold">System Users</h2>
                            <button onClick={loadUsers} className="text-indigo-400 hover:text-indigo-300 text-sm">Refresh</button>
                        </div>
                        {loading ? (
                            <div className="p-12 text-center text-slate-500">Loading users...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-slate-400 text-xs uppercase tracking-wider">
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Admin Access</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${u.status === 'Active' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{u.username}</div>
                                                            <div className="text-[10px] text-slate-500">{new Date(u.created_at).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {editingUserId === u.id ? (
                                                        <select
                                                            value={editRole}
                                                            onChange={e => setEditRole(e.target.value)}
                                                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none"
                                                        >
                                                            <option value="admin">ADMIN</option>
                                                            <option value="viewer">VIEWER</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                            }`}>
                                                            {u.role.toUpperCase()}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {editingUserId === u.id ? (
                                                        <select
                                                            value={editStatus}
                                                            onChange={e => setEditStatus(e.target.value)}
                                                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none"
                                                        >
                                                            <option value="Active">ACTIVE</option>
                                                            <option value="Inactive">INACTIVE</option>
                                                        </select>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`} />
                                                            <span className={`text-xs font-bold ${u.status === 'Active' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                                {u.status}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {editingUserId === u.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={editCanManage}
                                                                onChange={e => setEditCanManage(e.target.checked)}
                                                                className="accent-indigo-500"
                                                            />
                                                            <span className="text-xs text-slate-400">Can Manage</span>
                                                        </div>
                                                    ) : (
                                                        u.canManageUsers ? (
                                                            <Shield className="w-4 h-4 text-indigo-400" title="Can manage users" />
                                                        ) : (
                                                            <span className="text-slate-700">-</span>
                                                        )
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {editingUserId === u.id ? (
                                                            <>
                                                                <button onClick={() => handleUpdateUser(u)} className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors" title="Save">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => setEditingUserId(null)} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors" title="Cancel">
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => startEditing(u)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="Edit Role/Status">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => toggleStatus(u)}
                                                                    className={`p-1.5 rounded-lg transition-all ${u.status === 'Active' ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                                                                    title={u.status === 'Active' ? 'Deactivate' : 'Activate'}
                                                                >
                                                                    {u.status === 'Active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        {/* Create User Form */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                            <h2 className="text-xl font-semibold mb-6">Create New User</h2>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">USERNAME</label>
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={e => setNewUsername(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter username"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">PASSWORD</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">ROLE</label>
                                    <select
                                        value={newRole}
                                        onChange={e => setNewRole(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="viewer">Viewer (Read Only)</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl items-center cursor-pointer" onClick={() => setNewCanManage(!newCanManage)}>
                                    <input
                                        type="checkbox"
                                        checked={newCanManage}
                                        onChange={e => setNewCanManage(e.target.checked)}
                                        className="w-4 h-4 accent-indigo-500 cursor-pointer"
                                    />
                                    <div>
                                        <div className="text-xs font-bold text-indigo-300 uppercase tracking-tight">Allow User Management</div>
                                        <p className="text-[10px] text-slate-500">Enable access to this management dashboard (Shield icon)</p>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    Create User
                                </button>
                            </form>
                        </div>

                        {/* Change Password Form */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                            <h2 className="text-xl font-semibold mb-6 text-emerald-400">Change Password</h2>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">SELECT USER</label>
                                    <select
                                        value={selectedUser}
                                        onChange={e => setSelectedUser(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        required
                                    >
                                        <option value="">-- Choose User --</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.username}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">NEW PASSWORD</label>
                                    <input
                                        type="password"
                                        value={changePassword}
                                        onChange={e => setChangePassword(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter new password"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    Update Password
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserManagement;

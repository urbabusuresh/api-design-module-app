import React from 'react';
import { TriangleAlert, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Delete", cancelText = "Cancel", type = "danger" }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in shadow-2xl">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
                <div className={`h-1.5 w-full ${type === 'danger' ? 'bg-red-500' : 'bg-blue-600'}`} />

                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${type === 'danger' ? 'bg-red-500/10' : 'bg-blue-600/10'}`}>
                            <TriangleAlert className={`w-6 h-6 ${type === 'danger' ? 'text-red-500' : 'text-blue-500'}`} />
                        </div>
                        <button onClick={onCancel} className="p-2 hover:bg-slate-900 rounded-xl text-slate-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">{message}</p>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 bg-slate-900 text-slate-300 rounded-2xl font-bold hover:bg-slate-800 hover:text-white transition-all border border-slate-800"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-3 rounded-2xl font-bold text-white transition-all shadow-lg ${type === 'danger'
                                ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20'
                                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

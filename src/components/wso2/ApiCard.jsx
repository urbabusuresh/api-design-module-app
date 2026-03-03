import React from 'react';
import { Box, ArrowRight } from 'lucide-react';

const ApiCard = ({ api, onClick }) => {
    const operationCount = api.operations?.length || 0;

    return (
        <div
            onClick={() => onClick(api)}
            className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-red-500/50 hover:shadow-2xl hover:shadow-red-500/10 transition-all cursor-pointer flex flex-col h-full"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
                    <Box className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${api.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-400' :
                        api.status === 'CREATED' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-slate-800 text-slate-400'
                        }`}>
                        {api.status}
                    </span>
                    {operationCount > 0 && (
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                            {operationCount} endpoints
                        </span>
                    )}
                </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-red-400 transition-colors truncate" title={api.name}>
                {api.name}
            </h3>

            <div className="flex items-center space-x-2 mb-3">
                <span className="text-xs font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                    {api.version}
                </span>
                <span className="text-xs text-slate-500 truncate">{api.url}</span>
            </div>

            <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1">
                {api.description || "No description provided."}
            </p>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-medium text-slate-500">
                <span>{api.provider || 'WSO2'}</span>
                <div className="flex items-center space-x-1 group-hover:text-red-400 transition-colors">
                    <span>View Details</span>
                    <ArrowRight className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
};

export default ApiCard;

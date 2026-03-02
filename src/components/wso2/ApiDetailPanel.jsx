import React, { useState, useEffect } from 'react';
import { X, Box, Play, FileJson, Globe, Code } from 'lucide-react';
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { api } from '../../api';
import LifecycleManager from './LifecycleManager.jsx';
import SubscriptionsPanel from './SubscriptionsPanel.jsx';
import AnalyticsPanel from './AnalyticsPanel.jsx';
import DocumentationViewer from './DocumentationViewer.jsx';
import PoliciesPanel from './PoliciesPanel.jsx';
import AdvancedTestPanel from './AdvancedTestPanel.jsx';

const ApiDetailPanel = ({ apiItem, project, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [swaggerSpec, setSwaggerSpec] = useState(null);
    const [loadingSwagger, setLoadingSwagger] = useState(false);

    const loadSwagger = async () => {
        if (swaggerSpec) return;
        setLoadingSwagger(true);
        try {
            let targetId = apiItem.wso2_id;
            if (!targetId && apiItem.id) {
                targetId = apiItem.id.split('_op_')[0];
            }
            if (!targetId) throw new Error("Missing WSO2 ID");

            const spec = await api.getWso2ApiSwagger(project.id, targetId);
            setSwaggerSpec(spec);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSwagger(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'swagger') {
            loadSwagger();
        }
    }, [activeTab]);

    const getBackendUrl = () => {
        if (!apiItem.endpoint_config) return null;
        return apiItem.endpoint_config.production_endpoints?.url ||
            apiItem.endpoint_config.sandbox_endpoints?.url;
    };

    return (
        <div className="absolute inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-3xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full animate-slide-in-right">

                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <Box className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white">{apiItem.name}</h2>
                            <span className="text-xs text-slate-400 font-mono">{apiItem.version}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center space-x-1 px-6 pt-4 border-b border-slate-800 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('swagger')}
                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'swagger' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        API Console
                    </button>
                    <button
                        onClick={() => setActiveTab('endpoints')}
                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'endpoints' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Endpoints
                    </button>
                    <button
                        onClick={() => setActiveTab('lifecycle')}
                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'lifecycle' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Lifecycle
                    </button>
                    <button
                        onClick={() => setActiveTab('subscriptions')}
                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'subscriptions' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Subscriptions
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('docs')}
                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'docs' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Docs
                    </button>
                    <button
                        onClick={() => setActiveTab('policies')}
                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'policies' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Policies
                    </button>
                    <button
                        onClick={() => setActiveTab('test')}
                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'test' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Test
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-950 p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                                <h3 className="text-sm font-bold text-slate-300 uppercase mb-3">Description</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    {apiItem.description || "No description provided."}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Context</div>
                                    <div className="text-sm font-mono text-indigo-400 truncate" title={apiItem.url}>
                                        {apiItem.url}
                                    </div>
                                </div>
                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Status</div>
                                    <div className="text-sm font-bold text-white">{apiItem.status}</div>
                                </div>
                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Provider</div>
                                    <div className="text-sm font-bold text-white">{apiItem.provider || 'N/A'}</div>
                                </div>
                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Type</div>
                                    <div className="text-sm font-bold text-white">{apiItem.api_type || 'HTTP'}</div>
                                </div>
                            </div>

                            {getBackendUrl() && (
                                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
                                        <Globe className="w-4 h-4" />
                                        Backend Endpoint
                                    </h3>
                                    <div className="font-mono text-sm text-emerald-400 bg-slate-950 px-3 py-2 rounded border border-slate-800">
                                        {getBackendUrl()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'swagger' && (
                        <div className="h-full flex flex-col">
                            {loadingSwagger ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                                    <p>Loading API Definition...</p>
                                </div>
                            ) : swaggerSpec ? (
                                <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                                    <SwaggerUI spec={swaggerSpec} />
                                </div>
                            ) : (
                                <div className="text-center text-red-400 py-10">
                                    Failed to load API definition
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'endpoints' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white">Available Operations</h3>
                                <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">
                                    {apiItem.operations?.length || 0} endpoints
                                </span>
                            </div>

                            {apiItem.operations?.map((op, idx) => (
                                <div key={idx} className="flex items-center p-3 bg-slate-900 border border-slate-800 rounded-lg group hover:border-indigo-500/30 transition-colors">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black w-16 text-center mr-3 ${op.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' :
                                        op.method === 'POST' ? 'bg-blue-500/10 text-blue-400' :
                                            op.method === 'DELETE' ? 'bg-red-500/10 text-red-400' :
                                                'bg-amber-500/10 text-amber-400'
                                        }`}>
                                        {op.method}
                                    </span>
                                    <span className="font-mono text-xs text-slate-300 truncate flex-1" title={op.url}>
                                        {op.url}
                                    </span>
                                    <button className="p-1.5 text-slate-500 hover:text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            {(!apiItem.operations || apiItem.operations.length === 0) && (
                                <div className="text-center text-slate-500 py-10">
                                    No operations available
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'lifecycle' && (
                        <LifecycleManager apiItem={apiItem} project={project} />
                    )}

                    {activeTab === 'subscriptions' && (
                        <SubscriptionsPanel apiItem={apiItem} project={project} />
                    )}

                    {activeTab === 'analytics' && (
                        <AnalyticsPanel apiItem={apiItem} />
                    )}

                    {activeTab === 'docs' && (
                        <DocumentationViewer apiItem={apiItem} project={project} />
                    )}

                    {activeTab === 'policies' && (
                        <PoliciesPanel apiItem={apiItem} project={project} />
                    )}

                    {activeTab === 'test' && (
                        <AdvancedTestPanel apiItem={apiItem} project={project} />
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end space-x-3">
                    <button
                        onClick={() => setActiveTab('swagger')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-2"
                    >
                        <FileJson className="w-4 h-4" />
                        <span>Test API</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiDetailPanel;

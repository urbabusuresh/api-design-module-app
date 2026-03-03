import React, { useState } from 'react';
import {
    LayoutGrid, Search, ChevronLeft, Settings, Activity,
    Globe, Layers, List, Box, GitBranch
} from 'lucide-react';
import ApiCard from '../components/wso2/ApiCard.jsx';
import ApiDetailPanel from '../components/wso2/ApiDetailPanel.jsx';
import ServicesList from '../components/wso2/ServicesList.jsx';
import ApplicationsManager from '../components/wso2/ApplicationsManager.jsx';
import ApiProductsPanel from '../components/wso2/ApiProductsPanel.jsx';
import DeploymentSummary from '../components/wso2/DeploymentSummary.jsx';
import { api } from '../api';

const Wso2ProjectDashboard = ({ project, onBack, onRefresh }) => {
    const apis = project?.systems?.[0]?.services?.[0]?.subApis || [];

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedApi, setSelectedApi] = useState(null);
    const [viewMode, setViewMode] = useState('services'); // 'services' | 'all-apis'
    const [selectedService, setSelectedService] = useState(null);
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Group APIs by base API (wso2_id)
    const groupedApis = apis.reduce((acc, api) => {
        const baseId = api.wso2_id || api.id.split('_op_')[0];
        if (!acc[baseId]) {
            acc[baseId] = { ...api, operations: [] };
        }
        if (api.id.includes('_op_')) {
            acc[baseId].operations.push(api);
        }
        return acc;
    }, {});

    const apiGroups = Object.values(groupedApis);

    // Filter Logic
    const getFilteredApis = () => {
        let filtered = selectedService ? selectedService.apis : apis;

        if (viewMode === 'all-apis') {
            filtered = apiGroups;
        }

        const query = searchQuery.toLowerCase();
        return filtered.filter(api => {
            const matchesSearch = api.name.toLowerCase().includes(query) ||
                api.url.toLowerCase().includes(query) ||
                api.description?.toLowerCase().includes(query);
            const matchesStatus = statusFilter === 'ALL' || api.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    };

    const filteredApis = getFilteredApis();

    const handleServiceClick = (service) => {
        setSelectedService(service);
        setViewMode('service-detail');
    };

    const handleBackToServices = () => {
        setSelectedService(null);
        setViewMode('services');
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-600/20 border border-red-500/30 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/10">
                        <img src="/wso2-apim.png" alt="WSO2" className="w-5 h-5 object-contain" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight text-white leading-none">WSO2 Portal</h1>
                        <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">API Manager</span>
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-1">
                    <button onClick={onBack} className="w-full flex items-center space-x-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Projects</span>
                    </button>

                    <div className="pt-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3">Navigation</div>

                    <button
                        onClick={() => { setViewMode('services'); setSelectedService(null); }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'services' ? 'bg-red-600/10 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <Layers className="w-4 h-4" />
                        <span className="text-sm font-bold">Services</span>
                    </button>

                    <button
                        onClick={() => { setViewMode('all-apis'); setSelectedService(null); }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'all-apis' ? 'bg-red-600/10 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span className="text-sm font-bold">All APIs</span>
                    </button>

                    <button
                        onClick={() => { setViewMode('products'); setSelectedService(null); }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'products' ? 'bg-red-600/10 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <Box className="w-4 h-4" />
                        <span className="text-sm font-bold">API Products</span>
                    </button>

                    <button
                        onClick={() => { setViewMode('applications'); setSelectedService(null); }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'applications' ? 'bg-red-600/10 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <Layers className="w-4 h-4" />
                        <span className="text-sm font-bold">Applications</span>
                    </button>

                    <button
                        onClick={() => { setViewMode('deployments'); setSelectedService(null); }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'deployments' ? 'bg-red-600/10 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        <GitBranch className="w-4 h-4" />
                        <span className="text-sm font-bold">Deployments</span>
                    </button>
                </div>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center space-x-3 px-3 py-2 bg-slate-800 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-red-500/20">
                            {project.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate">{project.name}</div>
                            <div className="text-[10px] text-red-500 font-bold">Connected</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* Header */}
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between px-6 z-10">
                    <div className="flex items-center space-x-4">
                        {selectedService && (
                            <button
                                onClick={handleBackToServices}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search APIs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500 w-64 transition-all"
                            />
                        </div>
                        <div className="h-6 w-px bg-slate-700 mx-2" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="CREATED">Created</option>
                            <option value="PROTOTYPED">Prototype</option>
                        </select>
                        <div className="flex items-center space-x-1 text-slate-400 text-sm">
                            <span className="font-bold text-white">{filteredApis.length}</span>
                            {viewMode === 'services' && !selectedService ? 'services' : 'APIs'}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={onRefresh} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                            <Activity className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {/* Content Body */}
                <main className="flex-1 overflow-y-auto p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
                    <div className="max-w-7xl mx-auto">

                        {/* Services View */}
                        {viewMode === 'services' && !selectedService && (
                            <ServicesList apis={apis} onServiceClick={handleServiceClick} />
                        )}

                        {/* Service Detail View */}
                        {viewMode === 'service-detail' && selectedService && (
                            <div>
                                <div className="mb-6">
                                    <h2 className="text-3xl font-bold text-white mb-2">{selectedService.name}</h2>
                                    <p className="text-slate-400">{selectedService.description || "Service endpoints"}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredApis.map(api => (
                                        <ApiCard key={api.id} api={api} onClick={setSelectedApi} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All APIs View */}
                        {viewMode === 'all-apis' && (
                            <div>
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <h2 className="text-3xl font-bold text-white mb-2">API Catalog</h2>
                                        <p className="text-slate-400">Browse all available APIs</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredApis.map(api => (
                                        <ApiCard key={api.id} api={api} onClick={setSelectedApi} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* API Products View */}
                        {viewMode === 'products' && (
                            <ApiProductsPanel project={project} />
                        )}

                        {/* Applications View */}
                        {viewMode === 'applications' && (
                            <ApplicationsManager project={project} />
                        )}

                        {/* Deployments View */}
                        {viewMode === 'deployments' && (
                            <DeploymentSummary project={project} />
                        )}

                        {filteredApis.length === 0 && viewMode !== 'products' && viewMode !== 'applications' && viewMode !== 'deployments' && (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                <Search className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-lg font-medium">No results found</p>
                                <p className="text-sm">Try adjusting your filters</p>
                            </div>
                        )}
                    </div>
                </main>

                {/* API Details Panel */}
                {selectedApi && (
                    <ApiDetailPanel
                        apiItem={selectedApi}
                        project={project}
                        onClose={() => setSelectedApi(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default Wso2ProjectDashboard;

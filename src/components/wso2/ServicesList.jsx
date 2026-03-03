import React from 'react';
import { Layers, ArrowRight, Box } from 'lucide-react';

const ServicesList = ({ apis, onServiceClick }) => {
    // Group APIs by their base service (using wso2_id)
    const services = apis.reduce((acc, api) => {
        const serviceId = api.wso2_id || api.id.split('_op_')[0];
        if (!acc[serviceId]) {
            acc[serviceId] = {
                id: serviceId,
                name: api.name,
                description: api.description,
                version: api.version,
                status: api.status,
                provider: api.provider,
                apiCount: 0,
                apis: []
            };
        }
        acc[serviceId].apiCount++;
        acc[serviceId].apis.push(api);
        return acc;
    }, {});

    const serviceList = Object.values(services);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">API Services</h2>
                    <p className="text-slate-400 text-sm">Browse APIs organized by service</p>
                </div>
                <div className="text-sm text-slate-400">
                    <span className="font-bold text-white">{serviceList.length}</span> services
                </div>
            </div>

            <div className="grid gap-4">
                {serviceList.map(service => (
                    <div
                        key={service.id}
                        onClick={() => onServiceClick(service)}
                        className="group bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-500/10 transition-all cursor-pointer"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1 min-w-0">
                                <div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors shrink-0">
                                    <Layers className="w-6 h-6 text-red-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-red-400 transition-colors truncate">
                                        {service.name}
                                    </h3>
                                    <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                                        {service.description || "No description provided"}
                                    </p>
                                    <div className="flex items-center space-x-4 text-xs">
                                        <span className="text-slate-500">
                                            <span className="font-bold text-red-400">{service.apiCount}</span> endpoints
                                        </span>
                                        <span className="text-slate-500">Version: {service.version}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${service.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-400' :
                                            'bg-slate-800 text-slate-400'
                                            }`}>
                                            {service.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 text-slate-500 group-hover:text-red-400 transition-colors shrink-0 ml-4">
                                <span className="text-sm font-medium">View APIs</span>
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {serviceList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Box className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No services found</p>
                </div>
            )}
        </div>
    );
};

export default ServicesList;

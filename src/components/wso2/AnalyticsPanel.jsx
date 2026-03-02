import React from 'react';
import { TrendingUp, Users, Clock, AlertCircle, BarChart3 } from 'lucide-react';

const AnalyticsPanel = ({ apiItem }) => {
    // Mock analytics data - in production, this would come from WSO2 Analytics API
    const mockStats = {
        totalRequests: 12547,
        successRate: 98.5,
        avgResponseTime: 145,
        errorRate: 1.5,
        topConsumers: [
            { name: 'Mobile App', requests: 5420 },
            { name: 'Web Portal', requests: 4230 },
            { name: 'Partner API', requests: 2897 }
        ]
    };

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Total Requests</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                        {mockStats.totalRequests.toLocaleString()}
                    </div>
                    <div className="text-xs text-emerald-400">+12.5% from last week</div>
                </div>

                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Success Rate</span>
                        <BarChart3 className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                        {mockStats.successRate}%
                    </div>
                    <div className="text-xs text-slate-400">Last 7 days</div>
                </div>

                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Avg Response</span>
                        <Clock className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                        {mockStats.avgResponseTime}ms
                    </div>
                    <div className="text-xs text-blue-400">-8ms improvement</div>
                </div>

                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Error Rate</span>
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                        {mockStats.errorRate}%
                    </div>
                    <div className="text-xs text-slate-400">Within threshold</div>
                </div>
            </div>

            {/* Top Consumers */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Top Consumers
                </h3>
                <div className="space-y-3">
                    {mockStats.topConsumers.map((consumer, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                                    #{idx + 1}
                                </div>
                                <span className="text-sm font-medium text-white">{consumer.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full"
                                        style={{ width: `${(consumer.requests / mockStats.totalRequests) * 100}%` }}
                                    />
                                </div>
                                <span className="text-sm font-mono text-slate-400 w-16 text-right">
                                    {consumer.requests.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl p-5 border border-blue-500/20">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-1">Analytics Preview</h4>
                        <p className="text-sm text-slate-400">
                            This is a preview of API analytics. For detailed insights, access the WSO2 Analytics Dashboard.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPanel;

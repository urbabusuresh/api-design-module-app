import React, { useState, useEffect } from 'react';
import { Users, Key, Shield, ExternalLink } from 'lucide-react';
import { api } from '../../api';

const SubscriptionsPanel = ({ apiItem, project }) => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [apiItem]);

    const loadData = async () => {
        try {
            setLoading(true);
            let targetId = apiItem.wso2_id || apiItem.id.split('_op_')[0];

            const [subsData, policiesData] = await Promise.all([
                api.getWso2ApiSubscriptions(project.id, targetId).catch(() => ({ list: [] })),
                api.getWso2SubscriptionPolicies(project.id).catch(() => ({ list: [] }))
            ]);

            setSubscriptions(subsData.list || []);
            setPolicies(policiesData.list || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Subscription Policies */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Available Subscription Tiers
                </h3>
                {policies.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {policies.map((policy) => (
                            <div key={policy.policyId} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-white">{policy.displayName || policy.policyName}</h4>
                                    <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">
                                        {policy.tierPlan || 'Standard'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mb-3">
                                    {policy.description || 'No description'}
                                </p>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Rate Limit</span>
                                    <span className="font-mono text-indigo-400">
                                        {policy.requestCount || policy.defaultLimit?.requestCount || 'Unlimited'} /
                                        {policy.unitTime || policy.defaultLimit?.unitTime || '1'}
                                        {policy.timeUnit || policy.defaultLimit?.timeUnit || 'min'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-slate-500 py-6">
                        No subscription policies available
                    </div>
                )}
            </div>

            {/* Active Subscriptions */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Active Subscriptions ({subscriptions.length})
                </h3>
                {subscriptions.length > 0 ? (
                    <div className="space-y-3">
                        {subscriptions.map((sub) => (
                            <div key={sub.subscriptionId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-white text-sm">{sub.applicationInfo?.name || 'Unknown App'}</h4>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${sub.status === 'UNBLOCKED' || sub.status === 'ACTIVE'
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {sub.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span>Tier: <span className="text-indigo-400 font-medium">{sub.throttlingPolicy}</span></span>
                                        <span>Owner: {sub.applicationInfo?.owner || 'N/A'}</span>
                                    </div>
                                </div>
                                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-slate-500 py-6">
                        No active subscriptions
                    </div>
                )}
            </div>

            {/* API Keys Info */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-5 border border-indigo-500/20">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <Key className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-1">API Keys & Tokens</h4>
                        <p className="text-sm text-slate-400 mb-3">
                            Subscribe to this API from an application to generate access tokens for testing and production use.
                        </p>
                        <button className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                            Learn more about subscriptions →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionsPanel;

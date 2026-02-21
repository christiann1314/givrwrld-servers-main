import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLiveServerData } from '@/hooks/useLiveServerData';
import { useLiveBillingData } from '@/hooks/useLiveBillingData';
import { 
  Activity, 
  Users, 
  Server, 
  CreditCard, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface LiveStats {
  totalUsers: number;
  activeServers: number;
  totalRevenue: number;
  recentActivity: any[];
  serverStatus: any[];
}

const LiveDataDashboard = () => {
  const { user } = useAuth();
  const { data: serverData, loading: serverLoading, lastUpdated: serverLastUpdated, refresh: refreshServers } = useLiveServerData(30000);
  const { data: billingData, loading: billingLoading, lastUpdated: billingLastUpdated, refresh: refreshBilling } = useLiveBillingData(60000);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentActivity = async () => {
    if (!user) return;

    try {
      const { data: activityData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(10);

      setRecentActivity(activityData || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  useEffect(() => {
    fetchRecentActivity();
    setLoading(serverLoading || billingLoading);
  }, [user, serverLoading, billingLoading]);

  if (loading) {
    return (
      <div className="glass-panel-strong rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!serverData && !billingData) return null;

  return (
    <div className="space-y-6">
      {/* Live Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-4 text-center">
          <Users className="mx-auto mb-2 text-emerald-400" size={24} />
          <div className="text-2xl font-bold text-white mb-1">{recentActivity.length}</div>
          <div className="text-gray-400 text-sm">Recent Events</div>
        </div>
        
        <div className="glass-panel rounded-xl p-4 text-center">
          <Server className="mx-auto mb-2 text-blue-400" size={24} />
          <div className="text-2xl font-bold text-white mb-1">{serverData?.onlineServers || 0}</div>
          <div className="text-gray-400 text-sm">Online Servers</div>
        </div>
        
        <div className="glass-panel rounded-xl p-4 text-center">
          <CreditCard className="mx-auto mb-2 text-green-400" size={24} />
          <div className="text-2xl font-bold text-white mb-1">${billingData?.totalRevenue?.toFixed(2) || '0.00'}</div>
          <div className="text-gray-400 text-sm">Total Revenue</div>
        </div>
        
        <div className="glass-panel rounded-xl p-4 text-center">
          <TrendingUp className="mx-auto mb-2 text-purple-400" size={24} />
          <div className="text-2xl font-bold text-white mb-1">{serverData?.averageUptime?.toFixed(1) || '99.9'}%</div>
          <div className="text-gray-400 text-sm">Avg Uptime</div>
        </div>
      </div>

      {/* Server Status */}
      <div className="glass-panel-strong rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Server className="mr-2 text-emerald-400" size={20} />
            Server Status
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refreshServers()}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Refresh servers"
            >
              <RefreshCw size={14} />
            </button>
            <div className="flex items-center text-sm text-gray-400">
              <Clock className="mr-1" size={14} />
              Updated {serverLastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {serverData?.servers?.map((server) => (
            <div key={server.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  server.status === 'online' ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <div>
                  <div className="text-white font-medium">{server.name}</div>
                  <div className="text-gray-400 text-sm">
                    {server.players}/{server.maxPlayers} players • {server.uptime} uptime
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {server.status === 'online' ? (
                  <CheckCircle className="text-green-400" size={16} />
                ) : (
                  <AlertCircle className="text-red-400" size={16} />
                )}
                <span className={`text-sm font-medium ${
                  server.status === 'online' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {server.status.toUpperCase()}
                </span>
              </div>
            </div>
          )) || (
            <div className="text-gray-400 text-center py-4">
              No servers found
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-panel-strong rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <Activity className="mr-2 text-emerald-400" size={20} />
          Recent Activity
        </h3>
        
        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700/30 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm">
                    {activity.event_type.replace(/_/g, ' ').toUpperCase()}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                  {activity.properties && Object.keys(activity.properties).length > 0 && (
                    <div className="text-gray-500 text-xs mt-1">
                      {JSON.stringify(activity.properties, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-center py-4">
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveDataDashboard;

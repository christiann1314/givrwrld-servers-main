import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ENV } from '@/config/env';
import {
  Activity,
  HardDrive,
  Cpu,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ServerStats {
  state: string;
  cpu_percent: number;
  memory_bytes: number;
  disk_bytes: number;
  uptime_ms: number;
  fetched_at: string;
}

interface ServerStatsWidgetProps {
  serverId: string;
  serverIdentifier?: string | null;
  serverLimits?: {
    ram?: string;
    disk?: string;
  };
}

const ServerStatsWidget: React.FC<ServerStatsWidgetProps> = ({
  serverId,
  serverIdentifier,
  serverLimits = {}
}) => {
  const [stats, setStats] = React.useState<ServerStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session');
      }

      // Use server_identifier if available, otherwise fall back to order_id
      const params = serverIdentifier 
        ? `server_identifier=${encodeURIComponent(serverIdentifier)}`
        : `order_id=${encodeURIComponent(serverId)}`;

      const response = await supabase.functions.invoke('server-stats', {
        body: serverIdentifier 
          ? { server_identifier: serverIdentifier }
          : { order_id: serverId }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data) {
        setStats(response.data);
        setError(null);
      }
    } catch (err: any) {
      console.error('Stats fetch error:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStats();
    
    // Poll every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    
    return () => clearInterval(interval);
  }, [serverId, serverIdentifier]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  };

  const formatUptime = (ms: number): string => {
    if (ms === 0) return '0 minutes';
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getMemoryUsage = () => {
    if (!stats?.memory_bytes) return { used: '0 MB', total: serverLimits.ram || '0 MB', percentage: 0 };
    
    const usedMB = stats.memory_bytes / (1024 * 1024);
    let totalMB = 0;
    if (serverLimits.ram) {
      const match = serverLimits.ram.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        totalMB = unit === 'GB' ? value * 1024 : value;
      }
    }
    
    const percentage = totalMB > 0 ? (usedMB / totalMB) * 100 : 0;
    return {
      used: formatBytes(stats.memory_bytes),
      total: serverLimits.ram || '0 MB',
      percentage: Math.round(percentage)
    };
  };

  const getDiskUsage = () => {
    if (!stats?.disk_bytes) return { used: '0 MB', total: serverLimits.disk || '0 MB', percentage: 0 };
    
    const usedMB = stats.disk_bytes / (1024 * 1024);
    let totalMB = 0;
    if (serverLimits.disk) {
      const match = serverLimits.disk.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        totalMB = unit === 'GB' ? value * 1024 : value;
      }
    }
    
    const percentage = totalMB > 0 ? (usedMB / totalMB) * 100 : 0;
    return {
      used: formatBytes(stats.disk_bytes),
      total: serverLimits.disk || '0 MB',
      percentage: Math.round(percentage)
    };
  };

  const getStatusDisplay = () => {
    if (loading) {
      return {
        state: 'Loading...',
        color: 'text-gray-400',
        icon: <RefreshCw className="animate-spin" size={16} />
      };
    }
    
    if (error) {
      return {
        state: 'Temporarily unavailable. Retrying...',
        color: 'text-yellow-400',
        icon: <AlertTriangle size={16} />
      };
    }
    
    if (!stats) {
      return {
        state: 'Awaiting server creation...',
        color: 'text-gray-400',
        icon: <Clock size={16} />
      };
    }
    
    switch (stats.state) {
      case 'running':
        return {
          state: 'Online',
          color: 'text-emerald-400',
          icon: <CheckCircle size={16} />
        };
      case 'offline':
      case 'stopped':
        return {
          state: 'Offline',
          color: 'text-red-400',
          icon: <AlertTriangle size={16} />
        };
      default:
        return {
          state: stats.state || 'Unknown',
          color: 'text-gray-400',
          icon: <Clock size={16} />
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const memoryUsage = getMemoryUsage();
  const diskUsage = getDiskUsage();
  const cpuUsage = stats?.cpu_percent || 0;
  const uptime = stats?.uptime_ms ? formatUptime(stats.uptime_ms) : '0 minutes';

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {statusDisplay.icon}
          <span className={`font-medium ${statusDisplay.color}`}>
            {statusDisplay.state}
          </span>
        </div>
        {stats && (
          <div className="flex items-center space-x-1 text-xs text-emerald-400">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Cpu className="text-blue-400 mr-1" size={16} />
          </div>
          <div className="text-lg font-bold text-white">{Math.round(cpuUsage)}%</div>
          <div className="text-xs text-gray-400">CPU</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Activity className="text-green-400 mr-1" size={16} />
          </div>
          <div className="text-lg font-bold text-white">{memoryUsage.used}</div>
          <div className="text-xs text-gray-400">RAM</div>
          <div className="text-xs text-gray-500">of {memoryUsage.total}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <HardDrive className="text-purple-400 mr-1" size={16} />
          </div>
          <div className="text-lg font-bold text-white">{diskUsage.used}</div>
          <div className="text-xs text-gray-400">Disk</div>
          <div className="text-xs text-gray-500">of {diskUsage.total}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Clock className="text-yellow-400 mr-1" size={16} />
          </div>
          <div className="text-lg font-bold text-white">{uptime}</div>
          <div className="text-xs text-gray-400">Uptime</div>
        </div>
      </div>

      {/* Progress Bars */}
      {stats && (
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>CPU Usage</span>
              <span>{Math.round(cpuUsage)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(cpuUsage, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Memory Usage</span>
              <span>{memoryUsage.percentage}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(memoryUsage.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Disk Usage</span>
              <span>{diskUsage.percentage}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(diskUsage.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-yellow-400 text-center p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default ServerStatsWidget;
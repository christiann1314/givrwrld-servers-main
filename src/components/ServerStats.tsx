import * as React from "react";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Server, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Clock, 
  Activity,
  Loader2,
  AlertCircle
} from "lucide-react";

interface ServerStats {
  state: string;
  cpu_percent: number;
  memory_bytes: number;
  disk_bytes: number;
  uptime_ms: number;
  server_identifier: string;
}

interface Order {
  id: string;
  plan_id: string;
  status: string;
  pterodactyl_server_identifier?: string | null;
  created_at: string;
}

const ServerStats = ({ order }: { order: Order }) => {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<ServerStats | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStats = React.useCallback(async () => {
    if (!user || !order.pterodactyl_server_identifier) return;

    try {
      setLoading(true);
      setError(null);

      const api = (await import("@/lib/api")).default;
      const data = await api.getServerStats(order.id);
      setStats(data);
    } catch (err) {
      console.error('Error fetching server stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, order.id, order.pterodactyl_server_identifier]);

  // Poll for stats every 5 seconds
  React.useEffect(() => {
    if (order.status === 'provisioned' && order.pterodactyl_server_identifier) {
      fetchStats();
      const interval = setInterval(fetchStats, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchStats, order.status, order.pterodactyl_server_identifier]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-red-500';
      case 'starting':
        return 'bg-yellow-500';
      case 'stopping':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStateBadge = (state: string) => {
    switch (state.toLowerCase()) {
      case 'running':
        return <Badge className="bg-green-600">Running</Badge>;
      case 'stopped':
        return <Badge variant="destructive">Stopped</Badge>;
      case 'starting':
        return <Badge className="bg-yellow-600">Starting</Badge>;
      case 'stopping':
        return <Badge className="bg-orange-600">Stopping</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (order.status !== 'provisioned' || !order.pterodactyl_server_identifier) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-gray-400">
            <AlertCircle className="h-5 w-5" />
            <span>Server not provisioned yet</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Server className="h-5 w-5" />
          <span>Server Status</span>
          {stats && getStateBadge(stats.state)}
        </CardTitle>
        <CardDescription>
          Live server performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && !stats && (
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading stats...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {stats && (
          <>
            {/* Server State */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStateColor(stats.state)}`}></div>
              <span className="text-sm font-medium capitalize">{stats.state}</span>
            </div>

            {/* CPU Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">CPU Usage</span>
                </div>
                <span className="text-sm font-mono">{stats.cpu_percent.toFixed(1)}%</span>
              </div>
              <Progress value={stats.cpu_percent} className="h-2" />
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MemoryStick className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium">Memory</span>
                </div>
                <span className="text-sm font-mono">{formatBytes(stats.memory_bytes)}</span>
              </div>
              <div className="text-xs text-gray-400">
                Used: {formatBytes(stats.memory_bytes)}
              </div>
            </div>

            {/* Disk Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium">Disk</span>
                </div>
                <span className="text-sm font-mono">{formatBytes(stats.disk_bytes)}</span>
              </div>
              <div className="text-xs text-gray-400">
                Used: {formatBytes(stats.disk_bytes)}
              </div>
            </div>

            {/* Uptime */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium">Uptime</span>
              </div>
              <span className="text-sm font-mono">{formatUptime(stats.uptime_ms)}</span>
            </div>

            {/* Server Identifier */}
            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Server ID</span>
                <span className="text-xs font-mono text-gray-300">{stats.server_identifier}</span>
              </div>
            </div>
          </>
        )}

        {loading && stats && (
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Activity className="h-4 w-4 animate-pulse" />
            <span>Updating...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServerStats;


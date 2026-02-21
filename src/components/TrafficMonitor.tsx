import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trafficManager } from '@/lib/trafficManager';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Zap,
  BarChart3,
  Clock,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

export const TrafficMonitor = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshData = () => {
    const data = trafficManager.getHealthStatus();
    setHealthData(data);
  };

  useEffect(() => {
    refreshData();
    
    if (autoRefresh) {
      const interval = setInterval(refreshData, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const activateEmergencyMode = async () => {
    setIsEmergencyMode(true);
    await trafficManager.emergencyMode();
    toast.warning('Emergency mode activated - traffic reduced');
    
    setTimeout(() => {
      setIsEmergencyMode(false);
      toast.success('Emergency mode deactivated');
    }, 2 * 60 * 1000);
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (!healthData) {
    return <div>Loading traffic data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getHealthIcon(healthData.health)}
              Traffic Health Status
            </div>
            <Badge variant={getHealthColor(healthData.health) as any}>
              {healthData.health.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Real-time monitoring of traffic management systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
            >
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={activateEmergencyMode}
              disabled={isEmergencyMode}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isEmergencyMode ? 'Emergency Active' : 'Emergency Mode'}
            </Button>
          </div>

          {healthData.health === 'critical' && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Critical system health detected. Consider activating emergency mode.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Traffic Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Traffic Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {healthData.traffic.totalRequests}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {Math.round(healthData.traffic.successRate * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Average Response Time</div>
              <div className="text-lg font-semibold">
                {Math.round(healthData.traffic.averageResponseTime)}ms
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Request Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Queue Length</span>
                <span>{healthData.queue.queueLength}</span>
              </div>
              <Progress 
                value={(healthData.queue.queueLength / 100) * 100} 
                className="h-2" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">{healthData.queue.activeRequests}</div>
                <div className="text-muted-foreground">Active</div>
              </div>
              <div>
                <div className="font-medium">{Math.round(healthData.queue.avgWaitTime)}ms</div>
                <div className="text-muted-foreground">Avg Wait</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Circuit Breaker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Circuit Breaker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">State</span>
              <Badge 
                variant={
                  healthData.circuitBreaker.state === 'closed' 
                    ? 'default' 
                    : healthData.circuitBreaker.state === 'open'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {healthData.circuitBreaker.state.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Error Rate</span>
                <span>{Math.round(healthData.circuitBreaker.errorRate * 100)}%</span>
              </div>
              <Progress 
                value={healthData.circuitBreaker.errorRate * 100} 
                className="h-2" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-red-500">{healthData.circuitBreaker.failures}</div>
                <div className="text-muted-foreground">Failures</div>
              </div>
              <div>
                <div className="font-medium text-green-500">{healthData.circuitBreaker.successes}</div>
                <div className="text-muted-foreground">Successes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rate Limiting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage</span>
                <span>
                  {healthData.rateLimit.totalRequests} / {healthData.rateLimit.maxRequests}
                </span>
              </div>
              <Progress 
                value={(healthData.rateLimit.totalRequests / healthData.rateLimit.maxRequests) * 100} 
                className="h-2" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">{healthData.rateLimit.activeEntries}</div>
                <div className="text-muted-foreground">Active Limits</div>
              </div>
              <div>
                <div className="font-medium">{Math.round(healthData.rateLimit.windowMs / 1000)}s</div>
                <div className="text-muted-foreground">Window</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Load Balancer */}
        {healthData.loadBalancer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Load Balancer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Healthy Endpoints</span>
                <Badge variant="default">
                  {healthData.loadBalancer.healthyCount} / {healthData.loadBalancer.totalEndpoints}
                </Badge>
              </div>
              <div className="space-y-2">
                {healthData.loadBalancer.endpoints.map((endpoint: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="truncate flex-1">{endpoint.url.split('//')[1]}</span>
                    <div className="flex items-center gap-2">
                      <span>{endpoint.responseTime}ms</span>
                      <div className={`w-2 h-2 rounded-full ${
                        endpoint.isHealthy ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
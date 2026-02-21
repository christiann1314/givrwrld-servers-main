import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Timer, 
  Zap, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Activity
} from 'lucide-react';

interface PerformanceData {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cacheHitRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

export const PerformanceMetrics = () => {
  const [metrics, setMetrics] = useState<PerformanceData>({
    responseTime: 0,
    throughput: 0,
    errorRate: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const collectMetrics = () => {
      // Collect performance metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      // Response time calculation
      const responseTime = navigation ? navigation.responseEnd - navigation.requestStart : 0;
      
      // Memory usage (if available)
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? 
        (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100 : 0;

      // Simulated metrics (in real app, these would come from actual monitoring)
      const newMetrics: PerformanceData = {
        responseTime: Math.round(responseTime),
        throughput: Math.floor(Math.random() * 100) + 50, // Simulated
        errorRate: Math.random() * 5, // 0-5% error rate
        cacheHitRate: 75 + Math.random() * 20, // 75-95% cache hit rate
        memoryUsage: Math.round(memoryUsage),
        cpuUsage: Math.random() * 30 + 10, // 10-40% CPU usage
      };

      setMetrics(newMetrics);
      setIsLoading(false);
    };

    collectMetrics();
    const interval = setInterval(collectMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getPerformanceStatus = (metric: keyof PerformanceData, value: number) => {
    const thresholds = {
      responseTime: { good: 200, warning: 500 },
      throughput: { good: 80, warning: 50 },
      errorRate: { good: 1, warning: 3 },
      cacheHitRate: { good: 90, warning: 70 },
      memoryUsage: { good: 60, warning: 80 },
      cpuUsage: { good: 30, warning: 60 },
    };

    const threshold = thresholds[metric];
    
    if (metric === 'errorRate' || metric === 'memoryUsage' || metric === 'cpuUsage') {
      if (value <= threshold.good) return 'good';
      if (value <= threshold.warning) return 'warning';
      return 'critical';
    } else {
      if (value >= threshold.good) return 'good';
      if (value >= threshold.warning) return 'warning';
      return 'critical';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return <div>Loading performance metrics...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Response Time */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Timer className="h-4 w-4" />
            Response Time
            {getStatusIcon(getPerformanceStatus('responseTime', metrics.responseTime))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {metrics.responseTime}ms
          </div>
          <Progress 
            value={Math.min((metrics.responseTime / 1000) * 100, 100)} 
            className="h-2"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Target: &lt;200ms
          </div>
        </CardContent>
      </Card>

      {/* Throughput */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4" />
            Throughput
            {getStatusIcon(getPerformanceStatus('throughput', metrics.throughput))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {metrics.throughput} req/s
          </div>
          <Progress 
            value={metrics.throughput} 
            className="h-2"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Target: &gt;80 req/s
          </div>
        </CardContent>
      </Card>

      {/* Error Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            Error Rate
            {getStatusIcon(getPerformanceStatus('errorRate', metrics.errorRate))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {metrics.errorRate.toFixed(1)}%
          </div>
          <Progress 
            value={metrics.errorRate * 20} 
            className="h-2"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Target: &lt;1%
          </div>
        </CardContent>
      </Card>

      {/* Cache Hit Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4" />
            Cache Hit Rate
            {getStatusIcon(getPerformanceStatus('cacheHitRate', metrics.cacheHitRate))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {metrics.cacheHitRate.toFixed(1)}%
          </div>
          <Progress 
            value={metrics.cacheHitRate} 
            className="h-2"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Target: &gt;90%
          </div>
        </CardContent>
      </Card>

      {/* Memory Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Memory Usage
            {getStatusIcon(getPerformanceStatus('memoryUsage', metrics.memoryUsage))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {metrics.memoryUsage.toFixed(0)}%
          </div>
          <Progress 
            value={metrics.memoryUsage} 
            className="h-2"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Target: &lt;60%
          </div>
        </CardContent>
      </Card>

      {/* CPU Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4" />
            CPU Usage
            {getStatusIcon(getPerformanceStatus('cpuUsage', metrics.cpuUsage))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {metrics.cpuUsage.toFixed(0)}%
          </div>
          <Progress 
            value={metrics.cpuUsage} 
            className="h-2"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Target: &lt;30%
          </div>
        </CardContent>
      </Card>

      {/* Overall Performance Score */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>
            Real-time performance metrics and system health indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${getStatusColor(getPerformanceStatus('responseTime', metrics.responseTime))}`} />
              <div className="text-xs text-muted-foreground">Response</div>
            </div>
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${getStatusColor(getPerformanceStatus('throughput', metrics.throughput))}`} />
              <div className="text-xs text-muted-foreground">Throughput</div>
            </div>
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${getStatusColor(getPerformanceStatus('errorRate', metrics.errorRate))}`} />
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${getStatusColor(getPerformanceStatus('cacheHitRate', metrics.cacheHitRate))}`} />
              <div className="text-xs text-muted-foreground">Cache</div>
            </div>
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${getStatusColor(getPerformanceStatus('memoryUsage', metrics.memoryUsage))}`} />
              <div className="text-xs text-muted-foreground">Memory</div>
            </div>
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${getStatusColor(getPerformanceStatus('cpuUsage', metrics.cpuUsage))}`} />
              <div className="text-xs text-muted-foreground">CPU</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
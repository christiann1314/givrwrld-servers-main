import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getCacheHealth, debugCache, clearAllCaches } from '@/lib/cacheUtils';
import { monitorCacheUsage, optimizeCacheUsage } from '@/lib/performanceCache';
import { Trash2, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';

export const CacheStatus = () => {
  const [cacheHealth, setCacheHealth] = useState(getCacheHealth());
  const [memoryUsage, setMemoryUsage] = useState(monitorCacheUsage());

  const refreshStats = () => {
    setCacheHealth(getCacheHealth());
    setMemoryUsage(monitorCacheUsage());
  };

  const clearCache = () => {
    clearAllCaches();
    toast.success('All caches cleared');
    refreshStats();
  };

  const optimizeCache = () => {
    optimizeCacheUsage();
    toast.success('Cache optimized');
    refreshStats();
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Cache Status
        </CardTitle>
        <CardDescription>
          Monitor and manage application cache performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Query Cache Stats */}
        <div className="space-y-3">
          <h4 className="font-medium">Query Cache</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {cacheHealth.totalQueries}
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {cacheHealth.cachedQueries}
              </div>
              <div className="text-sm text-muted-foreground">Cached</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {cacheHealth.activeQueries}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {cacheHealth.staleQueries}
              </div>
              <div className="text-sm text-muted-foreground">Stale</div>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        {memoryUsage && (
          <div className="space-y-3">
            <h4 className="font-medium">Memory Usage</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Heap Usage</span>
                <span>{memoryUsage.cacheUsage.toFixed(1)}%</span>
              </div>
              <Progress value={memoryUsage.cacheUsage} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB / {(memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
          </div>
        )}

        {/* Local Storage */}
        <div className="space-y-3">
          <h4 className="font-medium">Local Storage</h4>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {cacheHealth.localStorageUsed} items cached
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Stats
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={optimizeCache}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Optimize
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => debugCache()}
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            Debug
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={clearCache}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
        </div>

        {/* Cache Health Indicator */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Health</span>
            <Badge 
              variant={cacheHealth.staleQueries > cacheHealth.totalQueries * 0.3 ? "destructive" : "default"}
            >
              {cacheHealth.staleQueries > cacheHealth.totalQueries * 0.3 ? "Needs Optimization" : "Healthy"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
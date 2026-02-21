import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, Settings, Info } from 'lucide-react';
import { toast } from 'sonner';

interface LoadBalancingConfigProps {
  onConfigChange?: (config: any) => void;
}

export const LoadBalancingConfig = ({ onConfigChange }: LoadBalancingConfigProps) => {
  const [config, setConfig] = useState({
    enableLoadBalancing: true,
    enableRateLimiting: true,
    enableCircuitBreaker: true,
    enableRequestBatching: false,
    endpoints: ['https://mjhvkvnshnbnxojnandf.supabase.co'],
    maxConcurrentRequests: 15,
    requestsPerSecond: 100,
    algorithm: 'weighted' as 'round-robin' | 'weighted' | 'least-connections',
    circuitBreakerThreshold: 5,
    rateLimitWindow: 60,
  });

  const [newEndpoint, setNewEndpoint] = useState('');

  const updateConfig = (updates: Partial<typeof config>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const addEndpoint = () => {
    if (!newEndpoint.trim()) {
      toast.error('Please enter a valid endpoint URL');
      return;
    }

    try {
      new URL(newEndpoint); // Validate URL
      updateConfig({
        endpoints: [...config.endpoints, newEndpoint.trim()]
      });
      setNewEndpoint('');
      toast.success('Endpoint added successfully');
    } catch {
      toast.error('Please enter a valid URL');
    }
  };

  const removeEndpoint = (index: number) => {
    if (config.endpoints.length <= 1) {
      toast.error('At least one endpoint is required');
      return;
    }

    updateConfig({
      endpoints: config.endpoints.filter((_, i) => i !== index)
    });
    toast.success('Endpoint removed');
  };

  const resetToDefaults = () => {
    const defaultConfig = {
      enableLoadBalancing: true,
      enableRateLimiting: true,
      enableCircuitBreaker: true,
      enableRequestBatching: false,
      endpoints: ['https://mjhvkvnshnbnxojnandf.supabase.co'],
      maxConcurrentRequests: 15,
      requestsPerSecond: 100,
      algorithm: 'weighted' as const,
      circuitBreakerThreshold: 5,
      rateLimitWindow: 60,
    };
    setConfig(defaultConfig);
    onConfigChange?.(defaultConfig);
    toast.success('Configuration reset to defaults');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Load Balancing Configuration
          </CardTitle>
          <CardDescription>
            Configure traffic management and load balancing settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feature Toggles */}
          <div className="space-y-4">
            <h4 className="font-medium">Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="load-balancing">Load Balancing</Label>
                <Switch
                  id="load-balancing"
                  checked={config.enableLoadBalancing}
                  onCheckedChange={(checked) => 
                    updateConfig({ enableLoadBalancing: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="rate-limiting">Rate Limiting</Label>
                <Switch
                  id="rate-limiting"
                  checked={config.enableRateLimiting}
                  onCheckedChange={(checked) => 
                    updateConfig({ enableRateLimiting: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="circuit-breaker">Circuit Breaker</Label>
                <Switch
                  id="circuit-breaker"
                  checked={config.enableCircuitBreaker}
                  onCheckedChange={(checked) => 
                    updateConfig({ enableCircuitBreaker: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="request-batching">Request Batching</Label>
                <Switch
                  id="request-batching"
                  checked={config.enableRequestBatching}
                  onCheckedChange={(checked) => 
                    updateConfig({ enableRequestBatching: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Endpoints Management */}
          <div className="space-y-4">
            <h4 className="font-medium">API Endpoints</h4>
            <div className="space-y-2">
              {config.endpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline" className="flex-1 justify-start">
                    {endpoint}
                  </Badge>
                  {config.endpoints.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEndpoint(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com"
                value={newEndpoint}
                onChange={(e) => setNewEndpoint(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addEndpoint()}
              />
              <Button onClick={addEndpoint}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Performance Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Performance Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="concurrent-requests">Max Concurrent Requests</Label>
                <Input
                  id="concurrent-requests"
                  type="number"
                  value={config.maxConcurrentRequests}
                  onChange={(e) => 
                    updateConfig({ maxConcurrentRequests: parseInt(e.target.value) || 1 })
                  }
                  min="1"
                  max="100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="requests-per-second">Requests per Second</Label>
                <Input
                  id="requests-per-second"
                  type="number"
                  value={config.requestsPerSecond}
                  onChange={(e) => 
                    updateConfig({ requestsPerSecond: parseInt(e.target.value) || 1 })
                  }
                  min="1"
                  max="1000"
                />
              </div>
            </div>
          </div>

          {/* Load Balancing Algorithm */}
          {config.enableLoadBalancing && config.endpoints.length > 1 && (
            <div className="space-y-4">
              <h4 className="font-medium">Load Balancing Algorithm</h4>
              <Select
                value={config.algorithm}
                onValueChange={(value: any) => updateConfig({ algorithm: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round-robin">Round Robin</SelectItem>
                  <SelectItem value="weighted">Weighted (Recommended)</SelectItem>
                  <SelectItem value="least-connections">Least Connections</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Advanced Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="circuit-threshold">Circuit Breaker Threshold</Label>
                <Input
                  id="circuit-threshold"
                  type="number"
                  value={config.circuitBreakerThreshold}
                  onChange={(e) => 
                    updateConfig({ circuitBreakerThreshold: parseInt(e.target.value) || 1 })
                  }
                  min="1"
                  max="20"
                  disabled={!config.enableCircuitBreaker}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rate-limit-window">Rate Limit Window (seconds)</Label>
                <Input
                  id="rate-limit-window"
                  type="number"
                  value={config.rateLimitWindow}
                  onChange={(e) => 
                    updateConfig({ rateLimitWindow: parseInt(e.target.value) || 1 })
                  }
                  min="1"
                  max="3600"
                  disabled={!config.enableRateLimiting}
                />
              </div>
            </div>
          </div>

          {/* Configuration Warnings */}
          {!config.enableLoadBalancing && config.endpoints.length > 1 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Load balancing is disabled but multiple endpoints are configured. 
                Only the first endpoint will be used.
              </AlertDescription>
            </Alert>
          )}

          {config.maxConcurrentRequests > 50 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                High concurrent request limit may impact browser performance. 
                Consider keeping it under 50 for optimal performance.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={resetToDefaults} variant="outline">
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
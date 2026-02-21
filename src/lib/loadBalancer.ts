// Client-side load balancing for high traffic scenarios
interface LoadBalancerConfig {
  endpoints: string[];
  healthCheckInterval: number;
  maxRetries: number;
  timeout: number;
  algorithm: 'round-robin' | 'weighted' | 'least-connections';
}

interface EndpointHealth {
  url: string;
  isHealthy: boolean;
  responseTime: number;
  lastChecked: number;
  activeConnections: number;
  weight: number;
}

export class LoadBalancer {
  private config: LoadBalancerConfig;
  private endpoints: EndpointHealth[] = [];
  private currentIndex = 0;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: LoadBalancerConfig) {
    this.config = config;
    this.initializeEndpoints();
    this.startHealthChecks();
  }

  private initializeEndpoints() {
    this.endpoints = this.config.endpoints.map(url => ({
      url,
      isHealthy: true,
      responseTime: 0,
      lastChecked: Date.now(),
      activeConnections: 0,
      weight: 1,
    }));
  }

  private async checkEndpointHealth(endpoint: EndpointHealth): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${endpoint.url}/health`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(this.config.timeout),
      });
      
      endpoint.isHealthy = response.ok;
      endpoint.responseTime = Date.now() - startTime;
      endpoint.lastChecked = Date.now();
      
      // Adjust weight based on performance
      if (endpoint.responseTime < 100) endpoint.weight = 1.5;
      else if (endpoint.responseTime < 500) endpoint.weight = 1.0;
      else endpoint.weight = 0.5;
      
    } catch (error) {
      endpoint.isHealthy = false;
      endpoint.responseTime = this.config.timeout;
      endpoint.lastChecked = Date.now();
      endpoint.weight = 0.1;
    }
  }

  private startHealthChecks() {
    this.healthCheckTimer = setInterval(() => {
      this.endpoints.forEach(endpoint => {
        this.checkEndpointHealth(endpoint);
      });
    }, this.config.healthCheckInterval);
  }

  private getHealthyEndpoints(): EndpointHealth[] {
    return this.endpoints.filter(endpoint => endpoint.isHealthy);
  }

  private selectEndpointRoundRobin(): EndpointHealth | null {
    const healthy = this.getHealthyEndpoints();
    if (healthy.length === 0) return null;
    
    const endpoint = healthy[this.currentIndex % healthy.length];
    this.currentIndex = (this.currentIndex + 1) % healthy.length;
    return endpoint;
  }

  private selectEndpointWeighted(): EndpointHealth | null {
    const healthy = this.getHealthyEndpoints();
    if (healthy.length === 0) return null;
    
    const totalWeight = healthy.reduce((sum, endpoint) => sum + endpoint.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of healthy) {
      random -= endpoint.weight;
      if (random <= 0) return endpoint;
    }
    
    return healthy[0];
  }

  private selectEndpointLeastConnections(): EndpointHealth | null {
    const healthy = this.getHealthyEndpoints();
    if (healthy.length === 0) return null;
    
    return healthy.reduce((least, current) => 
      current.activeConnections < least.activeConnections ? current : least
    );
  }

  public selectEndpoint(): EndpointHealth | null {
    switch (this.config.algorithm) {
      case 'weighted':
        return this.selectEndpointWeighted();
      case 'least-connections':
        return this.selectEndpointLeastConnections();
      default:
        return this.selectEndpointRoundRobin();
    }
  }

  public async makeRequest<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      const endpoint = this.selectEndpoint();
      
      if (!endpoint) {
        throw new Error('No healthy endpoints available');
      }
      
      try {
        endpoint.activeConnections++;
        
        const response = await fetch(`${endpoint.url}${path}`, {
          ...options,
          signal: AbortSignal.timeout(this.config.timeout),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
        
      } catch (error) {
        lastError = error as Error;
        endpoint.isHealthy = false;
        
        // Exponential backoff
        if (attempt < this.config.maxRetries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      } finally {
        endpoint.activeConnections--;
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  public getStats() {
    return {
      endpoints: this.endpoints.map(endpoint => ({
        url: endpoint.url,
        isHealthy: endpoint.isHealthy,
        responseTime: endpoint.responseTime,
        activeConnections: endpoint.activeConnections,
        weight: endpoint.weight,
      })),
      healthyCount: this.getHealthyEndpoints().length,
      totalEndpoints: this.endpoints.length,
    };
  }

  public destroy() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}
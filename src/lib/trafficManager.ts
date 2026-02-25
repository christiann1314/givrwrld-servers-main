// High-level traffic management orchestrator
import { LoadBalancer } from './loadBalancer';
import { RequestQueue } from './requestQueue';
import { CircuitBreaker } from './circuitBreaker';
import { RateLimiter, apiRateLimiter } from './rateLimiter';
import { RequestBatcher } from './requestBatcher';

interface TrafficManagerConfig {
  enableLoadBalancing: boolean;
  enableRateLimiting: boolean;
  enableCircuitBreaker: boolean;
  enableRequestBatching: boolean;
  endpoints: string[];
  maxConcurrentRequests: number;
  requestsPerSecond: number;
}

export class TrafficManager {
  private loadBalancer?: LoadBalancer;
  private requestQueue: RequestQueue;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private batchers = new Map<string, RequestBatcher<any>>();
  private config: TrafficManagerConfig;
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: 0,
  };

  constructor(config: Partial<TrafficManagerConfig> = {}) {
    this.config = {
      enableLoadBalancing: true,
      enableRateLimiting: true,
      enableCircuitBreaker: true,
      enableRequestBatching: false,
      endpoints: (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL ? [import.meta.env.VITE_SUPABASE_URL] : []),
      maxConcurrentRequests: 15,
      requestsPerSecond: 100,
      ...config,
    };

    this.requestQueue = new RequestQueue(
      this.config.maxConcurrentRequests,
      this.config.requestsPerSecond
    );

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 30000,
      expectedErrorRate: 0.15,
    });

    this.rateLimiter = apiRateLimiter;

    if (this.config.enableLoadBalancing && this.config.endpoints.length > 1) {
      this.loadBalancer = new LoadBalancer({
        endpoints: this.config.endpoints,
        healthCheckInterval: 30000,
        maxRetries: 3,
        timeout: 10000,
        algorithm: 'weighted',
      });
    }
  }

  public async makeRequest<T>(
    path: string,
    options: RequestInit = {},
    priority = 1,
    batchKey?: string
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Rate limiting check
      if (this.config.enableRateLimiting) {
        const allowed = await this.rateLimiter.checkLimit();
        if (!allowed) {
          throw new Error('Rate limit exceeded');
        }
      }

      // Batch handling for similar requests
      if (batchKey && this.config.enableRequestBatching) {
        return this.handleBatchedRequest<T>(path, options, batchKey);
      }

      // Queue the request
      const result = await this.requestQueue.enqueue(
        () => this.executeRequest<T>(path, options),
        priority
      );

      this.updateStats(true, Date.now() - startTime);
      return result;

    } catch (error) {
      this.updateStats(false, Date.now() - startTime);
      throw error;
    }
  }

  private async executeRequest<T>(path: string, options: RequestInit): Promise<T> {
    if (this.config.enableCircuitBreaker) {
      return this.circuitBreaker.execute(async () => {
        return this.performRequest<T>(path, options);
      });
    }

    return this.performRequest<T>(path, options);
  }

  private async performRequest<T>(path: string, options: RequestInit): Promise<T> {
    if (this.loadBalancer && this.config.enableLoadBalancing) {
      return this.loadBalancer.makeRequest<T>(path, options);
    }

    // Fallback to direct request
    const endpoint = this.config.endpoints[0];
    const response = await fetch(`${endpoint}${path}`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private async handleBatchedRequest<T>(
    path: string,
    options: RequestInit,
    batchKey: string
  ): Promise<T> {
    if (!this.batchers.has(batchKey)) {
      const batcher = new RequestBatcher<T>(
        async (requests) => {
          // Execute batched requests
          const results = await Promise.allSettled(
            requests.map(req => this.executeRequest<T>(path, req.options))
          );
          
          return results.map(result => 
            result.status === 'fulfilled' ? result.value : null
          );
        },
        {
          maxBatchSize: 10,
          flushInterval: 50,
          batchKey: () => batchKey,
        }
      );
      
      this.batchers.set(batchKey, batcher);
    }

    const batcher = this.batchers.get(batchKey)!;
    return batcher.add({ path, options });
  }

  private updateStats(success: boolean, responseTime: number): void {
    this.stats.totalRequests++;
    this.stats.lastRequestTime = Date.now();
    
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Calculate running average response time
    const totalResponseTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1);
    this.stats.averageResponseTime = (totalResponseTime + responseTime) / this.stats.totalRequests;
  }

  public getHealthStatus() {
    const queueStats = this.requestQueue.getStats();
    const circuitStats = this.circuitBreaker.getStats();
    const rateLimitStats = this.rateLimiter.getStats();
    const loadBalancerStats = this.loadBalancer?.getStats();

    const overallHealth = this.calculateOverallHealth(
      queueStats,
      circuitStats,
      rateLimitStats,
      loadBalancerStats
    );

    return {
      health: overallHealth,
      timestamp: Date.now(),
      queue: queueStats,
      circuitBreaker: circuitStats,
      rateLimit: rateLimitStats,
      loadBalancer: loadBalancerStats,
      traffic: {
        ...this.stats,
        successRate: this.stats.totalRequests > 0 
          ? this.stats.successfulRequests / this.stats.totalRequests 
          : 0,
      },
    };
  }

  private calculateOverallHealth(
    queueStats: any,
    circuitStats: any,
    rateLimitStats: any,
    loadBalancerStats?: any
  ): 'healthy' | 'warning' | 'critical' {
    let score = 100;

    // Queue health (30% weight)
    if (queueStats.queueLength > 50) score -= 20;
    else if (queueStats.queueLength > 20) score -= 10;

    if (queueStats.avgWaitTime > 5000) score -= 15;
    else if (queueStats.avgWaitTime > 2000) score -= 10;

    // Circuit breaker health (30% weight)
    if (circuitStats.state === 'open') score -= 30;
    else if (circuitStats.state === 'half-open') score -= 15;

    if (circuitStats.errorRate > 0.2) score -= 20;
    else if (circuitStats.errorRate > 0.1) score -= 10;

    // Rate limit health (20% weight)
    const rateLimitUtilization = rateLimitStats.totalRequests / rateLimitStats.maxRequests;
    if (rateLimitUtilization > 0.9) score -= 15;
    else if (rateLimitUtilization > 0.7) score -= 10;

    // Load balancer health (20% weight)
    if (loadBalancerStats) {
      const healthyRatio = loadBalancerStats.healthyCount / loadBalancerStats.totalEndpoints;
      if (healthyRatio < 0.5) score -= 20;
      else if (healthyRatio < 0.8) score -= 10;
    }

    if (score >= 80) return 'healthy';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  public async emergencyMode(): Promise<void> {
    console.warn('Activating emergency mode - reducing traffic load');
    
    // Increase rate limiting
    this.rateLimiter = new RateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 20, // Reduced from normal
    });

    // Force circuit breaker open temporarily
    this.circuitBreaker.forceOpen();
    
    // Clear queues
    this.requestQueue.clear();
    
    // Reset after 2 minutes
    setTimeout(() => {
      this.circuitBreaker.forceClose();
      this.rateLimiter = apiRateLimiter; // Restore normal rate limiter
      console.log('Emergency mode deactivated');
    }, 2 * 60 * 1000);
  }

  public destroy(): void {
    this.loadBalancer?.destroy();
    this.circuitBreaker.destroy();
    this.rateLimiter.destroy();
    
    for (const batcher of this.batchers.values()) {
      batcher.destroy();
    }
    this.batchers.clear();
  }
}

// Global traffic manager instance
// Supabase / external edge functions are no longer used in this stack,
// so the traffic manager is effectively idle. Endpoints array is left
// empty to avoid any accidental external calls.
export const trafficManager = new TrafficManager({
  endpoints: [],
  maxConcurrentRequests: 10,
  requestsPerSecond: 50,
});
// Circuit breaker pattern for fault tolerance
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrorRate: number;
}

interface CircuitStats {
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime: number;
  lastSuccessTime: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private config: CircuitBreakerConfig;
  private stats: CircuitStats;
  private timer?: NodeJS.Timeout;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      expectedErrorRate: 0.1, // 10%
      ...config,
    };

    this.stats = {
      failures: 0,
      successes: 0,
      totalRequests: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
    };

    this.startMonitoring();
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      this.stats.totalRequests++;
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.stats.successes++;
    this.stats.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.resetStats();
    }
  }

  private onFailure(): void {
    this.stats.failures++;
    this.stats.lastFailureTime = Date.now();

    const errorRate = this.stats.failures / this.stats.totalRequests;
    
    if (
      this.stats.failures >= this.config.failureThreshold ||
      (this.stats.totalRequests >= 10 && errorRate > this.config.expectedErrorRate)
    ) {
      this.state = CircuitState.OPEN;
    }
  }

  private shouldAttemptReset(): boolean {
    const timeSinceLastFailure = Date.now() - this.stats.lastFailureTime;
    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  private resetStats(): void {
    this.stats.failures = 0;
    this.stats.successes = 0;
    this.stats.totalRequests = 0;
  }

  private startMonitoring(): void {
    this.timer = setInterval(() => {
      // Reset stats periodically to avoid stale data
      const now = Date.now();
      const timeSinceLastActivity = Math.max(
        now - this.stats.lastFailureTime,
        now - this.stats.lastSuccessTime
      );

      if (timeSinceLastActivity > this.config.monitoringPeriod) {
        this.resetStats();
        if (this.state === CircuitState.OPEN) {
          this.state = CircuitState.CLOSED;
        }
      }
    }, this.config.monitoringPeriod);
  }

  public getState(): CircuitState {
    return this.state;
  }

  public getStats() {
    const errorRate = this.stats.totalRequests > 0 
      ? this.stats.failures / this.stats.totalRequests 
      : 0;

    return {
      state: this.state,
      failures: this.stats.failures,
      successes: this.stats.successes,
      totalRequests: this.stats.totalRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      lastFailureTime: this.stats.lastFailureTime,
      lastSuccessTime: this.stats.lastSuccessTime,
    };
  }

  public forceOpen(): void {
    this.state = CircuitState.OPEN;
  }

  public forceClose(): void {
    this.state = CircuitState.CLOSED;
    this.resetStats();
  }

  public destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
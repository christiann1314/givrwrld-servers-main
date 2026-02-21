// Rate limiting implementation for API requests
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: any) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: () => 'default',
      ...config,
    };

    this.startCleanup();
  }

  public async checkLimit(key?: string, request?: any): Promise<boolean> {
    const limitKey = key || this.config.keyGenerator!(request);
    const now = Date.now();
    
    let entry = this.store.get(limitKey);
    
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
      this.store.set(limitKey, entry);
    }

    if (entry.count >= this.config.maxRequests) {
      return false; // Rate limit exceeded
    }

    entry.count++;
    return true; // Request allowed
  }

  public getRemainingRequests(key?: string, request?: any): number {
    const limitKey = key || this.config.keyGenerator!(request);
    const entry = this.store.get(limitKey);
    
    if (!entry || Date.now() > entry.resetTime) {
      return this.config.maxRequests;
    }
    
    return Math.max(0, this.config.maxRequests - entry.count);
  }

  public getResetTime(key?: string, request?: any): number {
    const limitKey = key || this.config.keyGenerator!(request);
    const entry = this.store.get(limitKey);
    
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.config.windowMs;
    }
    
    return entry.resetTime;
  }

  public reset(key?: string, request?: any): void {
    const limitKey = key || this.config.keyGenerator!(request);
    this.store.delete(limitKey);
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetTime) {
          this.store.delete(key);
        }
      }
    }, this.config.windowMs);
  }

  public getStats() {
    const now = Date.now();
    let activeEntries = 0;
    let totalRequests = 0;

    for (const [, entry] of this.store.entries()) {
      if (now <= entry.resetTime) {
        activeEntries++;
        totalRequests += entry.count;
      }
    }

    return {
      activeEntries,
      totalRequests,
      maxRequests: this.config.maxRequests,
      windowMs: this.config.windowMs,
    };
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.store.clear();
  }
}

// Global rate limiter instances
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: (request) => request?.user?.id || 'anonymous',
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyGenerator: (request) => request?.ip || 'unknown',
});

export const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  keyGenerator: (request) => request?.user?.id || 'anonymous',
});
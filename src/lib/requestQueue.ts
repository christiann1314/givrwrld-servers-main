// Request queue manager for handling traffic bursts
interface QueuedRequest {
  id: string;
  priority: number;
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private concurrentLimit: number;
  private activeRequests = 0;
  private rateLimitPerSecond: number;
  private lastRequestTime = 0;
  private requestCount = 0;
  
  constructor(
    concurrentLimit = 10,
    rateLimitPerSecond = 50
  ) {
    this.concurrentLimit = concurrentLimit;
    this.rateLimitPerSecond = rateLimitPerSecond;
  }

  public enqueue<T>(
    request: () => Promise<T>,
    priority = 1,
    maxRetries = 3
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: `req_${Date.now()}_${Math.random()}`,
        priority,
        request,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0,
        maxRetries,
      };

      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(item => item.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(queuedRequest);
      } else {
        this.queue.splice(insertIndex, 0, queuedRequest);
      }

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.concurrentLimit) {
      const request = this.queue.shift();
      if (!request) break;

      // Rate limiting check
      const now = Date.now();
      if (now - this.lastRequestTime < 1000) {
        if (this.requestCount >= this.rateLimitPerSecond) {
          // Put request back and wait
          this.queue.unshift(request);
          await this.delay(1000 - (now - this.lastRequestTime));
          continue;
        }
      } else {
        this.lastRequestTime = now;
        this.requestCount = 0;
      }

      this.activeRequests++;
      this.requestCount++;
      this.executeRequest(request);
    }

    this.processing = false;
  }

  private async executeRequest(queuedRequest: QueuedRequest): Promise<void> {
    try {
      const result = await queuedRequest.request();
      queuedRequest.resolve(result);
    } catch (error) {
      if (queuedRequest.retries < queuedRequest.maxRetries) {
        queuedRequest.retries++;
        
        // Exponential backoff for retries
        const delay = Math.pow(2, queuedRequest.retries) * 1000;
        setTimeout(() => {
          this.queue.unshift(queuedRequest);
          this.processQueue();
        }, delay);
      } else {
        queuedRequest.reject(error);
      }
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getStats() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      concurrentLimit: this.concurrentLimit,
      rateLimitPerSecond: this.rateLimitPerSecond,
      avgWaitTime: this.calculateAverageWaitTime(),
    };
  }

  private calculateAverageWaitTime(): number {
    if (this.queue.length === 0) return 0;
    
    const now = Date.now();
    const totalWaitTime = this.queue.reduce(
      (sum, req) => sum + (now - req.timestamp),
      0
    );
    
    return totalWaitTime / this.queue.length;
  }

  public clear(): void {
    this.queue.forEach(req => {
      req.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}
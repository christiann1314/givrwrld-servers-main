// Request batching for optimizing multiple simultaneous requests
interface BatchedRequest<T> {
  id: string;
  params: any;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

interface BatchConfig {
  maxBatchSize: number;
  flushInterval: number;
  batchKey: (params: any) => string;
}

export class RequestBatcher<T> {
  private batches = new Map<string, BatchedRequest<T>[]>();
  private timers = new Map<string, NodeJS.Timeout>();
  private config: BatchConfig;
  private batchFunction: (requests: any[]) => Promise<T[]>;

  constructor(
    batchFunction: (requests: any[]) => Promise<T[]>,
    config: Partial<BatchConfig> = {}
  ) {
    this.batchFunction = batchFunction;
    this.config = {
      maxBatchSize: 10,
      flushInterval: 100,
      batchKey: () => 'default',
      ...config,
    };
  }

  public add(params: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: BatchedRequest<T> = {
        id: `req_${Date.now()}_${Math.random()}`,
        params,
        resolve,
        reject,
      };

      const key = this.config.batchKey(params);
      
      if (!this.batches.has(key)) {
        this.batches.set(key, []);
      }

      const batch = this.batches.get(key)!;
      batch.push(request);

      // Flush immediately if batch is full
      if (batch.length >= this.config.maxBatchSize) {
        this.flushBatch(key);
      } else if (!this.timers.has(key)) {
        // Set timer for automatic flush
        const timer = setTimeout(() => {
          this.flushBatch(key);
        }, this.config.flushInterval);
        this.timers.set(key, timer);
      }
    });
  }

  private async flushBatch(key: string): Promise<void> {
    const batch = this.batches.get(key);
    if (!batch || batch.length === 0) return;

    // Clear timer and batch
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    
    this.batches.set(key, []);

    try {
      const params = batch.map(request => request.params);
      const results = await this.batchFunction(params);

      // Resolve individual requests
      batch.forEach((request, index) => {
        if (results[index] !== undefined) {
          request.resolve(results[index]);
        } else {
          request.reject(new Error('No result for request'));
        }
      });
    } catch (error) {
      // Reject all requests in the batch
      batch.forEach(request => {
        request.reject(error);
      });
    }
  }

  public flushAll(): Promise<void[]> {
    const keys = Array.from(this.batches.keys());
    return Promise.all(keys.map(key => this.flushBatch(key)));
  }

  public getStats() {
    let totalPending = 0;
    let activeBatches = 0;

    for (const [, batch] of this.batches.entries()) {
      if (batch.length > 0) {
        activeBatches++;
        totalPending += batch.length;
      }
    }

    return {
      activeBatches,
      totalPending,
      maxBatchSize: this.config.maxBatchSize,
      flushInterval: this.config.flushInterval,
    };
  }

  public destroy(): void {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // Reject all pending requests
    for (const batch of this.batches.values()) {
      batch.forEach(request => {
        request.reject(new Error('Batcher destroyed'));
      });
    }
    this.batches.clear();
  }
}

// Pre-configured batchers for common operations
export const serverStatusBatcher = new RequestBatcher(
  async (serverIds: string[]) => {
    // Batch multiple server status requests
    const { data } = await fetch('/api/servers/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverIds }),
    }).then(res => res.json());
    
    return serverIds.map(id => data.find((s: any) => s.id === id));
  },
  {
    maxBatchSize: 20,
    flushInterval: 50,
    batchKey: () => 'server-status',
  }
);

export const userDataBatcher = new RequestBatcher(
  async (userIds: string[]) => {
    // Batch multiple user data requests
    const { data } = await fetch('/api/users/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds }),
    }).then(res => res.json());
    
    return userIds.map(id => data.find((u: any) => u.id === id));
  },
  {
    maxBatchSize: 50,
    flushInterval: 100,
    batchKey: () => 'user-data',
  }
);
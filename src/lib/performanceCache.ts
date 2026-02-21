// Performance-focused caching strategies
import { localCache } from './cache';

// Image caching with lazy loading
export class ImageCache {
  private static cache = new Map<string, HTMLImageElement>();
  
  static async preload(src: string): Promise<HTMLImageElement> {
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }
  
  static get(src: string): HTMLImageElement | null {
    return this.cache.get(src) || null;
  }
  
  static clear(): void {
    this.cache.clear();
  }
}

// Component state caching for expensive computations
export class ComponentCache {
  private static cache = new Map<string, any>();
  
  static set<T>(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }
  
  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }
  
  static invalidate(keyPattern: string): void {
    for (const [key] of this.cache) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Memory usage monitoring
export const monitorCacheUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      cacheUsage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
};

// Intelligent cache eviction
export const optimizeCacheUsage = () => {
  const usage = monitorCacheUsage();
  if (usage && usage.cacheUsage > 80) {
    // Clear least recently used cache entries
    console.log('High memory usage detected, clearing old cache entries');
    ImageCache.clear();
    ComponentCache.invalidate('temp_');
    
    // Clear old localStorage entries
    const keys = Object.keys(localStorage).filter(k => k.startsWith('givrwrld_'));
    keys.forEach(key => {
      try {
        const item = JSON.parse(localStorage.getItem(key) || '{}');
        if (item.timestamp && Date.now() - item.timestamp > 30 * 60 * 1000) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    });
  }
};
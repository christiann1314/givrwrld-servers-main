// Local storage cache management
class LocalStorageCache {
  private prefix = 'givrwrld_';
  private defaultTTL = 60 * 60 * 1000; // 1 hour

  set<T>(key: string, value: T, ttl?: number): void {
    try {
      const item = {
        value,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to cache item:', key, error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const isExpired = Date.now() - parsed.timestamp > parsed.ttl;

      if (isExpired) {
        this.remove(key);
        return null;
      }

      return parsed.value;
    } catch (error) {
      console.warn('Failed to retrieve cached item:', key, error);
      return null;
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Failed to remove cached item:', key, error);
    }
  }

  clear(): void {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  // Cache user preferences
  setUserPreference(key: string, value: any): void {
    this.set(`user_pref_${key}`, value, 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  getUserPreference<T>(key: string): T | null {
    return this.get<T>(`user_pref_${key}`);
  }

  // Cache API responses
  setAPIResponse(endpoint: string, params: any, response: any): void {
    const cacheKey = `api_${endpoint}_${JSON.stringify(params)}`;
    this.set(cacheKey, response, 5 * 60 * 1000); // 5 minutes
  }

  getAPIResponse<T>(endpoint: string, params: any): T | null {
    const cacheKey = `api_${endpoint}_${JSON.stringify(params)}`;
    return this.get<T>(cacheKey);
  }
}

export const localCache = new LocalStorageCache();
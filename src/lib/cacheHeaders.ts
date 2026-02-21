// HTTP cache configuration for different types of requests
export const cacheHeaders = {
  // Static assets - cache for 1 year
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
  
  // API responses - cache for 5 minutes with revalidation
  api: {
    'Cache-Control': 'public, max-age=300, must-revalidate',
    'ETag': () => Date.now().toString(),
  },
  
  // Real-time data - no cache
  realtime: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  
  // User-specific data - private cache for 1 minute
  userSpecific: {
    'Cache-Control': 'private, max-age=60, must-revalidate',
  },
} as const;

// Cache strategy based on data type
export const getCacheStrategy = (dataType: 'static' | 'api' | 'realtime' | 'userSpecific') => {
  const strategies = {
    static: {
      staleTime: 60 * 60 * 1000, // 1 hour
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
    },
    api: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes
    },
    realtime: {
      staleTime: 0, // Always stale
      gcTime: 30 * 1000, // 30 seconds
    },
    userSpecific: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  };
  
  return strategies[dataType];
};
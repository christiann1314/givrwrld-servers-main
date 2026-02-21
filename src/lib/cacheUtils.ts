import { queryClient, queryKeys } from './queryClient';
import { localCache } from './cache';
import api from '@/lib/api';

// Prefetch commonly used data
export const prefetchCommonData = async () => {
  try {
    // Prefetch static data that doesn't change often
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: queryKeys.plans,
        queryFn: async () => {
          const response = await api.getPlans();
          return response?.plans || [];
        },
        staleTime: 30 * 60 * 1000, // 30 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.games,
        queryFn: async () => {
          // Local backend does not expose games endpoint yet.
          return [];
        },
        staleTime: 30 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.bundles,
        queryFn: async () => {
          // Local backend does not expose bundles endpoint yet.
          return [];
        },
        staleTime: 30 * 60 * 1000,
      }),
    ]);
  } catch (error) {
    console.warn('Failed to prefetch common data:', error);
  }
};

// Cache warm-up for authenticated users
export const warmUpUserCache = async (userId: string) => {
  try {
    // Prefetch user-specific data
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: queryKeys.userServers,
        staleTime: 5 * 60 * 1000, // 5 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.userStats,
        staleTime: 10 * 60 * 1000, // 10 minutes
      }),
    ]);
  } catch (error) {
    console.warn('Failed to warm up user cache:', error);
  }
};

// Clear all caches (useful for logout)
export const clearAllCaches = () => {
  queryClient.clear();
  localCache.clear();
};

// Cache health check
export const getCacheHealth = () => {
  const queryCache = queryClient.getQueryCache();
  const queries = queryCache.getAll();
  
  return {
    totalQueries: queries.length,
    activeQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
    cachedQueries: queries.filter(q => q.state.data !== undefined).length,
    staleQueries: queries.filter(q => q.isStale()).length,
    localStorageUsed: Object.keys(localStorage).filter(k => k.startsWith('givrwrld_')).length,
  };
};

// Background cache refresh for critical data
export const refreshCriticalCache = () => {
  // Refresh user servers in background
  queryClient.refetchQueries({
    queryKey: queryKeys.userServers,
    type: 'active',
  });
  
  // Refresh monitoring data
  queryClient.refetchQueries({
    queryKey: queryKeys.monitoring,
    type: 'active',
  });
};

// Setup automatic cache refresh
export const setupAutomaticCacheRefresh = () => {
  // Refresh critical data every 5 minutes
  setInterval(refreshCriticalCache, 5 * 60 * 1000);
  
  // Clear expired local storage items every hour
  setInterval(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('givrwrld_'));
    keys.forEach(key => {
      try {
        const item = JSON.parse(localStorage.getItem(key) || '{}');
        if (item.timestamp && Date.now() - item.timestamp > item.ttl) {
          localStorage.removeItem(key);
        }
      } catch {
        // Invalid JSON, remove it
        localStorage.removeItem(key);
      }
    });
  }, 60 * 60 * 1000);
};

// Cache debugging utilities
export const debugCache = () => {
  console.group('Cache Debug Info');
  console.log('Cache Health:', getCacheHealth());
  console.log('Query Cache:', queryClient.getQueryCache().getAll());
  console.log('Local Storage Cache:', Object.keys(localStorage).filter(k => k.startsWith('givrwrld_')));
  console.groupEnd();
};
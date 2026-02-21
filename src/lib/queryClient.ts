import { QueryClient } from '@tanstack/react-query';

// Cache configuration for different types of data
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global cache settings
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  // User related
  user: ['user'] as const,
  userProfile: ['user', 'profile'] as const,
  userStats: ['user', 'stats'] as const,
  userServers: ['user', 'servers'] as const,
  
  // Server related
  servers: ['servers'] as const,
  server: (id: string) => ['servers', id] as const,
  serverStatus: (id: string) => ['servers', id, 'status'] as const,
  serverMetrics: (id: string) => ['servers', id, 'metrics'] as const,
  serverConsole: (id: string) => ['servers', id, 'console'] as const,
  
  // Monitoring
  monitoring: ['monitoring'] as const,
  monitoringMetrics: ['monitoring', 'metrics'] as const,
  
  // Billing
  billing: ['billing'] as const,
  purchases: ['billing', 'purchases'] as const,
  
  // Static data (longer cache times)
  plans: ['plans'] as const,
  games: ['games'] as const,
  bundles: ['bundles'] as const,
  addons: ['addons'] as const,
  modpacks: ['modpacks'] as const,
} as const;

// Cache time configurations for different data types
export const cacheConfig = {
  // Static data - cache for 30 minutes
  static: {
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  },
  
  // User data - cache for 5 minutes
  user: {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  
  // Real-time data - cache for 30 seconds
  realtime: {
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  },
  
  // Server status - cache for 1 minute
  serverStatus: {
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  
  // Monitoring data - cache for 2 minutes
  monitoring: {
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
} as const;

// Cache invalidation helpers
export const invalidateQueries = {
  user: () => queryClient.invalidateQueries({ queryKey: queryKeys.user }),
  userServers: () => queryClient.invalidateQueries({ queryKey: queryKeys.userServers }),
  server: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.server(id) }),
  monitoring: () => queryClient.invalidateQueries({ queryKey: queryKeys.monitoring }),
  all: () => queryClient.invalidateQueries(),
} as const;
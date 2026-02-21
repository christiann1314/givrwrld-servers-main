import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trafficManager } from '@/lib/trafficManager';
import { queryKeys } from '@/lib/queryClient';

export const useTrafficManager = () => {
  const queryClient = useQueryClient();

  // Get real-time traffic health data
  const { data: healthStatus, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['traffic', 'health'],
    queryFn: () => trafficManager.getHealthStatus(),
    refetchInterval: 5000, // Update every 5 seconds
    staleTime: 2000,
  });

  // Optimized request function using traffic manager
  const makeOptimizedRequest = useCallback(
    async <T>(
      path: string,
      options: RequestInit = {},
      priority = 1,
      batchKey?: string
    ): Promise<T> => {
      return trafficManager.makeRequest<T>(path, options, priority, batchKey);
    },
    []
  );

  // Emergency mode mutation
  const emergencyModeMutation = useMutation({
    mutationFn: async () => {
      await trafficManager.emergencyMode();
    },
    onSuccess: () => {
      // Invalidate health status to show emergency mode is active
      queryClient.invalidateQueries({ queryKey: ['traffic', 'health'] });
    },
  });

  // High-priority request hook for critical operations
  const makeCriticalRequest = useCallback(
    async <T>(path: string, options: RequestInit = {}): Promise<T> => {
      return makeOptimizedRequest<T>(path, options, 10); // High priority
    },
    [makeOptimizedRequest]
  );

  // Batch request hook for multiple similar requests
  const makeBatchedRequest = useCallback(
    async <T>(
      path: string,
      options: RequestInit = {},
      batchKey: string
    ): Promise<T> => {
      return makeOptimizedRequest<T>(path, options, 1, batchKey);
    },
    [makeOptimizedRequest]
  );

  // Background request hook for non-critical operations
  const makeBackgroundRequest = useCallback(
    async <T>(path: string, options: RequestInit = {}): Promise<T> => {
      return makeOptimizedRequest<T>(path, options, 0.1); // Low priority
    },
    [makeOptimizedRequest]
  );

  return {
    healthStatus,
    isLoadingHealth,
    makeOptimizedRequest,
    makeCriticalRequest,
    makeBatchedRequest,
    makeBackgroundRequest,
    activateEmergencyMode: emergencyModeMutation.mutate,
    isEmergencyModeActivating: emergencyModeMutation.isPending,
  };
};

// Helper hook for server operations with load balancing
export const useOptimizedServerOperations = () => {
  const { makeCriticalRequest, makeBatchedRequest } = useTrafficManager();

  const startServer = useCallback(
    (serverId: string) =>
      makeCriticalRequest('/functions/v1/start-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      }),
    [makeCriticalRequest]
  );

  const stopServer = useCallback(
    (serverId: string) =>
      makeCriticalRequest('/functions/v1/stop-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      }),
    [makeCriticalRequest]
  );

  const getServerStatus = useCallback(
    (serverId: string) =>
      makeBatchedRequest(
        '/functions/v1/get-server-status',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverId }),
        },
        'server-status'
      ),
    [makeBatchedRequest]
  );

  const syncServerStatus = useCallback(
    () =>
      makeCriticalRequest('/functions/v1/sync-server-status', {
        method: 'POST',
      }),
    [makeCriticalRequest]
  );

  return {
    startServer,
    stopServer,
    getServerStatus,
    syncServerStatus,
  };
};
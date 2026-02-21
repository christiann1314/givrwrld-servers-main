import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import { pterodactylService } from '@/services/pterodactylService';

interface ServerData {
  id: string;
  name: string;
  game: string;
  status: 'online' | 'offline' | 'starting' | 'stopping';
  players: number;
  maxPlayers: number;
  uptime: string;
  pterodactylUrl: string;
  specs: string;
  lastSeen: string;
}

interface LiveServerStats {
  servers: ServerData[];
  totalServers: number;
  onlineServers: number;
  totalPlayers: number;
  averageUptime: number;
}

export const useLiveServerData = (refreshInterval: number = 30000) => {
  const { user } = useAuth();
  const [data, setData] = useState<LiveServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchServerData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);

      // Fetch user's servers from API
      const response = await api.getServers();
      
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to fetch server data');
      }

      const userServers = response?.servers || [];

      // Process real server data from orders table with Pterodactyl integration
      const servers: ServerData[] = await pterodactylService.getEnhancedServerData(userServers || []);

        const totalServers = servers.length;
        const onlineServers = servers.filter(s => s.status === 'online').length;
        const totalPlayers = servers.reduce((sum, s) => sum + s.players, 0);
        const averageUptime = servers.reduce((sum, s) => sum + parseFloat(s.uptime), 0) / totalServers;

         setData({
           servers,
           totalServers,
           onlineServers,
           totalPlayers,
           averageUptime
         });
 
       setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch server data');
      console.error('Error fetching live server data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchServerData();
    
    const interval = setInterval(fetchServerData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchServerData, refreshInterval]);

  const refresh = useCallback(() => {
    fetchServerData();
  }, [fetchServerData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh
  };
};

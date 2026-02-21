import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface PterodactylCredentials {
  email: string;
  password: string;
  pterodactyl_user_id: number;
  panel_url: string;
}

export const usePterodactylCredentials = () => {
  const [credentials, setCredentials] = useState<PterodactylCredentials | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const fetchCredentials = async () => {
    if (!isAuthenticated) {
      setError('Authentication required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getPterodactylCredentials();
      if (!response?.success || !response?.credentials) {
        throw new Error(response?.error || response?.message || 'Failed to fetch credentials');
      }

      setCredentials(response.credentials);
      setNeedsSetup(false);
    } catch (err) {
      console.error('Error fetching Pterodactyl credentials:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch credentials');
      setNeedsSetup(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCredentials();
    }
  }, [isAuthenticated, user?.id]);

  const setupPterodactylAccount = async () => {
    if (!isAuthenticated || !user?.email) {
      toast.error('Authentication required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.resetPterodactylCredentials();
      if (!response?.success || !response?.credentials) {
        throw new Error(response?.error || response?.message || 'Failed to set up Pterodactyl credentials');
      }

      setCredentials(response.credentials);
      setNeedsSetup(false);
      setError(null);
      toast.success('Pterodactyl credentials are ready. You can login to the panel now.');
    } catch (err) {
      console.error('Error setting up Pterodactyl account:', err);
      toast.error('Failed to set up Pterodactyl account');
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const fixPterodactylCredentials = async () => {
    if (!isAuthenticated) {
      toast.error('Authentication required');
      return;
    }

    setLoading(true);
    try {
      const data = await api.resetPterodactylCredentials();

      if (data?.success && data?.credentials) {
        toast.success('Pterodactyl credentials fixed! You can now login to the panel.');
        setCredentials(data.credentials);
        setNeedsSetup(false);
        setError(null);
      } else {
        throw new Error(data?.message || 'Failed to fix credentials');
      }
    } catch (err) {
      console.error('Error fixing Pterodactyl credentials:', err);
      toast.error('Failed to fix credentials: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setError(err instanceof Error ? err.message : 'Fix failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    credentials,
    loading,
    error,
    needsSetup,
    refetch: fetchCredentials,
    setupPterodactylAccount,
    fixPterodactylCredentials,
  };
};
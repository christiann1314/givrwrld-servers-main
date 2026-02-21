import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ServerStatus {
  hasServer: boolean;
  serverInfo?: {
    id: string;
    name: string;
    status: string;
    ip: string;
    port: string;
  };
  loading: boolean;
}

export const useServerStatus = (userEmail?: string) => {
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    hasServer: false,
    loading: false
  });
  // toast is now imported directly from sonner

  const checkServerStatus = async () => {
    if (!userEmail) return;
    
    setServerStatus(prev => ({ ...prev, loading: true }));
    
    try {
      // Call Supabase Edge Function instead of Laravel API
      const { data, error } = await supabase.functions.invoke('get-server-status', {
        body: { email: userEmail }
      });
      
      if (error) {
        console.error('Failed to check server status:', error);
        setServerStatus(prev => ({ ...prev, loading: false }));
        return;
      }
      
      setServerStatus({
        hasServer: data.has_server,
        serverInfo: data.server_info,
        loading: false
      });
      
      if (data.has_server && !serverStatus.hasServer) {
        toast({
          title: "Server Ready!",
          description: "Your game server has been provisioned and is ready to use.",
        });
      }
    } catch (error) {
      console.error('Failed to check server status:', error);
      setServerStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Poll every 10 seconds when no server is detected
  useEffect(() => {
    if (!userEmail) return;
    
    checkServerStatus();
    
    const interval = setInterval(() => {
      if (!serverStatus.hasServer) {
        checkServerStatus();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [userEmail, serverStatus.hasServer]);

  return { serverStatus, checkServerStatus };
};
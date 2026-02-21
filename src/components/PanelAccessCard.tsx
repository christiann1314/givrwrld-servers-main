import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '../hooks/useAuth';
import {
  ExternalLink,
  UserPlus,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ExternalAccount {
  user_id: string;
  pterodactyl_user_id: number | null;
  panel_username: string | null;
  last_synced_at: string | null;
}

const PanelAccessCard: React.FC = () => {
  const [externalAccount, setExternalAccount] = React.useState<ExternalAccount | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const { user } = useAuth();
  // toast is now imported directly from sonner

  const fetchExternalAccount = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('external_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching external account:', error);
        toast({
          title: 'Error',
          description: 'Failed to load panel connection status',
          variant: 'destructive'
        });
        return;
      }

      setExternalAccount(data);
    } catch (error) {
      console.error('Failed to fetch external account:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchExternalAccount();
  }, [user?.id]);

  const createPanelAccount = async () => {
    if (!user?.id || !user?.email) {
      toast({
        title: 'Error',
        description: 'User information not available',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Get user profile for names
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const displayName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : (user.email?.split('@')[0] || 'User');
      const [firstName, ...lastNameParts] = displayName.split(' ');
      const lastName = lastNameParts.join(' ') || 'User';

      const response = await supabase.functions.invoke('panel-sync-user', {
        body: {
          user_id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create panel account');
      }

      toast({
        title: 'Panel Account Created',
        description: 'Your game panel account has been created successfully',
      });

      // Refresh the external account data
      await fetchExternalAccount();
    } catch (error: any) {
      console.error('Failed to create panel account:', error);
      toast({
        title: 'Failed to Create Account',
        description: error.message || 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const openPanel = async () => {
    if (!user?.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await supabase.functions.invoke('panel-link', {
        body: { user_id: user.id }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get panel link');
      }

      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        throw new Error('No panel URL returned');
      }
    } catch (error: any) {
      console.error('Failed to open panel:', error);
      toast({
        title: 'Failed to Open Panel',
        description: error.message || 'Please try again later',
        variant: 'destructive'
      });
    }
  };

  const openPasswordReset = () => {
    const panelUrl = 'https://panel.givrwrldservers.com';
    window.open(`${panelUrl}/auth/password`, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="text-blue-400" size={24} />
          <h3 className="text-xl font-bold text-white">Panel Access</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      </div>
    );
  }

  const isConnected = externalAccount?.pterodactyl_user_id && externalAccount?.panel_username;

  return (
    <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/50 rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Shield className="text-blue-400" size={24} />
        <h3 className="text-xl font-bold text-white">Panel Access</h3>
      </div>

      {!isConnected ? (
        <div className="text-center py-6">
          <AlertCircle className="mx-auto text-yellow-400 mb-4" size={48} />
          <h4 className="text-lg font-semibold text-white mb-2">Not Connected</h4>
          <p className="text-gray-400 mb-6">
            Create your game panel account to manage servers directly
          </p>
          <button
            onClick={createPanelAccount}
            disabled={creating}
            className="inline-flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-6 py-3 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <UserPlus size={20} />
                <span>Create Panel Account</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <CheckCircle className="text-emerald-400" size={20} />
            <div>
              <div className="text-white font-semibold">Connected</div>
              <div className="text-emerald-400 text-sm">
                Panel username: {externalAccount.panel_username}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={openPanel}
              className="flex items-center justify-center space-x-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 px-4 py-3 rounded-lg transition-colors"
            >
              <ExternalLink size={16} />
              <span>Open Panel</span>
            </button>
            
            <button
              onClick={openPasswordReset}
              className="flex items-center justify-center space-x-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 px-4 py-3 rounded-lg transition-colors"
            >
              <Shield size={16} />
              <span>Reset Password</span>
            </button>
          </div>

          {externalAccount.last_synced_at && (
            <div className="text-xs text-gray-400 text-center">
              Last synced: {new Date(externalAccount.last_synced_at).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PanelAccessCard;
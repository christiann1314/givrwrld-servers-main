import * as React from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Key, User, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ExternalAccount {
  pterodactyl_user_id: number;
  panel_username: string;
  last_synced_at: string;
}

const PanelAccess = () => {
  const { user } = useAuth();
  const [externalAccount, setExternalAccount] = React.useState<ExternalAccount | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      fetchExternalAccount();
    }
  }, [user]);

  const fetchExternalAccount = async () => {
    try {
      setLoading(true);
      // This would be replaced with actual Supabase query
      // const { data, error } = await supabase
      //   .from('external_accounts')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .single();
      
      // For now, simulate no account
      setExternalAccount(null);
    } catch (error) {
      console.error('Error fetching external account:', error);
      toast.error('Failed to load panel account');
    } finally {
      setLoading(false);
    }
  };

  const createPanelAccount = async () => {
    if (!user) return;

    try {
      setCreating(true);

      const api = (await import("@/lib/api")).default;
      const data = await api.syncPanelUser();
      setExternalAccount({
        pterodactyl_user_id: data.pterodactyl_user_id,
        panel_username: data.panel_username,
        last_synced_at: data.last_synced_at || new Date().toISOString(),
      });

      toast.success('Panel account created successfully!');
    } catch (error) {
      console.error('Error creating panel account:', error);
      toast.error('Failed to create panel account');
    } finally {
      setCreating(false);
    }
  };

  const openPanel = () => {
    window.open(import.meta.env.VITE_PANEL_URL, '_blank');
  };

  const openResetPassword = () => {
    window.open(`${import.meta.env.VITE_PANEL_URL}/auth/password`, '_blank');
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading panel access...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Panel Access</span>
        </CardTitle>
        <CardDescription>
          Manage your game servers through the control panel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {externalAccount ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>Panel account connected</span>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Username:</span>
                <span className="font-mono text-sm">{externalAccount.panel_username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">User ID:</span>
                <span className="font-mono text-sm">{externalAccount.pterodactyl_user_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Last synced:</span>
                <span className="text-sm">
                  {new Date(externalAccount.last_synced_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={openPanel} className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Panel
              </Button>
              <Button variant="outline" onClick={openResetPassword}>
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              <span>No panel account found</span>
            </div>
            
            <p className="text-sm text-gray-400">
              Create a panel account to manage your game servers. This will sync your account with our control panel.
            </p>

            <Button 
              onClick={createPanelAccount} 
              disabled={creating}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Create Panel Account
                </>
              )}
            </Button>
          </div>
        )}

        <div className="pt-4 border-t border-gray-700">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Badge variant="outline" className="text-xs">
              Secure
            </Badge>
            <span>Your panel account is securely linked to your GIVRwrld account</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PanelAccess;


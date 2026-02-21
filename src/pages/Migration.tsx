import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Migration() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  // toast is now imported directly from sonner

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('migrate-pterodactyl-data', {
        body: { action: 'status' }
      });

      if (error) throw error;
      setStatus(data.status);
    } catch (error) {
      console.error('Error checking status:', error);
      toast({
        title: 'Error',
        description: 'Failed to check migration status',
        variant: 'destructive'
      });
    }
  };

  const runMigration = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-pterodactyl-data', {
        body: { action: 'migrate' }
      });

      if (error) throw error;

      toast({
        title: 'Migration Successful',
        description: `Migrated ${data.migrated.users} users and ${data.migrated.nodes} server nodes`,
      });

      // Check status after migration
      await checkStatus();
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: 'Migration Failed',
        description: error.message || 'An error occurred during migration',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Pterodactyl to Supabase Migration</h1>
          <p className="text-muted-foreground mt-2">
            Migrate your existing Pterodactyl users and server data to Supabase
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Migration Status</CardTitle>
              <CardDescription>
                Check the current migration status and run the migration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={checkStatus} variant="outline">
                  Check Status
                </Button>
                <Button 
                  onClick={runMigration} 
                  disabled={isLoading}
                >
                  {isLoading ? 'Migrating...' : 'Run Migration'}
                </Button>
              </div>

              {status && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Current Status:</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Profiles Migrated:</strong> {status.profiles_migrated}</p>
                      <p><strong>Servers Migrated:</strong> {status.servers_migrated}</p>
                    </div>
                    <div>
                      <p><strong>Pterodactyl Users:</strong> {status.pterodactyl_users}</p>
                      <p><strong>Pterodactyl Nodes:</strong> {status.pterodactyl_nodes}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What This Migration Does</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• Migrates Pterodactyl users to Supabase profiles</li>
                <li>• Creates server entries for your 3 nodes (Minecraft, Palworld, Rust)</li>
                <li>• Sets up IP addresses and basic server configurations</li>
                <li>• Establishes connection between Pterodactyl and Supabase systems</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
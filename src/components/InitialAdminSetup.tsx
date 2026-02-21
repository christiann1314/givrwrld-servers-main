import React from 'react';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Shield, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export const InitialAdminSetup = () => {
  const { isAdmin, canBecomeAdmin, loading, assignAdminRole } = useAdminStatus();
  // toast is now imported directly from sonner

  const handleBecomeAdmin = async () => {
    const result = await assignAdminRole();
    
    if (result.success) {
      toast({
        title: "Admin Role Assigned",
        description: "You are now an administrator! Please set up 2FA immediately for security.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to assign admin role. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return null;
  }

  if (isAdmin) {
    return (
      <Alert className="mb-6">
        <Crown className="h-4 w-4" />
        <AlertDescription>
          You have administrator privileges. Make sure 2FA is enabled below for security.
        </AlertDescription>
      </Alert>
    );
  }

  if (canBecomeAdmin) {
    return (
      <Card className="mb-6 border-yellow-500/50 bg-yellow-50/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Initial Setup Required</span>
          </CardTitle>
          <CardDescription>
            No administrators have been set up yet. You can become the first admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              As the first administrator, you'll be able to:
            </p>
            <ul className="text-sm space-y-1 text-gray-600 ml-4">
              <li>• Manage server deployments and configurations</li>
              <li>• Assign roles to other users</li>
              <li>• Access administrative settings</li>
              <li>• Monitor system usage and billing</li>
            </ul>
            <Button onClick={handleBecomeAdmin} className="w-full">
              <Crown className="h-4 w-4 mr-2" />
              Become Administrator
            </Button>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Security Note:</strong> After becoming an admin, you'll be required to enable 
                two-factor authentication immediately for security purposes.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
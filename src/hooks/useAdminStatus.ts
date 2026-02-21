import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AdminStatus {
  isAdmin: boolean;
  canBecomeAdmin: boolean;
  loading: boolean;
}

export const useAdminStatus = () => {
  const { user } = useAuth();
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdmin: false,
    canBecomeAdmin: false,
    loading: true
  });

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      setAdminStatus(prev => ({ ...prev, loading: true }));
      
      // Check if current user is admin
      const { data: adminCheck } = await supabase.functions.invoke('admin-management', {
        body: { action: 'check_admin_status' }
      });

      // Check if any admins exist in the system
      const { data: existingAdmins } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      const canBecomeAdmin = !existingAdmins || existingAdmins.length === 0;

      setAdminStatus({
        isAdmin: adminCheck?.isAdmin || false,
        canBecomeAdmin,
        loading: false
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdminStatus({
        isAdmin: false,
        canBecomeAdmin: false,
        loading: false
      });
    }
  };

  const assignAdminRole = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-management', {
        body: { action: 'assign_admin' }
      });

      if (error) throw error;

      await checkAdminStatus();
      return { success: true, data };
    } catch (error) {
      console.error('Error assigning admin role:', error);
      return { success: false, error };
    }
  };

  return {
    ...adminStatus,
    assignAdminRole,
    refetch: checkAdminStatus
  };
};
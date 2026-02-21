import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface UserStats {
  activeServers: number;
  totalSpent: string;
  supportTickets: number;
  referrals: number;
  loading: boolean;
}

export const useUserStats = (userEmail?: string) => {
  const [userStats, setUserStats] = useState<UserStats>({
    activeServers: 0,
    totalSpent: "$0.00",
    supportTickets: 0,
    referrals: 0,
    loading: false
  });
  // toast is now imported directly from sonner

  const fetchUserStats = async () => {
    if (!userEmail) {
      console.log('No userEmail provided to fetchUserStats');
      return;
    }

    console.log('Fetching stats for user (derived):', userEmail);
    setUserStats(prev => ({ ...prev, loading: true }));

    try {
      // Fetch from API (includes user authentication check)
      const ordersResponse = await api.getOrders();

      let activeServers = 0;
      let totalSpentNum = 0;
      let supportTickets = 0;
      let referrals = 0;

      if (ordersResponse?.success) {
        const orders = ordersResponse?.orders || [];
        activeServers = orders.filter((o: any) => 
          o.item_type === 'game' && ['paid', 'provisioned', 'active'].includes(o.status)
        ).length;
        totalSpentNum = orders
          .filter((order: any) => ['paid', 'provisioning', 'provisioned', 'active'].includes(String(order.status || '').toLowerCase()))
          .reduce((sum: number, order: any) => {
            return sum + Number(order.billed_amount ?? order.total_amount ?? 0);
          }, 0);
      }

      // TODO: Fetch support tickets and referrals from MySQL
      // For now, set to 0 (these tables may not exist in MySQL yet)

      setUserStats({
        activeServers,
        totalSpent: `$${Number(totalSpentNum || 0).toFixed(2)}`,
        supportTickets,
        referrals,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch derived user stats:', error);
      setUserStats({
        activeServers: 0,
        totalSpent: "$0.00",
        supportTickets: 0,
        referrals: 0,
        loading: false,
      });
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchUserStats();
    }
  }, [userEmail]);

    // Set up periodic refresh (MySQL doesn't have real-time subscriptions)
    useEffect(() => {
      if (!userEmail) return;

      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchUserStats();
      }, 30000);

      return () => {
        clearInterval(interval);
      };
    }, [userEmail]);

  return { userStats, refetchStats: fetchUserStats };
};
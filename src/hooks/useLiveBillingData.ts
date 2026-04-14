import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

interface BillingData {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  recentPayments: Payment[];
  upcomingInvoices: Invoice[];
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  description: string;
  date: string;
  paymentMethod: string;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'paid' | 'open' | 'void';
  description: string;
}

export const useLiveBillingData = (refreshInterval: number = 60000) => {
  const { user } = useAuth();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchBillingData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);

      // Fetch user's billing data from API
      const response = await api.getOrders();
      
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to fetch billing data');
      }

      const userOrders = response?.orders || [];

      // Process billing data from orders + plan pricing join.
      const successfulStatuses = new Set([
        'paid',
        'provisioning',
        'provisioned',
        'configuring',
        'verifying',
        'playable',
        'active',
           ]);

      const successfulOrders = (userOrders || []).filter((o: any) =>
        successfulStatuses.has(String(o?.status || '').toLowerCase()),
      );

      const toAmountSafe = (order: any) => {
        const n = Number(order?.billed_amount ?? order?.total_amount ?? order?.price_monthly ?? 0);
        return Number.isFinite(n) ? n : 0;
      };

      const totalRevenue = successfulOrders.reduce((sum, o) => sum + toAmountSafe(o), 0);

      const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const monthlyRevenue = successfulOrders
        .filter((o) => new Date(o.created_at).getTime() > monthAgo)
        .reduce((sum, o) => sum + toAmountSafe(o), 0);

      const payments: Payment[] = successfulOrders.slice(0, 10).map((order: any) => ({
        id: order.id,
        amount: toAmountSafe(order),
        currency: 'USD',
        status: 'succeeded' as Payment['status'],
        description: `${order.server_name} - ${order.plan_id} - ${order.term}`,
        date: order.created_at,
        paymentMethod: 'paypal',
      }));

         setData({
           totalRevenue,
           monthlyRevenue,
           activeSubscriptions: successfulOrders.length,
           recentPayments: payments,
           upcomingInvoices: [] // TODO: Implement invoice fetching
         });
 
       setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch billing data');
      console.error('Error fetching live billing data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBillingData();
    
    const interval = setInterval(fetchBillingData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchBillingData, refreshInterval]);

  const refresh = useCallback(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh
  };
};

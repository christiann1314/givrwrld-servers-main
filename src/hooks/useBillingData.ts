 import { useState, useEffect, useCallback } from 'react';
 import { api } from '@/lib/api';
import { getBundleName } from '../utils/bundleUtils';

interface PaymentMethod {
  id: number;
  type: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface BillingHistoryItem {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: string;
  method: string;
}

interface UpcomingBill {
  service: string;
  amount: string;
  dueDate: string;
  status: string;
}

interface BillingStats {
  currentBalance: string;
  nextPayment: string;
  thisMonth: string;
  paymentMethods: string;
}

interface BillingData {
  stats: BillingStats;
  paymentMethods: PaymentMethod[];
  billingHistory: BillingHistoryItem[];
  upcomingBills: UpcomingBill[];
  loading: boolean;
}

export const useBillingData = (userEmail?: string) => {
  const [billingData, setBillingData] = useState<BillingData>({
    stats: {
      currentBalance: "$0.00",
      nextPayment: "N/A",
      thisMonth: "$0.00",
      paymentMethods: "0"
    },
    paymentMethods: [],
    billingHistory: [],
    upcomingBills: [],
    loading: false
  });

   const fetchBillingData = useCallback(async () => {
    if (!userEmail) return;
    
    setBillingData(prev => ({ ...prev, loading: true }));
    
    try {
       const response = await api.getOrders();
       
       if (!response?.success) {
        setBillingData(prev => ({ ...prev, loading: false }));
        return;
      }

       const orders = response?.orders || [];
       const activeStatuses = new Set(['paid', 'provisioning', 'provisioned', 'active']);
       const toAmount = (order: any) => Number(order?.billed_amount ?? order?.total_amount ?? 0);

      // Calculate stats from real data
       const thisMonthSpent = orders.filter((o: any) => {
         const orderDate = new Date(o.created_at);
        const now = new Date();
         return orderDate.getMonth() === now.getMonth()
           && orderDate.getFullYear() === now.getFullYear()
           && activeStatuses.has(String(o.status || '').toLowerCase());
       }).reduce((sum: number, o: any) => sum + toAmount(o), 0);

      // Transform purchases to billing history
       const billingHistory = orders.map((order: any) => {
         const bundleText = order.bundle_id && order.bundle_id !== 'none' 
           ? ` + ${getBundleName(order.bundle_id)}` 
          : '';
        const amount = toAmount(order);
        return {
           id: order.id,
           date: new Date(order.created_at).toISOString().split('T')[0],
           description: `${order.server_name} - ${order.plan_name || order.plan_id}${bundleText}`,
           amount: `$${amount.toFixed(2)}`,
           status: order.status,
          method: 'PayPal'
        };
       });

      const upcomingBills = orders
        .filter((order: any) => activeStatuses.has(String(order.status || '').toLowerCase()))
        .slice(0, 5)
        .map((order: any) => {
          const created = new Date(order.created_at);
          const next = new Date(created);
          switch (String(order.term || 'monthly').toLowerCase()) {
            case 'quarterly':
              next.setMonth(next.getMonth() + 3);
              break;
            case 'semiannual':
              next.setMonth(next.getMonth() + 6);
              break;
            case 'yearly':
              next.setFullYear(next.getFullYear() + 1);
              break;
            default:
              next.setMonth(next.getMonth() + 1);
          }
          return {
            service: order.server_name || order.plan_name || order.plan_id,
            amount: `$${toAmount(order).toFixed(2)}`,
            dueDate: next.toISOString().split('T')[0],
            status: 'scheduled',
          };
        });

      setBillingData({
        stats: {
          currentBalance: "$0.00",
          nextPayment: upcomingBills[0]?.dueDate || "N/A",
          thisMonth: `$${thisMonthSpent.toFixed(2)}`,
          paymentMethods: "1"
        },
        paymentMethods: upcomingBills.length > 0 ? [
          {
            id: 1,
            type: 'paypal',
            brand: 'PayPal',
            last4: 'N/A',
            expiryMonth: 0,
            expiryYear: 0,
            isDefault: true
          }
        ] : [],
        billingHistory,
        upcomingBills,
        loading: false
      });
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
      setBillingData(prev => ({ ...prev, loading: false }));
    }
   }, [userEmail]);

  useEffect(() => {
    if (userEmail) {
      fetchBillingData();
    }
   }, [userEmail, fetchBillingData]);

  return { billingData, refetchBilling: fetchBillingData };
};
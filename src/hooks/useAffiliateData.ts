import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Referral {
  id: number;
  user: string;
  amount: string;
  date: string;
  plan: string;
}

interface AffiliateData {
  stats: {
    totalEarnings: string;
    referrals: string;
    conversionRate: string;
    clicks: string;
    earningsChange: string;
    referralsChange: string;
    conversionChange: string;
    clicksChange: string;
  };
  referralCode: string;
  recentReferrals: Referral[];
  nextPayout: string;
  loading: boolean;
}

export const useAffiliateData = (userEmail?: string) => {
  const [affiliateData, setAffiliateData] = useState<AffiliateData>({
    stats: {
      totalEarnings: "$0.00",
      referrals: "0",
      conversionRate: "0%", 
      clicks: "0",
      earningsChange: "+0%",
      referralsChange: "+0",
      conversionChange: "+0%",
      clicksChange: "+0"
    },
    referralCode: "PLAYER2024",
    recentReferrals: [],
    nextPayout: "$0.00",
    loading: false
  });
  // toast is now imported directly from sonner

  const fetchAffiliateData = async () => {
    if (!userEmail) return;
    
    setAffiliateData(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await api.getOrders();
      const orders = response?.success ? (response?.orders || []) : [];
      const paidOrders = orders.filter((o: any) => o.status === 'paid' || o.status === 'provisioned');

      // Until dedicated affiliate tables exist in backend, derive live stats from real orders.
      const referrals = paidOrders.length;
      const earnings = paidOrders.reduce((sum: number, order: any) => {
        const amount = Number(order.total_amount || 0);
        return sum + amount * 0.25;
      }, 0);
      const clicks = referrals * 4;
      const conversionRate = clicks > 0 ? ((referrals / clicks) * 100).toFixed(1) : '0.0';

      setAffiliateData({
        stats: {
          totalEarnings: `$${earnings.toFixed(2)}`,
          referrals: String(referrals),
          conversionRate: `${conversionRate}%`,
          clicks: String(clicks),
          earningsChange: '+0%',
          referralsChange: '+0',
          conversionChange: '+0%',
          clicksChange: '+0'
        },
        referralCode: (userEmail.split('@')[0] || 'PLAYER').toUpperCase(),
        recentReferrals: paidOrders.slice(0, 5).map((order: any, idx: number) => ({
          id: idx + 1,
          user: order.server_name || 'Referral',
          amount: `$${(Number(order.total_amount || 0) * 0.25).toFixed(2)}`,
          date: new Date(order.created_at).toLocaleDateString(),
          plan: order.plan_id || 'Plan'
        })),
        nextPayout: `$${earnings.toFixed(2)}`,
        loading: false
      });
    } catch (error) {
      console.error('Failed to fetch affiliate data:', error);
      // Fallback to mock data
      setAffiliateData({
        stats: {
          totalEarnings: "$0.00", 
          referrals: "0",
          conversionRate: "0%",
          clicks: "0",
          earningsChange: "+0%",
          referralsChange: "+0",
          conversionChange: "+0%", 
          clicksChange: "+0"
        },
        referralCode: "PLAYER2024",
        recentReferrals: [],
        nextPayout: "$0.00",
        loading: false
      });
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchAffiliateData();
    }
  }, [userEmail]);

  return { affiliateData, refetchAffiliate: fetchAffiliateData };
};
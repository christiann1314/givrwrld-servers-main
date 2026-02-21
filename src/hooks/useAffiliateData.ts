import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AFFILIATE } from '@/config/affiliate';

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

const defaultStats = {
  totalEarnings: '$0.00',
  referrals: '0',
  conversionRate: '0%',
  clicks: '0',
  earningsChange: '+0%',
  referralsChange: '+0',
  conversionChange: '+0%',
  clicksChange: '+0',
};

export const useAffiliateData = (userEmail?: string) => {
  const [affiliateData, setAffiliateData] = useState<AffiliateData>({
    stats: defaultStats,
    referralCode: 'PLAYER2024',
    recentReferrals: [],
    nextPayout: '$0.00',
    loading: false,
  });

  const fetchAffiliateData = async () => {
    if (!userEmail) return;

    setAffiliateData((prev) => ({ ...prev, loading: true }));

    try {
      const response = await api.getOrders();
      const orders = Array.isArray(response?.orders) ? response.orders : [];

      // Referral earnings come only from referred customers, not the user's own orders.
      // Backend does not yet attribute orders to referrers; when it does, use GET /api/affiliate/stats.
      const referralCode =
        (userEmail.split('@')[0] || 'PLAYER').replace(/\W/g, '').toUpperCase().slice(0, 20) || 'PLAYER';

      setAffiliateData({
        stats: {
          ...defaultStats,
          referrals: '0',
          conversionRate: '0%',
          clicks: '0',
        },
        referralCode,
        recentReferrals: [],
        nextPayout: '$0.00',
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch affiliate data:', error);
      setAffiliateData({
        stats: defaultStats,
        referralCode: (userEmail?.split('@')[0] || 'PLAYER').replace(/\W/g, '').toUpperCase().slice(0, 20) || 'PLAYER2024',
        recentReferrals: [],
        nextPayout: '$0.00',
        loading: false,
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
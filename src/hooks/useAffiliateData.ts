import { useState, useEffect, useCallback } from 'react';
import { getApiBase } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

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

function deriveReferralCodeFromEmail(userEmail?: string): string {
  const raw = (userEmail?.split('@')[0] || 'PLAYER').replace(/\W/g, '').toUpperCase().slice(0, 20);
  return raw || 'PLAYER';
}

function apiOrigin(): string {
  return getApiBase().replace(/\/+$/, '');
}

async function fetchJson<T>(path: string, token: string | null): Promise<{ ok: boolean; data: T | null }> {
  const headers: HeadersInit = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${apiOrigin()}${path}`, { headers, credentials: 'include' });
    if (!res.ok) return { ok: false, data: null };
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, data: null };
  }
}

function formatUsdFromNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatUsdFromCents(cents: number): string {
  return formatUsdFromNumber(cents / 100);
}

function pickFiniteNumber(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function formatChangePercent(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n}%`;
}

function formatChangeInt(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n}`;
}

/** Map API payload (stats endpoint and/or affiliate row) onto display fields; missing keys keep defaults. */
function mergeStatsFromApi(raw: Record<string, unknown> | null | undefined): Partial<AffiliateData['stats']> {
  if (!raw || typeof raw !== 'object') return {};

  const totalEarningsCents = pickFiniteNumber(
    raw.credits_cents,
    raw.creditsCents,
    raw.total_earnings_cents,
    raw.totalEarningsCents
  );
  const totalEarningsUsd = pickFiniteNumber(raw.total_earnings_usd, raw.totalEarningsUsd, raw.earnings_usd, raw.earningsUsd);

  let totalEarnings: string | undefined;
  if (typeof raw.totalEarnings === 'string' && raw.totalEarnings.trim()) totalEarnings = raw.totalEarnings;
  else if (typeof raw.total_earnings === 'string' && raw.total_earnings.trim()) totalEarnings = raw.total_earnings;
  else if (totalEarningsCents !== undefined) totalEarnings = formatUsdFromCents(totalEarningsCents);
  else if (totalEarningsUsd !== undefined) totalEarnings = formatUsdFromNumber(totalEarningsUsd);

  const referralsN = pickFiniteNumber(raw.referrals, raw.referral_count, raw.signups, raw.referralCount);
  const clicksN = pickFiniteNumber(raw.clicks, raw.click_count, raw.clickCount);

  let conversionRate: string | undefined;
  const convRaw = raw.conversionRate ?? raw.conversion_rate;
  if (typeof convRaw === 'string' && convRaw.trim()) {
    conversionRate = convRaw.includes('%') ? convRaw : `${convRaw}%`;
  } else if (typeof convRaw === 'number' && Number.isFinite(convRaw)) {
    conversionRate = convRaw <= 1 && convRaw >= 0 ? `${Math.round(convRaw * 100)}%` : `${Math.round(convRaw)}%`;
  } else if (clicksN !== undefined && clicksN > 0 && referralsN !== undefined) {
    conversionRate = `${Math.round((referralsN / clicksN) * 10000) / 100}%`;
  }

  const patch: Partial<AffiliateData['stats']> = {};
  if (totalEarnings) patch.totalEarnings = totalEarnings;
  if (referralsN !== undefined) patch.referrals = String(Math.max(0, Math.floor(referralsN)));
  if (clicksN !== undefined) patch.clicks = String(Math.max(0, Math.floor(clicksN)));
  if (conversionRate) patch.conversionRate = conversionRate;

  const ec = raw.earningsChange ?? raw.earnings_change;
  if (typeof ec === 'number' && Number.isFinite(ec)) patch.earningsChange = formatChangePercent(ec);
  else if (typeof ec === 'string' && ec.trim()) patch.earningsChange = ec;

  const rc = raw.referralsChange ?? raw.referrals_change;
  if (typeof rc === 'number' && Number.isFinite(rc)) patch.referralsChange = formatChangeInt(rc);
  else if (typeof rc === 'string' && rc.trim()) patch.referralsChange = rc;

  const cc = raw.conversionChange ?? raw.conversion_change;
  if (typeof cc === 'number' && Number.isFinite(cc)) patch.conversionChange = formatChangePercent(cc);
  else if (typeof cc === 'string' && cc.trim()) patch.conversionChange = cc;

  const clkc = raw.clicksChange ?? raw.clicks_change;
  if (typeof clkc === 'number' && Number.isFinite(clkc)) patch.clicksChange = formatChangePercent(clkc);
  else if (typeof clkc === 'string' && clkc.trim()) patch.clicksChange = clkc;

  return patch;
}

function normalizeRecentReferrals(raw: unknown): Referral[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, idx) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const id = pickFiniteNumber(r.id, r.order_id) ?? idx;
      const user = typeof r.user === 'string' ? r.user : typeof r.email === 'string' ? r.email : 'Customer';
      const amount =
        typeof r.amount === 'string'
          ? r.amount
          : r.amount_cents !== undefined
            ? formatUsdFromCents(pickFiniteNumber(r.amount_cents) ?? 0)
            : '$0.00';
      const date = typeof r.date === 'string' ? r.date : typeof r.created_at === 'string' ? r.created_at : '';
      const plan = typeof r.plan === 'string' ? r.plan : typeof r.plan_name === 'string' ? r.plan_name : '—';
      return { id: Number(id), user, amount, date, plan };
    })
    .filter((x): x is Referral => x !== null);
}

function initialState(userEmail?: string): AffiliateData {
  return {
    stats: { ...defaultStats },
    referralCode: deriveReferralCodeFromEmail(userEmail),
    recentReferrals: [],
    nextPayout: '$0.00',
    loading: false,
  };
}

export const useAffiliateData = (userEmail?: string) => {
  const [affiliateData, setAffiliateData] = useState<AffiliateData>(() => initialState(userEmail));

  const fetchAffiliateData = useCallback(async () => {
    if (!userEmail) return;

    const token = getAccessToken();
    setAffiliateData((prev) => ({ ...prev, loading: true }));

    const fallbackCode = deriveReferralCodeFromEmail(userEmail);

    if (!token) {
      setAffiliateData({
        ...initialState(userEmail),
        referralCode: fallbackCode,
        loading: false,
      });
      return;
    }

    try {
      const [meRes, statsRes] = await Promise.all([
        fetchJson<{ success?: boolean; affiliate?: Record<string, unknown> | null }>('/api/affiliates/me', token),
        fetchJson<Record<string, unknown>>('/api/affiliates/stats', token),
      ]);

      let referralCode = fallbackCode;
      if (meRes.ok && meRes.data?.success && meRes.data.affiliate && typeof meRes.data.affiliate === 'object') {
        const code = meRes.data.affiliate.code;
        if (typeof code === 'string' && code.trim()) referralCode = code.trim();
      }

      const statsPayload =
        statsRes.ok && statsRes.data && typeof statsRes.data === 'object'
          ? (statsRes.data.stats && typeof statsRes.data.stats === 'object'
              ? (statsRes.data.stats as Record<string, unknown>)
              : statsRes.data)
          : null;

      const fromMeAffiliate =
        meRes.ok && meRes.data?.affiliate && typeof meRes.data.affiliate === 'object'
          ? (meRes.data.affiliate as Record<string, unknown>)
          : null;

      const statsPatch = {
        ...mergeStatsFromApi(fromMeAffiliate),
        ...mergeStatsFromApi(statsPayload),
      };

      const stats = { ...defaultStats, ...statsPatch };

      let recentReferrals: Referral[] = [];
      let nextPayout = '$0.00';

      if (statsRes.ok && statsRes.data && typeof statsRes.data === 'object') {
        const d = statsRes.data as Record<string, unknown>;
        const list = d.recentReferrals ?? d.recent_referrals ?? d.referrals_list;
        recentReferrals = normalizeRecentReferrals(list);
        const np = d.nextPayout ?? d.next_payout;
        if (typeof np === 'string' && np.trim()) nextPayout = np;
        else if (typeof np === 'number' && Number.isFinite(np)) nextPayout = formatUsdFromNumber(np);
      }

      setAffiliateData({
        stats,
        referralCode,
        recentReferrals,
        nextPayout,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch affiliate data:', error);
      setAffiliateData({
        stats: { ...defaultStats },
        referralCode: fallbackCode,
        recentReferrals: [],
        nextPayout: '$0.00',
        loading: false,
      });
    }
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) {
      void fetchAffiliateData();
    }
  }, [userEmail, fetchAffiliateData]);

  return { affiliateData, refetchAffiliate: fetchAffiliateData };
};

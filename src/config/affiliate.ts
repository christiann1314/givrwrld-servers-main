/**
 * Affiliate program: single source of truth for rates, caps, tiers, and display.
 * Public page and dashboard both read from this config to stay in sync.
 */

export const AFFILIATE = {
  /** Base commission on referred customer payments (0–1). */
  commissionRateDefault: 0.20,
  /** Mid‑tier commission (for consistent promoters). */
  commissionRateGrowth: 0.22,
  /** Performance tier commission (top partners). */
  commissionRatePerformance: 0.25,
  /** Only pay commission on first N months of each referred customer's payments. */
  commissionMonthsCap: 12,
  /** Minimum payout in USD. */
  minPayoutUsd: 50,
  /** Referral link attribution cookie duration in days. */
  cookieDurationDays: 90,
  /** Payment schedule label. */
  paymentSchedule: 'Monthly' as const,
  /** Performance tier: min referrals in rolling 90 days to get performance rate. */
  performanceTierMinReferrals: 50,
  /** Welcome bonus in USD for new affiliates. */
  welcomeBonusUsd: 5,
} as const;

export type AffiliateTier = {
  id: string;
  name: string;
  minReferrals: number;
  description: string;
  commissionRate: number;
  highlight?: boolean;
};

export const AFFILIATE_TIERS: AffiliateTier[] = [
  {
    id: 'starter',
    name: 'Tier 1 (10 referrals)',
    minReferrals: 10,
    description: 'Standard commission on new qualifying sign‑ups once you reach 10 active referrals.',
    commissionRate: AFFILIATE.commissionRateDefault,
  },
  {
    id: 'growth',
    name: 'Tier 2 (25 referrals)',
    minReferrals: 25,
    description: 'Increased commission rate and additional promo opportunities for consistent promoters.',
    commissionRate: AFFILIATE.commissionRateGrowth,
    highlight: true,
  },
  {
    id: 'elite',
    name: 'Tier 3 (50 referrals)',
    minReferrals: 50,
    description: 'Highest commission rate plus eligibility for custom partner deals and co‑marketing.',
    commissionRate: AFFILIATE.commissionRatePerformance,
  },
];

/** Display: given rate as percentage string. */
export const affiliatePercentFromRate = (rate: number): string =>
  `${Math.round(rate * 100)}%`;

/** Display: default commission as percentage string. */
export const affiliateCommissionPercent = (): string =>
  affiliatePercentFromRate(AFFILIATE.commissionRateDefault);

/** Display: performance commission as percentage string. */
export const affiliatePerformanceCommissionPercent = (): string =>
  affiliatePercentFromRate(AFFILIATE.commissionRatePerformance);

/** Display: commission cap in months. */
export const affiliateCommissionMonthsCap = (): number =>
  AFFILIATE.commissionMonthsCap;

/** Display: minimum payout. */
export const affiliateMinPayout = (): string =>
  `$${AFFILIATE.minPayoutUsd}.00`;

/** Display: cookie duration. */
export const affiliateCookieDays = (): number =>
  AFFILIATE.cookieDurationDays;

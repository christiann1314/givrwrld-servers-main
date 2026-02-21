/**
 * Affiliate program: single source of truth for rates, caps, and display.
 * Aligned with docs/AFFILIATE-PROGRAM.md (market analysis & profit model).
 */

export const AFFILIATE = {
  /** Base commission on referred customer payments (0–1). */
  commissionRateDefault: 0.2,
  /** Performance tier commission (e.g. ≥5 referrals in 90 days). */
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
  performanceTierMinReferrals: 5,
} as const;

/** Display: default commission as percentage string. */
export const affiliateCommissionPercent = (): string =>
  `${Math.round(AFFILIATE.commissionRateDefault * 100)}%`;

/** Display: performance commission as percentage string. */
export const affiliatePerformanceCommissionPercent = (): string =>
  `${Math.round(AFFILIATE.commissionRatePerformance * 100)}%`;

/** Display: commission cap in months. */
export const affiliateCommissionMonthsCap = (): number =>
  AFFILIATE.commissionMonthsCap;

/** Display: minimum payout. */
export const affiliateMinPayout = (): string =>
  `$${AFFILIATE.minPayoutUsd}.00`;

/** Display: cookie duration. */
export const affiliateCookieDays = (): number =>
  AFFILIATE.cookieDurationDays;

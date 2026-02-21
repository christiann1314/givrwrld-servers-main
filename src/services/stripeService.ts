
import { api } from '@/lib/api';

export type BillingTerm = 'monthly' | 'quarterly' | 'semiannual' | 'yearly';

export interface CheckoutSessionData {
  item_type: 'game' | 'vps' | 'upgrade' | 'bundle' | 'addon';
  plan_id: string;
  region: string;
  server_name: string;
  modpack_id?: string;
  term: BillingTerm;
  addons?: string[];
  success_url?: string;
  cancel_url?: string;
  amount?: number;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
}

export const stripeService = {
  async createCheckoutSession(data: CheckoutSessionData): Promise<CheckoutSessionResponse> {
    console.log('Creating PayPal checkout session with API:', data);

    const normalizeRegion = (_region: string): string => {
      // Only US East is offered at launch.
      return 'us-east';
    };

    let resolvedPlanId = data.plan_id;
    if (data.item_type === 'game') {
      try {
        const plansResponse = await api.getPlans();
        if (plansResponse?.success) {
          const activePlans = (plansResponse?.plans || []).filter((p: any) => Number(p?.is_active) === 1);
          const exact = activePlans.find((p: any) => p?.id === data.plan_id);

          if (!exact) {
            const requestedPrefix = (data.plan_id || '').split('-')[0].toLowerCase();
            const gameAlias: Record<string, string> = {
              mc: 'minecraft',
            };
            const normalizedGame = gameAlias[requestedPrefix] || requestedPrefix;

            const gameCandidates = activePlans
              .filter((p: any) => String(p?.game || '').toLowerCase() === normalizedGame)
              .sort((a: any, b: any) => Number(a?.ram_gb || 0) - Number(b?.ram_gb || 0));

            if (gameCandidates.length > 0) {
              resolvedPlanId = gameCandidates[0].id;
              console.warn(`Resolved stale plan "${data.plan_id}" to active local plan "${resolvedPlanId}".`);
            }
          }

          if (!activePlans.some((p: any) => p?.id === resolvedPlanId)) {
            throw new Error('No active plan available for this game in local MariaDB.');
          }
        }
      } catch (err) {
        // Keep explicit failure for a clean purchase flow instead of creating a broken checkout.
        const message = err instanceof Error ? err.message : 'Unable to validate active plans.';
        throw new Error(message);
      }
    }

    const response = await api.createCheckoutSession({
      ...data,
      plan_id: resolvedPlanId,
      term: data.term,
      region: normalizeRegion(data.region),
      success_url: data.success_url || `${window.location.origin}/success`,
      cancel_url: data.cancel_url || `${window.location.origin}/dashboard`,
    });

    if (!response?.success) {
      console.error('API error:', response?.error);
      throw new Error(response?.error || 'Failed to create checkout session');
    }

    // Backend may return top-level { url } or nested data.url shape.
    const checkoutUrl =
      (response as any)?.url ||
      (response as any)?.checkout_url ||
      (response as any)?.data?.url ||
      (response as any)?.data?.checkout_url;
    if (!checkoutUrl) {
      throw new Error('No checkout URL received from server');
    }

    return { checkout_url: checkoutUrl };
  }
};

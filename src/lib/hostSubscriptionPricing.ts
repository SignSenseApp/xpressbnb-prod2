/** Host subscription pricing — mirrors supabase/functions/_shared/host-subscription.ts */

export type HostPlanTier = 'standard_999' | 'premium_2999';
export type HostBillingCycle = 'monthly' | 'yearly';

export const YEARLY_DISCOUNT_PERCENT = 12;

export const PLAN_TIER_LABELS: Record<HostPlanTier, string> = {
  standard_999: 'Standard',
  premium_2999: 'Premium',
};

const TIER_MONTHLY_INR: Record<HostPlanTier, number> = {
  standard_999: 999,
  premium_2999: 2999,
};

export function monthlyPriceInr(planTier: HostPlanTier): number {
  return TIER_MONTHLY_INR[planTier];
}

export function subscriptionAmountInr(
  planTier: HostPlanTier,
  billingCycle: HostBillingCycle,
): number {
  const monthly = TIER_MONTHLY_INR[planTier];
  if (billingCycle === 'monthly') return monthly;
  return Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100));
}

/** Effective monthly rate when billed yearly (for UI). */
export function yearlyEffectiveMonthlyInr(planTier: HostPlanTier): number {
  return Math.round(monthlyPriceInr(planTier) * (1 - YEARLY_DISCOUNT_PERCENT / 100));
}

export function formatInr(amount: number): string {
  return amount.toLocaleString('en-IN');
}

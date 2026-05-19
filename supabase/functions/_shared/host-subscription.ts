/** Host dashboard subscription pricing — server-side source of truth. */

export type HostPlanTier = 'standard_999' | 'premium_2999';
export type HostBillingCycle = 'monthly' | 'yearly';

export const YEARLY_DISCOUNT_PERCENT = 12;

const TIER_MONTHLY_INR: Record<HostPlanTier, number> = {
  standard_999: 999,
  premium_2999: 2999,
};

export function isHostPlanTier(value: string): value is HostPlanTier {
  return value === 'standard_999' || value === 'premium_2999';
}

export function isHostBillingCycle(value: string): value is HostBillingCycle {
  return value === 'monthly' || value === 'yearly';
}

/** Charge amount in INR (rupees, not paise). */
export function subscriptionAmountInr(
  planTier: HostPlanTier,
  billingCycle: HostBillingCycle,
): number {
  const monthly = TIER_MONTHLY_INR[planTier];
  if (billingCycle === 'monthly') return monthly;
  return Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100));
}

export function subscriptionEndDate(
  billingCycle: HostBillingCycle,
  from = new Date(),
): Date {
  const end = new Date(from);
  if (billingCycle === 'yearly') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

export function hostSubscriptionReceipt(propertyId: string): string {
  const compact = propertyId.replace(/-/g, '').slice(0, 10);
  const suffix = Date.now().toString(36);
  return `hs${compact}${suffix}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
}

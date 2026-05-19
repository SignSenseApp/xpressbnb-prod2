import type { HostPlanTier } from './hostSubscriptionPricing';

/** Premium-only capabilities — UI shows "Coming soon" until implemented. */
export const PREMIUM_FEATURE_FLAGS = {
  analytics: false,
  calendarSync: false,
  verifiedBadge: false,
  featured: false,
} as const;

export type PremiumFeatureKey = keyof typeof PREMIUM_FEATURE_FLAGS;

export function hasPlanTierAccess(
  activeTier: HostPlanTier | 'free' | null | undefined,
  required: HostPlanTier,
): boolean {
  if (!activeTier || activeTier === 'free') return false;
  if (required === 'standard_999') {
    return activeTier === 'standard_999' || activeTier === 'premium_2999';
  }
  return activeTier === 'premium_2999';
}

export function isPremiumFeatureBuilt(feature: PremiumFeatureKey): boolean {
  return PREMIUM_FEATURE_FLAGS[feature];
}

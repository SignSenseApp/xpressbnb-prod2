import { supabase } from './supabase';

export interface Property {
  id: string;
  is_premium: boolean;
  premium_plan: 'FREE' | 'PAID';
  premium_expiry: string | null;
  listing_type: 'free' | 'paid';
}

export const PREMIUM_PRICE = 999;

export function hasPremiumAccess(property: Property | null | undefined): boolean {
  if (!property) return false;

  if (!property.is_premium || property.premium_plan !== 'PAID') {
    return false;
  }

  if (property.premium_expiry) {
    const expiryDate = new Date(property.premium_expiry);
    if (expiryDate < new Date()) {
      return false;
    }
  }

  return true;
}

export async function checkPremiumStatus(propertyId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('is_premium, premium_plan, premium_expiry')
      .eq('id', propertyId)
      .maybeSingle();

    if (error || !data) return false;

    return hasPremiumAccess(data as Property);
  } catch {
    return false;
  }
}

export function getPremiumBadgeText(property: Property | null | undefined): string {
  if (hasPremiumAccess(property)) {
    return 'Premium Active';
  }
  return 'Upgrade to Premium';
}

export function shouldShowPremiumFeature(property: Property | null | undefined): {
  show: boolean;
  locked: boolean;
  message: string;
} {
  const hasAccess = hasPremiumAccess(property);

  if (hasAccess) {
    return {
      show: true,
      locked: false,
      message: '',
    };
  }

  return {
    show: true,
    locked: true,
    message: `Upgrade to Paid Listing (₹${PREMIUM_PRICE}/month)`,
  };
}

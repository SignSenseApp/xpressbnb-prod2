import { supabase } from './supabase';

// `premium_plan` is currently stored as a free-form string in the DB (see
// database.types.ts → properties.premium_plan: string). Keep this contract
// permissive so the premium helpers work with rows that haven't been
// constrained to the FREE/PAID literal set yet. We deliberately omit
// `listing_type` here — the helpers below never read it — so any minimal
// projection of a property row can be passed in.
export interface Property {
  id: string;
  is_premium: boolean;
  premium_plan: string;
  premium_expiry: string | null;
}

export const STANDARD_PRICE_INR = 999;
export const PREMIUM_PRICE_INR = 2999;
/** @deprecated Use STANDARD_PRICE_INR */
export const PREMIUM_PRICE = STANDARD_PRICE_INR;

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
    message: `Upgrade to Standard (₹${STANDARD_PRICE_INR}/mo) or Premium (₹${PREMIUM_PRICE_INR}/mo)`,
  };
}

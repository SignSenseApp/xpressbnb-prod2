/**
 * @deprecated Import from `guestPricingEngine` directly.
 * Thin facade kept for gradual migration of legacy import paths.
 */
import type { Property } from './database.types';
import {
  buildGuestPricingQuote,
  type GuestPricingQuote,
  type GuestPricingLine,
  formatInr,
  DECORATION_ADDON_INR,
  GUEST_PRICING_CURRENCY,
} from './guestPricingEngine';

export type { GuestPricingQuote, GuestPricingLine };
export { buildGuestPricingQuote, formatInr, DECORATION_ADDON_INR, GUEST_PRICING_CURRENCY };

/** @deprecated Use GuestPricingQuote from buildGuestPricingQuote */
export interface BookingTotalBreakdown {
  baseTotal: number;
  fees: number;
  taxes: number;
  grandTotal: number;
  cleaningFee: number;
  serviceFee: number;
}

/**
 * @deprecated Use buildGuestPricingQuote — no longer adds cleaning/service fees.
 */
export function calculateBookingTotal(
  basePrice: number,
  nights: number,
  guests: number,
  property: Property,
): BookingTotalBreakdown {
  const quote = buildGuestPricingQuote({
    property,
    accommodationSubtotal: basePrice,
    nights,
    numGuests: guests,
  });
  return {
    baseTotal: quote.accommodationSubtotal,
    fees: 0,
    taxes: 0,
    grandTotal: quote.guestTotal,
    cleaningFee: 0,
    serviceFee: 0,
  };
}

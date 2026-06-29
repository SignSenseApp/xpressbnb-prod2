import { describe, expect, it } from 'vitest';
import {
  buildGuestPricingQuote,
  DECORATION_ADDON_INR,
  formatInr,
} from './guestPricingEngine';
import type { Property } from './database.types';

const baseProperty = {
  id: 'p1',
  title: 'Test Stay',
  price_per_day: 2400,
} as Property;

describe('buildGuestPricingQuote', () => {
  it('returns accommodation subtotal as guest total with no fake fees', () => {
    const quote = buildGuestPricingQuote({
      property: baseProperty,
      accommodationSubtotal: 4800,
      nights: 2,
    });
    expect(quote.guestTotal).toBe(4800);
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0]?.amount).toBe(4800);
  });

  it('applies property offer discount before total', () => {
    const quote = buildGuestPricingQuote({
      property: { ...baseProperty, discount_percent: 10 } as Property,
      accommodationSubtotal: 4800,
      nights: 2,
    });
    expect(quote.guestTotal).toBe(4320);
    expect(quote.lines.some((l) => l.id === 'property-offer')).toBe(true);
  });

  it('includes decoration only when opted in', () => {
    const without = buildGuestPricingQuote({
      property: baseProperty,
      accommodationSubtotal: 3000,
      nights: 1,
      includeDecoration: false,
    });
    const withDeco = buildGuestPricingQuote({
      property: baseProperty,
      accommodationSubtotal: 3000,
      nights: 1,
      includeDecoration: true,
    });
    expect(without.guestTotal).toBe(3000);
    expect(withDeco.guestTotal).toBe(3000 + DECORATION_ADDON_INR);
  });

  it('returns zero quote for invalid nights', () => {
    const quote = buildGuestPricingQuote({
      property: baseProperty,
      accommodationSubtotal: 4800,
      nights: 0,
    });
    expect(quote.guestTotal).toBe(0);
  });

  it('formatInr uses Indian grouping', () => {
    expect(formatInr(5120)).toBe('₹5,120');
  });
});

describe('calculateBookingTotal facade', () => {
  it('matches guest engine grand total', async () => {
    const { calculateBookingTotal } = await import('./pricingUtils');
    const breakdown = calculateBookingTotal(4800, 2, 2, baseProperty);
    expect(breakdown.grandTotal).toBe(4800);
    expect(breakdown.serviceFee).toBe(0);
    expect(breakdown.cleaningFee).toBe(0);
  });
});

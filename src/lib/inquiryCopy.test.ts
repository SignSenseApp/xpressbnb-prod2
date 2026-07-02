import { describe, expect, it } from 'vitest';
import { inquiryCtaLabel, openingArrivalCtaLabel } from './inquiryCopy';

describe('inquiryCopy', () => {
  it('uses inquiry labels per context', () => {
    expect(inquiryCtaLabel('property_no_dates')).toBe('Choose your stay');
    expect(inquiryCtaLabel('property_with_dates')).toBe('Send your request');
    expect(inquiryCtaLabel('host_card')).toBe('Request to book');
    expect(inquiryCtaLabel('form_submit')).toBe('Send your request');
  });

  it('uses editorial arrival labels for the opening spread', () => {
    expect(openingArrivalCtaLabel(false)).toBe('Begin your stay');
    expect(openingArrivalCtaLabel(true)).toBe('Continue to reservation');
  });
});

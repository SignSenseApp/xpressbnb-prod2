import { describe, expect, it } from 'vitest';
import { inquiryCtaLabel } from './inquiryCopy';

describe('inquiryCopy', () => {
  it('uses inquiry-first labels per context', () => {
    expect(inquiryCtaLabel('property_no_dates')).toBe('Check availability');
    expect(inquiryCtaLabel('property_with_dates')).toBe('Send inquiry');
    expect(inquiryCtaLabel('host_card')).toBe('Ask about this stay');
    expect(inquiryCtaLabel('form_submit')).toBe('Send inquiry');
  });
});

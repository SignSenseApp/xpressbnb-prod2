import { describe, expect, it } from 'vitest';
import { inquiryCtaLabel } from './inquiryCopy';

describe('inquiryCopy', () => {
  it('uses request-to-book labels per context', () => {
    expect(inquiryCtaLabel('property_no_dates')).toBe('Check availability');
    expect(inquiryCtaLabel('property_with_dates')).toBe('Request to book');
    expect(inquiryCtaLabel('host_card')).toBe('Request to book');
    expect(inquiryCtaLabel('form_submit')).toBe('Request to book');
  });
});

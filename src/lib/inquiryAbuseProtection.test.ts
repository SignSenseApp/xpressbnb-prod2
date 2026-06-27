import { describe, expect, it } from 'vitest';
import {
  buildInquiryAbusePayload,
  getInquiryInteractionMs,
  isInquiryInteractionTooFast,
  INQUIRY_MIN_INTERACTION_MS,
} from './inquiryAbuseProtection';

describe('inquiryAbuseProtection', () => {
  it('builds abuse payload with honeypot field', () => {
    const opened = 1_700_000_000_000;
    expect(buildInquiryAbusePayload(opened, '')).toEqual({
      form_opened_at: opened,
      company_website: '',
    });
  });

  it('detects too-fast interaction', () => {
    const opened = Date.now() - 500;
    expect(isInquiryInteractionTooFast(opened)).toBe(true);
    expect(getInquiryInteractionMs(opened)).toBeLessThan(INQUIRY_MIN_INTERACTION_MS);
  });

  it('allows interaction after minimum time', () => {
    const opened = Date.now() - INQUIRY_MIN_INTERACTION_MS - 100;
    expect(isInquiryInteractionTooFast(opened)).toBe(false);
  });
});

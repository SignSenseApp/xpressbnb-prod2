import { describe, expect, it } from 'vitest';
import { validateInquiryAbuse } from './inquiry-abuse.ts';

describe('validateInquiryAbuse', () => {
  const now = 1_700_000_010_000;
  const opened = now - 5000;

  it('rejects filled honeypot', () => {
    const result = validateInquiryAbuse(
      { honeypot: 'http://spam.test', form_opened_at: opened, check_in: '2026-07-01', check_out: '2026-07-03' },
      now,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects too-fast submission', () => {
    const result = validateInquiryAbuse(
      { honeypot: '', form_opened_at: now - 1000, check_in: '2026-07-01', check_out: '2026-07-03' },
      now,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(429);
  });

  it('rejects invalid date range', () => {
    const result = validateInquiryAbuse(
      { honeypot: '', form_opened_at: opened, check_in: '2026-07-05', check_out: '2026-07-03' },
      now,
    );
    expect(result.ok).toBe(false);
  });

  it('accepts valid submission signals', () => {
    const futureIn = '2030-07-01';
    const futureOut = '2030-07-03';
    const result = validateInquiryAbuse(
      { honeypot: '', form_opened_at: opened, check_in: futureIn, check_out: futureOut },
      now,
    );
    expect(result.ok).toBe(true);
  });
});

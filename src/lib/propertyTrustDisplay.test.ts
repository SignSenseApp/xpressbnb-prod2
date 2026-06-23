import { describe, expect, it } from 'vitest';
import { getPropertyTrustChipLabel, getPropertyTrustDisplay } from './propertyTrustDisplay';

describe('propertyTrustDisplay', () => {
  it('shows verified external rating when ops data is valid', () => {
    const display = getPropertyTrustDisplay({
      external_listings: [
        {
          source: 'airbnb',
          url: 'https://airbnb.com/rooms/1',
          listing_title: 'Riverside Cottage',
          rating: 4.7,
          review_count: 18,
          verified_by_ops: true,
          checked_at: new Date().toISOString(),
        },
      ],
      is_verified: true,
    });
    expect(display.kind).toBe('verified_external_rating');
    if (display.kind === 'verified_external_rating') {
      expect(display.label).toContain('4.7');
      expect(display.label).toContain('Airbnb');
    }
  });

  it('ignores malformed external listing safely', () => {
    const display = getPropertyTrustDisplay({
      external_listings: [{ rating: 5, source: 'airbnb' }],
      is_verified: true,
    });
    expect(display.kind).toBe('trust_chip');
  });

  it('falls back to trust chip when no verified rating', () => {
    const display = getPropertyTrustDisplay({
      external_listings: null,
      is_verified: false,
      created_at: '2020-01-01T00:00:00Z',
    });
    expect(display.kind).toBe('trust_chip');
    expect(display.label).toBe('Direct host booking');
  });

  it('handles partial listing without throwing', () => {
    expect(() => getPropertyTrustDisplay({})).not.toThrow();
    expect(() => getPropertyTrustChipLabel({})).not.toThrow();
  });

  it('does not emit fake review marketing copy in chip label', () => {
    const chip = getPropertyTrustChipLabel({ is_verified: true });
    expect(chip).not.toMatch(/top rated|guest favourite|best stay/i);
  });
});

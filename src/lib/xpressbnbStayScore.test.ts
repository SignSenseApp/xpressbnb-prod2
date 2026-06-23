import { describe, expect, it } from 'vitest';
import {
  STAY_SCORE_MAX,
  STAY_SCORE_MIN,
  computeXpressbnbStayScore,
} from './xpressbnbStayScore';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const helperSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'xpressbnbStayScore.ts'),
  'utf8',
);

describe('computeXpressbnbStayScore', () => {
  it('returns the same score for identical input', () => {
    const input = {
      is_verified: true,
      city: 'Delhi',
      price_per_day: 3500,
      images: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'],
    };
    const a = computeXpressbnbStayScore(input);
    const b = computeXpressbnbStayScore(input);
    expect(a.score).toBe(b.score);
    expect(a.label).toBe(b.label);
  });

  it('keeps score within 4.2 and 4.8', () => {
    const sparse = computeXpressbnbStayScore({});
    expect(sparse.score).toBeGreaterThanOrEqual(STAY_SCORE_MIN);
    expect(sparse.score).toBeLessThanOrEqual(STAY_SCORE_MAX);

    const rich = computeXpressbnbStayScore({
      is_verified: true,
      host_has_phone: true,
      images: Array.from({ length: 10 }, (_, i) => `img-${i}.jpg`),
      price_per_day: 5000,
      city: 'Goa',
      latitude: 15.2993,
      longitude: 74.124,
      bedrooms: 2,
      bathrooms: 2,
      max_guests: 4,
      amenities: ['WiFi', 'Pool', 'AC', 'Parking', 'Kitchen'],
      is_premium: true,
      premium_plan: 'PAID',
      premium_expiry: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(rich.score).toBeGreaterThanOrEqual(STAY_SCORE_MIN);
    expect(rich.score).toBeLessThanOrEqual(STAY_SCORE_MAX);
  });

  it('handles null arrays and missing optional fields', () => {
    const result = computeXpressbnbStayScore({
      images: null,
      amenities: null,
      city: null,
      bedrooms: null,
      bathrooms: null,
      max_guests: null,
      latitude: null,
      longitude: null,
      is_premium: null,
      premium_plan: null,
      premium_expiry: null,
    });
    expect(result.score).toBeGreaterThanOrEqual(STAY_SCORE_MIN);
    expect(result.score).toBeLessThanOrEqual(STAY_SCORE_MAX);
  });

  it('stays deterministic for partial listing payload', () => {
    const partial = { title: 'ignored', price_per_day: 1200, city: 'Noida' };
    const a = computeXpressbnbStayScore(partial);
    const b = computeXpressbnbStayScore(partial);
    expect(a).toEqual(b);
  });

  it('does not throw when optional fields are missing', () => {
    expect(() => computeXpressbnbStayScore({})).not.toThrow();
    expect(() =>
      computeXpressbnbStayScore({
        images: null,
        amenities: undefined,
        city: '',
      }),
    ).not.toThrow();
  });

  it('adds verified increment', () => {
    const base = computeXpressbnbStayScore({ price_per_day: 1000, city: 'X' });
    const verified = computeXpressbnbStayScore({
      is_verified: true,
      price_per_day: 1000,
      city: 'X',
    });
    expect(verified.score).toBeGreaterThan(base.score);
  });

  it('applies image count boundaries', () => {
    const three = computeXpressbnbStayScore({ images: ['a', 'b', 'c'] });
    const four = computeXpressbnbStayScore({ images: ['a', 'b', 'c', 'd'] });
    const eight = computeXpressbnbStayScore({
      images: Array.from({ length: 8 }, (_, i) => `photo-${i}.jpg`),
    });
    expect(three.score).toBe(4.2);
    expect(four.score).toBe(4.3);
    expect(eight.score).toBe(4.3);
    expect(eight.score).toBeGreaterThan(three.score);
    expect(four.score).toBeGreaterThan(three.score);
  });

  it('labels stay score without review language', () => {
    const result = computeXpressbnbStayScore({ city: 'Jaipur' });
    expect(result.label).toMatch(/^XpressBNB Stay Score \d\.\d$/);
    expect(result.label.toLowerCase()).not.toContain('review');
    expect(result.label.toLowerCase()).not.toContain('rating');
  });

  it('helper source does not use Math.random', () => {
    expect(helperSource.includes('Math.random')).toBe(false);
  });
});

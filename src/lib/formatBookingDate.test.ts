import { describe, expect, it } from 'vitest';
import { addLocalDays, toLocalYmd } from './formatBookingDate';

describe('toLocalYmd', () => {
  it('uses the local civil date components', () => {
    const localMidnight = new Date(2026, 7, 25, 0, 0, 0, 0);
    expect(toLocalYmd(localMidnight)).toBe('2026-08-25');
  });
});

describe('addLocalDays', () => {
  it('adds whole calendar days without UTC conversion', () => {
    const start = new Date(2026, 7, 25);
    expect(toLocalYmd(addLocalDays(start, 2))).toBe('2026-08-27');
  });
});

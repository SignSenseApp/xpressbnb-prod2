import { describe, expect, it } from 'vitest';
import { isOlderThan } from './storage.mjs';

describe('isOlderThan', () => {
  it('returns true when object is older than threshold', () => {
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    expect(isOlderThan(old, 30)).toBe(true);
  });

  it('returns false when object is newer than threshold', () => {
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(isOlderThan(recent, 30)).toBe(false);
  });

  it('returns false when date missing', () => {
    expect(isOlderThan(undefined, 30)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { guestHostDisplayName, guestHostFallbackName } from './host';

describe('guestHostDisplayName', () => {
  it('keeps a real name', () => {
    expect(guestHostDisplayName('Priya Sharma', 'Delhi')).toBe('Priya Sharma');
  });

  it('uses city when the stored name is a phone number', () => {
    expect(guestHostDisplayName('8882442861', 'Delhi')).toBe('Host in Delhi');
  });

  it('falls back to Host without a city', () => {
    expect(guestHostFallbackName(null)).toBe('Host');
    expect(guestHostDisplayName('9876543210')).toBe('Host');
  });
});

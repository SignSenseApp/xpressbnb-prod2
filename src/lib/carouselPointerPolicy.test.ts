import { describe, expect, it } from 'vitest';
import { isCardTapGesture } from './carouselPointerPolicy';

describe('carouselPointerPolicy', () => {
  it('treats small movement as tap', () => {
    expect(isCardTapGesture(0, 0)).toBe(true);
    expect(isCardTapGesture(8, 4)).toBe(true);
  });

  it('treats horizontal swipe intent as not a tap', () => {
    expect(isCardTapGesture(24, 2)).toBe(false);
  });
});

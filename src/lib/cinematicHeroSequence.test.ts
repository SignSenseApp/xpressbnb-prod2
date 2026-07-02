import { describe, expect, it } from 'vitest';
import {
  cinematicFrameLabel,
  sequenceCinematicHeroImages,
} from './cinematicHeroSequence';

describe('cinematicHeroSequence', () => {
  it('keeps the cover photo first and orders the remainder narratively', () => {
    const images = [
      'https://example.com/cover.jpg',
      'https://example.com/bedroom-interior.jpg',
      'https://example.com/mountain-view.jpg',
      'https://example.com/sunset-evening.jpg',
    ];

    const sequenced = sequenceCinematicHeroImages(images);
    expect(sequenced[0]).toBe(images[0]);
    expect(sequenced).toContain(images[1]);
    expect(sequenced).toContain(images[2]);
    expect(sequenced).toContain(images[3]);
    expect(sequenced[sequenced.length - 1]).toBe(images[3]);
  });

  it('formats frame counter quietly', () => {
    expect(cinematicFrameLabel(0, 18)).toBe('01 of 18');
    expect(cinematicFrameLabel(2, 12)).toBe('03 of 12');
  });
});

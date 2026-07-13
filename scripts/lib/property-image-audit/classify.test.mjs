import { describe, expect, it } from 'vitest';
import {
  classifyExternalUrl,
  estimateMigratedBytes,
  extensionOf,
  hasMissingExtension,
  median,
} from './classify.mjs';

describe('classifyExternalUrl', () => {
  it('returns null for property-images URLs', () => {
    expect(
      classifyExternalUrl(
        'https://abc.supabase.co/storage/v1/object/public/property-images/a.jpg',
      ),
    ).toBeNull();
  });

  it('detects pexels and unsplash', () => {
    expect(classifyExternalUrl('https://images.pexels.com/photos/1.jpeg')).toBe('pexels');
    expect(classifyExternalUrl('https://images.unsplash.com/photo-1')).toBe('unsplash');
  });

  it('detects other https', () => {
    expect(classifyExternalUrl('https://cdn.example.com/photo.png')).toBe('other-https');
  });
});

describe('estimateMigratedBytes', () => {
  it('skips webp and gif', () => {
    expect(estimateMigratedBytes(1_000_000, 'webp')).toBe(1_000_000);
    expect(estimateMigratedBytes(1_000_000, 'gif')).toBe(1_000_000);
  });

  it('reduces large jpeg significantly', () => {
    const est = estimateMigratedBytes(5_000_000, 'jpeg');
    expect(est).toBeLessThan(1_000_000);
  });
});

describe('extension helpers', () => {
  it('parses extensions', () => {
    expect(extensionOf('uuid.webp')).toBe('webp');
    expect(hasMissingExtension('noext')).toBe(true);
  });

  it('computes median', () => {
    expect(median([1, 3, 9])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import {
  isAlreadyOptimizedWebp,
  isExternalImageUrl,
  parseSupabasePropertyImageUrl,
} from './urlParser.mjs';

describe('parseSupabasePropertyImageUrl', () => {
  it('parses object public URLs', () => {
    const parsed = parseSupabasePropertyImageUrl(
      'https://abc.supabase.co/storage/v1/object/public/property-images/photo-123.jpg',
    );
    expect(parsed?.path).toBe('photo-123.jpg');
    expect(parsed?.bucket).toBe('property-images');
  });

  it('parses render URLs back to object path', () => {
    const parsed = parseSupabasePropertyImageUrl(
      'https://abc.supabase.co/storage/v1/render/image/public/property-images/uuid.webp?width=640',
    );
    expect(parsed?.path).toBe('uuid.webp');
  });

  it('returns null for external URLs', () => {
    expect(parseSupabasePropertyImageUrl('https://images.pexels.com/photo.jpg')).toBeNull();
    expect(isExternalImageUrl('https://cdn.example.com/a.png')).toBe(true);
  });
});

describe('isAlreadyOptimizedWebp', () => {
  it('detects webp filenames', () => {
    expect(isAlreadyOptimizedWebp('a1b2.webp')).toBe(true);
    expect(isAlreadyOptimizedWebp('legacy.jpg')).toBe(false);
  });
});

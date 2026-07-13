import { describe, expect, it } from 'vitest';
import { containsBlobPreviewUrls, isBlobUrl } from './blobUrls';

describe('blobUrls', () => {
  it('detects blob preview URLs', () => {
    expect(isBlobUrl('blob:http://localhost/abc')).toBe(true);
    expect(isBlobUrl('https://example.com/a.webp')).toBe(false);
  });

  it('detects when any preview is still a blob URL', () => {
    expect(
      containsBlobPreviewUrls([
        'https://cdn.example.com/a.webp',
        'blob:http://localhost/preview',
      ]),
    ).toBe(true);
    expect(containsBlobPreviewUrls(['https://cdn.example.com/a.webp'])).toBe(false);
  });
});

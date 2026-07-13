import { describe, expect, it } from 'vitest';
import { isAllowedMimeType, validateImageDimensions, validateImageFile } from './validate';

function makeFile(bytes: number[], name: string, type: string): File {
  const buffer = new Uint8Array(bytes);
  return new File([buffer], name, { type });
}

describe('validateImageFile', () => {
  it('accepts JPEG magic bytes', async () => {
    const file = makeFile([0xff, 0xd8, 0xff, 0xe0], 'photo.jpg', 'image/jpeg');
    const result = await validateImageFile(file);
    expect(result.ok).toBe(true);
  });

  it('rejects SVG by extension', async () => {
    const file = makeFile([0x3c, 0x73, 0x76, 0x67], 'icon.svg', 'image/svg+xml');
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/SVG/i);
    }
  });

  it('rejects disguised SVG content', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    const bytes = Array.from(new TextEncoder().encode(svg));
    const file = makeFile(bytes, 'photo.png', 'image/png');
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown binary payloads', async () => {
    const file = makeFile([0x00, 0x01, 0x02, 0x03], 'photo.jpg', 'image/jpeg');
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
  });
});

describe('validateImageDimensions', () => {
  it('rejects oversized dimensions', () => {
    const result = validateImageDimensions(40_000, 2_000);
    expect(result.ok).toBe(false);
  });

  it('accepts normal dimensions', () => {
    const result = validateImageDimensions(4_000, 3_000);
    expect(result.ok).toBe(true);
  });
});

describe('isAllowedMimeType', () => {
  it('allows webp', () => {
    expect(isAllowedMimeType('image/webp')).toBe(true);
  });

  it('blocks svg', () => {
    expect(isAllowedMimeType('image/svg+xml')).toBe(false);
  });
});

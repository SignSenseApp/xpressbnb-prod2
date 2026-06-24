import type { Json } from '../lib/database.types';

/** Card layout: mobile carousel peek 85vw, grid columns, 380px card cap. */
export const PROPERTY_CARD_IMAGE_WIDTHS = [320, 480, 640, 768] as const;

export const PROPERTY_CARD_IMAGE_SIZES =
  '(max-width: 639px) 85vw, (max-width: 1023px) 45vw, 380px';

/** Property page hero — full-bleed gallery above the fold. */
export const PROPERTY_HERO_IMAGE_WIDTHS = [480, 768, 1280, 1600] as const;

export const PROPERTY_HERO_IMAGE_SIZES = '100vw';

const CARD_IMAGE_QUALITY = 80;
const HERO_IMAGE_QUALITY = 82;

/** Normalized property image URLs for gallery components. */
export function listPropertyImages(
  images: Json | string[] | null | undefined,
): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

function withPexelsWidth(url: string, width: number): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('auto', 'compress');
    parsed.searchParams.set('cs', 'tinysrgb');
    parsed.searchParams.set('w', String(width));
    return parsed.toString();
  } catch {
    return url;
  }
}

function toSupabaseRenderUrl(url: string, width: number, quality = CARD_IMAGE_QUALITY): string {
  if (!url.includes('/storage/v1/object/public/')) return url;
  const renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  try {
    const parsed = new URL(renderUrl);
    parsed.searchParams.set('width', String(width));
    parsed.searchParams.set('quality', String(quality));
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Resize-aware URL for a single property card image at the given width. */
export function propertyCardImageUrl(url: string, width: number): string {
  return buildResizedImageUrl(url, width, CARD_IMAGE_QUALITY);
}

/** Fallback `src` — largest card width (matches 2× on 380px cards). */
export function propertyCardImageSrc(url: string): string {
  return propertyCardImageUrl(url, PROPERTY_CARD_IMAGE_WIDTHS[PROPERTY_CARD_IMAGE_WIDTHS.length - 1]);
}

/** Responsive srcset for property card images; undefined when URL cannot be resized. */
export function propertyCardImageSrcSet(url: string): string | undefined {
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  const canResize =
    trimmed.includes('/storage/v1/object/public/') || trimmed.includes('images.pexels.com');
  if (!canResize) return undefined;

  return PROPERTY_CARD_IMAGE_WIDTHS.map((w) => `${propertyCardImageUrl(trimmed, w)} ${w}w`).join(', ');
}

function buildResizedImageUrl(url: string, width: number, quality: number): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.includes('/storage/v1/object/public/')) {
    return toSupabaseRenderUrl(trimmed, width, quality);
  }

  if (trimmed.includes('images.pexels.com')) {
    return withPexelsWidth(trimmed, width);
  }

  return trimmed;
}

/** Fallback `src` for property page hero — largest hero width. */
export function propertyHeroImageSrc(url: string): string {
  const maxW = PROPERTY_HERO_IMAGE_WIDTHS[PROPERTY_HERO_IMAGE_WIDTHS.length - 1];
  return buildResizedImageUrl(url, maxW, HERO_IMAGE_QUALITY);
}

/** Responsive srcset for property page hero images. */
export function propertyHeroImageSrcSet(url: string): string | undefined {
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  const canResize =
    trimmed.includes('/storage/v1/object/public/') || trimmed.includes('images.pexels.com');
  if (!canResize) return undefined;

  return PROPERTY_HERO_IMAGE_WIDTHS.map(
    (w) => `${buildResizedImageUrl(trimmed, w, HERO_IMAGE_QUALITY)} ${w}w`,
  ).join(', ');
}

import type { Json } from '../lib/database.types';

/** Normalized property image URLs for gallery components. */
export function listPropertyImages(
  images: Json | string[] | null | undefined,
): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

/**
 * Property Prefetch System — route chunk, listing data, hero gallery images.
 * Deduped; uses existing publicListings cache; never preloads BookingForm / sidebar.
 */

import type { Property } from './database.types';
import {
  listPropertyImages,
  PROPERTY_HERO_IMAGE_WIDTHS,
  propertyHeroImageUrl,
} from './propertyImages';
import { prefetchPublicPropertyById } from './publicListings';
import { loadPropertyPageModule } from './propertyRouteChunk';

/** Mobile-first hero width for gallery warm (768w). */
const PREFETCH_HERO_WIDTH = PROPERTY_HERO_IMAGE_WIDTHS[1];
const GALLERY_PREFETCH_COUNT = 2;

let propertyPageChunkPromise: Promise<unknown> | null = null;
let viewportChunkWarmed = false;

const interactionPrefetched = new Set<string>();
const prefetchedImageUrls = new Set<string>();

function scheduleNonBlocking(task: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(task, { timeout: 1500 });
    return;
  }
  queueMicrotask(task);
}

/** Warm PropertyPage route chunk only (viewport / first card visibility). */
export function prefetchPropertyPageRouteChunk(): void {
  if (propertyPageChunkPromise) return;
  propertyPageChunkPromise = loadPropertyPageModule().catch(() => {
    propertyPageChunkPromise = null;
  });
}

/** IntersectionObserver entry — route chunk once per session, no property data. */
export function prefetchPropertyOnViewport(): void {
  if (viewportChunkWarmed) return;
  viewportChunkWarmed = true;
  prefetchPropertyPageRouteChunk();
}

/** Hover (desktop) or touchstart (mobile) — chunk + data + first 2 hero images. */
export function prefetchPropertyOnInteraction(property: Property): void {
  const id = property.id?.trim();
  if (!id || interactionPrefetched.has(id)) return;
  interactionPrefetched.add(id);

  prefetchPropertyPageRouteChunk();
  prefetchPublicPropertyById(id, property);

  scheduleNonBlocking(() => {
    prefetchPropertyGalleryImages(property.images);
  });
}

function prefetchPropertyGalleryImages(
  images: Property['images'],
  count = GALLERY_PREFETCH_COUNT,
): void {
  const urls = listPropertyImages(images).slice(0, count);
  for (const original of urls) {
    const src = propertyHeroImageUrl(original, PREFETCH_HERO_WIDTH);
    if (!src || prefetchedImageUrls.has(src)) continue;
    prefetchedImageUrls.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
}

/** Test / diagnostics — whether route chunk import was started. */
export function isPropertyPageChunkPrefetchStarted(): boolean {
  return propertyPageChunkPromise != null;
}

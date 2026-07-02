/**
 * Shared navigation/prefetch for property-page editorial discovery windows.
 * Logic only — not for marketplace card navigation.
 */
import type { Property } from './database.types';
import { trackXpressEvent } from './analytics';
import { bucketDistanceKm } from './nearbyDistanceCopy';
import {
  prefetchPropertyOnInteraction,
  prefetchPropertyOnViewport,
} from './propertyPrefetch';

type OpenDiscoveryPropertyOptions = {
  property: Property;
  tripQuery?: string;
  nearbyDistanceKm?: number;
  nearbySource?: string;
  onEngagement?: () => void;
};

export function prefetchDiscoveryProperty(property: Property): void {
  prefetchPropertyOnInteraction(property);
}

export function observeDiscoveryPrefetch(node: HTMLElement | null): () => void {
  if (!node || typeof IntersectionObserver === 'undefined') return () => undefined;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        prefetchPropertyOnViewport();
      }
    },
    { rootMargin: '0px', threshold: [0, 0.45, 0.75] },
  );
  observer.observe(node);
  return () => observer.disconnect();
}

export function openDiscoveryProperty({
  property,
  tripQuery = '',
  nearbyDistanceKm,
  nearbySource,
  onEngagement,
}: OpenDiscoveryPropertyOptions): void {
  trackXpressEvent('property_card_click', {
    property_id: property.id,
    property_slug: property.slug ?? undefined,
    city: property.city,
    ...(nearbyDistanceKm != null
      ? {
          nearby_source: nearbySource ?? 'nearby',
          distance_km_bucket: bucketDistanceKm(nearbyDistanceKm),
        }
      : {}),
  });
  onEngagement?.();
  if (nearbyDistanceKm != null) {
    trackXpressEvent('nearby_card_clicked', {
      property_id: property.id,
      property_slug: property.slug ?? undefined,
      city: property.city,
      nearby_source: nearbySource ?? 'nearby',
      distance_km_bucket: bucketDistanceKm(nearbyDistanceKm),
    });
  }
  const q = tripQuery.startsWith('?') ? tripQuery : tripQuery ? `?${tripQuery}` : '';
  const nearbyParam =
    nearbyDistanceKm != null
      ? `${q ? '&' : '?'}nearby=${encodeURIComponent(nearbySource ?? 'nearby')}`
      : '';
  window.history.pushState({}, '', `/property/${property.id}${q}${nearbyParam}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

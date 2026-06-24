import { useEffect, useState } from 'react';
import type { Property } from '../../lib/database.types';
import { useNearbyLocationOptional } from '../../contexts/NearbyLocationContext';
import { getPublicListings } from '../../lib/publicListings';
import { rankPropertiesForNearby } from '../../lib/nearbyRanking';
import FeaturedStaysCarousel from '../FeaturedStaysCarousel';
import { trackXpressEvent } from '../../lib/analytics';

type PropertyGuestsAlsoViewedProps = {
  property: Property;
  placement: 'amenities' | 'booking';
};

/**
 * "Guests also viewed" / area popularity upsell — location-aware.
 */
export default function PropertyGuestsAlsoViewed({
  property,
  placement,
}: PropertyGuestsAlsoViewedProps) {
  const nearby = useNearbyLocationOptional();
  const [list, setList] = useState<Property[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getPublicListings();
      if (cancelled || result.status !== 'success') return;

      const coords =
        nearby?.coords ??
        (property.latitude != null && property.longitude != null
          ? { lat: property.latitude, lng: property.longitude }
          : null);

      if (!coords) {
        setList(result.listings.filter((p) => p.id !== property.id).slice(0, 6));
        return;
      }

      const ranked = rankPropertiesForNearby(coords.lat, coords.lng, result.listings, {
        limit: 6,
        maxKm: 80,
        excludeId: property.id,
      });
      setList(ranked);
      trackXpressEvent('property_recommended', {
        property_id: property.id,
        city: property.city,
        recommendation_type: placement,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [property.id, property.city, property.latitude, property.longitude, nearby?.coords, placement]);

  if (list.length === 0) return null;

  const title =
    placement === 'booking'
      ? 'Guests also viewed'
      : `Popular with travelers from ${nearby?.detectedCity ?? property.city}`;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-extrabold text-xpx-text mb-3">{title}</h3>
      <FeaturedStaysCarousel
        properties={list}
        userCity={nearby?.detectedCity ?? property.city}
      />
    </div>
  );
}

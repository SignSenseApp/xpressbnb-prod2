import { useEffect, useState } from 'react';
import type { Property } from '../../lib/database.types';
import { useNearbyLocationOptional } from '../../contexts/NearbyLocationContext';
import { getPublicListings } from '../../lib/publicListings';
import { rankPropertiesForNearby } from '../../lib/nearbyRanking';
import { trackXpressEvent } from '../../lib/analytics';
import {
  chapterInspiredBy,
  chapterJournalPause,
  chapterSlowMornings,
} from '../../lib/discoveryEditorial';
import {
  DiscoveryFeatureChapter,
  DiscoveryJournalPause,
  DiscoveryPortraitPair,
} from './editorial/EditorialDiscoveryModules';

type PropertyGuestsAlsoViewedProps = {
  property: Property;
  placement: 'amenities' | 'booking';
};

/**
 * First movement of the discovery journal — cinematic feature, pause, portrait pair.
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
        setList(result.listings.filter((p) => p.id !== property.id).slice(0, 3));
        return;
      }

      const ranked = rankPropertiesForNearby(coords.lat, coords.lng, result.listings, {
        limit: 3,
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

  const feature = list[0];
  const portraits = list.slice(1, 3) as [Property] | [Property, Property];

  return (
    <div className="xpx-discovery-journal xpx-discovery-journal--opening">
      <DiscoveryFeatureChapter
        property={feature}
        copy={chapterInspiredBy(property)}
        id={`discovery-opening-${placement}`}
      />

      {portraits.length > 0 && (
        <>
          <DiscoveryJournalPause>{chapterJournalPause(property)}</DiscoveryJournalPause>
          <DiscoveryPortraitPair
            properties={portraits.length === 2 ? portraits : [portraits[0]]}
            copy={chapterSlowMornings()}
            nearbySource="recommended_journal"
            id={`discovery-portraits-${placement}`}
          />
        </>
      )}
    </div>
  );
}

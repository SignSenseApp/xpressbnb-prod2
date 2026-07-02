import { useEffect, useMemo, useState } from 'react';
import type { Property } from '../../lib/database.types';
import { useNearbyLocationOptional } from '../../contexts/NearbyLocationContext';
import { getPublicListings } from '../../lib/publicListings';
import { rankPropertiesForNearby } from '../../lib/nearbyRanking';
import NearbyDestinationsFallback from '../nearby/NearbyDestinationsFallback';
import { isMappableProperty } from '../../lib/propertyCoords';
import {
  chapterDestinationEssay,
  chapterQuietEscapes,
  chapterWeekendSelection,
  chapterWorthWaking,
} from '../../lib/discoveryEditorial';
import {
  DiscoveryCuratedCollection,
  DiscoveryEditorialPause,
  DiscoveryJournalSkeleton,
  DiscoveryPortraitPair,
  DiscoveryWeekendSelection,
  DiscoveryWideChapter,
} from './editorial/EditorialDiscoveryModules';

type NearbyPropertiesSectionProps = {
  originProperty: Property;
};

/**
 * Second movement — wide story, weekend trio, portraits, collection, destination essay.
 */
export default function NearbyPropertiesSection({ originProperty }: NearbyPropertiesSectionProps) {
  const nearby = useNearbyLocationOptional();
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState<Array<Property & { distanceKm: number }>>([]);

  const originCoords = useMemo(() => {
    if (nearby?.coords) return nearby.coords;
    if (isMappableProperty(originProperty)) {
      return { lat: originProperty.latitude, lng: originProperty.longitude };
    }
    return null;
  }, [nearby?.coords, originProperty]);

  useEffect(() => {
    if (!originCoords) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await getPublicListings();
      if (cancelled) return;
      if (result.status === 'error') {
        setSimilar([]);
        setLoading(false);
        return;
      }
      const ranked = rankPropertiesForNearby(
        originCoords.lat,
        originCoords.lng,
        result.listings,
        { limit: 8, maxKm: 50, excludeId: originProperty.id },
      );
      setSimilar(ranked);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [originCoords, originProperty.id]);

  const nearestCities = nearby?.nearestCities?.length ? nearby.nearestCities : [];

  if (!originCoords && !loading) return null;

  const distanceMap = Object.fromEntries(similar.map((p) => [p.id, p.distanceKm]));
  const nearbySource = 'nearby_journal';

  const handleExploreCity = (slug: string) => {
    window.history.pushState({}, '', `/stays/${slug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const wide = similar[0];
  const weekend = similar.slice(1, 4);
  const portraitPair = similar.slice(4, 6) as [Property, Property] | [];
  const collection = similar.slice(6);

  return (
    <div
      id="similar-nearby"
      className="xpx-discovery-journal xpx-discovery-journal--closing scroll-mt-28"
    >
      {loading ? (
        <DiscoveryJournalSkeleton />
      ) : similar.length > 0 ? (
        <>
          <DiscoveryEditorialPause>
            The story does not end at the doorstep. These addresses continue the mood — each
            chosen for a different reason.
          </DiscoveryEditorialPause>

          {wide && (
            <DiscoveryWideChapter
              property={wide}
              copy={chapterWorthWaking()}
              nearbyDistanceKm={wide.distanceKm}
              nearbySource={nearbySource}
              id="discovery-wide-nearby"
            />
          )}

          {weekend.length >= 2 && (
            <DiscoveryWeekendSelection
              properties={weekend}
              copy={chapterWeekendSelection()}
              nearbyDistanceById={distanceMap}
              nearbySource={nearbySource}
              id="discovery-weekend-nearby"
            />
          )}

          {portraitPair.length === 2 && (
            <DiscoveryPortraitPair
              properties={portraitPair}
              copy={chapterQuietEscapes(originProperty)}
              nearbyDistanceById={distanceMap}
              nearbySource={nearbySource}
              id="discovery-portraits-nearby"
            />
          )}

          {collection.length > 0 && (
            <DiscoveryCuratedCollection
              properties={collection}
              copy={{
                eyebrow: 'Editorial notes',
                headline: 'Places with unforgettable terraces',
                lead: 'A final handful — open when curiosity outweighs the itinerary.',
              }}
              nearbyDistanceById={distanceMap}
              nearbySource={nearbySource}
              id="discovery-collection-nearby"
            />
          )}
        </>
      ) : nearestCities.length > 0 ? (
        <NearbyDestinationsFallback
          title={chapterDestinationEssay(originProperty.city).headline}
          subtitle={chapterDestinationEssay(originProperty.city).lead}
          nearestCities={nearestCities.slice(0, 3)}
          onExploreCity={handleExploreCity}
        />
      ) : (
        <p className="xpx-discovery-pause-text">
          We&apos;re curating more remarkable places nearby.
        </p>
      )}
    </div>
  );
}

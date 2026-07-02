import { useEffect, useMemo, useState } from 'react';
import type { Property } from '../../lib/database.types';
import { useNearbyLocationOptional } from '../../contexts/NearbyLocationContext';
import { getPublicListings } from '../../lib/publicListings';
import { rankPropertiesForNearby } from '../../lib/nearbyRanking';
import FeaturedStaysCarousel from '../FeaturedStaysCarousel';
import NearbyStaysSkeleton from '../nearby/NearbyStaysSkeleton';
import NearbyDestinationsFallback from '../nearby/NearbyDestinationsFallback';
import { isMappableProperty } from '../../lib/propertyCoords';

type NearbyPropertiesSectionProps = {
  originProperty: Property;
};

/**
 * Property detail — location-aware "Similar stays nearby" using guest coords.
 */
export default function NearbyPropertiesSection({ originProperty }: NearbyPropertiesSectionProps) {
  const nearby = useNearbyLocationOptional();
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState<
    Array<Property & { distanceKm: number }>
  >([]);

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

  const nearestCities = nearby?.nearestCities?.length
    ? nearby.nearestCities
    : [];

  if (!originCoords && !loading) return null;

  const distanceMap = Object.fromEntries(similar.map((p) => [p.id, p.distanceKm]));

  const handleExploreCity = (slug: string) => {
    window.history.pushState({}, '', `/stays/${slug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <section id="similar-nearby" className="scroll-mt-28">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-xpx-text">
        More stays near you
      </h2>
      <p className="mt-2 text-sm text-xpx-muted">
        Other exceptional homes within reach — curated by distance and quality.
      </p>

      {loading ? (
        <div className="mt-6">
          <NearbyStaysSkeleton />
        </div>
      ) : similar.length > 0 ? (
        <div className="mt-6">
          <FeaturedStaysCarousel properties={similar} distanceByPropertyId={distanceMap} />
        </div>
      ) : nearestCities.length > 0 ? (
        <div className="mt-6">
          <NearbyDestinationsFallback
            title="Popular destinations near this stay"
            subtitle="Explore verified inventory in nearby cities"
            nearestCities={nearestCities.slice(0, 3)}
            onExploreCity={handleExploreCity}
          />
        </div>
      ) : null}
    </section>
  );
}

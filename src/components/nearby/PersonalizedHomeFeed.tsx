import { useEffect, useMemo, useState } from 'react';
import { Map } from 'lucide-react';
import type { Property } from '../../lib/database.types';
import { useNearbyLocationOptional } from '../../contexts/NearbyLocationContext';
import { getPublicListings } from '../../lib/publicListings';
import { buildPersonalizedDestinationRails } from '../../lib/destinationRecommendations';
import { orderFeedRails, getTimeGreeting } from '../../lib/nearbyFeed';
import { readRecentlyViewed } from '../../lib/recentlyViewed';
import { touchLocationLookup, isReturningNearbyUser } from '../../lib/locationMemory';
import { trackXpressEvent } from '../../lib/analytics';
import FeaturedStaysCarousel from '../FeaturedStaysCarousel';
import NearbyStaysSkeleton from './NearbyStaysSkeleton';
import ComingSoonPanel from './ComingSoonPanel';
import LocationIdentityChip from './LocationIdentityChip';
import NearbyMapDiscovery from './NearbyMapDiscovery';

type PersonalizedHomeFeedProps = {
  onNavigate: (path: string) => void;
  compactSearch?: React.ReactNode;
};

/**
 * Zero-scroll personalized homepage — replaces generic hero when location is known.
 */
export default function PersonalizedHomeFeed({
  onNavigate,
  compactSearch,
}: PersonalizedHomeFeedProps) {
  const nearby = useNearbyLocationOptional();
  const [allListings, setAllListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);

  const cityName = nearby?.detectedCity?.split(',')[0] ?? nearby?.locationLabel?.split(',')[0] ?? null;

  useEffect(() => {
    touchLocationLookup();
    if (isReturningNearbyUser()) {
      trackXpressEvent('nearby_returning_user', { city: cityName ?? undefined });
    }
  }, [cityName]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await getPublicListings();
      if (cancelled) return;
      if (result.status === 'success') {
        setAllListings(result.listings);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rails = useMemo(() => {
    if (!nearby?.coords || allListings.length === 0) return [];
    return orderFeedRails(
      buildPersonalizedDestinationRails({
        originLat: nearby.coords.lat,
        originLng: nearby.coords.lng,
        originCity: cityName,
        allListings,
        nearestCities: nearby.nearestCities,
      }),
    );
  }, [nearby?.coords, nearby?.nearestCities, allListings, cityName]);

  const recentIds = useMemo(() => new Set(readRecentlyViewed().map((r) => r.id)), []);
  const recentlyViewed = useMemo(
    () => allListings.filter((p) => recentIds.has(p.id)).slice(0, 6),
    [allListings, recentIds],
  );

  const trending = nearby?.trendingProperties?.length
    ? nearby.trendingProperties
    : nearby?.properties?.length
      ? nearby.properties
      : allListings.slice(0, 8);

  const distanceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const rail of rails) {
      for (const p of rail.properties) {
        if (p.distanceKm != null) map[p.id] = p.distanceKm;
      }
    }
    for (const p of nearby?.properties ?? []) {
      if ('distanceKm' in p) map[p.id] = (p as { distanceKm: number }).distanceKm;
    }
    return map;
  }, [rails, nearby?.properties]);

  useEffect(() => {
    if (!loading && (rails.length > 0 || trending.length > 0)) {
      trackXpressEvent('nearby_feed_viewed', {
        city: cityName ?? undefined,
      });
    }
  }, [loading, rails.length, trending.length, cityName]);

  const handleExploreCity = (slug: string) => onNavigate(`/stays/${slug}`);

  const showComingSoon =
    !loading &&
    nearby?.phase === 'coming_soon' &&
    rails.length === 0 &&
    trending.length === 0;

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: '#FAFAF8' }}>
      <header
        className="sticky top-0 z-40 border-b px-4 py-3 sm:px-6"
        style={{ background: 'rgba(255,255,255,0.92)', borderColor: '#e5e7eb', backdropFilter: 'blur(12px)' }}
      >
        <div className="xpx-container flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-xpx-text truncate">
              {getTimeGreeting()}
              {cityName ? `, ${cityName}` : ''}
            </h1>
            <p className="text-sm text-xpx-muted mt-0.5 truncate">
              {cityName
                ? `Vacation rentals near ${cityName}`
                : 'Homes and apartments near you'}
            </p>
          </div>
          <LocationIdentityChip variant="dark" />
        </div>
        {compactSearch && <div className="xpx-container mt-3">{compactSearch}</div>}
      </header>

      <main className="flex-1 xpx-container py-5 sm:py-6 space-y-8 pb-28">
        {loading && <NearbyStaysSkeleton />}

        {showComingSoon && (
          <ComingSoonPanel
            locationLabel={nearby?.locationLabel ?? null}
            nearestCities={nearby?.nearestCities ?? []}
            onExploreCity={handleExploreCity}
            onDiscoverNearby={() => {
              const first = nearby?.nearestCities?.[0];
              if (first) handleExploreCity(first.slug);
            }}
          />
        )}

        {!loading &&
          rails.map((rail) => (
            <section key={rail.id} id={rail.id === 'nearby' ? 'nearby' : undefined}>
              <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-xpx-text">{rail.title}</h2>
                  <p className="text-sm text-xpx-muted mt-0.5">{rail.subtitle}</p>
                </div>
                {rail.citySlug && (
                  <button
                    type="button"
                    onClick={() => {
                      trackXpressEvent('destination_recommended', { city: rail.citySlug });
                      handleExploreCity(rail.citySlug!);
                    }}
                    className="text-xs font-semibold text-[#059669] shrink-0"
                  >
                    See all →
                  </button>
                )}
              </div>
              <FeaturedStaysCarousel
                properties={rail.properties}
                distanceByPropertyId={distanceMap}
                userCity={cityName}
              />
            </section>
          ))}

        {!loading && recentlyViewed.length > 0 && (
          <section>
            <h2 className="text-lg font-extrabold text-xpx-text mb-4">Recently viewed</h2>
            <FeaturedStaysCarousel properties={recentlyViewed} distanceByPropertyId={distanceMap} />
          </section>
        )}

        {!loading && trending.length > 0 && rails.length === 0 && !showComingSoon && (
          <section id="nearby">
            <h2 className="text-lg font-extrabold text-xpx-text mb-4">Trending near you</h2>
            <FeaturedStaysCarousel
              properties={trending}
              distanceByPropertyId={distanceMap}
              userCity={cityName}
            />
          </section>
        )}
      </main>

      <button
        type="button"
        onClick={() => {
          setMapOpen(true);
          trackXpressEvent('map_opened', { city: cityName ?? undefined });
        }}
        className="fixed bottom-24 right-4 z-50 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg lg:hidden"
        style={{ background: '#059669' }}
        aria-label="Open map"
      >
        <Map className="h-4 w-4" />
        Map
      </button>

      {mapOpen && (
        <NearbyMapDiscovery
          properties={allListings}
          distanceByPropertyId={distanceMap}
          userCity={cityName}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo } from 'react';
import { MapPin, Navigation, RefreshCw } from 'lucide-react';
import { useNearbyLocationOptional } from '../../contexts/NearbyLocationContext';
import { orchestratedScrollTo } from '../../lib/scrollOrchestrator';
import FeaturedStaysCarousel from '../FeaturedStaysCarousel';
import NearbyStaysSkeleton from './NearbyStaysSkeleton';
import ComingSoonPanel from './ComingSoonPanel';
import NearbyDestinationsFallback from './NearbyDestinationsFallback';

type NearbyStaysSectionProps = {
  onNavigate: (path: string) => void;
  /** Trending properties when location unavailable — from parent inventory */
  fallbackTrending?: import('../../lib/database.types').Property[];
};

export default function NearbyStaysSection({
  onNavigate,
  fallbackTrending = [],
}: NearbyStaysSectionProps) {
  const nearby = useNearbyLocationOptional();

  if (!nearby) return null;

  const {
    phase,
    isLoading,
    locationLabel,
    properties,
    nearestCities,
    trendingProperties,
    permission,
    openPrompt,
    requestLocation,
    refreshLocation,
    shouldScrollToNearby,
    clearScrollToNearby,
  } = nearby;

  useEffect(() => {
    if (!shouldScrollToNearby || isLoading) return;
    const timer = window.setTimeout(() => {
      orchestratedScrollTo('nearby_stays', { highlight: true, skipIfVisible: true });
      clearScrollToNearby();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [shouldScrollToNearby, isLoading, clearScrollToNearby]);

  const distanceByPropertyId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of properties) {
      if ('distanceKm' in p && typeof p.distanceKm === 'number') {
        map[p.id] = p.distanceKm;
      }
    }
    for (const p of trendingProperties) {
      if ('distanceKm' in p && typeof p.distanceKm === 'number' && map[p.id] == null) {
        map[p.id] = p.distanceKm;
      }
    }
    return map;
  }, [properties, trendingProperties]);

  const handleExploreCity = (slug: string) => {
    onNavigate(`/stays/${slug}`);
  };

  const showSection =
    phase !== 'idle' ||
    permission === 'granted' ||
    properties.length > 0 ||
    isLoading;

  if (!showSection && permission === 'unknown') {
    return (
      <section id="nearby" className="scroll-mt-28 xpx-section" style={{ background: '#FAFAF8' }}>
        <div className="xpx-container">
          <NearbyLocationCTA onEnable={openPrompt} />
        </div>
      </section>
    );
  }

  const carouselProperties =
    properties.length > 0
      ? properties
      : trendingProperties.length > 0
        ? trendingProperties
        : fallbackTrending;

  const sectionTitle =
    locationLabel && phase === 'ready'
      ? `Stays near ${locationLabel.split(',')[0]}`
      : phase === 'fallback' && properties.length > 0
        ? 'Stays closest to you'
        : 'Nearby stays';

  const sectionSubtitle =
    phase === 'ready'
      ? 'Vacation rentals sorted by distance from you'
      : phase === 'fallback'
        ? 'Rentals in cities closest to you'
        : 'Homes and apartments based on your area';

  return (
    <section id="nearby" className="scroll-mt-28 xpx-section" style={{ background: '#FAFAF8' }}>
      <div className="xpx-container">
        <div className="xpx-section-head flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6 mb-6">
          <div className="min-w-0">
            <span className="text-[11px] font-bold tracking-[0.2em] text-[#059669]">
              NEAR YOU
            </span>
            <h2 className="mt-2.5 text-[26px] sm:text-[28px] md:text-3xl font-extrabold tracking-tight leading-[1.12] text-xpx-text">
              {sectionTitle}
            </h2>
            <p className="text-sm md:text-[15px] mt-1.5 text-xpx-muted">{sectionSubtitle}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {permission === 'granted' ? (
              <button
                type="button"
                onClick={refreshLocation}
                className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors"
                style={{ borderColor: '#e5e7eb', color: '#64748b', background: '#fff' }}
                aria-label="Refresh location"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Update
              </button>
            ) : permission !== 'blocked' ? (
              <button
                type="button"
                onClick={requestLocation}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
                style={{ background: '#059669' }}
              >
                <Navigation className="h-3.5 w-3.5" />
                Use current location
              </button>
            ) : null}
          </div>
        </div>

        {isLoading && <NearbyStaysSkeleton />}

        {!isLoading && phase === 'coming_soon' && (
          <ComingSoonPanel
            locationLabel={locationLabel}
            nearestCities={nearestCities}
            onExploreCity={handleExploreCity}
            onDiscoverNearby={() => {
              const first = nearestCities[0];
              if (first) handleExploreCity(first.slug);
            }}
          />
        )}

        {!isLoading && phase === 'unavailable' && permission !== 'granted' && (
          <div className="space-y-4">
            <NearbyLocationCTA
              onEnable={permission === 'blocked' ? undefined : openPrompt}
              blocked={permission === 'blocked'}
            />
            <NearbyDestinationsFallback
              nearestCities={nearestCities}
              onExploreCity={handleExploreCity}
            />
            {carouselProperties.length > 0 && (
              <TrendingBlock
                properties={carouselProperties}
                distanceByPropertyId={distanceByPropertyId}
              />
            )}
          </div>
        )}

        {!isLoading && (phase === 'ready' || phase === 'fallback') && carouselProperties.length > 0 && (
          <>
            <FeaturedStaysCarousel
              properties={carouselProperties}
              distanceByPropertyId={distanceByPropertyId}
            />
            {phase === 'fallback' && (
              <NearbyDestinationsFallback
                nearestCities={nearestCities}
                onExploreCity={handleExploreCity}
              />
            )}
          </>
        )}

        {!isLoading && phase === 'coming_soon' && trendingProperties.length > 0 && (
          <div className="mt-8">
            <TrendingBlock
              properties={trendingProperties}
              distanceByPropertyId={distanceByPropertyId}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function TrendingBlock({
  properties,
  distanceByPropertyId,
}: {
  properties: import('../../lib/database.types').Property[];
  distanceByPropertyId?: Record<string, number>;
}) {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-extrabold text-xpx-text mb-4">Trending stays</h3>
      <FeaturedStaysCarousel
        properties={properties}
        distanceByPropertyId={distanceByPropertyId}
      />
    </div>
  );
}

function NearbyLocationCTA({
  onEnable,
  blocked = false,
}: {
  onEnable?: () => void;
  blocked?: boolean;
}) {
  return (
    <div
      className="rounded-[24px] border px-6 py-8 sm:px-8 flex flex-col sm:flex-row sm:items-center gap-5"
      style={{ borderColor: '#e5e7eb', background: '#ffffff' }}
    >
      <div
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: '#ecfdf5', color: '#059669' }}
      >
        <MapPin className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-extrabold text-xpx-text">
          {blocked ? 'Location is turned off' : 'Show rentals near you'}
        </h3>
        <p className="mt-1.5 text-sm text-xpx-muted leading-relaxed">
          {blocked
            ? 'Turn on location in your browser to see nearby homes — or pick a destination below.'
            : 'Use your current location to see homes and apartments nearby, or search by city instead.'}
        </p>
      </div>
      {onEnable && !blocked && (
        <button
          type="button"
          onClick={onEnable}
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white"
          style={{ background: '#059669' }}
        >
          <Navigation className="h-4 w-4" />
          Use current location
        </button>
      )}
    </div>
  );
}

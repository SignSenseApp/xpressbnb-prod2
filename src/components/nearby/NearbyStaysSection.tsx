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
    <>
      {/* Mobile Nearby Section - Compact Grid */}
      <section id="nearby" className="scroll-mt-28 xpx-section md:hidden" style={{ background: '#FAFAF8' }}>
        <div className="px-4 py-6">
          <div className="flex flex-col gap-3 mb-5">
            <div className="min-w-0">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#059669]">
                NEAR YOU
              </span>
              <h2 className="mt-1.5 text-[20px] font-extrabold tracking-tight leading-[1.15] text-xpx-text">
                {sectionTitle}
              </h2>
              <p className="text-[13px] mt-1 text-xpx-muted">{sectionSubtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              {permission === 'granted' ? (
                <button
                  type="button"
                  onClick={refreshLocation}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors"
                  style={{ borderColor: '#e5e7eb', color: '#64748b', background: '#fff' }}
                  aria-label="Refresh location"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Update
                </button>
              ) : permission !== 'blocked' ? (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-white"
                  style={{ background: '#059669' }}
                >
                  <Navigation className="h-3 w-3" />
                  Use current location
                </button>
              ) : null}
            </div>
          </div>

          {isLoading && <MobileNearbyStaysSkeleton />}

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
                <CompactNearbyGrid
                  properties={carouselProperties.slice(0, 4)}
                  distanceByPropertyId={distanceByPropertyId}
                  onNavigate={onNavigate}
                />
              )}
            </div>
          )}

          {!isLoading && (phase === 'ready' || phase === 'fallback') && carouselProperties.length > 0 && (
            <>
              <CompactNearbyGrid
                properties={carouselProperties.slice(0, 4)}
                distanceByPropertyId={distanceByPropertyId}
                onNavigate={onNavigate}
              />
              {phase === 'fallback' && (
                <NearbyDestinationsFallback
                  nearestCities={nearestCities}
                  onExploreCity={handleExploreCity}
                />
              )}
            </>
          )}

          {!isLoading &&
            (phase === 'ready' || phase === 'fallback') &&
            carouselProperties.length === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-500 mb-3">No stays found nearby right now</p>
                <button
                  type="button"
                  onClick={() => onNavigate('/stays/delhi')}
                  className="text-sm font-semibold text-emerald-600 underline underline-offset-2"
                >
                  Explore all cities →
                </button>
              </div>
            )}

          {!isLoading && phase === 'coming_soon' && trendingProperties.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[16px] font-extrabold text-xpx-text mb-3">Trending stays</h3>
              <CompactNearbyGrid
                properties={trendingProperties.slice(0, 4)}
                distanceByPropertyId={distanceByPropertyId}
                onNavigate={onNavigate}
              />
            </div>
          )}
        </div>
      </section>

      {/* Desktop Nearby Section - Full Carousel */}
      <section id="nearby_desktop" className="scroll-mt-28 xpx-section hidden md:block" style={{ background: '#FAFAF8' }}>
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

          {!isLoading &&
            (phase === 'ready' || phase === 'fallback') &&
            carouselProperties.length === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-500 mb-3">No stays found nearby right now</p>
                <button
                  type="button"
                  onClick={() => onNavigate('/stays/delhi')}
                  className="text-sm font-semibold text-emerald-600 underline underline-offset-2"
                >
                  Explore all cities →
                </button>
              </div>
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
    </>
  );
}

function MobileNearbyStaysSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-[16px] overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          <div className="h-[120px] bg-gray-200 animate-pulse" />
          <div className="p-2.5 space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CompactNearbyGrid({
  properties,
  distanceByPropertyId,
  onNavigate,
}: {
  properties: import('../../lib/database.types').Property[];
  distanceByPropertyId?: Record<string, number>;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {properties.map((property) => {
        const distance = distanceByPropertyId?.[property.id];
        const priceDisplay = (
          property.price_per_day ??
          property.price_full_day ??
          0
        ).toLocaleString('en-IN');

        return (
          <div
            key={property.id}
            onClick={() => onNavigate(`/property/${property.id}`)}
            className="bg-white rounded-[16px] overflow-hidden cursor-pointer transition-all active:scale-95"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {/* Image */}
            <div className="relative h-[120px] bg-gray-100 overflow-hidden">
              {property.images && Array.isArray(property.images) && property.images[0] ? (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
              )}
              {distance != null && (
                <div
                  className="absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-semibold text-white"
                  style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
                >
                  {distance < 1 ? '<1 km' : `${Math.round(distance)} km`}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-2.5">
              <div className="flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-[#6B7280]" strokeWidth={2} />
                <p className="text-[11px] font-medium text-[#6B7280] truncate">
                  {property.city}
                </p>
              </div>
              <p className="text-[13px] font-bold text-[#111827] leading-tight mb-1.5 line-clamp-1">
                {property.title}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-[#059669]">
                  ₹{priceDisplay}
                  <span className="text-[10px] text-[#9CA3AF] font-normal">/night</span>
                </p>
                {property.is_verified && (
                  <div
                    className="w-4 h-4 rounded-full bg-[#ECFDF5] flex items-center justify-center"
                    title="Verified"
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
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

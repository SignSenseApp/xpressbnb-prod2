import { Compass, Sparkles, Palmtree } from 'lucide-react';
import type { NearestServicedCity } from '../../lib/nearbyInventory';
import { formatDistanceKm } from '../../lib/nearbyInventory';

type ComingSoonPanelProps = {
  locationLabel: string | null;
  nearestCities: NearestServicedCity[];
  onExploreCity: (slug: string) => void;
  onDiscoverNearby: () => void;
};

/**
 * Premium "expanding to your area" state — never says "not available".
 */
export default function ComingSoonPanel({
  locationLabel,
  nearestCities,
  onExploreCity,
  onDiscoverNearby,
  weekendGetawaySlug = 'rishikesh',
}: ComingSoonPanelProps) {
  const area = locationLabel?.split(',')[0] ?? 'your area';

  return (
    <div
      className="rounded-[24px] overflow-hidden border"
      style={{
        borderColor: '#e5e7eb',
        background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 55%, #ecfdf5 100%)',
        boxShadow: '0 8px 28px rgba(15,23,42,0.06)',
      }}
    >
      <div className="px-6 py-8 sm:px-8 sm:py-10">
        <div
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl mb-5"
          style={{ background: '#ecfdf5', color: '#059669' }}
        >
          <Sparkles className="h-5 w-5" />
        </div>

        <h3 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-xpx-text">
          We&apos;re coming soon
        </h3>
        <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-xpx-muted max-w-xl">
          We&apos;re adding more vacation rentals in {area}. In the meantime, browse homes in
          cities we already serve.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onDiscoverNearby}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition-transform active:scale-[0.99]"
            style={{ background: '#059669' }}
          >
            <Compass className="h-4 w-4" />
            Explore nearby destinations
          </button>
        </div>
      </div>

      {nearestCities.length > 0 && (
        <div className="border-t px-6 py-6 sm:px-8" style={{ borderColor: '#e5e7eb', background: 'rgba(255,255,255,0.7)' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#059669] mb-4">
            Closest destinations
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {nearestCities.map((city) => (
              <button
                key={city.slug}
                type="button"
                onClick={() => onExploreCity(city.slug)}
                className="group relative overflow-hidden rounded-2xl text-left min-h-[120px] transition-transform active:scale-[0.99]"
                style={{ boxShadow: '0 6px 18px rgba(15,23,42,0.08)' }}
              >
                {city.exploreImage && (
                  <img
                    src={city.exploreImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg, rgba(2,6,23,0.05) 0%, rgba(2,6,23,0.75) 100%)',
                  }}
                />
                <div className="relative p-4 flex flex-col justify-end h-full min-h-[120px]">
                  <span className="text-white font-bold text-lg">{city.city}</span>
                  <span className="text-xs text-white/80 mt-0.5">{formatDistanceKm(city.distanceKm)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="border-t px-6 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{ borderColor: '#e5e7eb', background: '#fafafa' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: '#ecfdf5', color: '#059669' }}
          >
            <Palmtree className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-xpx-text">Weekend getaway ideas</p>
            <p className="text-xs text-xpx-muted mt-0.5">
              Riverside retreats and boutique stays — perfect for a quick escape.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onExploreCity(weekendGetawaySlug)}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold border transition-colors"
          style={{ borderColor: '#a7f3d0', color: '#047857', background: '#fff' }}
        >
          Discover Rishikesh
        </button>
      </div>
    </div>
  );
}

import { ArrowRight, MapPin } from 'lucide-react';
import type { NearestServicedCity } from '../../lib/nearbyInventory';
import { formatDistanceKm } from '../../lib/nearbyInventory';

type NearbyDestinationsFallbackProps = {
  title?: string;
  subtitle?: string;
  nearestCities: NearestServicedCity[];
  onExploreCity: (slug: string) => void;
};

export default function NearbyDestinationsFallback({
  title = 'Discover popular stays nearby',
  subtitle = 'Handpicked destinations with verified inventory',
  nearestCities,
  onExploreCity,
}: NearbyDestinationsFallbackProps) {
  if (nearestCities.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-xpx-text">{title}</h3>
        <p className="text-sm text-xpx-muted mt-1">{subtitle}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
        {nearestCities.map((city) => (
          <button
            key={city.slug}
            type="button"
            onClick={() => onExploreCity(city.slug)}
            className="group snap-start shrink-0 w-[72vw] max-w-[280px] sm:w-[240px] relative overflow-hidden rounded-[20px] text-left transition-transform active:scale-[0.99]"
            style={{ boxShadow: '0 8px 22px rgba(15,23,42,0.08)' }}
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
                background: 'linear-gradient(180deg, rgba(2,6,23,0) 30%, rgba(2,6,23,0.82) 100%)',
              }}
            />
            <div className="relative flex flex-col justify-end min-h-[160px] p-4">
              <div className="flex items-center gap-1.5 text-white/85 text-xs font-medium mb-1">
                <MapPin className="h-3.5 w-3.5" />
                {formatDistanceKm(city.distanceKm)}
              </div>
              <span className="text-white font-extrabold text-xl">{city.city}</span>
              {city.tagline && (
                <span className="text-white/80 text-xs mt-1 line-clamp-2">{city.tagline}</span>
              )}
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-200">
                Explore stays
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

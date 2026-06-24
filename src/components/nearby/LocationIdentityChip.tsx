import { useState } from 'react';
import { ChevronDown, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { useNearbyLocationOptional } from '../../contexts/NearbyLocationContext';
import { LIVE_EXPLORE_CITIES } from '../../config/exploreCities';

type LocationIdentityChipProps = {
  variant?: 'light' | 'dark';
  className?: string;
};

/**
 * Persistent location identity — Airbnb-style "📍 Delhi" chip in header areas.
 */
export default function LocationIdentityChip({
  variant = 'dark',
  className = '',
}: LocationIdentityChipProps) {
  const nearby = useNearbyLocationOptional();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!nearby) return null;

  const { locationLabel, detectedCity, permission, openPrompt, refreshLocation, isLoading } =
    nearby;

  const displayCity =
    detectedCity ?? locationLabel?.split(',')[0] ?? null;

  const isLight = variant === 'light';
  const chipBg = isLight ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.92)';
  const chipBorder = isLight ? 'rgba(255,255,255,0.28)' : '#e5e7eb';
  const chipText = isLight ? '#ffffff' : '#0f172a';
  const chipMuted = isLight ? 'rgba(255,255,255,0.75)' : '#64748b';

  const handleExploreCity = (slug: string) => {
    setMenuOpen(false);
    window.history.pushState({}, '', `/stays/${slug}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors max-w-[160px] sm:max-w-[200px]"
        style={{
          background: chipBg,
          borderColor: chipBorder,
          color: chipText,
          backdropFilter: isLight ? 'blur(8px)' : undefined,
        }}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: isLight ? '#6ee7b7' : '#059669' }} />
        <span className="truncate">
          {displayCity ? displayCity : permission === 'granted' ? 'Near you' : 'Set location'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] cursor-default"
            aria-label="Close location menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            className="absolute left-0 top-[calc(100%+8px)] z-[61] min-w-[220px] rounded-2xl border p-2 shadow-xl"
            style={{ background: '#fff', borderColor: '#e5e7eb' }}
          >
            {permission === 'granted' ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  refreshLocation();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-xpx-text hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 text-[#059669] ${isLoading ? 'animate-spin' : ''}`} />
                Refresh location
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  openPrompt();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-xpx-text hover:bg-slate-50"
              >
                <Navigation className="h-4 w-4 text-[#059669]" />
                Use my location
              </button>
            )}

            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: chipMuted }}>
              Explore cities
            </p>
            {LIVE_EXPLORE_CITIES.slice(0, 5).map((city) => (
              <button
                key={city.id}
                type="button"
                role="menuitem"
                onClick={() => handleExploreCity(city.slug)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-xpx-text hover:bg-slate-50"
              >
                <MapPin className="h-3.5 w-3.5 text-[#059669]" />
                {city.name}
              </button>
            ))}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                window.history.pushState({}, '', '/explore');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="mt-1 flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold text-[#059669] hover:bg-emerald-50"
            >
              View all destinations
            </button>
          </div>
        </>
      )}
    </div>
  );
}

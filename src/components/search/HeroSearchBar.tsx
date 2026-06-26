import { useEffect, useRef, useState } from 'react';
import { Calendar, MapPin, Search, Users, X } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useGalleryMotion';

const ACCENT = '#059669';

export type HeroSearchBarProps = {
  cities: readonly string[];
  city: string;
  onCityChange: (v: string) => void;
  checkin: string;
  onCheckinChange: (v: string) => void;
  checkout: string;
  onCheckoutChange: (v: string) => void;
  guests: number;
  onGuestsChange: (n: number) => void;
  onSearch: () => void;
  variant?: 'hero' | 'compact';
  /** Subtle nearby label — e.g. "Near Connaught Place" or "Choose location" */
  locationLabel?: string | null;
  onLocationClick?: () => void;
};

function formatHeroDisplayDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function openHeroDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    const el = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof el.showPicker === 'function') {
      el.showPicker();
    } else {
      input.click();
    }
  } catch {
    input.click();
  }
}

function SearchLocationChip({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80"
      style={{
        borderColor: 'rgba(226,232,240,0.95)',
        background: 'rgba(255,255,255,0.92)',
        color: '#475569',
      }}
    >
      <MapPin className="h-3 w-3 shrink-0" style={{ color: ACCENT }} aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}

/**
 * Primary search — hero (large) or compact (sticky header morph).
 * Mobile: collapsed trigger + bottom sheet. Desktop: segmented pill.
 */
export default function HeroSearchBar({
  cities,
  city,
  onCityChange,
  checkin,
  onCheckinChange,
  checkout,
  onCheckoutChange,
  guests,
  onGuestsChange,
  onSearch,
  variant = 'hero',
  locationLabel,
  onLocationClick,
}: HeroSearchBarProps) {
  const reducedMotion = usePrefersReducedMotion();
  const today = new Date().toISOString().split('T')[0];
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCompact = variant === 'compact';

  useEffect(() => {
    if (!mobileOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  const mobileDateSummary =
    checkin && checkout
      ? `${formatHeroDisplayDate(checkin)} - ${formatHeroDisplayDate(checkout)}`
      : checkin
        ? formatHeroDisplayDate(checkin)
        : checkout
          ? formatHeroDisplayDate(checkout)
          : 'Add dates';

  const mobileShadow = isCompact
    ? '0 4px 14px rgba(15,23,42,0.08)'
    : '0 14px 34px rgba(15,23,42,0.16)';

  return (
    <>
      {locationLabel && onLocationClick && !isCompact && (
        <SearchLocationChip label={locationLabel} onClick={onLocationClick} />
      )}

      <div
        className={`md:hidden w-full rounded-2xl border bg-white ${isCompact ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}
        style={{
          borderColor: 'rgba(226,232,240,0.95)',
          boxShadow: mobileShadow,
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="min-w-0 flex-1 text-left rounded-xl px-1 py-1"
            aria-label="Open search filters"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#6B7280' }}>
              {isCompact ? 'Search' : 'Where to?'}
            </div>
            <div
              className={`truncate font-bold leading-tight ${isCompact ? 'text-[14px]' : 'mt-0.5 text-[15px]'}`}
              style={{ color: '#111827' }}
            >
              {city}
            </div>
            {!isCompact && (
              <div className="mt-0.5 truncate text-[11px] font-semibold" style={{ color: '#6B7280' }}>
                {mobileDateSummary} · {guests} {guests === 1 ? 'guest' : 'guests'}
              </div>
            )}
            {isCompact && (
              <div className="truncate text-[11px] font-medium" style={{ color: '#6B7280' }}>
                {mobileDateSummary} · {guests}g
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={onSearch}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white shrink-0 ${
              isCompact ? 'h-10 w-10 min-w-10' : 'h-12 min-w-[98px] px-4'
            }`}
            style={{ background: ACCENT }}
            aria-label="Search stays"
          >
            <Search className="h-4 w-4" />
            {!isCompact && <span>Search</span>}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className={`absolute inset-x-0 bottom-0 rounded-t-[28px] border-t bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 ${
              reducedMotion ? '' : 'xpx-hero-search-sheet'
            }`}
            style={{ borderColor: '#E5E7EB' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search stays"
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300" />
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: '#111827' }}>
                Search stays
              </h3>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {locationLabel && onLocationClick && (
              <SearchLocationChip label={locationLabel} onClick={onLocationClick} />
            )}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-semibold" style={{ color: '#6B7280' }}>
                Where to?
                <div
                  className="mt-1.5 flex min-h-[48px] items-center gap-2 rounded-2xl border bg-white px-3"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <MapPin className="h-4 w-4 shrink-0" style={{ color: '#9CA3AF' }} />
                  <select
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold outline-none"
                    style={{ color: '#111827' }}
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-2.5">
                <label className="block text-[11px] font-semibold" style={{ color: '#6B7280' }}>
                  Check-in
                  <div
                    className="relative mt-1.5 min-h-[48px] flex items-center rounded-2xl border bg-white px-3"
                    style={{ borderColor: '#E5E7EB' }}
                  >
                    <Calendar className="h-4 w-4 shrink-0 mr-2" style={{ color: '#9CA3AF' }} />
                    <input
                      type="date"
                      min={today}
                      value={checkin}
                      onChange={(e) => onCheckinChange(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold outline-none"
                      style={{ color: '#111827' }}
                    />
                  </div>
                </label>
                <label className="block text-[11px] font-semibold" style={{ color: '#6B7280' }}>
                  Check-out
                  <div
                    className="relative mt-1.5 min-h-[48px] flex items-center rounded-2xl border bg-white px-3"
                    style={{ borderColor: '#E5E7EB' }}
                  >
                    <Calendar className="h-4 w-4 shrink-0 mr-2" style={{ color: '#9CA3AF' }} />
                    <input
                      type="date"
                      min={checkin || today}
                      value={checkout}
                      onChange={(e) => onCheckoutChange(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold outline-none"
                      style={{ color: '#111827' }}
                    />
                  </div>
                </label>
              </div>
              <label className="block text-[11px] font-semibold" style={{ color: '#6B7280' }}>
                Guests
                <div
                  className="mt-1.5 flex min-h-[48px] items-center gap-2 rounded-2xl border bg-white px-3"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <Users className="h-4 w-4 shrink-0" style={{ color: '#9CA3AF' }} />
                  <select
                    value={guests}
                    onChange={(e) => onGuestsChange(Number(e.target.value))}
                    className="w-full bg-transparent text-sm font-semibold outline-none"
                    style={{ color: '#111827' }}
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onSearch();
                }}
                className="mt-1 inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-95 active:scale-[0.99]"
                style={{ background: ACCENT }}
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="hidden md:flex items-center w-full"
        style={{
          background: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 16px 40px rgba(15,23,42,0.22)',
          minHeight: 78,
          padding: '6px 8px',
          maxWidth: 980,
          width: '100%',
          border: '1px solid rgba(226,232,240,0.9)',
        }}
      >
        <div
          className="flex flex-col justify-center min-w-0"
          style={{ flex: '1.25', paddingLeft: 18, paddingRight: 14 }}
        >
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Where to?</span>
          <div className="mt-0.5 flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" style={{ color: '#9CA3AF' }} />
            <select
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              className="appearance-none bg-transparent border-0 p-0 text-[14px] outline-none cursor-pointer w-full truncate"
              style={{ color: '#111827', fontWeight: 700 }}
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ width: 1, height: 38, background: '#E5E7EB', flexShrink: 0 }} aria-hidden />
        <div
          className="flex flex-col justify-center min-w-[120px] shrink-0"
          style={{ flex: 1, paddingLeft: 14, paddingRight: 14 }}
        >
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Check-in</span>
          <div className="relative mt-0.5 min-h-[44px] w-full flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" style={{ color: '#9CA3AF' }} />
            <input
              ref={checkInRef}
              type="date"
              min={today}
              value={checkin}
              onChange={(e) => onCheckinChange(e.target.value)}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => openHeroDatePicker(checkInRef.current)}
              className="absolute inset-0 left-6 z-10 flex w-[calc(100%-1.5rem)] min-h-[44px] items-center rounded-lg border-0 bg-transparent p-0 text-left cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2"
              aria-label="Choose check-in date"
            >
              <span className="text-[14px] font-semibold truncate" style={{ color: '#111827' }}>
                {checkin ? formatHeroDisplayDate(checkin) : 'Add date'}
              </span>
            </button>
          </div>
        </div>
        <div style={{ width: 1, height: 38, background: '#E5E7EB', flexShrink: 0 }} aria-hidden />
        <div
          className="flex flex-col justify-center min-w-[120px] shrink-0"
          style={{ flex: 1, paddingLeft: 14, paddingRight: 14 }}
        >
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Check-out</span>
          <div className="relative mt-0.5 min-h-[44px] w-full flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" style={{ color: '#9CA3AF' }} />
            <input
              ref={checkOutRef}
              type="date"
              min={checkin || today}
              value={checkout}
              onChange={(e) => onCheckoutChange(e.target.value)}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => openHeroDatePicker(checkOutRef.current)}
              className="absolute inset-0 left-6 z-10 flex w-[calc(100%-1.5rem)] min-h-[44px] items-center rounded-lg border-0 bg-transparent p-0 text-left cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2"
              aria-label="Choose check-out date"
            >
              <span className="text-[14px] font-semibold truncate" style={{ color: '#111827' }}>
                {checkout ? formatHeroDisplayDate(checkout) : 'Add date'}
              </span>
            </button>
          </div>
        </div>
        <div style={{ width: 1, height: 38, background: '#E5E7EB', flexShrink: 0 }} aria-hidden />
        <div
          className="flex flex-col justify-center min-w-0"
          style={{ flex: 0.95, paddingLeft: 14, paddingRight: 12 }}
        >
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Guests</span>
          <div className="mt-0.5 flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" style={{ color: '#9CA3AF' }} />
            <select
              value={guests}
              onChange={(e) => onGuestsChange(Number(e.target.value))}
              className="appearance-none bg-transparent border-0 p-0 text-[14px] outline-none cursor-pointer w-full truncate"
              style={{ color: '#111827', fontWeight: 700 }}
              aria-label="Guests"
            >
              {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'guest' : 'guests'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={onSearch}
          className="flex items-center justify-center gap-2 shrink-0 rounded-2xl px-5 transition-opacity duration-200 hover:opacity-95 active:scale-[0.99]"
          style={{
            background: ACCENT,
            height: 58,
            marginRight: 2,
          }}
          aria-label="Search stays"
        >
          <Search className="w-4 h-4" style={{ color: '#ffffff' }} />
          <span className="text-sm font-semibold text-white">Search</span>
        </button>
      </div>
    </>
  );
}

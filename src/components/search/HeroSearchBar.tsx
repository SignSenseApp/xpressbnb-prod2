import { useEffect, useRef, useState } from 'react';
import { Calendar, MapPin, Search, Users, X } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useGalleryMotion';
import { premiumBrand, premiumShadows } from '../../lib/premiumBrand';

const ACCENT = premiumBrand.forest;

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
  variant?: 'hero' | 'compact' | 'hero-h1';
  locationLabel?: string | null;
  onLocationClick?: () => void;
};

function formatHeroDisplayDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function openHeroDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    const el = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof el.showPicker === 'function') el.showPicker();
    else input.click();
  } catch {
    input.click();
  }
}

/**
 * Premium search — collapsed glass pill expands into Airbnb × Linear fields.
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isCompact = variant === 'compact';
  const isHeroH1 = variant === 'hero-h1';
  const isHeroPill = variant === 'hero' || isHeroH1;

  useEffect(() => {
    if (!mobileOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!expanded || isCompact) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [expanded, isCompact]);

  const dateSummary =
    checkin && checkout
      ? `${formatHeroDisplayDate(checkin)} – ${formatHeroDisplayDate(checkout)}`
      : checkin
        ? formatHeroDisplayDate(checkin)
        : 'Add dates';

  const collapsedLabel = isHeroH1 ? 'Where to?' : city || 'Where to?';

  if (isHeroH1) {
    return (
      <>
        <div ref={rootRef} className="w-full">
          <div className="xpx-h1-hero-search-pill">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="xpx-h1-hero-search-pill__trigger"
              aria-label="Open search"
            >
              <MapPin className="xpx-h1-hero-search-pill__pin" strokeWidth={2} aria-hidden />
              <span className="xpx-h1-hero-search-pill__label">Where to?</span>
            </button>
            <button
              type="button"
              onClick={onSearch}
              className="xpx-h1-hero-search-pill__action"
              aria-label="Search stays"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-[120] bg-[#111827]/40 backdrop-blur-md"
            onClick={() => setMobileOpen(false)}
          >
            <div
              className={`absolute inset-x-0 bottom-0 rounded-t-[28px] bg-[#FAF8F4] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 ${
                reducedMotion ? '' : 'xpx-hero-search-sheet'
              }`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Search stays"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D1D5DB]" />
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#111827]">Where to?</h3>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#6B7280]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {locationLabel && onLocationClick && (
                <button
                  type="button"
                  onClick={onLocationClick}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0B8A5A] border border-[rgba(17,24,39,0.08)]"
                >
                  <MapPin className="h-3 w-3" />
                  {locationLabel}
                </button>
              )}
              <div className="space-y-3">
                <SearchField label="Destination">
                  <MapPin className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                  <select
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold outline-none text-[#111827]"
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </SearchField>
                <div className="grid grid-cols-2 gap-3">
                  <SearchField label="Check-in">
                    <Calendar className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                    <input
                      type="date"
                      min={today}
                      value={checkin}
                      onChange={(e) => onCheckinChange(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold outline-none text-[#111827]"
                    />
                  </SearchField>
                  <SearchField label="Check-out">
                    <Calendar className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                    <input
                      type="date"
                      min={checkin || today}
                      value={checkout}
                      onChange={(e) => onCheckoutChange(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold outline-none text-[#111827]"
                    />
                  </SearchField>
                </div>
                <SearchField label="Guests">
                  <Users className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                  <select
                    value={guests}
                    onChange={(e) => onGuestsChange(Number(e.target.value))}
                    className="w-full bg-transparent text-sm font-semibold outline-none text-[#111827]"
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                    ))}
                  </select>
                </SearchField>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onSearch();
                  }}
                  className="mt-2 inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white xpx-press"
                  style={{ background: ACCENT }}
                >
                  <Search className="h-4 w-4" />
                  Search stays
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* ── Mobile: glass pill → bottom sheet ── */}
      <div
        ref={rootRef}
        className={`md:hidden w-full ${isCompact ? '' : isHeroPill ? 'xpx-premium-search-wrap' : ''}`}
      >
        <div
          className={`xpx-premium-search-pill ${isCompact ? 'xpx-premium-search-pill--compact' : ''}`}
          style={{
            boxShadow: isCompact ? premiumShadows.chip : premiumShadows.search,
          }}
        >
          <button
            type="button"
            onClick={() => (isCompact ? setMobileOpen(true) : setMobileOpen(true))}
            className="min-w-0 flex-1 text-left px-1 py-0.5"
            aria-label="Open search"
          >
            {!isCompact ? (
              <>
                <span className="text-[15px] font-semibold text-[#111827] flex items-center gap-1.5">
                  <span aria-hidden>📍</span>
                  <span className="truncate">{collapsedLabel}</span>
                </span>
                {expanded && (
                  <span className="mt-0.5 block text-[12px] font-medium text-[#6B7280] truncate">
                    {dateSummary} · {guests} {guests === 1 ? 'guest' : 'guests'}
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">Search</div>
                <div className="truncate text-[14px] font-bold text-[#111827]">{city}</div>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onSearch}
            className="xpx-premium-search-btn shrink-0"
            aria-label="Search stays"
          >
            <Search className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[120] bg-[#111827]/40 backdrop-blur-md"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className={`absolute inset-x-0 bottom-0 rounded-t-[28px] bg-[#FAF8F4] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 ${
              reducedMotion ? '' : 'xpx-hero-search-sheet'
            }`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search stays"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D1D5DB]" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="xpx-premium-font-display text-lg font-semibold text-[#111827]">Where to?</h3>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#6B7280]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {locationLabel && onLocationClick && (
              <button
                type="button"
                onClick={onLocationClick}
                className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0B8A5A] border border-[rgba(17,24,39,0.08)]"
              >
                <MapPin className="h-3 w-3" />
                {locationLabel}
              </button>
            )}
            <div className="space-y-3">
              <SearchField label="Destination">
                <MapPin className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                <select
                  value={city}
                  onChange={(e) => onCityChange(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold outline-none text-[#111827]"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </SearchField>
              <div className="grid grid-cols-2 gap-3">
                <SearchField label="Check-in">
                  <Calendar className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                  <input
                    type="date"
                    min={today}
                    value={checkin}
                    onChange={(e) => onCheckinChange(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold outline-none text-[#111827]"
                  />
                </SearchField>
                <SearchField label="Check-out">
                  <Calendar className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                  <input
                    type="date"
                    min={checkin || today}
                    value={checkout}
                    onChange={(e) => onCheckoutChange(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold outline-none text-[#111827]"
                  />
                </SearchField>
              </div>
              <SearchField label="Guests">
                <Users className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                <select
                  value={guests}
                  onChange={(e) => onGuestsChange(Number(e.target.value))}
                  className="w-full bg-transparent text-sm font-semibold outline-none text-[#111827]"
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                  ))}
                </select>
              </SearchField>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onSearch();
                }}
                className="mt-2 inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white xpx-press"
                style={{ background: ACCENT }}
              >
                <Search className="h-4 w-4" />
                Search stays
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop: expandable glass capsule ── */}
      <div ref={!isCompact ? rootRef : undefined} className="hidden md:block w-full max-w-xl">
        <div
          className={`xpx-premium-search-desktop ${expanded ? 'xpx-premium-search-desktop--expanded' : ''}`}
          style={{ boxShadow: premiumShadows.search }}
        >
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
              <span className="text-[15px] font-semibold text-[#111827] flex items-center gap-2 min-w-0 flex-1">
                <span aria-hidden>📍</span>
                <span className="truncate">{collapsedLabel}</span>
              </span>
              <span
                className="xpx-premium-search-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSearch();
                }}
                role="presentation"
              >
                <Search className="h-4 w-4" strokeWidth={2.25} />
              </span>
            </button>
          ) : (
            <div className="flex items-stretch w-full min-h-[72px]">
              <div className="flex flex-col justify-center flex-[1.2] px-5 py-3 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Where</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
                  <select
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    className="appearance-none bg-transparent border-0 p-0 text-[14px] font-bold outline-none cursor-pointer w-full truncate text-[#111827]"
                  >
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="w-px bg-[rgba(17,24,39,0.08)] my-3" aria-hidden />
              <div className="flex flex-col justify-center flex-1 px-4 py-3 min-w-[110px]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Dates</span>
                <div className="relative mt-0.5 flex items-center gap-2 min-h-[40px]">
                  <Calendar className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
                  <input ref={checkInRef} type="date" min={today} value={checkin} onChange={(e) => onCheckinChange(e.target.value)} className="sr-only" tabIndex={-1} aria-hidden />
                  <input ref={checkOutRef} type="date" min={checkin || today} value={checkout} onChange={(e) => onCheckoutChange(e.target.value)} className="sr-only" tabIndex={-1} aria-hidden />
                  <button
                    type="button"
                    onClick={() => openHeroDatePicker(checkInRef.current)}
                    className="text-left text-[13px] font-semibold text-[#111827] truncate"
                  >
                    {checkin && checkout ? dateSummary : 'Add dates'}
                  </button>
                </div>
              </div>
              <div className="w-px bg-[rgba(17,24,39,0.08)] my-3" aria-hidden />
              <div className="flex flex-col justify-center flex-[0.85] px-4 py-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Guests</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <Users className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
                  <select
                    value={guests}
                    onChange={(e) => onGuestsChange(Number(e.target.value))}
                    className="appearance-none bg-transparent border-0 p-0 text-[14px] font-bold outline-none cursor-pointer text-[#111827]"
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={onSearch}
                className="xpx-premium-search-btn m-2 shrink-0 self-center"
                aria-label="Search"
              >
                <Search className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SearchField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold text-[#6B7280]">
      {label}
      <div className="mt-1.5 flex min-h-[50px] items-center gap-2 rounded-2xl border border-[rgba(17,24,39,0.08)] bg-white px-3.5">
        {children}
      </div>
    </label>
  );
}

import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { useNearbyLocation } from '../../contexts/NearbyLocationContext';
import { getAppMode } from '../../lib/analytics';
import { LIVE_EXPLORE_CITIES } from '../../config/exploreCities';
import { navigateTo } from '../../lib/navigation';

const QUICK_CITIES = LIVE_EXPLORE_CITIES.filter((c) => c.status === 'live').slice(0, 4);

/**
 * Location permission sheet — VRBO-style: clear benefit, current-location CTA,
 * and an obvious "search by destination" path (not AI-marketing fluff).
 */
export default function LocationPermissionSheet() {
  const { isPromptOpen, dismissPrompt, acceptPrompt, phase } = useNearbyLocation();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const open = isPromptOpen && phase === 'prompt_visible';

  useEffect(() => {
    if (open) {
      setMounted(true);
      const t = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(t);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!mounted) return null;

  const isPwa = getAppMode() === 'standalone_pwa';

  const handleSearchDestination = () => {
    dismissPrompt();
    navigateTo('/explore');
  };

  const handleQuickCity = (slug: string) => {
    dismissPrompt();
    navigateTo(`/stays/${slug}`);
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-sheet-title"
      aria-describedby="location-sheet-desc"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-slate-900/40 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={dismissPrompt}
      />

      <div
        className="relative w-full sm:max-w-[400px] rounded-t-[20px] sm:rounded-[20px] overflow-hidden transition-all duration-300 ease-out"
        style={{
          background: '#ffffff',
          boxShadow: '0 -4px 24px rgba(15,23,42,0.12)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex justify-center pt-2.5 pb-0 sm:hidden" aria-hidden>
          <div className="h-1 w-9 rounded-full bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={dismissPrompt}
          className="absolute right-3 top-3 sm:top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 pt-1 pb-5 sm:px-6 sm:pb-6">
          <div className="flex items-start gap-3.5 pr-8">
            <div
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full mt-0.5"
              style={{ background: '#f1f5f9', color: '#334155' }}
            >
              <MapPin className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2
                id="location-sheet-title"
                className="text-[19px] sm:text-xl font-bold tracking-tight text-xpx-text leading-snug"
              >
                Show rentals near you
              </h2>
              <p id="location-sheet-desc" className="mt-1.5 text-sm leading-relaxed text-xpx-muted">
                {isPwa
                  ? 'See homes and apartments close to your current area. Location is only used to sort nearby results.'
                  : "See homes and apartments in your area. We use your location only to show what's nearby."}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={acceptPrompt}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white transition-colors active:opacity-90"
              style={{ background: 'var(--xpx-cta, #059669)' }}
            >
              {isPwa ? 'Use current location' : 'Use current location'}
            </button>
            <button
              type="button"
              onClick={handleSearchDestination}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border text-[15px] font-semibold text-xpx-text transition-colors hover:bg-slate-50 active:bg-slate-100"
              style={{ borderColor: '#cbd5e1' }}
            >
              Search by destination
            </button>
          </div>

          {QUICK_CITIES.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#e2e8f0' }}>
              <p className="text-xs font-medium text-xpx-muted mb-2.5">Popular destinations</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_CITIES.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleQuickCity(city.slug)}
                    className="rounded-full border px-3.5 py-2 text-sm font-medium text-xpx-text transition-colors hover:bg-slate-50 active:bg-slate-100"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={dismissPrompt}
            className="mt-4 w-full py-2 text-sm font-medium text-xpx-muted hover:text-xpx-text transition-colors"
          >
            Not now
          </button>

          <p className="mt-1 text-[11px] leading-relaxed text-xpx-subtle text-center px-2">
            Your location is not sold or shared. You can turn it off anytime in your device or
            browser settings.
          </p>
        </div>
      </div>
    </div>
  );
}

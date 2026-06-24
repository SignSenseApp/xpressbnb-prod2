import { useEffect, useState } from 'react';
import { MapPin, Navigation, Shield, X } from 'lucide-react';
import { useNearbyLocation } from '../../contexts/NearbyLocationContext';
import { getAppMode } from '../../lib/analytics';

/**
 * Mobile-first bottom sheet — Airbnb-style location permission prompt.
 * Respects deny: dismiss without re-prompting for 7 days.
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

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Enable location for nearby stays"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={dismissPrompt}
      />

      <div
        className="relative w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] overflow-hidden transition-all duration-300 ease-out"
        style={{
          background: '#ffffff',
          boxShadow: '0 -8px 40px rgba(15,23,42,0.18)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={dismissPrompt}
          className="absolute right-4 top-4 sm:top-5 inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors"
          style={{ background: '#f8fafc', color: '#64748b' }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-2 pb-6 sm:px-7 sm:pb-7">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-4"
            style={{ background: '#ecfdf5', color: '#059669' }}
          >
            <Navigation className="h-5 w-5" />
          </div>

          <h2 className="text-[22px] sm:text-2xl font-extrabold tracking-tight text-xpx-text pr-8">
            Find exceptional stays near you
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-xpx-muted max-w-[36ch]">
            {isPwa
              ? 'Allow location while using the app to surface curated homes around you — instantly, no search required.'
              : 'Share your location to discover handpicked stays nearby. We only use it to show relevant properties.'}
          </p>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3.5" style={{ borderColor: '#e5e7eb', background: '#fafafa' }}>
            <Shield className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#059669' }} />
            <p className="text-xs leading-relaxed text-xpx-muted">
              Your precise location is never sold or shared. You can change this anytime in browser settings.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={acceptPrompt}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-transform active:scale-[0.99]"
              style={{ background: '#059669', boxShadow: '0 8px 20px rgba(5,150,105,0.28)' }}
            >
              <MapPin className="h-4 w-4" />
              {isPwa ? 'Allow while using app' : 'Use my location'}
            </button>
            <button
              type="button"
              onClick={dismissPrompt}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl text-sm font-semibold transition-colors"
              style={{ color: '#64748b' }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

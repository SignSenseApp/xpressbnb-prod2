import { useEffect, useState, useSyncExternalStore } from 'react';
import { Cookie, Settings2, X } from 'lucide-react';
import {
  acceptAllCookies,
  acceptEssentialCookiesOnly,
  getCookieConsent,
  hasCookieConsentDecision,
  saveCustomCookiePreferences,
  shouldShowCookieBanner,
  subscribeCookieConsent,
} from '../lib/cookieConsent';
import { openHomeOverlay } from '../lib/navigation';

function useCookieBannerVisible() {
  return useSyncExternalStore(
    subscribeCookieConsent,
    () => shouldShowCookieBanner(),
    () => false,
  );
}

function CookieSettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const existing = getCookieConsent();
  const [analytics, setAnalytics] = useState(existing?.analytics ?? false);
  const [marketing, setMarketing] = useState(existing?.marketing ?? false);

  useEffect(() => {
    if (open) {
      const current = getCookieConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
    }
  }, [open]);

  if (!open) return null;

  const save = () => {
    saveCustomCookiePreferences({ analytics, marketing });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Cookie settings">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.2)',
        }}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <p className="xpx-eyebrow">Cookie settings</p>
              <h2 className="text-lg font-extrabold text-xpx-text tracking-tight">Choose what we can use</h2>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-xpx-muted" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <ConsentRow
              title="Essential"
              description="Login sessions, security, and saving your preferences. Always on."
              checked
              disabled
            />
            <ConsentRow
              title="Analytics"
              description="Anonymous usage stats so we can improve search, listings, and speed."
              checked={analytics}
              onChange={setAnalytics}
            />
            <ConsentRow
              title="Marketing"
              description="Measure ad performance (Google Ads) — helps us reach more hosts and guests."
              checked={marketing}
              onChange={setMarketing}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={save}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--xpx-warm)' }}
            >
              Save preferences
            </button>
            <button
              type="button"
              onClick={() => {
                acceptAllCookies();
                onClose();
              }}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)', color: 'var(--xpx-text)' }}
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-xpx-text">{title}</p>
        <p className="text-xs text-xpx-muted mt-1 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className="relative shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors disabled:opacity-60"
        style={{ background: checked ? 'var(--xpx-warm)' : 'var(--xpx-border-strong)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
          aria-hidden
        />
      </button>
    </div>
  );
}

export function CookieConsentBanner() {
  const visible = useCookieBannerVisible();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--xpx-cookie-banner-h', visible ? '132px' : '0px');
    return () => {
      document.documentElement.style.removeProperty('--xpx-cookie-banner-h');
    };
  }, [visible]);

  if (!visible) return <CookieSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />;

  return (
    <>
      <div
        className="fixed left-0 right-0 bottom-0 z-[55] animate-fade-in-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="region"
        aria-label="Cookie consent"
      >
        <div
          className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5"
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderTop: '1px solid var(--xpx-border-strong)',
            boxShadow: '0 -8px 32px rgba(15,23,42,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className="hidden sm:flex shrink-0 w-10 h-10 rounded-xl items-center justify-center"
                style={{ background: 'rgba(5,150,105,0.12)', color: '#047857' }}
              >
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-xpx-text leading-snug">We use cookies</p>
                <p className="text-xs sm:text-sm text-xpx-muted mt-1 leading-relaxed">
                  Essential cookies keep you signed in and the site running. With your permission we also use analytics and
                  marketing cookies to improve XpressBnB.{' '}
                  <button
                    type="button"
                    onClick={() => openHomeOverlay('privacy')}
                    className="font-semibold underline underline-offset-2 hover:text-xpx-text"
                    style={{ color: 'var(--xpx-warm-dark)' }}
                  >
                    Privacy Policy
                  </button>
                </p>
              </div>
            </div>

            <div className="flex flex-col xs:flex-row sm:flex-col lg:flex-row gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => acceptAllCookies()}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white whitespace-nowrap"
                style={{ background: 'var(--xpx-warm)', boxShadow: '0 4px 14px rgba(5,150,105,0.25)' }}
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={() => acceptEssentialCookiesOnly()}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap"
                style={{
                  background: 'var(--xpx-surface-light)',
                  border: '1px solid var(--xpx-border)',
                  color: 'var(--xpx-text)',
                }}
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="px-3 py-2.5 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xpx-muted hover:text-xpx-text"
              >
                <Settings2 className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <CookieSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

/** Footer / settings link after user has already chosen */
export function ManageCookiesLink({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const decided = useSyncExternalStore(subscribeCookieConsent, () => hasCookieConsentDecision(), () => false);

  if (!decided) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className={className}
        style={style}
      >
        Cookie settings
      </button>
      <CookieSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export { useCookieBannerVisible };

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
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

const PRIMARY_BLUE = '#2563EB';
const PRIMARY_BLUE_HOVER = '#1D4ED8';

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
  const titleId = useId();
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const save = () => {
    saveCustomCookiePreferences({ analytics, marketing });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close cookie settings"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-[calc(100%-20px)] sm:w-full sm:max-w-md max-h-[calc(100dvh-20px)] flex flex-col rounded-[22px] sm:rounded-[20px] overflow-hidden mb-[10px] sm:mb-0"
        style={{
          background: 'var(--xpx-surface, #ffffff)',
          border: '1px solid var(--xpx-border, #E5E7EB)',
          boxShadow: '0 20px 60px rgba(15,23,42,0.16)',
        }}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-xpx-subtle">
                Cookie settings
              </p>
              <h2 id={titleId} className="text-lg font-extrabold text-xpx-text tracking-tight mt-1">
                Choose what we can use
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-xpx-muted hover:text-xpx-text hover:bg-slate-100 transition-colors duration-150"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
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
        </div>

        <div
          className="shrink-0 px-5 py-4 sm:px-6 border-t flex flex-col sm:flex-row gap-2"
          style={{
            borderColor: 'var(--xpx-border, #E5E7EB)',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            background: 'var(--xpx-surface, #ffffff)',
          }}
        >
          <button
            type="button"
            onClick={save}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors duration-150 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ background: PRIMARY_BLUE }}
          >
            Save preferences
          </button>
          <button
            type="button"
            onClick={() => {
              acceptAllCookies();
              onClose();
            }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-xpx-text transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            style={{
              background: 'var(--xpx-surface-light, #F8FAFC)',
              border: '1px solid var(--xpx-border, #E5E7EB)',
            }}
          >
            Accept all
          </button>
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
        className="relative shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors duration-150 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          background: checked ? PRIMARY_BLUE : 'var(--xpx-border-strong, #CBD5E1)',
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-150"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
          aria-hidden
        />
      </button>
    </div>
  );
}

function PrivacyCopy() {
  return (
    <p className="text-sm sm:text-[15px] text-xpx-muted leading-relaxed">
      Your travel plans stay private. Essential cookies keep the site working. With your permission,
      we also use analytics cookies to improve XpressBnB — never to sell your data.{' '}
      <button
        type="button"
        onClick={() => openHomeOverlay('privacy')}
        className="font-semibold underline underline-offset-2 text-xpx-text hover:opacity-80 transition-opacity duration-150"
      >
        Privacy Policy
      </button>
    </p>
  );
}

type CookieConsentBannerProps = {
  /** When true, visibility is controlled by the guest onboarding orchestrator. */
  orchestrated?: boolean;
  forceVisible?: boolean;
};

export function CookieConsentBanner({
  orchestrated = false,
  forceVisible = false,
}: CookieConsentBannerProps) {
  const naturalVisible = useCookieBannerVisible();
  const visible = orchestrated ? forceVisible : naturalVisible;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--xpx-cookie-banner-h', '0px');
    return () => {
      document.documentElement.style.removeProperty('--xpx-cookie-banner-h');
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    dialogRef.current?.focus();
  }, [visible]);

  if (!visible) {
    return <CookieSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />;
  }

  const openSettings = () => setSettingsOpen(true);

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6" role="presentation">
        <div className="absolute inset-0 bg-black/55" aria-hidden />

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative z-[1] flex flex-col w-[calc(100%-20px)] sm:w-full sm:max-w-[800px] max-h-[calc(100dvh-20px)] sm:max-h-[min(88vh,640px)] mb-[10px] sm:mb-0 rounded-[22px] sm:rounded-[20px] overflow-hidden outline-none"
          style={{
            background: 'var(--xpx-surface, #ffffff)',
            border: '1px solid var(--xpx-border, #E5E7EB)',
            boxShadow: '0 24px 64px rgba(15,23,42,0.18)',
          }}
        >
          {/* Scrollable legal copy */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-5">
            <h2
              id={titleId}
              className="text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight leading-tight"
            >
              Your privacy matters
            </h2>
            <div className="mt-3 sm:mt-4">
              <PrivacyCopy />
            </div>
          </div>

          {/* Desktop actions */}
          <div
            className="hidden sm:flex shrink-0 items-center justify-between gap-4 px-8 py-5 border-t"
            style={{
              borderColor: 'var(--xpx-border, #E5E7EB)',
              background: 'var(--xpx-surface, #ffffff)',
            }}
          >
            <button
              type="button"
              onClick={openSettings}
              className="text-sm font-semibold text-xpx-text underline underline-offset-4 hover:opacity-80 transition-opacity duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-sm"
            >
              More settings
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => acceptEssentialCookiesOnly()}
                className="min-w-[120px] h-11 px-5 rounded-xl text-sm font-semibold text-xpx-text transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                style={{
                  background: 'var(--xpx-surface, #ffffff)',
                  border: '1px solid var(--xpx-border-strong, #CBD5E1)',
                }}
              >
                Reject All
              </button>
              <button
                type="button"
                onClick={() => acceptAllCookies()}
                className="min-w-[120px] h-11 px-6 rounded-xl text-sm font-bold text-white transition-colors duration-150 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ background: PRIMARY_BLUE }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = PRIMARY_BLUE_HOVER;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = PRIMARY_BLUE;
                }}
              >
                Accept
              </button>
            </div>
          </div>

          {/* Mobile sticky actions */}
          <div
            className="sm:hidden shrink-0 px-5 pt-3 border-t flex flex-col gap-2.5"
            style={{
              borderColor: 'var(--xpx-border, #E5E7EB)',
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
              background: 'var(--xpx-surface, #ffffff)',
            }}
          >
            <button
              type="button"
              onClick={() => acceptAllCookies()}
              className="w-full h-12 rounded-xl text-sm font-bold text-white transition-opacity duration-150 active:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ background: PRIMARY_BLUE }}
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => acceptEssentialCookiesOnly()}
              className="w-full h-12 rounded-xl text-sm font-semibold text-xpx-text transition-colors duration-150 active:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              style={{
                background: 'var(--xpx-surface, #ffffff)',
                border: '1px solid var(--xpx-border-strong, #CBD5E1)',
              }}
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={openSettings}
              className="w-full py-2 text-sm font-semibold text-xpx-text underline underline-offset-4 hover:opacity-80 transition-opacity duration-150"
            >
              More settings
            </button>
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

/** Cookie consent — essential vs analytics/marketing tracking for XpressBnB */

export type CookieConsentChoice = 'accepted' | 'essential';

export type CookieConsentState = {
  choice: CookieConsentChoice;
  /** Vercel Web Analytics + Speed Insights */
  analytics: boolean;
  /** Google Ads / conversion tags */
  marketing: boolean;
  updatedAt: number;
};

const STORAGE_KEY = 'xpx_cookie_consent_v1';
const CONSENT_EVENT = 'xpx-consent-updated';
const GOOGLE_ADS_ID = 'AW-17923088071';

let gtagLoaded = false;

function readStored(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed.choice !== 'accepted' && parsed.choice !== 'essential') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(state: CookieConsentState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
}

export function getCookieConsent(): CookieConsentState | null {
  return readStored();
}

export function hasCookieConsentDecision(): boolean {
  return readStored() !== null;
}

export function shouldShowCookieBanner(): boolean {
  return !hasCookieConsentDecision();
}

export function subscribeCookieConsent(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener(CONSENT_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CONSENT_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

function buildConsentState(choice: CookieConsentChoice): CookieConsentState {
  if (choice === 'accepted') {
    return {
      choice,
      analytics: true,
      marketing: true,
      updatedAt: Date.now(),
    };
  }
  return {
    choice: 'essential',
    analytics: false,
    marketing: false,
    updatedAt: Date.now(),
  };
}

export function acceptAllCookies(): CookieConsentState {
  const state = buildConsentState('accepted');
  writeStored(state);
  applyConsent(state);
  return state;
}

export function acceptEssentialCookiesOnly(): CookieConsentState {
  const state = buildConsentState('essential');
  writeStored(state);
  applyConsent(state);
  return state;
}

export function saveCustomCookiePreferences(prefs: {
  analytics: boolean;
  marketing: boolean;
}): CookieConsentState {
  const allOn = prefs.analytics && prefs.marketing;
  const state: CookieConsentState = {
    choice: allOn ? 'accepted' : 'essential',
    analytics: prefs.analytics,
    marketing: prefs.marketing,
    updatedAt: Date.now(),
  };
  writeStored(state);
  applyConsent(state);
  return state;
}

export function resetCookieConsentForSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}

function loadGoogleAdsTag(): void {
  if (gtagLoaded || typeof document === 'undefined') return;
  gtagLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GOOGLE_ADS_ID, { anonymize_ip: true });
}

export function applyConsent(state: CookieConsentState | null): void {
  if (!state?.marketing) return;
  loadGoogleAdsTag();
}

/** Call once on app boot — loads trackers only if user already consented. */
export function initCookieConsent(): void {
  const stored = readStored();
  applyConsent(stored);
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

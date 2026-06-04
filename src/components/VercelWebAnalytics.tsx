import { useSyncExternalStore } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { getCookieConsent, subscribeCookieConsent } from '../lib/cookieConsent';

function subscribe(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange);

  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);

  history.pushState = (...args) => {
    pushState(...args);
    onStoreChange();
  };
  history.replaceState = (...args) => {
    replaceState(...args);
    onStoreChange();
  };

  return () => {
    window.removeEventListener('popstate', onStoreChange);
    history.pushState = pushState;
    history.replaceState = replaceState;
  };
}

function getPathSnapshot() {
  return `${window.location.pathname}${window.location.search}`;
}

function useAnalyticsAllowed() {
  return useSyncExternalStore(
    (onChange) => {
      const unsubRoute = subscribe(onChange);
      const unsubConsent = subscribeCookieConsent(onChange);
      return () => {
        unsubRoute();
        unsubConsent();
      };
    },
    () => getCookieConsent()?.analytics === true,
    () => false,
  );
}

/**
 * Vercel Web Analytics + Speed Insights — only after cookie consent.
 * Neither package records data in local dev — deploy to Vercel to see metrics.
 */
export default function VercelWebAnalytics() {
  const path = useSyncExternalStore(subscribe, getPathSnapshot, () => '/');
  const allowed = useAnalyticsAllowed();

  if (!allowed) return null;

  return (
    <>
      <Analytics route={path} path={path} />
      <SpeedInsights route={path} />
    </>
  );
}

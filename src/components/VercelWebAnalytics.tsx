import { useSyncExternalStore } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

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

/**
 * Vercel Web Analytics + Speed Insights for this Vite SPA.
 * Passes `route` so client-side navigations (history.pushState) are attributed correctly.
 * Neither package records data in local dev — deploy to Vercel to see metrics.
 */
export default function VercelWebAnalytics() {
  const path = useSyncExternalStore(subscribe, getPathSnapshot, () => '/');

  return (
    <>
      <Analytics route={path} path={path} />
      <SpeedInsights route={path} />
    </>
  );
}

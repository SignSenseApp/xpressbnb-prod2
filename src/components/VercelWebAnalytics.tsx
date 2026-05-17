import { useSyncExternalStore } from 'react';
import { Analytics } from '@vercel/analytics/react';

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
 * Vercel Web Analytics for this Vite SPA.
 * Passes `route` + `path` so client-side navigations (history.pushState) are tracked.
 */
export default function VercelWebAnalytics() {
  const path = useSyncExternalStore(subscribe, getPathSnapshot, () => '/');

  return <Analytics route={path} path={path} />;
}

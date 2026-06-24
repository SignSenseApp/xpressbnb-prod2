export type HomeOverlayPage = 'about' | 'blog' | 'privacy' | 'terms';

/** Custom event for SPA navigation — reliable on iOS PWA where synthetic popstate can be flaky. */
export const XPX_NAVIGATE_EVENT = 'xpx:navigate';

export function getHomeOverlayPage(): HomeOverlayPage | null {
  if (typeof window === 'undefined') return null;
  const page = new URLSearchParams(window.location.search).get('page');
  if (page === 'about' || page === 'blog' || page === 'privacy' || page === 'terms') return page;
  return null;
}

export function openHomeOverlay(page: HomeOverlayPage) {
  navigateTo(`/?page=${page}`);
}

export function closeHomeOverlay() {
  navigateTo('/');
}

/**
 * SPA navigate — updates history and notifies AppRouter via popstate + custom event.
 * Use this instead of raw pushState + PopStateEvent for iOS Safari / PWA compatibility.
 */
export function navigateTo(path: string, options?: { replace?: boolean }) {
  if (options?.replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.dispatchEvent(new CustomEvent(XPX_NAVIGATE_EVENT, { detail: { path } }));
}

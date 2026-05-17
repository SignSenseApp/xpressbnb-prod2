export type HomeOverlayPage = 'about' | 'blog';

export function getHomeOverlayPage(): HomeOverlayPage | null {
  if (typeof window === 'undefined') return null;
  const page = new URLSearchParams(window.location.search).get('page');
  if (page === 'about' || page === 'blog') return page;
  return null;
}

export function closeHomeOverlay() {
  window.history.pushState({}, '', '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export type HomeOverlayPage = 'about' | 'blog' | 'privacy' | 'terms';

export function getHomeOverlayPage(): HomeOverlayPage | null {
  if (typeof window === 'undefined') return null;
  const page = new URLSearchParams(window.location.search).get('page');
  if (page === 'about' || page === 'blog' || page === 'privacy' || page === 'terms') return page;
  return null;
}

export function openHomeOverlay(page: HomeOverlayPage) {
  window.history.pushState({}, '', `/?page=${page}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function closeHomeOverlay() {
  window.history.pushState({}, '', '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

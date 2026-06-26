import { useEffect, useState, type RefObject } from 'react';

/**
 * Shows compact sticky search when the hero search sentinel scrolls out of view.
 * Uses IntersectionObserver — no scroll listeners, no layout thrashing.
 */
export function useStickySearchMorph(
  sentinelRef: RefObject<HTMLElement | null>,
  enabled = true,
): boolean {
  const [heroSearchVisible, setHeroSearchVisible] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setHeroSearchVisible(true);
      return;
    }
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHeroSearchVisible(entry?.isIntersecting ?? false),
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [sentinelRef, enabled]);

  return !heroSearchVisible;
}

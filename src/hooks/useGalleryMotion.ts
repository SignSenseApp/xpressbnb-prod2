import { useEffect, useState } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return reduced;
}

export function useIsDesktop(breakpointPx = 768): boolean {
  const query = `(min-width: ${breakpointPx}px)`;
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);

  return isDesktop;
}

export function useInViewport<T extends Element>(
  ref: React.RefObject<T | null>,
  threshold = 0.35,
): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return visible;
}

export function useScrollPause(setPaused: (v: boolean) => void, debounceMs = 150): void {
  useEffect(() => {
    let timer: number | null = null;

    const onScroll = () => {
      setPaused(true);
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => setPaused(false), debounceMs);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timer != null) window.clearTimeout(timer);
    };
  }, [debounceMs, setPaused]);
}

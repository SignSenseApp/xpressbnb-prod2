import { useEffect, useLayoutEffect } from 'react';
import type Lenis from 'lenis';
import { prefersNativeScroll } from '../lib/pwa';
import { setLenisInstance } from '../lib/smoothScroll';

/**
 * Desktop: Lenis smooth wheel scroll (dynamic import — not on mobile/PWA critical path).
 * Mobile / PWA: native iOS momentum scroll.
 */
export default function SmoothScrollRoot({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    if (prefersNativeScroll()) {
      document.documentElement.classList.add('xpx-native-scroll');
    }
    return () => {
      document.documentElement.classList.remove('xpx-native-scroll');
    };
  }, []);

  useEffect(() => {
    if (prefersNativeScroll()) {
      setLenisInstance(null);
      return;
    }

    let cancelled = false;
    let lenisInstance: Lenis | null = null;

    void import('lenis').then(({ default: Lenis }) => {
      const instance = new Lenis({
        autoRaf: true,
        smoothWheel: true,
        lerp: 0.09,
        wheelMultiplier: 0.92,
        touchMultiplier: 1.12,
        anchors: true,
        duration: 1.05,
      });

      if (cancelled) {
        instance.destroy();
        return;
      }

      lenisInstance = instance;
      setLenisInstance(instance);
      document.documentElement.classList.add('lenis');
    });

    return () => {
      cancelled = true;
      document.documentElement.classList.remove('lenis');
      lenisInstance?.destroy();
      setLenisInstance(null);
    };
  }, []);

  return <>{children}</>;
}

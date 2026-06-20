import { useEffect, useLayoutEffect } from 'react';
import Lenis from 'lenis';
import { prefersNativeScroll } from '../lib/pwa';
import { setLenisInstance } from '../lib/smoothScroll';

/**
 * Desktop: Lenis smooth wheel scroll. Mobile / PWA: native iOS momentum scroll.
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

    const lenis = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      lerp: 0.09,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.12,
      anchors: true,
      duration: 1.05,
    });
    setLenisInstance(lenis);
    document.documentElement.classList.add('lenis');
    return () => {
      document.documentElement.classList.remove('lenis');
      lenis.destroy();
      setLenisInstance(null);
    };
  }, []);

  return <>{children}</>;
}

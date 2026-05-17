import { useEffect } from 'react';
import Lenis from 'lenis';
import { setLenisInstance } from '../lib/smoothScroll';

/**
 * Site-wide smooth scrolling (wheel / touch) similar to Airbnb-class UX.
 * Uses Lenis with auto RAF; anchor-style jumps use the shared scroll helpers.
 */
export default function SmoothScrollRoot({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isNarrow = window.matchMedia('(max-width: 768px)').matches;

    if (isNarrow) {
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

import type Lenis from 'lenis';
import { prefersNativeScroll } from './pwa';

let lenisRef: Lenis | null = null;

export function setLenisInstance(instance: Lenis | null) {
  lenisRef = instance;
}

export function getLenis(): Lenis | null {
  return lenisRef;
}

/** Scroll to an element — instant on mobile/PWA, Lenis on desktop. */
export function scrollToElement(el: HTMLElement | null, opts?: { offset?: number; duration?: number }) {
  if (!el) return;
  const lenis = lenisRef;
  const offset = opts?.offset ?? 0;
  const duration = opts?.duration ?? 1.05;
  const native = prefersNativeScroll();

  if (lenis && !native) {
    lenis.scrollTo(el, { offset, duration });
    return;
  }

  el.scrollIntoView({ behavior: 'auto', block: 'start' });
  if (offset !== 0) {
    requestAnimationFrame(() => {
      window.scrollBy(0, offset);
    });
  }
}

export function scrollToId(id: string, opts?: { offset?: number; duration?: number }) {
  const el = document.getElementById(id);
  scrollToElement(el, opts);
}

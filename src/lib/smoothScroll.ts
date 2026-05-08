import type Lenis from 'lenis';

let lenisRef: Lenis | null = null;

export function setLenisInstance(instance: Lenis | null) {
  lenisRef = instance;
}

export function getLenis(): Lenis | null {
  return lenisRef;
}

/** Smooth-scroll to an element (falls back to native if Lenis not ready). */
export function scrollToElement(el: HTMLElement | null, opts?: { offset?: number; duration?: number }) {
  if (!el) return;
  const lenis = lenisRef;
  const offset = opts?.offset ?? 0;
  const duration = opts?.duration ?? 1.05;
  if (lenis) {
    lenis.scrollTo(el, { offset, duration });
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (offset !== 0) {
      requestAnimationFrame(() => {
        window.scrollBy(0, offset);
      });
    }
  }
}

export function scrollToId(id: string, opts?: { offset?: number; duration?: number }) {
  const el = document.getElementById(id);
  scrollToElement(el, opts);
}

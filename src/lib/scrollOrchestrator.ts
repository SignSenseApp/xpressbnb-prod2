/**
 * Conversion scroll orchestration — smooth, non-aggressive, analytics-instrumented.
 * Respects prefers-reduced-motion; uses Lenis on desktop when available.
 */

import { trackXpressEvent } from './analytics';
import { readScrollAnchorOffset } from './layoutTokens';
import { scrollToElement } from './smoothScroll';

export type ScrollTarget =
  | 'nearby_stays'
  | 'booking_guests'
  | 'booking_contact'
  | 'booking_submit';

const TARGET_IDS: Record<ScrollTarget, string> = {
  nearby_stays: 'nearby',
  booking_guests: 'booking-step-guests',
  booking_contact: 'booking-step-contact',
  booking_submit: 'booking-step-submit',
};

const HIGHLIGHT_CLASS = 'xpx-scroll-highlight';
const HIGHLIGHT_MS = 1_800;

let highlightTimer: number | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clearHighlight(): void {
  if (highlightTimer != null) {
    window.clearTimeout(highlightTimer);
    highlightTimer = null;
  }
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
    el.classList.remove(HIGHLIGHT_CLASS);
  });
}

/** Brief emerald ring pulse on the destination — signals "you're here". */
export function pulseScrollTarget(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return;
  clearHighlight();
  el.classList.add(HIGHLIGHT_CLASS);
  highlightTimer = window.setTimeout(() => {
    el.classList.remove(HIGHLIGHT_CLASS);
    highlightTimer = null;
  }, HIGHLIGHT_MS);
}

export type OrchestratedScrollOptions = {
  offset?: number;
  duration?: number;
  highlight?: boolean;
  analyticsContext?: string;
  /** Skip if element is already mostly visible */
  skipIfVisible?: boolean;
};

function isMostlyVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
  return visible / Math.min(rect.height, vh) > 0.55;
}

/**
 * Scroll to a known conversion target with optional highlight + analytics.
 */
export function orchestratedScrollTo(
  target: ScrollTarget,
  options?: OrchestratedScrollOptions,
): void {
  const id = TARGET_IDS[target];
  const el = document.getElementById(id);
  if (!el) return;

  if (options?.skipIfVisible && isMostlyVisible(el)) {
    if (options.highlight) pulseScrollTarget(el);
    return;
  }

  const offset = options?.offset ?? (target === 'nearby_stays' ? readScrollAnchorOffset() : -72);
  const duration = prefersReducedMotion() ? 0 : (options?.duration ?? 0.85);

  scrollToElement(el, { offset, duration });

  if (options?.highlight !== false) {
    window.setTimeout(() => pulseScrollTarget(el), duration > 0 ? duration * 400 : 50);
  }

  trackXpressEvent('auto_scroll_triggered', {
    booking_step: target,
    source_route: options?.analyticsContext ?? window.location.pathname,
  });
}

export function orchestratedScrollToId(
  id: string,
  options?: Omit<OrchestratedScrollOptions, 'analyticsContext'> & { step?: string },
): void {
  const el = document.getElementById(id);
  if (!el) return;
  scrollToElement(el, {
    offset: options?.offset ?? -72,
    duration: prefersReducedMotion() ? 0 : (options?.duration ?? 0.85),
  });
  if (options?.highlight !== false) {
    window.setTimeout(() => pulseScrollTarget(el), 120);
  }
  trackXpressEvent('auto_scroll_triggered', {
    booking_step: options?.step ?? id,
  });
}

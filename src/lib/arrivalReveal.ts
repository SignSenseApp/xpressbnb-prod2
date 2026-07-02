/** Viewport fraction scrolled before property chrome reveals. */
export const ARRIVAL_REVEAL_VIEWPORT_RATIO = 0.85;

export function getArrivalRevealThreshold(): number {
  if (typeof window === 'undefined') return 0;
  return window.innerHeight * ARRIVAL_REVEAL_VIEWPORT_RATIO;
}

export function isArrivalRevealed(
  scrollY: number = typeof window !== 'undefined' ? window.scrollY : 0,
): boolean {
  return scrollY > getArrivalRevealThreshold();
}

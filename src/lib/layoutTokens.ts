/** Read resolved scroll anchor offset (negative px) from layout tokens. */
export function readScrollAnchorOffset(): number {
  if (typeof window === 'undefined') return -96;
  const styles = getComputedStyle(document.documentElement);
  const chrome = styles.getPropertyValue('--xpx-chrome-height').trim();
  const px = parseFloat(chrome);
  if (!Number.isNaN(px) && px > 0) {
    return -(px + 12);
  }
  return -96;
}

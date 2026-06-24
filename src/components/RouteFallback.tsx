/** Minimal route chunk fallback — preserves layout, zero CLS. */
export default function RouteFallback() {
  return (
    <div
      className="min-h-[50vh] w-full"
      style={{ background: 'var(--xpx-base, #FAFAF8)' }}
      aria-hidden
    />
  );
}

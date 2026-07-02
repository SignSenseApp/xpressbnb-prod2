const SHIMMER = 'rgba(15,23,42,0.06)';

function Block({
  className = '',
  style,
}: {
  className?: string;
  style?: Record<string, string | number>;
}) {
  return (
    <div
      className={`rounded-2xl animate-pulse ${className}`}
      style={{ background: SHIMMER, ...style }}
      aria-hidden
    />
  );
}

/** Booking sidebar placeholder — shared with lazy sidebar Suspense fallback. */
export function PropertySidebarSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`xpx-concierge space-y-5 ${className}`} aria-hidden>
      <Block className="h-3 w-24 rounded-none" />
      <Block className="h-8 w-2/5 rounded-none" />
      <Block className="h-6 w-1/3 rounded-none" />
      <Block className="h-40 w-full rounded-none" />
      <Block className="h-10 w-full rounded-none" />
    </div>
  );
}

type PropertyPageSkeletonBodyProps = {
  className?: string;
};

/** Content shell matching PropertyPage layout — zero CLS, no spinner. */
export function PropertyPageSkeletonBody({ className = '' }: PropertyPageSkeletonBodyProps) {
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 pb-28 lg:pb-12 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
        <Block className="h-10 w-32 rounded-full" />
        <div className="flex gap-2">
          <Block className="h-10 w-10 rounded-full" />
          <Block className="h-10 w-24 rounded-full hidden sm:block" />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 xl:gap-10 lg:items-start">
        <div className="min-w-0">
          <Block className="w-full h-[min(68svh,640px)] min-h-[420px] sm:h-[clamp(440px,58vh,680px)] lg:h-[clamp(480px,62vh,720px)] rounded-none sm:rounded-[24px] lg:rounded-[28px] -mx-4 sm:mx-0" />

          <div className="mt-8 sm:mt-10 space-y-4">
            <Block className="h-10 sm:h-12 w-[88%] max-w-xl rounded-lg" />
            <Block className="h-5 w-[40%] max-w-xs rounded-md" />
            <Block className="h-5 w-[72%] max-w-lg rounded-md" />
            <div className="space-y-2.5 pt-6 border-t border-xpx-border/60">
              <Block className="h-4 w-[65%] rounded-md" />
              <Block className="h-4 w-[50%] rounded-md" />
              <Block className="h-4 w-[58%] rounded-md" />
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <Block className="h-4 w-32 rounded-lg" />
            <Block className="h-4 w-full rounded-lg" />
            <Block className="h-4 w-[94%] rounded-lg" />
            <Block className="h-4 w-[78%] rounded-lg" />
          </div>
        </div>

        <div className="hidden lg:block lg:sticky lg:top-24">
          <PropertySidebarSkeleton className="min-h-[520px]" />
        </div>
      </div>

      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pt-3 border-t border-xpx-border bg-white/95 backdrop-blur-md"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        aria-hidden
      >
        <Block className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}

type PropertyPageSkeletonProps = {
  /** Top chrome shimmer while route chunk loads (no real Header yet). */
  withChrome?: boolean;
};

export default function PropertyPageSkeleton({ withChrome = true }: PropertyPageSkeletonProps) {
  return (
    <div className="xpx-page min-h-screen w-full" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading property</span>
      {withChrome ? (
        <div
          className="sticky top-0 z-50 h-14 sm:h-16 border-b border-xpx-border animate-pulse"
          style={{ background: 'rgba(255,255,255,0.92)' }}
          aria-hidden
        />
      ) : null}
      <PropertyPageSkeletonBody />
    </div>
  );
}

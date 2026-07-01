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
    <div
      className={`rounded-3xl p-5 sm:p-6 space-y-4 ${className}`}
      style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
      aria-hidden
    >
      <Block className="h-5 w-2/5 rounded-lg" />
      <Block className="h-12 w-full rounded-xl" />
      <Block className="h-44 w-full rounded-2xl" />
      <Block className="h-12 w-full rounded-2xl" />
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
          <Block className="w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl sm:rounded-3xl" />

          <div className="mt-6 sm:mt-8 space-y-3">
            <Block className="h-8 sm:h-9 w-[88%] max-w-xl rounded-xl" />
            <Block className="h-4 w-[55%] max-w-sm rounded-lg" />
            <div className="flex flex-wrap gap-2 pt-1">
              <Block className="h-8 w-24 rounded-full" />
              <Block className="h-8 w-28 rounded-full" />
              <Block className="h-8 w-20 rounded-full" />
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

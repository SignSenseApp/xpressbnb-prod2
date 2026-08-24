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
      className={`xpx-property-sidebar-v2 rounded-2xl p-5 sm:p-6 space-y-5 ${className}`}
      aria-hidden
    >
      <Block className="h-8 w-2/5 rounded-md" />
      <Block className="h-4 w-1/3 rounded-md" />
      <Block className="h-24 w-full rounded-xl" />
      <Block className="h-28 w-full rounded-xl" />
      <Block className="h-12 w-full rounded-xl" />
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
      <div className="flex items-center justify-between gap-3 mb-4">
        <Block className="h-4 w-48 sm:w-72 rounded-md hidden lg:block" />
        <Block className="h-10 w-24 rounded-full lg:hidden" />
        <div className="flex gap-2 ml-auto">
          <Block className="h-10 w-10 rounded-full" />
          <Block className="h-10 w-20 rounded-full hidden sm:block" />
        </div>
      </div>

      <Block className="h-9 sm:h-11 w-[86%] max-w-xl rounded-lg mb-3" />
      <Block className="h-4 w-[48%] max-w-sm rounded-md mb-5" />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_420px] lg:gap-10 xl:gap-12 lg:items-start">
        <div className="min-w-0">
          <div className="hidden sm:grid grid-cols-[1.55fr_1fr] gap-2 md:gap-3 h-[clamp(340px,38vw,460px)] rounded-2xl overflow-hidden">
            <Block className="h-full rounded-none" />
            <div className="grid grid-rows-2 gap-2 md:gap-3 min-h-0">
              <Block className="h-full rounded-none" />
              <Block className="h-full rounded-none" />
            </div>
          </div>
          <Block className="sm:hidden w-[calc(100%+2rem)] max-w-none aspect-[4/3] rounded-none -mx-4" />

          <div className="mt-8 sm:mt-10 space-y-3">
            <div className="flex flex-wrap gap-4">
              <Block className="h-4 w-20 rounded-md" />
              <Block className="h-4 w-24 rounded-md" />
              <Block className="h-4 w-16 rounded-md" />
              <Block className="h-4 w-14 rounded-md" />
            </div>
            <Block className="h-5 w-40 rounded-md mt-8" />
            <Block className="h-4 w-full rounded-md" />
            <Block className="h-4 w-[92%] rounded-md" />
            <Block className="h-4 w-[70%] rounded-md" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6">
              <Block className="h-16 rounded-xl" />
              <Block className="h-16 rounded-xl" />
              <Block className="h-16 rounded-xl" />
              <Block className="h-16 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="hidden lg:block lg:sticky lg:top-[calc(var(--xpx-chrome-height)+0.75rem)]">
          <PropertySidebarSkeleton className="min-h-[480px]" />
        </div>
      </div>

      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pt-3 border-t border-xpx-border bg-white/95 backdrop-blur-md"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        aria-hidden
      >
        <div className="flex items-center justify-between gap-3">
          <Block className="h-10 w-28 rounded-md" />
          <Block className="h-12 w-36 rounded-xl" />
        </div>
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

import ListingPropertyCardSkeleton from './ListingPropertyCardSkeleton';

const SHIMMER = 'rgba(15,23,42,0.06)';

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-full animate-pulse ${className}`}
      style={{ background: SHIMMER }}
      aria-hidden
    />
  );
}

export function CityListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="xpx-marketplace-grid" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <ListingPropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Route + data loading shell — matches CityListingPage chrome and grid rhythm. */
export default function CityListingPageSkeleton() {
  return (
    <div className="xpx-page" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading stays</span>

      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          borderBottom: '1px solid var(--xpx-border)',
        }}
        aria-hidden
      >
        <div className="xpx-container flex items-center gap-3 py-3.5 sm:py-4">
          <div
            className="h-11 w-11 shrink-0 rounded-full animate-pulse"
            style={{ background: SHIMMER }}
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div
              className="h-4 w-36 max-w-[70%] rounded-lg animate-pulse"
              style={{ background: SHIMMER }}
            />
            <div
              className="h-3 w-52 max-w-[85%] rounded-lg animate-pulse"
              style={{ background: SHIMMER }}
            />
          </div>
          <div
            className="h-10 w-24 shrink-0 rounded-full animate-pulse"
            style={{ background: SHIMMER }}
          />
        </div>

        <div className="xpx-container flex items-center gap-2.5 pb-3.5 sm:pb-4 overflow-hidden">
          <Shimmer className="h-9 w-28 shrink-0" />
          <div className="w-px h-6 shrink-0" style={{ background: 'var(--xpx-border)' }} />
          <Shimmer className="h-9 w-32 shrink-0" />
          <Shimmer className="h-9 w-28 shrink-0" />
          <Shimmer className="h-9 w-24 shrink-0" />
          <Shimmer className="h-9 w-28 shrink-0 hidden sm:block" />
        </div>
      </header>

      <div className="xpx-container pt-6 sm:pt-8 pb-28">
        <CityListingGridSkeleton />
      </div>
    </div>
  );
}

import PropertyPageSkeleton from './property/PropertyPageSkeleton';
import CityListingPageSkeleton from './listing/CityListingPageSkeleton';

function GenericRouteSkeleton() {
  return (
    <div
      className="xpx-page min-h-[50vh] w-full px-4 sm:px-6 pt-8"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading page</span>
      <div
        className="h-8 w-48 max-w-[70%] rounded-xl animate-pulse mb-6"
        style={{ background: 'rgba(15,23,42,0.06)' }}
        aria-hidden
      />
      <div className="space-y-3 max-w-2xl" aria-hidden>
        <div
          className="h-4 w-full rounded-lg animate-pulse"
          style={{ background: 'rgba(15,23,42,0.06)' }}
        />
        <div
          className="h-4 w-[85%] rounded-lg animate-pulse"
          style={{ background: 'rgba(15,23,42,0.06)' }}
        />
      </div>
    </div>
  );
}

/** Route chunk fallback — layout-shaped placeholders, zero CLS. */
export default function RouteFallback() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';

  if (path.startsWith('/property/')) {
    return <PropertyPageSkeleton withChrome />;
  }

  if (path.startsWith('/stays/')) {
    return <CityListingPageSkeleton />;
  }

  return <GenericRouteSkeleton />;
}

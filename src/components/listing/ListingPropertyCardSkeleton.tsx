const SHIMMER = 'rgba(15,23,42,0.06)';

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg animate-pulse ${className}`}
      style={{ background: SHIMMER }}
      aria-hidden
    />
  );
}

/** Layout-matched placeholder for ConversionPropertyCard — fixed zones, zero CLS. */
export default function ListingPropertyCardSkeleton() {
  return (
    <div
      className="xpx-property-card flex h-full w-full flex-col overflow-hidden pointer-events-none"
      aria-hidden
    >
      <div className="xpx-property-card-media animate-pulse" style={{ background: SHIMMER }} />
      <div className="xpx-property-card-body">
        <div className="xpx-property-card-zone-title">
          <Shimmer className="h-full w-full rounded-md" />
        </div>
        <div className="xpx-property-card-zone-location">
          <Shimmer className="h-3 w-3 shrink-0 rounded-full" />
          <Shimmer className="h-3 flex-1 max-w-[70%] rounded" />
        </div>
        <div className="xpx-property-card-zone-host">
          <Shimmer className="h-full w-[62%] rounded-full" />
        </div>
        <div className="xpx-property-card-zone-meta">
          <div className="xpx-property-card-zone-meta__grid w-full">
            <Shimmer className="h-8 w-full rounded-lg" />
            <Shimmer className="h-8 w-full rounded-lg" />
            <Shimmer className="h-8 w-full rounded-lg" />
          </div>
        </div>
        <div className="xpx-property-card-zone-score">
          <Shimmer className="h-full w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

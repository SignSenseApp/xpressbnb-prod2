const SURFACE_LIGHT = '#F8FAFC';

export default function NearbyStaysSkeleton() {
  return (
    <div
      className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="xpx-property-card shrink-0 w-[85vw] min-w-[85vw] max-w-[85vw] md:w-auto md:min-w-0 md:max-w-[380px] overflow-hidden"
        >
          <div className="xpx-property-card-media animate-pulse" style={{ background: SURFACE_LIGHT }} />
          <div className="space-y-3 p-5">
            <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: SURFACE_LIGHT }} />
            <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: SURFACE_LIGHT }} />
            <div className="h-8 w-full rounded-xl animate-pulse" style={{ background: SURFACE_LIGHT }} />
          </div>
        </div>
      ))}
    </div>
  );
}

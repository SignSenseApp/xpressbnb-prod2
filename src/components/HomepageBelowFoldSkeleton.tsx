/** Lightweight placeholder while the below-fold homepage chunk loads (CLS guard). */
export default function HomepageBelowFoldSkeleton() {
  return (
    <div aria-hidden className="pointer-events-none">
      <section className="xpx-section" style={{ background: '#FAFAF8' }}>
        <div className="xpx-container space-y-6">
          <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: '#F1F5F9' }} />
          <div className="h-4 w-72 rounded animate-pulse" style={{ background: '#F1F5F9' }} />
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="shrink-0 w-[78vw] min-w-[78vw] md:w-auto md:min-w-0 rounded-2xl overflow-hidden"
                style={{ background: '#F8FAFC', minHeight: 320 }}
              />
            ))}
          </div>
        </div>
      </section>
      <section className="xpx-section" style={{ background: '#F8FAFC', minHeight: 520 }} />
      <section className="xpx-section" style={{ background: '#FAFAF8', minHeight: 140 }} />
      <section className="xpx-section" style={{ background: '#FAFAF8', minHeight: 420 }} />
      <section className="xpx-section" style={{ background: '#F8FAFC', minHeight: 380 }} />
      <div style={{ background: '#032E25', minHeight: 320 }} />
    </div>
  );
}

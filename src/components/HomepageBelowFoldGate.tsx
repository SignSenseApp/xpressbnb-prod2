import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import HomepageBelowFoldSkeleton from './HomepageBelowFoldSkeleton';

const HomepageBelowFold = lazy(() => import('./HomepageBelowFold'));

export type HomepageBelowFoldGateProps = {
  onCityClick: (city: string) => void;
  onNavigate: (path: string) => void;
  scrollTo: (id: string) => void;
  onActivateRef?: (activate: () => void) => void;
  tripQuery?: string;
};

const BELOW_FOLD_ROOT_MARGIN = '400px 0px';

export default function HomepageBelowFoldGate({
  onCityClick,
  onNavigate,
  scrollTo,
  onActivateRef,
  tripQuery,
}: HomepageBelowFoldGateProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  const activate = useCallback(() => {
    setActive(true);
  }, []);

  useEffect(() => {
    onActivateRef?.(activate);
  }, [activate, onActivateRef]);

  useEffect(() => {
    if (active) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: BELOW_FOLD_ROOT_MARGIN, threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  return (
    <div ref={ref} className="min-h-[480px]">
      {active ? (
        <Suspense fallback={<HomepageBelowFoldSkeleton />}>
          <HomepageBelowFold
            onCityClick={onCityClick}
            onNavigate={onNavigate}
            scrollTo={scrollTo}
            tripQuery={tripQuery}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

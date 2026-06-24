import { useEffect, useRef, useState, type ReactNode } from 'react';

type DeferredMountProps = {
  children: ReactNode;
  /** When true, mount immediately (e.g. desktop layout or user action). */
  force?: boolean;
  /** IntersectionObserver rootMargin — preload before entering viewport. */
  rootMargin?: string;
};

/**
 * Mount children when near the viewport (or when forced).
 * Used on property pages to defer below-the-fold JS and DOM work.
 */
export default function DeferredMount({
  children,
  force = false,
  rootMargin = '320px 0px',
}: DeferredMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(force);

  useEffect(() => {
    if (force) {
      setMounted(true);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setMounted(true);
      },
      { rootMargin, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [force, rootMargin]);

  return <div ref={ref}>{mounted ? children : null}</div>;
}

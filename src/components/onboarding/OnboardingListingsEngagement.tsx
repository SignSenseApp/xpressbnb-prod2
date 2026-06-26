import { useEffect, useRef } from 'react';
import { useGuestOnboardingOptional } from '../../contexts/GuestOnboardingContext';

type OnboardingListingsEngagementProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
};

/**
 * Fires property-row visibility when the listings section enters the viewport —
 * intent signal for the product-education modal (no timers).
 */
export function OnboardingListingsEngagement({
  children,
  className,
  id,
  style,
}: OnboardingListingsEngagementProps) {
  const ref = useRef<HTMLElement>(null);
  const onboarding = useGuestOnboardingOptional();
  const firedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !onboarding?.enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || firedRef.current) return;
        firedRef.current = true;
        onboarding.recordPropertyRowVisible();
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [onboarding]);

  return (
    <section ref={ref} id={id} className={className} style={style}>
      {children}
    </section>
  );
}

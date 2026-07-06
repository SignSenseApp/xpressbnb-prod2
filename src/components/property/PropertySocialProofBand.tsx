import { useEffect, useState } from 'react';
import {
  fetchPropertyEngagement,
  formatBookingsWeekCopy,
  formatCityTrendingCopy,
  formatViewsTodayCopy,
} from '../../lib/propertySocialProof';

type PropertySocialProofBandProps = {
  propertyId: string;
  city: string;
  variant?: 'inline' | 'card' | 'whisper';
};

/**
 * Real analytics-only social proof — hidden when counts below threshold.
 */
export default function PropertySocialProofBand({
  propertyId,
  city,
  variant = 'inline',
}: PropertySocialProofBandProps) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchPropertyEngagement(propertyId).then((engagement) => {
      if (cancelled || !engagement.hasData) return;
      const next: string[] = [];
      const views = formatViewsTodayCopy(engagement.viewsToday);
      const bookings = formatBookingsWeekCopy(engagement.bookingsThisWeek);
      const trending = formatCityTrendingCopy(city, engagement.viewsThisWeek);
      if (views) next.push(views);
      if (bookings) next.push(bookings);
      if (trending && next.length < 2) next.push(trending);
      setLines(next.slice(0, 2));
    });
    return () => {
      cancelled = true;
    };
  }, [propertyId, city]);

  if (lines.length === 0) return null;

  const className =
    variant === 'card'
      ? 'rounded-2xl border px-4 py-3 space-y-1.5'
      : variant === 'whisper'
        ? 'space-y-1'
        : 'space-y-1 mb-4';

  return (
    <div
      className={className}
      style={
        variant === 'card'
          ? { borderColor: 'var(--xpx-border)', background: 'var(--xpx-base)' }
          : undefined
      }
    >
      {lines.map((line) => (
        <p
          key={line}
          className={
            variant === 'whisper'
              ? 'text-[11px] sm:text-xs text-xpx-subtle leading-relaxed'
              : 'text-sm font-medium'
          }
          style={variant === 'whisper' ? undefined : { color: 'var(--accent-dark)' }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

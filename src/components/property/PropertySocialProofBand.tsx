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
  variant?: 'inline' | 'card';
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
      : 'space-y-1 mb-4';

  return (
    <div
      className={className}
      style={
        variant === 'card'
          ? { borderColor: '#e5e7eb', background: '#fafafa' }
          : undefined
      }
    >
      {lines.map((line) => (
        <p key={line} className="text-sm font-medium text-[#047857]">
          {line}
        </p>
      ))}
    </div>
  );
}

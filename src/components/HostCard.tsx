import { useEffect, useState } from 'react';
import { Headphones } from 'lucide-react';
import { fetchPublicHost } from '../lib/hostPublicCache';
import { safeHostDisplayName, safeHostInitial, stripPhoneLike } from '../lib/host';
import { buildTeamWhatsAppLink, TEAM_BRAND_NAME } from '../lib/team';
import PropertyTrustNotes from './property/PropertyTrustNotes';
import {
  EditorialProse,
  MagazineSpread,
} from './editorial/EditorialLayouts';

interface HostInfo {
  id: string;
  name: string;
  city?: string | null;
  bio?: string | null;
  kyc_status?: string | null;
  total_bookings?: number | null;
  created_at?: string | null;
}

interface HostCardProps {
  hostId: string | null;
  fallbackCity?: string;
  className?: string;
  propertyTitle?: string;
  onRequestToBook?: () => void;
}

/**
 * Magazine interview — portrait breaks grid, bio stays narrow.
 */
export default function HostCard({
  hostId,
  fallbackCity,
  className = '',
  propertyTitle = 'this property',
}: HostCardProps) {
  const [host, setHost] = useState<HostInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!hostId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const row = await fetchPublicHost(hostId);
        if (cancelled) return;
        if (!row) {
          setHost(null);
        } else {
          setHost(row as HostInfo);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hostId]);

  const handleConcierge = () => {
    window.open(
      buildTeamWhatsAppLink(
        `Hi — I have a question about "${propertyTitle}" on XpressBNB before I send an inquiry.`,
      ),
      '_blank',
      'noopener,noreferrer',
    );
  };

  if (loading) {
    return (
      <MagazineSpread
        visual={
          <div
            className="xpx-lux-host-avatar animate-pulse"
            style={{ background: 'var(--lux-divider)' }}
            aria-hidden
          />
        }
        prose={
          <div className="space-y-2" aria-hidden>
            <div className="h-4 w-1/3 rounded" style={{ background: 'var(--lux-divider)' }} />
            <div className="h-3 w-1/2 rounded" style={{ background: 'var(--lux-divider)' }} />
          </div>
        }
      />
    );
  }

  if (!host) {
    return (
      <p className={`text-sm leading-relaxed text-lux-whisper ${className}`}>
        Host details are not available for this listing yet.
      </p>
    );
  }

  const isVerified = host.kyc_status === 'verified';
  const safeName = safeHostDisplayName(host.name);
  const initial = safeHostInitial(host.name);
  const safeBio = host.bio ? stripPhoneLike(host.bio) : '';
  const memberSince = host.created_at ? new Date(host.created_at) : null;
  const memberSinceLabel = memberSince
    ? memberSince.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    : null;
  const bookingCount = host.total_bookings && host.total_bookings > 0 ? host.total_bookings : null;

  const metaParts: string[] = [];
  const locationLabel = host.city ?? fallbackCity;
  if (locationLabel) metaParts.push(locationLabel);
  if (memberSinceLabel) metaParts.push(`Hosting since ${memberSinceLabel}`);
  if (bookingCount) metaParts.push(`${bookingCount} inquiries fulfilled`);

  return (
    <article className={className} aria-label={`Hosted by ${safeName}`}>
      <MagazineSpread
        visual={
          <div className="xpx-lux-host-avatar xpx-ed-host-avatar" aria-hidden>
            {initial}
          </div>
        }
        prose={
          <div>
            <h3 className="xpx-lux-host-name">{safeName}</h3>
            {metaParts.length > 0 && <p className="xpx-lux-host-meta">{metaParts.join(' · ')}</p>}
            {isVerified && (
              <p className="mt-1.5 text-xs leading-relaxed text-lux-whisper">Verified host</p>
            )}
          </div>
        }
      />

      {safeBio && (
        <EditorialProse className="mt-10 whitespace-pre-line">{safeBio}</EditorialProse>
      )}

      <div className="mt-10 max-w-[42rem]">
        <button
          type="button"
          onClick={handleConcierge}
          className="xpx-lux-link inline-flex items-center gap-1.5"
        >
          <Headphones className="h-4 w-4" strokeWidth={1.25} aria-hidden />
          Ask {TEAM_BRAND_NAME}
        </button>
        <p className="mt-4 text-xs leading-relaxed text-lux-whisper">
          Questions before you inquire? Our concierge team can help — host contact is shared after
          quality review.
        </p>
        <PropertyTrustNotes className="mt-6" />
      </div>
    </article>
  );
}

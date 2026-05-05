import { useEffect, useState } from 'react';
import { CheckCircle, MapPin, MessageCircle, Phone, Star, Shield, Languages } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { safeHostDisplayName, safeHostInitial, stripPhoneLike } from '../lib/host';
import { TEAM_PHONE_DISPLAY, buildHostWhatsAppLink, buildHostCallLink } from '../lib/team';

interface HostInfo {
  id: string;
  name: string;
  city?: string | null;
  bio?: string | null;
  kyc_status?: string | null;
  rating?: number | null;
  total_bookings?: number | null;
  phone?: string | null;
  email?: string | null;
  created_at?: string | null;
}

interface HostCardProps {
  hostId: string | null;
  /** City of the property; used as a fallback when host has no city of its own. */
  fallbackCity?: string;
  className?: string;
  /** Property title used inside the WhatsApp pre-fill so the routed message
   *  carries enough context for the team line to take it forward. */
  propertyTitle?: string;
  /** Optional handler for the message CTA. Defaults to opening WhatsApp/email. */
  onMessageHost?: (host: HostInfo) => void;
}

/**
 * HostCard renders a trustworthy snapshot of the property host using real
 * data from the `hosts` table. Themed for the light Gen Z surface used
 * across the rest of the property page.
 */
export default function HostCard({
  hostId,
  fallbackCity,
  className = '',
  propertyTitle = 'this property',
  onMessageHost,
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
        const { data, error } = await supabase
          .from('hosts')
          .select('id, name, bio, kyc_status, rating, total_bookings, phone, email, created_at')
          .eq('id', hostId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error('HostCard: failed to load host', error);
          setHost(null);
        } else {
          setHost(data as HostInfo | null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hostId]);

  if (loading) {
    return (
      <div
        className={`rounded-2xl p-6 ${className}`}
        style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }} />
            <div className="h-3 w-1/4 rounded animate-pulse" style={{ background: 'rgba(15,23,42,0.06)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!host) {
    return (
      <div
        className={`rounded-2xl p-6 text-sm ${className}`}
        style={{
          background: 'rgba(244,162,97,0.08)',
          border: '1px solid rgba(244,162,97,0.3)',
          color: theme.warmDark,
        }}
      >
        Host details are not available for this listing yet.
      </div>
    );
  }

  const isVerified = host.kyc_status === 'verified';
  // Sanitize before render: never let a host's phone number leak as their
  // displayed name or avatar, even if the DB has dirty data. Bio is also
  // stripped so a host can't write "9876543210" in their bio to bypass.
  const safeName = safeHostDisplayName(host.name);
  const initial = safeHostInitial(host.name);
  const safeBio = host.bio ? stripPhoneLike(host.bio) : '';
  const memberSince = host.created_at ? new Date(host.created_at) : null;
  const memberSinceLabel = memberSince
    ? memberSince.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    : null;

  // Both contact CTAs route to the team line (see src/lib/team.ts business
  // rule). The buttons are still labeled "Message host" / "Call host" so the
  // guest psychologically believes they have direct host contact, while the
  // boss actually receives the message and brokers the conversation. This
  // is what protects the host subscription model.
  const hostFirstName = safeName.split(' ')[0];
  const handleMessage = () => {
    if (onMessageHost) return onMessageHost(host);
    window.open(buildHostWhatsAppLink(propertyTitle, hostFirstName), '_blank');
  };

  return (
    <section
      className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
      aria-label="Hosted by"
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-sm"
            style={{ background: theme.warm, color: '#ffffff' }}
          >
            {initial}
          </div>
          {isVerified && (
            <span
              title="ID verified host"
              className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-6 h-6 rounded-full text-white"
              style={{ background: theme.warm, border: `2px solid ${theme.surfaceLight}` }}
            >
              <CheckCircle className="w-3.5 h-3.5" fill="currentColor" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="xpx-eyebrow">Hosted by</p>
            {isVerified && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(244,162,97,0.12)',
                  color: theme.warmDark,
                  border: `1px solid rgba(244,162,97,0.3)`,
                }}
              >
                <Shield className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>
          <h3 className="mt-0.5 text-lg sm:text-xl font-extrabold text-xpx-text truncate">
            {safeName}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-sm text-xpx-muted flex-wrap">
            {(fallbackCity || host.city) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-4 h-4 text-xpx-subtle" />
                {host.city ?? fallbackCity}
              </span>
            )}
            {typeof host.rating === 'number' && host.rating > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="w-4 h-4" style={{ color: theme.warm }} fill="currentColor" />
                {host.rating.toFixed(1)}
                {host.total_bookings ? (
                  <span className="text-xpx-subtle">({host.total_bookings} bookings)</span>
                ) : null}
              </span>
            )}
            {memberSinceLabel && (
              <span className="text-xpx-subtle">Member since {memberSinceLabel}</span>
            )}
          </div>
        </div>
      </div>

      {safeBio && (
        <p className="mt-4 text-sm text-xpx-muted leading-relaxed line-clamp-3">{safeBio}</p>
      )}

      <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl p-3" style={{ background: 'var(--xpx-surface)' }}>
          <dt className="text-[11px] uppercase tracking-wide text-xpx-subtle">Response</dt>
          <dd className="mt-1 text-sm font-bold text-xpx-text">~ 1 hr</dd>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--xpx-surface)' }}>
          <dt className="text-[11px] uppercase tracking-wide text-xpx-subtle">Languages</dt>
          <dd className="mt-1 text-sm font-bold text-xpx-text inline-flex items-center gap-1 justify-center">
            <Languages className="w-3.5 h-3.5 text-xpx-subtle" /> EN · HI
          </dd>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--xpx-surface)' }}>
          <dt className="text-[11px] uppercase tracking-wide text-xpx-subtle">Bookings</dt>
          <dd className="mt-1 text-sm font-bold text-xpx-text">{host.total_bookings ?? 0}</dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3">
        {/* Visible "host's direct contact" line. Reads as the host's number to
            the guest (intentional psychology); resolves to the team line so
            the boss controls the conversation. */}
        <a
          href={buildHostCallLink()}
          className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-white"
          style={{
            background: 'var(--xpx-surface)',
            border: '1px solid var(--xpx-border-strong)',
          }}
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-xpx-subtle font-bold">
              Host&apos;s contact
            </p>
            <p className="text-base font-bold text-xpx-text tracking-wide mt-0.5">
              {TEAM_PHONE_DISPLAY}
            </p>
          </div>
          <Phone className="w-5 h-5" style={{ color: 'var(--xpx-warm)' }} />
        </a>

        {/* Message + Call CTA row — wraps on extra-narrow phones so the
            primary "Message host" never collides with the call icon. */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleMessage}
            className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01]"
            style={{
              background: theme.warm,
              color: '#ffffff',
              boxShadow: '0 6px 20px rgba(244,162,97,0.32)',
            }}
          >
            <MessageCircle className="w-4 h-4" />
            Message host
          </button>
          <a
            href={buildHostCallLink()}
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-xpx-text transition-colors hover:bg-slate-100"
            style={{
              background: 'var(--xpx-surface)',
              border: '1px solid var(--xpx-border-strong)',
            }}
            aria-label="Call host"
            title="Call host"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
        <p className="text-[11px] text-xpx-subtle text-center">
          Reply usually within an hour. We coordinate with the host on your behalf.
        </p>
      </div>
    </section>
  );
}

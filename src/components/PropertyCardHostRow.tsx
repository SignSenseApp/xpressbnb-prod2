import { useEffect, useState } from 'react';
import { fetchPublicHost } from '../lib/hostPublicCache';
import { safeHostDisplayName, safeHostInitial } from '../lib/host';
import { VerifiedShieldIcon } from './icons/PropertyCardIcons';

type PropertyCardHostRowProps = {
  hostId: string | null;
  propertyVerified?: boolean | null;
};

/**
 * Fixed-height host row for property cards — truncates long names; badge never wraps.
 */
export default function PropertyCardHostRow({
  hostId,
  propertyVerified,
}: PropertyCardHostRowProps) {
  const [hostName, setHostName] = useState<string | null>(null);
  const [hostVerified, setHostVerified] = useState(false);
  const [loading, setLoading] = useState(Boolean(hostId));

  useEffect(() => {
    let cancelled = false;
    if (!hostId) {
      setLoading(false);
      return;
    }

    void fetchPublicHost(hostId).then((row) => {
      if (cancelled) return;
      if (!row) {
        setHostName(null);
        setHostVerified(Boolean(propertyVerified));
      } else {
        setHostName(safeHostDisplayName(row.name));
        setHostVerified(row.kyc_status === 'verified' || Boolean(propertyVerified));
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [hostId, propertyVerified]);

  if (loading) {
    return (
      <div className="flex h-full w-full min-w-0 items-center gap-2" aria-hidden>
        <div
          className="h-7 w-7 shrink-0 animate-pulse rounded-full"
          style={{ background: 'rgba(17,24,39,0.06)' }}
        />
        <div className="h-3.5 min-w-0 flex-1 animate-pulse rounded" style={{ background: 'rgba(17,24,39,0.06)' }} />
      </div>
    );
  }

  const displayName = hostName ?? 'Verified Host';
  const initial = safeHostInitial(hostName ?? displayName);
  const hostLabel = `Hosted by ${displayName}`;

  return (
    <div className="flex h-full w-full min-w-0 items-center gap-2">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-white"
        style={{ background: '#16A34A' }}
        aria-hidden
      >
        {initial}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
        <p
          className="min-w-0 flex-1 truncate text-xs leading-none text-[#374151] md:text-[13px]"
          title={hostLabel}
        >
          <span className="font-normal text-[#6B7280]">Hosted by </span>
          <span className="font-medium">{displayName}</span>
        </p>
        {hostVerified && (
          <span
            className="inline-flex h-[22px] shrink-0 items-center gap-0.5 rounded-full px-2 text-[11px] font-normal leading-none text-[#16A34A]"
            style={{ background: '#F1FAF5' }}
          >
            <VerifiedShieldIcon className="h-2.5 w-2.5 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">Verified</span>
          </span>
        )}
      </div>
    </div>
  );
}

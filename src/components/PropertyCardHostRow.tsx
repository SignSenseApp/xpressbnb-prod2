import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { safeHostDisplayName, safeHostInitial } from '../lib/host';
import { VerifiedShieldIcon } from './icons/PropertyCardIcons';

type PropertyCardHostRowProps = {
  hostId: string | null;
  propertyVerified?: boolean | null;
};

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

    (async () => {
      try {
        const { data, error } = await supabase
          .from('hosts')
          .select('name, kyc_status')
          .eq('id', hostId)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          setHostName(null);
          setHostVerified(Boolean(propertyVerified));
        } else {
          setHostName(safeHostDisplayName(data.name));
          setHostVerified(data.kyc_status === 'verified' || Boolean(propertyVerified));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hostId, propertyVerified]);

  if (loading) {
    return (
      <div className="flex min-h-[28px] items-center gap-2">
        <div
          className="h-7 w-7 shrink-0 animate-pulse rounded-full"
          style={{ background: 'rgba(17,24,39,0.06)' }}
        />
        <div className="h-3.5 w-24 animate-pulse rounded" style={{ background: 'rgba(17,24,39,0.06)' }} />
      </div>
    );
  }

  const displayName = hostName ?? 'Verified Host';
  const initial = safeHostInitial(hostName ?? displayName);

  return (
    <div className="flex min-w-0 items-center gap-2 flex-nowrap">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-white"
        style={{ background: '#16A34A' }}
        aria-hidden
      >
        {initial}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 flex-nowrap">
        <p className="min-w-0 truncate leading-tight">
          <span className="text-xs font-normal text-[#6B7280]">Hosted by </span>
          <span className="text-xs font-medium text-[#374151] md:text-[13px]">{displayName}</span>
        </p>
        {hostVerified && (
          <span
            className="inline-flex h-[22px] shrink-0 items-center gap-0.5 rounded-full px-2 text-[11px] font-normal leading-none text-[#16A34A]"
            style={{ background: '#F1FAF5' }}
          >
            <VerifiedShieldIcon className="h-2.5 w-2.5" aria-hidden />
            Verified
          </span>
        )}
      </div>
    </div>
  );
}

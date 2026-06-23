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
      <div className="flex items-center gap-2.5 min-h-[32px]">
        <div
          className="w-8 h-8 rounded-full shrink-0 animate-pulse"
          style={{ background: 'rgba(17,24,39,0.06)' }}
        />
        <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'rgba(17,24,39,0.06)' }} />
      </div>
    );
  }

  const displayName = hostName ?? 'Verified Host';
  const initial = safeHostInitial(hostName ?? displayName);

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden"
        style={{ background: '#16A34A' }}
        aria-hidden
      >
        {initial}
      </div>
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <span className="text-sm font-semibold text-[#111827] truncate">
          Hosted by {displayName}
        </span>
        {hostVerified && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0"
            style={{ background: '#F1FAF5', color: '#16A34A' }}
          >
            <VerifiedShieldIcon className="w-3 h-3" />
            Host verified
          </span>
        )}
      </div>
    </div>
  );
}

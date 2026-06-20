import { useState } from 'react';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import { theme } from '../lib/theme';

const SHARE_LINE =
  'Found a stay without guest commission on XpressBNB. Verified inquiry — coordinate directly with your host.';

type ZeroCommissionSavingsReceiptProps = {
  /** Trip estimated total from booking flow — used only for illustrative fee estimate */
  estimatedTotal?: number;
  compact?: boolean;
};

function SnapshotCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-left"
      style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(5,150,105,0.14)' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/80">{label}</p>
      <p className="text-sm font-bold text-xpx-text mt-0.5 leading-tight">{value}</p>
    </div>
  );
}

export default function ZeroCommissionSavingsReceipt({
  estimatedTotal = 0,
  compact = false,
}: ZeroCommissionSavingsReceiptProps) {
  const [copied, setCopied] = useState(false);
  const showEstimate = estimatedTotal > 0;
  const illustrativeSaving = showEstimate ? Math.round(estimatedTotal * 0.1) : null;

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_LINE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      className={`rounded-2xl text-left ${compact ? 'p-3.5' : 'p-4'}`}
      style={{
        background:
          'linear-gradient(160deg, rgba(5,150,105,0.10) 0%, rgba(248,250,252,0.95) 55%, #fff 100%)',
        border: '1px solid rgba(5,150,105,0.22)',
        boxShadow: '0 8px 28px rgba(5,150,105,0.08)',
      }}
      aria-labelledby="zero-commission-receipt"
    >
      <div className="flex items-start gap-2.5 mb-3">
        <div
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: theme.accentLight, border: `1px solid ${theme.accentBorder}` }}
        >
          <ShieldCheck className="w-4 h-4" style={{ color: theme.accentDark }} strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <h4
            id="zero-commission-receipt"
            className="text-sm font-extrabold text-xpx-text tracking-tight leading-snug"
          >
            Smart move — you avoided guest commission
          </h4>
          <p className="text-xs text-xpx-muted mt-1 leading-relaxed">
            Your verified inquiry was sent through XpressBNB. We do not charge guest booking commission.
            Continue directly with the host on WhatsApp or call after verification.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <SnapshotCell label="XpressBNB guest commission" value="₹0" />
        <SnapshotCell label="Host contact" value="Unlocked after OTP" />
        <SnapshotCell label="Payment" value="Directly with host" />
        <SnapshotCell label="Status" value="Verified inquiry sent" />
      </div>

      {showEstimate && illustrativeSaving != null && illustrativeSaving > 0 && (
        <div
          className="rounded-xl px-3 py-2.5 mb-3"
          style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid var(--xpx-border)' }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-xpx-subtle">
              Potential platform-fee saving
            </p>
            <p className="text-base font-extrabold tabular-nums" style={{ color: theme.accentDark }}>
              ~₹{illustrativeSaving.toLocaleString('en-IN')}
            </p>
          </div>
          <p className="text-[10px] text-xpx-subtle mt-1 leading-relaxed">
            Illustrative estimate based on common platform service-fee patterns. Final price is confirmed
            directly with host.
          </p>
        </div>
      )}

      <p className="text-[11px] text-xpx-muted leading-relaxed">
        No hidden guest commission. No fake confirmation. Verified lead first, direct host contact next.
      </p>

      <button
        type="button"
        onClick={() => void copyMessage()}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" aria-hidden />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" aria-hidden />
            Copy savings message
          </>
        )}
      </button>
    </section>
  );
}

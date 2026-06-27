import { Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';
import InquiryHostContactCard from './InquiryHostContactCard';
import type { InquirySuccessSnapshot } from '../../../lib/inquirySuccessStorage';

type RequestBookSuccessProps = {
  snapshot: InquirySuccessSnapshot;
  hostName: string | null;
  onDone?: () => void;
  doneLabel?: string;
  className?: string;
};

function formatTripDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function RequestBookSuccess({
  snapshot,
  hostName,
  onDone,
  doneLabel = 'Back to listing',
  className = '',
}: RequestBookSuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyGuestId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snapshot.customerReference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [snapshot.customerReference]);

  return (
    <div
      className={`text-left inquiry-reveal motion-reduce:animate-none ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="text-center mb-6">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'var(--xpx-verified-bg)', border: '1px solid rgba(5,150,105,0.25)' }}
        >
          <Check className="h-7 w-7 text-emerald-600" strokeWidth={2.5} aria-hidden />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">
          Request sent
        </p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight text-balance">
          Talk to your host now
        </h2>
        <p className="mt-2 text-sm text-xpx-muted leading-relaxed">
          {snapshot.propertyTitle} · {formatTripDate(snapshot.checkIn)} →{' '}
          {formatTripDate(snapshot.checkOut)}
        </p>
      </div>

      <InquiryHostContactCard
        hostName={hostName}
        propertyTitle={snapshot.propertyTitle}
        hostPhoneDigits={snapshot.hostContactPhone}
        prominent
        className="inquiry-host-reveal motion-reduce:animate-none"
      />

      <div
        className="mt-5 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3"
        style={{
          background: 'var(--xpx-surface-light)',
          border: '1px solid var(--xpx-border)',
        }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-xpx-subtle">
            Guest ID
          </p>
          <p className="mt-0.5 font-mono text-sm sm:text-base font-bold text-xpx-text tabular-nums truncate">
            {snapshot.customerReference}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleCopyGuestId()}
          className="shrink-0 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-xpx-border-strong bg-white px-3 py-2 text-xs font-semibold text-xpx-text"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copy
            </>
          )}
        </button>
      </div>

      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="mt-5 w-full min-h-[48px] rounded-2xl text-sm font-semibold text-xpx-muted hover:text-xpx-text transition-colors"
        >
          {doneLabel}
        </button>
      )}
    </div>
  );

}

import { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { TRUST_BADGE_COPY } from '../../lib/trustBadgeCopy';

type CustomerReferenceFieldProps = {
  reference: string;
  label?: string;
  description?: string;
};

export default function CustomerReferenceField({
  reference,
  label = TRUST_BADGE_COPY.guestId.short,
  description = 'Private reference issued with your inquiry — use it to track status.',
}: CustomerReferenceFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = reference;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [reference]);

  return (
    <div
      className="rounded-2xl p-4 text-left"
      style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
      aria-labelledby="guest-reference-heading"
    >
      <p
        id="guest-reference-heading"
        className="text-[11px] font-bold uppercase tracking-[0.14em] text-xpx-subtle mb-2"
        title={TRUST_BADGE_COPY.guestId.title}
      >
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code
          className="flex-1 min-w-0 text-lg sm:text-xl font-extrabold tracking-wide text-xpx-text tabular-nums break-all"
          aria-label={`Guest ID ${reference}`}
        >
          {reference}
        </code>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-xpx-border-strong bg-white px-3 py-2 text-xs font-semibold text-xpx-text hover:bg-slate-50 transition-colors min-h-[44px]"
          aria-label={copied ? 'Copied' : 'Copy Guest ID'}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" aria-hidden />
              Copy
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-xpx-muted mt-2 leading-relaxed">{description}</p>
    </div>
  );
}

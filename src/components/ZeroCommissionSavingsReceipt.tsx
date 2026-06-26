import { useState } from 'react';
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { theme } from '../lib/theme';
import type { Json } from '../lib/database.types';
import {
  formatInr,
  pickExternalListingForDisplay,
} from '../lib/externalListingProof';

const SHARE_LINE =
  'Found a stay without guest commission on XpressBNB. Quality-reviewed inquiry — coordinate directly with your host.';

type ZeroCommissionSavingsReceiptProps = {
  estimatedTotal?: number;
  compact?: boolean;
  externalListings?: Json | null;
};

function PriceRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className={`text-xs ${bold ? 'font-bold text-xpx-text' : 'text-xpx-muted'}`}>{label}</span>
      <span
        className={`text-sm tabular-nums shrink-0 ${bold ? 'font-extrabold text-xpx-text' : 'font-semibold text-xpx-text'}`}
      >
        {value}
      </span>
    </div>
  );
}

const TRUST_BULLETS = [
  'Contact details checked during quality review',
  'Inquiry reviewed by XpressBNB before reaching the host',
  'Host contact shared after Operations review',
  'No guest commission added by XpressBNB',
] as const;

export default function ZeroCommissionSavingsReceipt({
  estimatedTotal = 0,
  compact = false,
  externalListings,
}: ZeroCommissionSavingsReceiptProps) {
  const [copied, setCopied] = useState(false);
  const total = estimatedTotal > 0 ? estimatedTotal : 0;
  const totalLabel = total > 0 ? formatInr(total) : 'Confirm with host';
  const external = pickExternalListingForDisplay(externalListings);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_LINE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const difference =
    external && total > 0 ? Math.round(external.listedPrice - total) : null;

  return (
    <section
      className={`rounded-2xl text-left ${compact ? 'p-3.5' : 'p-4'}`}
      style={{
        background:
          'linear-gradient(160deg, rgba(5,150,105,0.10) 0%, rgba(248,250,252,0.95) 55%, #fff 100%)',
        border: '1px solid rgba(5,150,105,0.22)',
        boxShadow: '0 8px 28px rgba(5,150,105,0.08)',
      }}
      aria-labelledby="verified-price-proof"
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
            id="verified-price-proof"
            className="text-sm font-extrabold text-xpx-text tracking-tight leading-snug"
          >
            Verified Price Proof
          </h4>
          <p className="text-xs text-xpx-muted mt-1 leading-relaxed">
            Direct-host pricing on XpressBNB — no guest commission, service fee, or platform fee added
            by us.
          </p>
        </div>
      </div>

      {/* A. Price breakdown */}
      <div
        className="rounded-xl px-3 py-2 mb-3"
        style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(5,150,105,0.12)' }}
      >
        <PriceRow label="Direct host price" value={totalLabel} />
        <PriceRow label="XpressBNB guest commission" value="₹0" />
        <PriceRow label="Service fee" value="₹0" />
        <PriceRow label="Platform fee" value="₹0" />
        <div className="border-t border-slate-200/80 mt-1 pt-1">
          <PriceRow label="Total payable to host" value={totalLabel} bold />
        </div>
      </div>

      <p className="text-[11px] text-xpx-muted leading-relaxed mb-3">
        You are not paying guest commission to XpressBNB. Confirm final amount, advance, pets,
        parking, and ID requirements directly with the host.
      </p>

      {/* B. Reliability */}
      <div
        className="rounded-xl px-3 py-2.5 mb-3"
        style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid var(--xpx-border)' }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 mb-2">
          Why this is safer than random direct calling
        </p>
        <ul className="space-y-1.5">
          {TRUST_BULLETS.map((line) => (
            <li key={line} className="flex items-start gap-2 text-[11px] text-xpx-muted leading-snug">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      </div>

      {/* C. External comparison — only when safe parsed data exists */}
      {external && (
        <div
          className="rounded-xl px-3 py-2.5 mb-3"
          style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid var(--xpx-border)' }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-xpx-subtle">
              Same stay listed elsewhere
            </p>
            <span
              className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                external.opsVerified
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {external.opsVerified ? 'Checked by XpressBNB' : 'Host-provided'}
            </span>
          </div>

          <PriceRow label="XpressBNB direct-host total" value={totalLabel} />
          <PriceRow
            label={`${external.platform} listed price`}
            value={formatInr(external.listedPrice)}
          />
          {difference != null && (
            <PriceRow
              label="Difference"
              value={
                difference === 0
                  ? 'Same'
                  : difference > 0
                    ? `${formatInr(difference)} higher elsewhere`
                    : `${formatInr(Math.abs(difference))} lower on XpressBNB`
              }
            />
          )}

          <p className="text-[10px] text-xpx-subtle mt-2 leading-relaxed">
            {external.opsVerified
              ? 'Comparison checked by XpressBNB. External prices and fees may still change.'
              : 'Host-provided comparison. Final prices may change on external platforms.'}
          </p>

          <a
            href={external.url}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900"
          >
            Check external listing
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          </a>
        </div>
      )}

      <p className="text-[11px] text-xpx-muted leading-relaxed">
        No hidden guest commission. No fake confirmation. Quality review first, direct host contact
        next.
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

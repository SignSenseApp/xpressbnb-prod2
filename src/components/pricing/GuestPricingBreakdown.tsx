import type { GuestPricingLine } from '../../lib/guestPricingEngine';
import { formatInr } from '../../lib/guestPricingEngine';
import {
  GUEST_PRICING_INQUIRY_TOTAL_NOTE,
  GUEST_PRICING_NO_COMMISSION,
} from '../../lib/guestPricingCopy';

type GuestPricingBreakdownProps = {
  lines: GuestPricingLine[];
  guestTotal: number;
  className?: string;
};

export default function GuestPricingBreakdown({
  lines,
  guestTotal,
  className = '',
}: GuestPricingBreakdownProps) {
  if (guestTotal <= 0) return null;

  return (
    <div className={className}>
      <dl className="space-y-2 text-sm">
        {lines.map((line) => (
          <div key={line.id} className="flex justify-between gap-3">
            <dt className="text-xpx-muted">{line.label}</dt>
            <dd
              className={`font-medium tabular-nums shrink-0 ${
                line.kind === 'discount' ? 'text-emerald-700' : 'text-xpx-text'
              }`}
            >
              {line.kind === 'discount' ? '−' : ''}
              {formatInr(Math.abs(line.amount))}
            </dd>
          </div>
        ))}
        <div
          className="pt-3 mt-3 flex justify-between text-base"
          style={{ borderTop: '1px solid var(--xpx-border)' }}
        >
          <dt className="text-xpx-text font-bold">Total</dt>
          <dd className="text-xpx-text font-extrabold tabular-nums">{formatInr(guestTotal)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] text-xpx-subtle leading-snug">
        {GUEST_PRICING_NO_COMMISSION} {GUEST_PRICING_INQUIRY_TOTAL_NOTE}
      </p>
    </div>
  );
}

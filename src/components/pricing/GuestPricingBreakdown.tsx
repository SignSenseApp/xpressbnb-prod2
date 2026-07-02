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

/** Luxury folio — quiet line items, hairline total. */
export default function GuestPricingBreakdown({
  lines,
  guestTotal,
  className = '',
}: GuestPricingBreakdownProps) {
  if (guestTotal <= 0) return null;

  return (
    <div className={className}>
      <dl className="xpx-concierge-folio xpx-concierge-folio--spacious">
        {lines.map((line) => (
          <div key={line.id} className="xpx-concierge-folio-row">
            <dt>{line.label}</dt>
            <dd className="shrink-0 tabular-nums" style={{ color: 'var(--lux-ink)' }}>
              {line.kind === 'discount' ? '−' : ''}
              {formatInr(Math.abs(line.amount))}
            </dd>
          </div>
        ))}
        <div className="xpx-concierge-folio-total">
          <dt>Your stay</dt>
          <dd>{formatInr(guestTotal)}</dd>
        </div>
      </dl>
      <p className="xpx-concierge-hint mt-4">
        {GUEST_PRICING_NO_COMMISSION} {GUEST_PRICING_INQUIRY_TOTAL_NOTE}
      </p>
    </div>
  );
}

import CustomerReferenceField from './CustomerReferenceField';
import InquiryTrustBadgePill from './InquiryTrustBadgePill';
import {
  CONTACT_DETAILS_REVIEWED_HELPER,
  formatApprovalSource,
  formatReviewedAt,
  getInquiryTrustBadges,
  isReadyToContactGuest,
  type InquiryTrustBookingFields,
} from '../../lib/inquiryTrust';

type InquiryHostTrustPanelProps = {
  booking: InquiryTrustBookingFields & {
    customer_reference?: string | null;
    guest_name?: string;
    guest_phone?: string | null;
    reviewed_at?: string | null;
    approval_source?: string | null;
  };
  showReference?: boolean;
};

export default function InquiryHostTrustPanel({
  booking,
  showReference = true,
}: InquiryHostTrustPanelProps) {
  const badges = getInquiryTrustBadges(booking);
  const primary = badges[0];
  const reviewedLabel = formatReviewedAt(booking.reviewed_at);
  const ready = isReadyToContactGuest(booking);

  if (!primary && !booking.customer_reference) return null;

  return (
    <section
      className="mt-4 rounded-xl p-4 space-y-3"
      style={{
        background: 'linear-gradient(135deg, rgba(5,150,105,0.06) 0%, var(--xpx-surface-light) 100%)',
        border: '1px solid rgba(5,150,105,0.18)',
      }}
      aria-labelledby="inquiry-trust-panel-heading"
    >
      <div className="flex flex-wrap items-center gap-2">
        {primary && <InquiryTrustBadgePill badge={primary} />}
        {ready && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
            Ready to Contact
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p id="inquiry-trust-panel-heading" className="text-sm font-semibold text-xpx-text">
          {primary?.label ?? 'Inquiry'}
        </p>
        <p className="text-xs text-xpx-muted leading-relaxed">{primary?.description}</p>
      </div>

      {reviewedLabel && (
        <p className="text-xs text-xpx-muted">
          Reviewed by{' '}
          <span className="font-semibold text-xpx-text">
            {formatApprovalSource(booking.approval_source)}
          </span>
          <span className="text-xpx-subtle"> · {reviewedLabel}</span>
        </p>
      )}

      {showReference && booking.customer_reference && (
        <div className="pt-1">
          <CustomerReferenceField
            reference={booking.customer_reference}
            label="Customer reference"
          />
        </div>
      )}

      {booking.guest_phone && ready && (
        <p className="text-[11px] text-xpx-subtle leading-relaxed border-t border-emerald-100/80 pt-2">
          {CONTACT_DETAILS_REVIEWED_HELPER}
        </p>
      )}
    </section>
  );
}

import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { theme } from '../../lib/theme';
import CustomerReferenceField from './CustomerReferenceField';
import GuestIdProfileCard from './GuestIdProfileCard';
import GuestTrustJourney from './GuestTrustJourney';
import InquiryStatusTimeline from './InquiryStatusTimeline';
import FrequentAmigoProgress from '../FrequentAmigoProgress';
import { recordGuestInquiry } from '../../lib/guestTrustStorage';
import type { FrequentAmigoStatus } from '../../lib/inquiryHostContact';
import { trackXpressEvent, type AnalyticsScope } from '../../lib/analytics';
import { navigateTo } from '../../lib/navigation';

export type InquiryReceivedSuccessProps = {
  variant: 'booking' | 'offer';
  customerReference: string;
  propertyTitle: string;
  checkInLabel: string;
  checkOutLabel: string;
  estimatedTotal: number;
  guestEmail: string;
  frequentAmigo?: FrequentAmigoStatus | null;
  onTrackInquiry?: () => void;
  analyticsScope?: AnalyticsScope;
};

export default function InquiryReceivedSuccess({
  variant,
  customerReference,
  propertyTitle,
  checkInLabel,
  checkOutLabel,
  estimatedTotal,
  guestEmail,
  frequentAmigo,
  onTrackInquiry,
  analyticsScope,
}: InquiryReceivedSuccessProps) {
  useEffect(() => {
    recordGuestInquiry(customerReference);
    trackXpressEvent('inquiry_success', {
      ...analyticsScope,
      inquiry_type: variant === 'offer' ? 'make_offer' : 'book_pay_later',
      booking_step: 'complete',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrack = () => {
    if (onTrackInquiry) {
      onTrackInquiry();
      return;
    }
    const params = new URLSearchParams({
      ref: customerReference,
      email: guestEmail,
    });
    navigateTo(`/track-inquiry?${params.toString()}`);
  };

  return (
    <div
      className="space-y-5 text-center px-0.5 max-h-[min(85svh,720px)] overflow-y-auto"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      role="status"
      aria-live="polite"
    >
      <div
        className="w-16 h-16 rounded-full mx-auto flex items-center justify-center shrink-0"
        style={{
          background: theme.accentLight,
          border: `1px solid ${theme.accentBorder}`,
          boxShadow: '0 12px 40px rgba(5,150,105,0.15)',
        }}
      >
        <CheckCircle2
          className="w-9 h-9"
          style={{ color: theme.accentDark }}
          strokeWidth={2}
          aria-hidden
        />
      </div>

      <div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight">
          Welcome — your inquiry is in.
        </h3>
        <p className="text-sm text-xpx-muted mt-2 leading-relaxed max-w-md mx-auto">
          We&apos;re reviewing it now. Your Guest ID is ready so you can track everything later.
        </p>
      </div>

      <CustomerReferenceField reference={customerReference} />

      <GuestIdProfileCard />

      <GuestTrustJourney
        compact
        context={{
          inquiries: [
            {
              customerReference: customerReference.trim().toUpperCase(),
              submittedAt: Date.now(),
            },
          ],
          frequentAmigo: frequentAmigo ?? null,
        }}
      />

      <section
        className="rounded-2xl p-4 sm:p-5 text-left"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)' }}
        aria-labelledby="inquiry-timeline-heading"
      >
        <h4
          id="inquiry-timeline-heading"
          className="text-[11px] font-bold uppercase tracking-wide text-xpx-subtle mb-4"
        >
          Progress
        </h4>
        <InquiryStatusTimeline variant="submit" />
      </section>

      {frequentAmigo && (
        <div className="text-left">
          <FrequentAmigoProgress
            status={{
              qualifyingCount: frequentAmigo.qualifyingCount,
              threshold: frequentAmigo.threshold,
              unlocked: frequentAmigo.unlocked,
            }}
          />
        </div>
      )}

      <section
        className="rounded-2xl p-4 text-left"
        style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-xpx-subtle mb-2">
          Trip summary
        </p>
        <p className="font-semibold text-xpx-text text-sm leading-snug">{propertyTitle}</p>
        <p className="text-sm text-xpx-muted mt-1.5">
          {checkInLabel} → {checkOutLabel}
        </p>
        <div className="flex justify-between items-baseline mt-2.5 pt-2.5 border-t border-slate-200/80">
          <span className="text-sm font-semibold text-xpx-text">Estimated total</span>
          <span className="text-base font-extrabold tabular-nums" style={{ color: theme.accentDark }}>
            ₹{estimatedTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </section>

      <button
        type="button"
        onClick={handleTrack}
        className="w-full py-3.5 rounded-2xl font-bold text-white transition-opacity hover:opacity-95 text-sm min-h-[52px]"
        style={{
          background: theme.accent,
          boxShadow: '0 6px 20px rgba(5,150,105,0.24)',
        }}
      >
        Track inquiry
      </button>

      <p className="text-[11px] text-xpx-subtle leading-relaxed pb-1">
        No payment taken. Your details stay private until the inquiry is reviewed. We&apos;ll email
        you when it moves forward.
      </p>
    </div>
  );
}

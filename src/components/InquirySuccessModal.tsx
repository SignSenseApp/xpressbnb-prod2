import { useEffect } from 'react';
import { Calendar, CheckCircle2, MessageSquare, Phone, Sparkles } from 'lucide-react';
import { theme } from '../lib/theme';
import {
  buildHostDirectWhatsAppLink,
  formatHostPhoneDisplay,
  hostPhoneToE164,
} from '../lib/inquiryHostContact';
import ZeroCommissionSavingsReceipt from './ZeroCommissionSavingsReceipt';
import FrequentAmigoProgress from './FrequentAmigoProgress';
import type { FrequentAmigoStatus } from '../lib/inquiryHostContact';
import type { Json } from '../lib/database.types';
import { trackXpressEvent, type AnalyticsScope } from '../lib/analytics';

export type InquirySuccessVariant = 'booking' | 'offer';

export type InquirySuccessModalProps = {
  variant: InquirySuccessVariant;
  hostName: string;
  hostPhone: string;
  propertyTitle: string;
  checkInLabel: string;
  checkOutLabel: string;
  estimatedTotal: number;
  includeDecoration?: boolean;
  offerPerNight?: number;
  externalListings?: Json | null;
  frequentAmigo?: FrequentAmigoStatus | null;
  onViewConfirmation: () => void;
  onDismiss?: () => void;
  dismissLabel?: string;
  analyticsScope?: AnalyticsScope;
};

export default function InquirySuccessModal({
  variant,
  hostName,
  hostPhone,
  propertyTitle,
  checkInLabel,
  checkOutLabel,
  estimatedTotal,
  includeDecoration = false,
  offerPerNight,
  externalListings,
  frequentAmigo,
  onViewConfirmation,
  onDismiss,
  dismissLabel = 'Done',
  analyticsScope,
}: InquirySuccessModalProps) {
  const phoneDisplay = formatHostPhoneDisplay(hostPhone);
  const telHref = `tel:${hostPhoneToE164(hostPhone)}`;
  const waHref = buildHostDirectWhatsAppLink(
    hostPhone,
    propertyTitle,
    hostName.split(/\s+/)[0],
  );

  const headline =
    variant === 'offer' ? `Offer sent to ${hostName}` : `Inquiry sent to ${hostName}`;

  useEffect(() => {
    trackXpressEvent('inquiry_success', {
      ...analyticsScope,
      inquiry_type: variant === 'offer' ? 'make_offer' : 'book_pay_later',
      booking_step: 'complete',
    });
    // Fire once when success UI mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="max-h-[min(85svh,720px)] overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling-touch space-y-4 text-center px-0.5"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="w-14 h-14 rounded-full mx-auto flex items-center justify-center shrink-0"
        style={{
          background: theme.accentLight,
          border: `1px solid ${theme.accentBorder}`,
        }}
      >
        <CheckCircle2 className="w-7 h-7" style={{ color: theme.accentDark }} strokeWidth={2.25} />
      </div>

      <div>
        <h3 className="text-lg sm:text-xl font-extrabold text-xpx-text tracking-tight">
          {headline}
        </h3>
        <p className="text-sm text-xpx-muted mt-1.5 leading-relaxed max-w-sm mx-auto">
          Your inquiry is with XpressBNB Operations for quality review. Host contact unlocks after
          review — not identity verification.
        </p>
      </div>

      <section
        className="rounded-2xl p-4 text-left"
        style={{
          background:
            'linear-gradient(135deg, rgba(5,150,105,0.08) 0%, var(--xpx-surface-light) 100%)',
          border: '1px solid rgba(5,150,105,0.22)',
        }}
        aria-labelledby="host-direct-contact"
      >
        <h4
          id="host-direct-contact"
          className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 mb-1"
        >
          Host contact
        </h4>
        <p className="text-xl sm:text-2xl font-extrabold text-xpx-text tabular-nums tracking-tight">
          +91 {phoneDisplay}
        </p>
        <p className="text-xs text-xpx-muted mt-1 mb-3">
          WhatsApp or call to coordinate directly with {hostName.split(/\s+/)[0]}.
        </p>
        <div className="flex flex-col gap-2.5">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackXpressEvent('host_whatsapp_click', {
                ...analyticsScope,
                inquiry_type: variant === 'offer' ? 'make_offer' : 'book_pay_later',
              })
            }
            className="inline-flex items-center justify-center gap-2 min-h-12 w-full rounded-xl font-bold text-white transition-colors shadow-sm"
            style={{ background: theme.accent }}
          >
            <MessageSquare className="w-5 h-5" aria-hidden />
            WhatsApp host
          </a>
          <a
            href={telHref}
            onClick={() =>
              trackXpressEvent('host_call_click', {
                ...analyticsScope,
                inquiry_type: variant === 'offer' ? 'make_offer' : 'book_pay_later',
              })
            }
            className="inline-flex items-center justify-center gap-2 min-h-12 w-full rounded-xl font-semibold border-2 border-slate-200 bg-white text-xpx-text hover:bg-slate-50 transition-colors"
          >
            <Phone className="w-5 h-5" aria-hidden />
            Call host
          </a>
        </div>
      </section>

      <div className="space-y-3 text-left">
        <ZeroCommissionSavingsReceipt
          estimatedTotal={estimatedTotal}
          externalListings={externalListings}
        />
        {frequentAmigo && (
          <FrequentAmigoProgress
            status={{
              qualifyingCount: frequentAmigo.qualifyingCount,
              threshold: frequentAmigo.threshold,
              unlocked: frequentAmigo.unlocked,
            }}
          />
        )}
      </div>

      <section
        className="rounded-2xl p-4 text-left"
        style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-xpx-subtle mb-2">
          Trip summary
        </p>
        <p className="font-semibold text-xpx-text text-sm leading-snug">{propertyTitle}</p>
        <div className="flex items-center gap-2 mt-2 text-sm text-xpx-muted">
          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
          <span>
            {checkInLabel} → {checkOutLabel}
          </span>
        </div>
        {offerPerNight != null && (
          <p className="text-sm text-xpx-muted mt-1.5">
            Your offer:{' '}
            <span className="font-bold text-xpx-text">
              ₹{offerPerNight.toLocaleString('en-IN')}/night
            </span>
          </p>
        )}
        {includeDecoration && (
          <p className="text-xs text-xpx-muted mt-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" aria-hidden />
            Decoration add-on included
          </p>
        )}
        <div className="flex justify-between items-baseline mt-2.5 pt-2.5 border-t border-slate-200/80">
          <span className="text-sm font-semibold text-xpx-text">Estimated total</span>
          <span className="text-base font-extrabold tabular-nums" style={{ color: theme.accentDark }}>
            ₹{estimatedTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </section>

      <button
        type="button"
        onClick={onViewConfirmation}
        className="w-full py-3 rounded-2xl font-bold text-white transition-opacity hover:opacity-95 text-sm"
        style={{
          background: theme.accent,
          boxShadow: '0 6px 20px rgba(5,150,105,0.24)',
        }}
      >
        View full confirmation
      </button>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-2 text-sm font-semibold text-xpx-muted hover:text-xpx-text"
        >
          {dismissLabel}
        </button>
      )}

      <p className="text-[11px] text-xpx-subtle leading-relaxed pb-1">
        No online payment taken. Host will confirm dates and coordinate payment directly.
      </p>
    </div>
  );
}

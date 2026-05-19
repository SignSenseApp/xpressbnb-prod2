import { Calendar, CheckCircle2, MessageSquare, Phone, Sparkles } from 'lucide-react';
import { theme } from '../lib/theme';
import {
  buildHostDirectWhatsAppLink,
  formatHostPhoneDisplay,
  hostPhoneToE164,
} from '../lib/inquiryHostContact';

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
  onViewConfirmation: () => void;
  onDismiss?: () => void;
  dismissLabel?: string;
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
  onViewConfirmation,
  onDismiss,
  dismissLabel = 'Done',
}: InquirySuccessModalProps) {
  const phoneDisplay = formatHostPhoneDisplay(hostPhone);
  const telHref = `tel:${hostPhoneToE164(hostPhone)}`;
  const waHref = buildHostDirectWhatsAppLink(
    hostPhone,
    propertyTitle,
    hostName.split(/\s+/)[0],
  );

  const headline =
    variant === 'offer' ? `Offer ${hostName} ko bhej di` : `Inquiry ${hostName} ko bhej di`;

  return (
    <div className="space-y-5 text-center">
      <div
        className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
        style={{
          background: theme.accentLight,
          border: `1px solid ${theme.accentBorder}`,
        }}
      >
        <CheckCircle2 className="w-8 h-8" style={{ color: theme.accentDark }} strokeWidth={2.25} />
      </div>

      <div>
        <h3 className="text-xl font-extrabold text-xpx-text tracking-tight">{headline}</h3>
        <p className="text-sm text-xpx-muted mt-2 leading-relaxed max-w-sm mx-auto">
          Inquiry sent to <span className="font-semibold text-xpx-text">{hostName}</span>. They
          usually reply within a few minutes — seedha unse baat karein, no platform commission.
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
          className="text-xs font-bold uppercase tracking-wide text-emerald-800 mb-1"
        >
          Host ka number
        </h4>
        <p className="text-2xl font-extrabold text-xpx-text tabular-nums tracking-tight">
          +91 {phoneDisplay}
        </p>
        <p className="text-xs text-xpx-muted mt-1 mb-4">
          Call ya WhatsApp — host se directly coordinate karein.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-12 flex-1 rounded-xl font-semibold text-white transition-colors shadow-sm"
            style={{ background: theme.accent }}
          >
            <MessageSquare className="w-5 h-5" aria-hidden />
            WhatsApp host
          </a>
          <a
            href={telHref}
            className="inline-flex items-center justify-center gap-2 min-h-12 flex-1 rounded-xl font-semibold border-2 border-slate-200 bg-white text-xpx-text hover:bg-slate-50 transition-colors"
          >
            <Phone className="w-5 h-5" aria-hidden />
            Call host
          </a>
        </div>
      </section>

      <section
        className="rounded-2xl p-4 text-left"
        style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-xpx-subtle mb-3">
          Trip summary
        </p>
        <p className="font-semibold text-xpx-text leading-snug">{propertyTitle}</p>
        <div className="flex items-center gap-2 mt-3 text-sm text-xpx-muted">
          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
          <span>
            {checkInLabel} → {checkOutLabel}
          </span>
        </div>
        {offerPerNight != null && (
          <p className="text-sm text-xpx-muted mt-2">
            Your offer:{' '}
            <span className="font-bold text-xpx-text">
              ₹{offerPerNight.toLocaleString('en-IN')}/night
            </span>
          </p>
        )}
        {includeDecoration && (
          <p className="text-xs text-xpx-muted mt-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" aria-hidden />
            Decoration add-on included
          </p>
        )}
        <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-slate-200/80">
          <span className="text-sm font-semibold text-xpx-text">Estimated total</span>
          <span className="text-lg font-extrabold tabular-nums" style={{ color: theme.accentDark }}>
            ₹{estimatedTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </section>

      <button
        type="button"
        onClick={onViewConfirmation}
        className="w-full py-3.5 rounded-2xl font-bold text-white transition-all shadow-md hover:opacity-95"
        style={{
          background: theme.accent,
          boxShadow: '0 8px 24px rgba(5,150,105,0.28)',
        }}
      >
        Full confirmation dekhein
      </button>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-2.5 text-sm font-semibold text-xpx-muted hover:text-xpx-text"
        >
          {dismissLabel}
        </button>
      )}

      <p className="text-[11px] text-xpx-subtle leading-relaxed">
        Online payment nahi li gayi. Host dates confirm karke payment directly coordinate karenge.
      </p>
    </div>
  );
}


import { Phone, MessageCircle, Home } from 'lucide-react';
import {
  buildInquirySuccessWhatsAppLink,
  formatHostPhoneDisplay,
  hostPhoneToE164,
} from '../../../lib/inquiryHostContact';
import { safeHostDisplayName, safeHostInitial } from '../../../lib/host';

type InquiryHostContactCardProps = {
  hostName: string | null;
  propertyTitle: string;
  hostPhoneDigits: string | null;
  className?: string;
};

export default function InquiryHostContactCard({
  hostName,
  propertyTitle,
  hostPhoneDigits,
  className = '',
}: InquiryHostContactCardProps) {
  const displayName = safeHostDisplayName(hostName, 'Your host');
  const initial = safeHostInitial(hostName, 'H');
  const digits = hostPhoneDigits?.replace(/\D/g, '') ?? '';
  const hasPhone = digits.length >= 10;
  const displayPhone = hasPhone ? formatHostPhoneDisplay(digits) : null;
  const telHref = hasPhone ? `tel:${hostPhoneToE164(digits)}` : null;
  const whatsappHref = hasPhone ? buildInquirySuccessWhatsAppLink(digits, propertyTitle) : null;

  return (
    <section
      className={`rounded-3xl overflow-hidden text-left inquiry-reveal motion-reduce:animate-none ${className}`}
      style={{
        background: 'var(--xpx-surface, #fff)',
        border: '1px solid var(--xpx-border)',
        boxShadow: '0 16px 48px rgba(15,23,42,0.06)',
      }}
      aria-labelledby="host-contact-heading"
    >
      <div className="p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-xpx-subtle">
          Your host
        </p>
        <h3
          id="host-contact-heading"
          className="mt-1 text-lg sm:text-xl font-extrabold text-xpx-text tracking-tight"
        >
          {hasPhone ? 'Continue the conversation' : 'Introduction coming soon'}
        </h3>

        <div className="mt-4 flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
            style={{ background: 'linear-gradient(145deg, #0f172a 0%, #334155 100%)' }}
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-xpx-text truncate">{displayName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-xpx-muted truncate">
              <Home className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{propertyTitle}</span>
            </p>
            {displayPhone && (
              <p className="mt-1 text-sm font-semibold text-xpx-text tabular-nums">{displayPhone}</p>
            )}
          </div>
        </div>

        {hasPhone && telHref && whatsappHref ? (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] motion-reduce:transition-none"
              style={{ background: '#25D366', boxShadow: '0 8px 24px rgba(37,211,102,0.28)' }}
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              WhatsApp
            </a>
            <a
              href={telHref}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-xpx-text transition-transform active:scale-[0.98] motion-reduce:transition-none"
              style={{
                background: 'var(--xpx-surface-light)',
                border: '1px solid var(--xpx-border-strong)',
              }}
            >
              <Phone className="h-5 w-5" aria-hidden />
              Call
            </a>
          </div>
        ) : (
          <p className="mt-4 text-sm text-xpx-muted leading-relaxed rounded-2xl px-4 py-3.5 bg-slate-50 border border-slate-100">
            We&apos;re preparing your inquiry for the host. Direct contact details appear here once
            our team completes the quality review — you can also track progress with your Guest ID.
          </p>
        )}
      </div>
    </section>
  );
}

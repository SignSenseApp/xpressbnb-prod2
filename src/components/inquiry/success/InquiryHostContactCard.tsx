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
  prominent?: boolean;
  className?: string;
};

export default function InquiryHostContactCard({
  hostName,
  propertyTitle,
  hostPhoneDigits,
  prominent = false,
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
      className={`relative overflow-hidden rounded-3xl text-left ${className}`}
      style={{
        background: prominent
          ? 'linear-gradient(165deg, var(--xpx-surface) 0%, var(--xpx-verified-bg) 100%)'
          : 'var(--xpx-surface)',
        border: prominent ? '1px solid var(--xpx-accent-a28)' : '1px solid var(--xpx-border)',
        boxShadow: prominent ? 'var(--xpx-shadow-floating)' : 'var(--xpx-shadow-card)',
      }}
      aria-labelledby="host-contact-heading"
    >
      <div className="p-5 sm:p-6">
        <p className="xpx-eyebrow">Your host</p>
        <h3
          id="host-contact-heading"
          className={`mt-1 font-extrabold text-xpx-text tracking-tight ${
            prominent ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
          }`}
        >
          {hasPhone ? 'Call or WhatsApp to confirm your stay' : 'Host contact'}
        </h3>

        <div className="mt-4 flex items-center gap-4">
          <div
            className={`flex shrink-0 items-center justify-center rounded-2xl font-bold text-white ${
              prominent ? 'h-16 w-16 text-xl' : 'h-14 w-14 text-lg'
            }`}
            style={{ background: 'linear-gradient(145deg, #0f172a 0%, #334155 100%)' }}
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className={`font-bold text-xpx-text truncate ${prominent ? 'text-lg' : 'text-base'}`}>
              {displayName}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-xpx-muted truncate">
              <Home className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{propertyTitle}</span>
            </p>
            {displayPhone && (
              <p
                className={`mt-1.5 font-bold text-xpx-text tabular-nums ${
                  prominent ? 'text-xl sm:text-2xl tracking-tight' : 'text-sm'
                }`}
              >
                {displayPhone}
              </p>
            )}
          </div>
        </div>

        {hasPhone && telHref && whatsappHref ? (
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${prominent ? 'mt-6' : 'mt-5'}`}>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-2xl px-4 py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98] motion-reduce:transition-none"
              style={{ background: '#25D366', boxShadow: '0 10px 32px rgba(37,211,102,0.32)' }}
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              WhatsApp host
            </a>
            <a
              href={telHref}
              className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-2xl px-4 py-3.5 text-base font-bold text-xpx-text transition-transform active:scale-[0.98] motion-reduce:transition-none"
              style={{
                background: 'var(--xpx-surface)',
                border: '2px solid var(--xpx-border-strong)',
                boxShadow: 'var(--xpx-shadow-card)',
              }}
            >
              <Phone className="h-5 w-5" aria-hidden />
              Call host
            </a>
          </div>
        ) : (
          <p className="mt-4 text-sm text-xpx-muted leading-relaxed rounded-2xl px-4 py-3.5 border" style={{ background: 'var(--xpx-surface-light)', borderColor: 'var(--xpx-border)' }}>
            We couldn&apos;t load the host number right now. Your request was saved — our team will
            share contact details shortly.
          </p>
        )}
      </div>
    </section>
  );
}

import { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Copy,
  Check,
  Home,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Users,
} from 'lucide-react';
import type { BookingConfirmationSnapshot } from '../lib/bookingConfirmationStorage';
import {
  buildHostDirectWhatsAppLink,
  formatHostPhoneDisplay,
  hostPhoneToE164,
} from '../lib/inquiryHostContact';
import {
  TEAM_EMAIL,
  TEAM_PHONE_DISPLAY,
  TEAM_PHONE_E164,
  buildTeamWhatsAppLink,
} from '../lib/team';

export type GuestTripConfirmationProps = {
  snapshot: BookingConfirmationSnapshot;
  /** When data came from Supabase (signed-in guest), not only sessionStorage */
  source: 'snapshot' | 'remote';
  onBackHome: () => void;
};

function formatLongDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function GuestTripConfirmation({
  snapshot,
  source,
  onBackHome,
}: GuestTripConfirmationProps) {
  const [copiedRef, setCopiedRef] = useState(false);

  const total = snapshot.estimatedTotal;
  const waSupport = buildTeamWhatsAppLink(
    `Hi XpressBnB, I need help with my booking.\nReference: ${snapshot.bookingId}\nProperty: ${snapshot.propertyTitle}`,
  );
  const hostPhoneDigits = snapshot.hostContactPhone?.replace(/\D/g, '').slice(-10) ?? '';
  const showHostDirect =
    Boolean(hostPhoneDigits) &&
    (snapshot.paymentStatus === 'paid' ||
      snapshot.paymentStatus === 'inquiry' ||
      snapshot.paymentStatus === 'offer_pending');
  const hostPhoneDisplay = showHostDirect ? formatHostPhoneDisplay(hostPhoneDigits) : '';
  const hostPhoneE164 = showHostDirect ? hostPhoneToE164(hostPhoneDigits) : null;

  const waHost = showHostDirect
    ? buildHostDirectWhatsAppLink(
        hostPhoneDigits,
        snapshot.propertyTitle,
        snapshot.hostContactName?.split(/\s+/)[0],
      )
    : buildTeamWhatsAppLink(
        `Hi XpressBnB, I need help with my booking.\nReference: ${snapshot.bookingId}\nProperty: ${snapshot.propertyTitle}`,
      );

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(snapshot.bookingId);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const mailSupport = `mailto:${TEAM_EMAIL}?subject=${encodeURIComponent(
    `Booking help — ${snapshot.bookingId}`,
  )}&body=${encodeURIComponent(
    `Booking reference: ${snapshot.bookingId}\nProperty: ${snapshot.propertyTitle}\n\n`,
  )}`;

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-0 pb-28 sm:pb-12">
      <div className="text-center pt-2 sm:pt-4">
        <div
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: 'rgba(80,200,120,0.12)',
            border: '1px solid rgba(80,200,120,0.35)',
          }}
          aria-hidden
        >
          <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2} style={{ color: '#3dae68' }} />
        </div>
        <h1 id="trip-confirmation-title" className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight">
          You&apos;re all set
        </h1>
        <p className="text-xpx-muted mt-2 text-sm sm:text-base leading-relaxed">
          We&apos;ve shared your stay details with the host. Keep this summary handy — it has your trip basics and how
          to reach out.
        </p>
      </div>

      {source === 'snapshot' && (
        <p className="mt-4 text-xs text-xpx-subtle text-center leading-relaxed" role="status">
          Saved on this device only. For access from another phone or computer, sign in with the same email you used to
          book, or save your booking reference below.
        </p>
      )}

      <section
        className="mt-8 rounded-2xl p-5 sm:p-6"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border-strong)',
          boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
        }}
        aria-labelledby="trip-summary-heading"
      >
        <h2 id="trip-summary-heading" className="text-sm font-bold uppercase tracking-wide text-xpx-subtle mb-4">
          Trip summary
        </h2>
        <div className="space-y-4 text-xpx-text">
          <div className="flex gap-3">
            <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-xpx-subtle">Stay</p>
              <p className="font-semibold text-lg leading-snug">{snapshot.propertyTitle}</p>
              <p className="text-sm text-xpx-muted mt-0.5">{snapshot.propertyCity}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-xpx-subtle">Dates</p>
              <p className="font-medium">
                {formatLongDate(snapshot.checkIn)} → {formatLongDate(snapshot.checkOut)}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Users className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-xpx-subtle">Guests</p>
              <p className="font-medium">
                {snapshot.numGuests} {snapshot.numGuests === 1 ? 'guest' : 'guests'}
              </p>
            </div>
          </div>
          {snapshot.includeDecoration && (
            <p className="text-sm text-xpx-muted pl-8">Decoration add-on included in your request.</p>
          )}
          <div
            className="flex flex-wrap items-baseline justify-between gap-2 pt-3 xpx-divider"
            style={{ borderTopColor: 'var(--xpx-border)' }}
          >
            <span className="text-sm font-semibold text-xpx-text">Estimated total</span>
            <span className="text-xl font-extrabold tabular-nums">₹{total.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-xpx-subtle">
            Payment status:{' '}
            <span className="font-medium text-xpx-muted">{snapshot.paymentStatus}</span>
          </p>
        </div>
      </section>

      <section
        className="mt-6 rounded-2xl p-5 sm:p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(80,200,120,0.08) 0%, var(--xpx-surface-light) 100%)',
          border: '1px solid var(--xpx-border-strong)',
        }}
        aria-labelledby="booking-ref-heading"
      >
        <h2 id="booking-ref-heading" className="text-sm font-bold text-xpx-text mb-3">
          Booking reference
        </h2>
        <p className="text-xs text-xpx-muted mb-3">Share this if you message support or your host.</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <code className="flex-1 min-w-0 break-all rounded-xl px-3 py-3 text-sm font-mono bg-white/80 border border-slate-200/80 text-xpx-text">
            {snapshot.bookingId}
          </code>
          <button
            type="button"
            onClick={copyRef}
            className="inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-xl font-semibold text-sm bg-white border border-slate-200 text-xpx-text hover:bg-slate-50 transition-colors"
            aria-label={copiedRef ? 'Reference copied' : 'Copy booking reference'}
          >
            {copiedRef ? <Check className="w-5 h-5 text-emerald-600" aria-hidden /> : <Copy className="w-5 h-5" aria-hidden />}
            {copiedRef ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>

      <section
        className="mt-6 rounded-2xl p-5 sm:p-6"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)' }}
        aria-labelledby="host-contact-heading"
      >
        <h2 id="host-contact-heading" className="text-sm font-bold uppercase tracking-wide text-xpx-subtle mb-2">
          Host contact
        </h2>
        <p className="text-sm text-xpx-muted leading-relaxed mb-4">
          {showHostDirect ? (
            <>
              Your host is{' '}
              <span className="font-semibold text-xpx-text">
                {snapshot.hostContactName ?? 'Verified Host'}
              </span>
              . Inquiry bhej di hai — seedha call ya WhatsApp karein. Usually reply kuch minutes mein.
            </>
          ) : snapshot.hostContactName ? (
            <>
              Your host is <span className="font-semibold text-xpx-text">{snapshot.hostContactName}</span>.
              Host number is saved on the device where you submitted this inquiry.
            </>
          ) : (
            <>Open this page from the same browser where you sent your inquiry, or use support below.</>
          )}
        </p>
        <div className="rounded-xl p-4 bg-slate-50 border border-slate-200/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-xpx-subtle mb-1">
            {showHostDirect ? 'Phone (host)' : 'Phone (support line)'}
          </p>
          <p className="text-lg font-bold text-xpx-text tabular-nums">
            {showHostDirect ? `+91 ${hostPhoneDisplay}` : TEAM_PHONE_DISPLAY}
          </p>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <a
            href={waHost}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-12 flex-1 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
            aria-label="Message on WhatsApp about this stay"
          >
            <MessageSquare className="w-5 h-5" aria-hidden />
            WhatsApp
          </a>
          <a
            href={showHostDirect && hostPhoneE164 ? `tel:${hostPhoneE164}` : `tel:${TEAM_PHONE_E164}`}
            className="inline-flex items-center justify-center gap-2 min-h-12 flex-1 rounded-xl font-semibold border-2 border-slate-200 text-xpx-text bg-white hover:bg-slate-50 transition-colors"
            aria-label="Call host"
          >
            <Phone className="w-5 h-5" aria-hidden />
            Call
          </a>
        </div>
      </section>

      <section
        className="mt-6 rounded-2xl p-5 sm:p-6"
        style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
        aria-labelledby="support-heading"
      >
        <div className="flex items-start gap-3">
          <LifeBuoy className="w-6 h-6 text-slate-600 flex-shrink-0 mt-0.5" aria-hidden />
          <div>
            <h2 id="support-heading" className="text-base font-bold text-xpx-text">
              Help from XpressBnB
            </h2>
            <p className="text-sm text-xpx-muted mt-1 leading-relaxed">
              Questions about your booking, changes, or something that doesn&apos;t look right? We&apos;re here.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <a
            href={mailSupport}
            className="inline-flex items-center justify-center gap-2 min-h-12 rounded-xl font-semibold border-2 border-slate-200 bg-white text-xpx-text hover:bg-slate-50 transition-colors"
            aria-label={`Email support at ${TEAM_EMAIL}`}
          >
            <Mail className="w-5 h-5 text-slate-600" aria-hidden />
            Email support
          </a>
          <a
            href={waSupport}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-12 rounded-xl font-semibold border border-slate-200 bg-slate-50 text-xpx-text hover:bg-slate-100 transition-colors"
            aria-label="WhatsApp XpressBnB support"
          >
            <MessageSquare className="w-5 h-5 text-slate-600" aria-hidden />
            WhatsApp support
          </a>
        </div>
      </section>

      <div className="mt-8">
        <button
          type="button"
          onClick={onBackHome}
          className="w-full inline-flex items-center justify-center gap-2 min-h-12 rounded-xl font-bold text-white transition-colors active:scale-[0.99]"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 8px 28px rgba(80,200,120,0.28)',
          }}
          aria-label="Back to home"
        >
          <Home className="w-5 h-5" aria-hidden />
          Back to home
        </button>
      </div>
    </div>
  );
}

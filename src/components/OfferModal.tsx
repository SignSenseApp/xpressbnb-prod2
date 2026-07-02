import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Property } from '../lib/database.types';
import { saveBookingConfirmationSnapshot } from '../lib/bookingConfirmationStorage';
import InquiryConfidenceStrip from './inquiry/InquiryConfidenceStrip';
import InquiryHoneypotField from './inquiry/InquiryHoneypotField';
import InquirySubmitTransition from './inquiry/InquirySubmitTransition';
import { normalizePhoneDigits } from '../lib/guestValidation';
import { guestEmailError } from '../lib/guestValidation';
import { submitBookingInquiry } from '../lib/inquirySubmit';
import {
  inquirySuccessPath,
  saveInquirySuccessSnapshot,
  type InquirySuccessSnapshot,
} from '../lib/inquirySuccessStorage';
import type { InquiryTransitionPhase } from '../lib/inquirySuccessMotion';
import { completeInquiryAfterSubmit } from '../lib/finishInquirySuccess';
import { navigateTo } from '../lib/navigation';
import { getDeviceFingerprint } from '../lib/deviceFingerprint';
import {
  isPushSupported,
  subscribeToInquiryPushNotifications,
} from '../lib/pushSubscription';
import {
  bucketResponseMs,
  categorizeBookingError,
  trackXpressEvent,
  type AnalyticsScope,
} from '../lib/analytics';
import { INQUIRY_SENDING_LABEL, inquiryCtaLabel } from '../lib/inquiryCopy';
import {
  buildInquiryAbusePayload,
  createInquiryFormOpenedAt,
  getInquiryCooldownRemainingMs,
  inquiryCooldownMessage,
  inquiryTooFastMessage,
  isInquiryInteractionTooFast,
  markInquirySubmitCooldown,
} from '../lib/inquiryAbuseProtection';

interface OfferModalProps {
  open: boolean;
  onClose: () => void;
  property: Property;
  /** Defaults to today / today+2 if not provided. */
  checkInDate: Date | null;
  checkOutDate: Date | null;
}

/**
 * OfferModal — guest-side "Make an Offer" experience.
 *
 * UX principles:
 *  - Conversational language ("Your fair offer", not "Submit form").
 *  - Always-visible context: the listed nightly price + how much the user
 *    is asking off, so the negotiation feels concrete.
 *  - Slider + numeric input stay in sync; both are bounded so the user
 *    can't propose unreasonable numbers (60% to 100% of list price).
 *  - On submit we record the offer as a `pending` booking with a
 *    structured `[OFFER]` prefix in special_requests so the host can see
 *    it inside their existing Bookings page without any new dashboard.
 */
export default function OfferModal({
  open,
  onClose,
  property,
  checkInDate,
  checkOutDate,
}: OfferModalProps) {
  const listPrice = property.price_per_day || property.price_full_day || 0;

  // Default offer = 10% below list, snapped to nearest ₹50.
  const defaultOffer = useMemo(
    () => Math.max(50, Math.round((listPrice * 0.9) / 50) * 50),
    [listPrice],
  );

  const [offer, setOffer] = useState<number>(defaultOffer);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const formOpenedAtRef = useRef(createInquiryFormOpenedAt());
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<InquiryTransitionPhase | null>(null);
  const pendingSuccessRef = useRef<InquirySuccessSnapshot | null>(null);
  const navigatedRef = useRef(false);

  const finishWelcome = useCallback(
    (snap: InquirySuccessSnapshot) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      setTransitionPhase(null);
      setSubmitting(false);
      onClose();
      navigateTo(inquirySuccessPath(snap));
    },
    [onClose],
  );

  const handleTransitionComplete = useCallback(() => {
    const snap = pendingSuccessRef.current;
    if (snap) finishWelcome(snap);
    else {
      setTransitionPhase(null);
      setSubmitting(false);
    }
  }, [finishWelcome]);

  const analyticsScope: AnalyticsScope = useMemo(
    () => ({
      property_id: property.id,
      property_slug: property.slug ?? undefined,
      city: property.city,
      inquiry_type: 'make_offer',
    }),
    [property.id, property.slug, property.city],
  );

  // Whenever the modal re-opens or the listing changes, reset the suggested
  // offer back to a sensible default.
  useEffect(() => {
    if (open) {
      setOffer(defaultOffer);
      setError(null);
      setTransitionPhase(null);
      pendingSuccessRef.current = null;
      navigatedRef.current = false;
      setHoneypot('');
      formOpenedAtRef.current = createInquiryFormOpenedAt();
      trackXpressEvent('booking_form_started', {
        ...analyticsScope,
        booking_step: 'details',
      });
    }
  }, [open, defaultOffer, analyticsScope]);

  if (!open) return null;

  const minOffer = Math.max(50, Math.round((listPrice * 0.6) / 50) * 50);
  const maxOffer = listPrice;
  const discountPct = listPrice > 0 ? Math.round(((listPrice - offer) / listPrice) * 100) : 0;

  const inferredNights = (() => {
    if (checkInDate && checkOutDate) {
      const ms = checkOutDate.getTime() - checkInDate.getTime();
      return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
    }
    return 2;
  })();

  const totalOffer = offer * inferredNights;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Tell us the name we should address your offer to.');
      return;
    }
    const emailErr = guestEmailError(email);
    if (emailErr) {
      if (!email.trim()) {
        setError('Share an email address where we may follow up.');
        return;
      }
      setError('That email address doesn’t look quite right — please check and try again.');
      return;
    }
    if (offer < minOffer || offer > maxOffer) {
      setError(
        `Your offer should fall between ₹${minOffer.toLocaleString()} and ₹${maxOffer.toLocaleString()} per night.`,
      );
      return;
    }
    const phoneDigits = normalizePhoneDigits(phone);
    if (phoneDigits.length !== 10) {
      setError('A mobile number helps our team reach you — please share a 10-digit number.');
      return;
    }
    const cooldownRemaining = getInquiryCooldownRemainingMs();
    if (cooldownRemaining > 0) {
      setError(inquiryCooldownMessage(cooldownRemaining));
      return;
    }
    if (isInquiryInteractionTooFast(formOpenedAtRef.current)) {
      setError(inquiryTooFastMessage());
      return;
    }
    if (honeypot.trim()) {
      setError('We couldn’t send your offer just now — please try again in a moment.');
      return;
    }

    setSubmitting(true);
    setTransitionPhase(0);
    const submitStarted = performance.now();
    trackXpressEvent('inquiry_submit_started', {
      ...analyticsScope,
      booking_step: 'send',
    });

    try {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const checkin = checkInDate ? fmt(checkInDate) : fmt(today);
    const checkout =
      checkOutDate
        ? fmt(checkOutDate)
        : fmt(new Date(today.getTime() + inferredNights * 24 * 60 * 60 * 1000));

    if (!property.host_id) {
      setError('We’re unable to reach the host for this stay — please try again shortly.');
      setSubmitting(false);
      setTransitionPhase(null);
      return;
    }

    const fingerprint = await getDeviceFingerprint();
    const abuse = buildInquiryAbusePayload(formOpenedAtRef.current, honeypot);

    const submitRes = await submitBookingInquiry({
      inquiry_type: 'make_offer',
      property_id: property.id,
      host_id: property.host_id,
      guest_name: name.trim(),
      guest_email: email.trim(),
      guest_phone: phoneDigits,
      check_in: checkin,
      check_out: checkout,
      num_guests: 1,
      offer_amount: offer,
      offer_message: message.trim() || undefined,
      form_opened_at: abuse.form_opened_at,
      company_website: abuse.company_website,
      device_fingerprint: fingerprint,
    });

    if (!submitRes.ok) {
      const errMsg = submitRes.error || 'We couldn’t send your offer just now — please try again in a moment.';
      setError(errMsg);
      trackXpressEvent('inquiry_submit_failed', {
        ...analyticsScope,
        error_category: categorizeBookingError(errMsg),
        booking_step: 'send',
        response_time_bucket: bucketResponseMs(performance.now() - submitStarted),
      });
      setSubmitting(false);
      setTransitionPhase(null);
      return;
    }

    const inquiry = submitRes.result;
    const hostContactName = inquiry.hostName ?? null;
    const hostContactPhone = inquiry.hostPhone ?? null;

    trackXpressEvent('inquiry_submit_success', {
      ...analyticsScope,
      booking_step: 'send',
      response_time_bucket: bucketResponseMs(performance.now() - submitStarted),
    });

    markInquirySubmitCooldown();

    saveBookingConfirmationSnapshot({
      v: 1,
      savedAt: Date.now(),
      bookingId: inquiry.bookingId,
      customerReference: inquiry.customerReference,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCity: property.city,
      propertySlug: property.slug ?? null,
      checkIn: checkin,
      checkOut: checkout,
      numGuests: 1,
      estimatedTotal: totalOffer,
      guestEmail: email.trim(),
      hostContactName,
      hostContactPhone,
      includeDecoration: false,
      paymentStatus: 'offer_pending',
      bookingStatus: 'inquiry_preparing',
      externalListings: property.external_listings ?? null,
      ...(inquiry.frequentAmigo
        ? {
            frequentAmigoCount: inquiry.frequentAmigo.qualifyingCount,
            frequentAmigoUnlocked: inquiry.frequentAmigo.unlocked,
            frequentAmigoThreshold: inquiry.frequentAmigo.threshold,
          }
        : {}),
    });

    const successSnapshot: InquirySuccessSnapshot = {
      v: 1,
      savedAt: Date.now(),
      variant: 'offer',
      bookingId: inquiry.bookingId,
      customerReference: inquiry.customerReference,
      guestName: name.trim(),
      guestEmail: email.trim(),
      guestPhone: phoneDigits,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCity: property.city,
      propertySlug: property.slug ?? null,
      hostId: property.host_id ?? null,
      hostContactName,
      hostContactPhone,
      checkIn: checkin,
      checkOut: checkout,
      numGuests: 1,
      estimatedTotal: totalOffer,
      ...(inquiry.frequentAmigo ? { frequentAmigo: inquiry.frequentAmigo } : {}),
    };
    saveInquirySuccessSnapshot(successSnapshot);
    pendingSuccessRef.current = successSnapshot;

    if (
      isPushSupported() &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      void subscribeToInquiryPushNotifications(
        inquiry.customerReference,
        email.trim(),
        inquiry.bookingId,
      );
    }

    navigatedRef.current = false;
    completeInquiryAfterSubmit({
      snapshot: successSnapshot,
      onPhase: setTransitionPhase,
      onNavigate: finishWelcome,
      navigatedRef,
    });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'We couldn’t send your offer just now — please try again in a moment.';
      setError(errMsg);
      trackXpressEvent('inquiry_submit_failed', {
        ...analyticsScope,
        error_category: categorizeBookingError(errMsg),
        booking_step: 'send',
      });
      setSubmitting(false);
      setTransitionPhase(null);
    }
  };


  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Private offer"
    >
      <button
        type="button"
        aria-label="Close"
        className="xpx-concierge-modal-overlay absolute inset-0"
        onClick={onClose}
      />

      <div
        className="xpx-concierge-modal relative flex w-full max-h-[92svh] flex-col overflow-hidden rounded-t-3xl sm:max-w-md sm:rounded-3xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle (mobile) — affords "this is a swipe-able sheet" to
            the user. Visible against the white sheet. */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full" style={{ background: 'rgba(15,23,42,0.18)' }} />
        </div>

        <div className="flex flex-shrink-0 items-start justify-between px-6 pt-4 pb-2">
          <div>
            <p className="xpx-lux-eyebrow">Private arrangement</p>
            <h2 className="xpx-lux-heading">Propose your offer</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="xpx-concierge-calendar-nav -m-2 p-2"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.25} />
          </button>
        </div>

        {/* Scrollable body so a tall sheet on a small phone doesn't clip the
            submit button — the form scrolls inside the sheet. */}
        <div className="overflow-y-auto overscroll-contain flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>

        <form onSubmit={handleSubmit} className="relative px-5 sm:px-6 pb-6 pt-2">
            <InquiryHoneypotField value={honeypot} onChange={setHoneypot} />
            <div className="xpx-reservation-stack">
            <div className="py-4" style={{ borderBottom: '1px solid var(--lux-divider)' }}>
              <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
                <div className="min-w-0">
                  <p className="xpx-concierge-hint">Listed rate</p>
                  <p className="mt-1 truncate text-sm tabular-nums line-through opacity-50" style={{ color: 'var(--lux-ink-muted)' }}>
                    ₹{listPrice.toLocaleString()}
                  </p>
                </div>
                <div className="min-w-0 text-center">
                  <p className="xpx-concierge-hint">Your proposal</p>
                  <p className="mt-1 text-lg font-normal leading-none tabular-nums sm:text-xl" style={{ color: 'var(--lux-ink)' }}>
                    ₹{offer.toLocaleString()}
                  </p>
                  <p className="xpx-concierge-hint mt-0.5">per night</p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="xpx-concierge-hint">Your stay</p>
                  <p className="mt-1 text-sm font-normal tabular-nums sm:text-base" style={{ color: 'var(--lux-ink)' }}>
                    ₹{totalOffer.toLocaleString()}
                  </p>
                  <p className="xpx-concierge-hint mt-0.5">{inferredNights} nights</p>
                </div>
              </div>
              {discountPct > 0 && (
                <p className="xpx-concierge-hint mt-3 text-center">
                  {discountPct}% below the listed rate
                </p>
              )}
            </div>

            <div>
              <input
                type="range"
                min={minOffer}
                max={maxOffer}
                step={50}
                value={offer}
                onChange={(e) => setOffer(Number(e.target.value))}
                aria-label="Nightly proposal"
                className="w-full accent-[var(--lux-accent)]"
              />
              <div className="mt-1 flex justify-between text-[10px] font-mono" style={{ color: 'var(--lux-ink-whisper)' }}>
                <span>₹{minOffer.toLocaleString()}</span>
                <span>₹{maxOffer.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="block">
                <span className="xpx-concierge-label">Per night</span>
                <input
                  type="number"
                  min={minOffer}
                  max={maxOffer}
                  step={50}
                  value={offer}
                  onChange={(e) => setOffer(Math.max(minOffer, Math.min(maxOffer, Number(e.target.value) || 0)))}
                  className="xpx-concierge-field"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </label>
            </div>

            <div>
              <span className="xpx-concierge-label">Duration</span>
              <p className="xpx-concierge-field flex items-center justify-between tabular-nums font-normal">
                <span>{inferredNights} {inferredNights === 1 ? 'night' : 'nights'}</span>
                <span style={{ color: 'var(--lux-ink-muted)' }}>₹{totalOffer.toLocaleString()}</span>
              </p>
            </div>

            <InquiryConfidenceStrip />

            <label className="block">
              <span className="xpx-concierge-label">Your name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="As we should address you"
                className="xpx-concierge-field"
                required
                autoComplete="name"
                autoCapitalize="words"
              />
            </label>

            <label className="block">
              <span className="xpx-concierge-label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Where we may follow up"
                className="xpx-concierge-field"
                required
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
              />
            </label>

            <label className="block">
              <span className="xpx-concierge-label">Mobile</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="xpx-concierge-field"
                required
                inputMode="numeric"
                autoComplete="tel"
              />
            </label>

            <label className="block">
              <span className="xpx-concierge-label">A note for the host <span className="font-normal text-lux-whisper">(optional)</span></span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Anniversary, work retreat, travelling with family — a line helps the host respond thoughtfully."
                className="xpx-concierge-field resize-none"
                maxLength={300}
              />
            </label>

            {error && (
              <p className="xpx-concierge-guidance" role="status" aria-live="polite">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="xpx-concierge-cta disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? INQUIRY_SENDING_LABEL : inquiryCtaLabel('offer_submit')}
            </button>

            <p className="xpx-concierge-hint text-center">
              Your host receives the proposal with your dates and note. No payment is taken now.
            </p>
            </div>
          </form>
        </div>
      </div>
      {transitionPhase !== null && (
        <InquirySubmitTransition phase={transitionPhase} onComplete={handleTransitionComplete} />
      )}
    </div>
  );
}

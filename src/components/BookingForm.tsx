import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import type { Property } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import { findPromoCode, type PromoCodeDef } from '../lib/offers';
import { buildGuestPricingQuote, getInquirySubmitAmount } from '../lib/guestPricingEngine';
import { GUEST_PRICING_NO_COMMISSION } from '../lib/guestPricingCopy';
import GuestPricingBreakdown from './pricing/GuestPricingBreakdown';
import { saveBookingConfirmationSnapshot } from '../lib/bookingConfirmationStorage';
import BookingProgressBar from './booking/BookingProgressBar';
import { BOOKING_STEP_LABELS } from './booking/bookingStepLabels';
import { guestEmailError } from '../lib/guestValidation';
import { normalizePhoneDigits } from '../lib/guestValidation';
import {
  bucketResponseMs,
  categorizeBookingError,
  trackXpressEvent,
  type AnalyticsScope,
} from '../lib/analytics';
import { orchestratedScrollTo } from '../lib/scrollOrchestrator';
import InquiryHoneypotField from './inquiry/InquiryHoneypotField';
import InquirySubmitTransition from './inquiry/InquirySubmitTransition';
import InquiryConfidenceStrip from './inquiry/InquiryConfidenceStrip';
import { submitBookingInquiry, type MarketplaceInquiryResult } from '../lib/inquirySubmit';
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
  buildInquiryAbusePayload,
  createInquiryFormOpenedAt,
  getInquiryCooldownRemainingMs,
  inquiryCooldownMessage,
  inquiryTooFastMessage,
  isInquiryInteractionTooFast,
  markInquirySubmitCooldown,
} from '../lib/inquiryAbuseProtection';
import { INQUIRY_SENDING_LABEL, inquiryCtaLabel } from '../lib/inquiryCopy';
import {
  subscribeToInquiryPushNotifications,
  isPushSupported,
} from '../lib/pushSubscription';

export type BookingFormSuccessDetail = {
  bookingId: string;
  customerReference: string;
};

interface BookingFormProps {
  property: Property;
  onSuccess: (detail: BookingFormSuccessDetail) => void;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  calculatedPrice: number;
  numGuests: number;
  onEditDates: () => void;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function ConciergeGuidance({ message }: { message: string }) {
  return (
    <p className="xpx-concierge-guidance" role="status" aria-live="polite">
      {message}
    </p>
  );
}

export default function BookingForm({
  property,
  onSuccess,
  checkInDate,
  checkOutDate,
  calculatedPrice,
  numGuests,
  onEditDates,
}: BookingFormProps) {
  const [includeDecoration, setIncludeDecoration] = useState(false);
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    special_requests: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inquirySubmittedRef = useRef(false);

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeDef | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const formOpenedAtRef = useRef(createInquiryFormOpenedAt());

  useEffect(() => {
    formOpenedAtRef.current = createInquiryFormOpenedAt();
  }, [property.id]);
  const [transitionPhase, setTransitionPhase] = useState<InquiryTransitionPhase | null>(null);
  const pendingSuccessRef = useRef<InquirySuccessSnapshot | null>(null);
  const navigatedRef = useRef(false);

  const settleSubmission = useCallback(() => {
    setTransitionPhase(null);
    setLoading(false);
  }, []);

  const finishWelcome = useCallback(
    (snap: InquirySuccessSnapshot) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      settleSubmission();
      navigateTo(inquirySuccessPath(snap));
    },
    [settleSubmission],
  );

  const handleTransitionComplete = useCallback(() => {
    const snap = pendingSuccessRef.current;
    if (snap) finishWelcome(snap);
    else settleSubmission();
  }, [finishWelcome, settleSubmission]);

  const numberOfDays = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  }, [checkInDate, checkOutDate]);
  const pricingQuote = useMemo(
    () =>
      buildGuestPricingQuote({
        property,
        accommodationSubtotal: calculatedPrice,
        nights: numberOfDays,
        numGuests,
        promo: appliedPromo,
        includeDecoration,
      }),
    [calculatedPrice, numberOfDays, numGuests, property, appliedPromo, includeDecoration],
  );
  const totalPrice = pricingQuote.guestTotal;
  const inquiryAmount = getInquirySubmitAmount(pricingQuote);
  const totalSaved =
    pricingQuote.lines
      .filter((line) => line.kind === 'discount')
      .reduce((sum, line) => sum + Math.abs(line.amount), 0);

  const analyticsScope: AnalyticsScope = useMemo(
    () => ({
      property_id: property.id,
      property_slug: property.slug ?? undefined,
      city: property.city,
      inquiry_type: 'book_pay_later',
    }),
    [property.id, property.slug, property.city],
  );

  const handleApplyPromo = () => {
    setPromoError(null);
    const promo = findPromoCode(promoInput);
    if (!promo) {
      setPromoError('That code isn’t recognised — please check and try again.');
      setAppliedPromo(null);
      return;
    }
    if (promo.minSubtotal && calculatedPrice < promo.minSubtotal) {
      setPromoError(
        `This arrangement applies to stays from ₹${promo.minSubtotal.toLocaleString()} — adjust your dates or choose another code.`,
      );
      return;
    }
    setAppliedPromo(promo);
  };

  const handleClearPromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
  };

  const validateForm = (): string | null => {
    if (!checkInDate || !checkOutDate) {
      return 'Choose your preferred arrival and departure to continue.';
    }
    if (checkOutDate <= checkInDate) {
      return 'Departure should follow your arrival — adjust your dates above.';
    }
    const emailErr = guestEmailError(formData.guest_email);
    if (emailErr) {
      if (!formData.guest_email.trim()) {
        return 'Share an email address where we may follow up.';
      }
      return 'That email address doesn’t look quite right — please check and try again.';
    }
    if (!formData.guest_name.trim()) {
      return 'Tell us the name we should address your request to.';
    }
    const phoneDigits = normalizePhoneDigits(formData.guest_phone);
    if (phoneDigits.length !== 10) {
      return 'A mobile number helps our team reach you — please share a 10-digit number.';
    }
    if (numberOfDays <= 0) {
      return 'Choose your preferred arrival and departure to continue.';
    }
    if (calculatedPrice <= 0) {
      return 'We couldn’t estimate your stay — please choose your dates again.';
    }
    if (inquiryAmount <= 0) {
      return 'We couldn’t estimate your stay — please choose your dates again.';
    }
    const cooldownRemaining = getInquiryCooldownRemainingMs();
    if (cooldownRemaining > 0) {
      return inquiryCooldownMessage(cooldownRemaining);
    }
    if (isInquiryInteractionTooFast(formOpenedAtRef.current)) {
      return inquiryTooFastMessage();
    }
    if (honeypot.trim()) {
      return 'We couldn’t send your request just now — please try again in a moment.';
    }
    return null;
  };

  const assertDatesAvailable = async (checkIn: string, checkOut: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('is_property_available', {
      p_property_id: property.id,
      p_check_in: checkIn,
      p_check_out: checkOut,
    });

    if (error) throw error;

    return Boolean(data);
  };

  const completeInquiry = (
    inquiry: MarketplaceInquiryResult,
    checkIn: string,
    checkOut: string,
  ) => {
    inquirySubmittedRef.current = true;
    markInquirySubmitCooldown();

    const hostContactName = inquiry.hostName ?? null;
    const hostContactPhone = inquiry.hostPhone ?? null;

    saveBookingConfirmationSnapshot({
      v: 1,
      savedAt: Date.now(),
      bookingId: inquiry.bookingId,
      customerReference: inquiry.customerReference,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCity: property.city,
      propertySlug: property.slug ?? null,
      checkIn,
      checkOut,
      numGuests: numGuests,
      estimatedTotal: inquiryAmount,
      guestEmail: formData.guest_email,
      hostContactName,
      hostContactPhone,
      includeDecoration,
      paymentStatus: 'inquiry',
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
      variant: 'booking',
      bookingId: inquiry.bookingId,
      customerReference: inquiry.customerReference,
      guestName: formData.guest_name.trim(),
      guestEmail: formData.guest_email.trim(),
      guestPhone: normalizePhoneDigits(formData.guest_phone),
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCity: property.city,
      propertySlug: property.slug ?? null,
      hostId: property.host_id ?? null,
      hostContactName,
      hostContactPhone,
      checkIn,
      checkOut,
      numGuests,
      estimatedTotal: inquiryAmount,
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
        formData.guest_email.trim(),
        inquiry.bookingId,
      );
    }

    onSuccess({ bookingId: inquiry.bookingId, customerReference: inquiry.customerReference });

    navigatedRef.current = false;
    completeInquiryAfterSubmit({
      snapshot: successSnapshot,
      onPhase: setTransitionPhase,
      onNavigate: finishWelcome,
      navigatedRef,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      trackXpressEvent('inquiry_submit_failed', {
        ...analyticsScope,
        error_category: categorizeBookingError(validationError),
        booking_step: 'send',
      });
      return;
    }

    if (!checkInDate || !checkOutDate) return;

    setLoading(true);
    setTransitionPhase(0);
    const submitStarted = performance.now();
    trackXpressEvent('inquiry_submit_started', {
      ...analyticsScope,
      booking_step: 'send',
    });
    const checkIn = formatDate(checkInDate);
    const checkOut = formatDate(checkOutDate);

    try {
      const available = await assertDatesAvailable(checkIn, checkOut);
      if (!available) {
        setErrorMessage(
          'Those dates may no longer be available — please choose another arrival.',
        );
        trackXpressEvent('inquiry_submit_failed', {
          ...analyticsScope,
          error_category: 'availability',
          booking_step: 'send',
          response_time_bucket: bucketResponseMs(performance.now() - submitStarted),
        });
        setLoading(false);
        setTransitionPhase(null);
        return;
      }

      const fingerprint = await getDeviceFingerprint();
      const abuse = buildInquiryAbusePayload(formOpenedAtRef.current, honeypot);

      if (!property.host_id) {
        setErrorMessage(
          'We’re unable to reach the host for this stay — please try again shortly.',
        );
        setLoading(false);
        setTransitionPhase(null);
        return;
      }

      const submitRes = await submitBookingInquiry({
        inquiry_type: 'book_pay_later',
        property_id: property.id,
        host_id: property.host_id,
        guest_name: formData.guest_name.trim(),
        guest_email: formData.guest_email.trim(),
        guest_phone: normalizePhoneDigits(formData.guest_phone),
        check_in: checkIn,
        check_out: checkOut,
        num_guests: numGuests,
        amount_total: inquiryAmount,
        total_price: inquiryAmount,
        nights: numberOfDays,
        special_requests: formData.special_requests.trim() || undefined,
        include_decoration: includeDecoration,
        form_opened_at: abuse.form_opened_at,
        company_website: abuse.company_website,
        device_fingerprint: fingerprint,
      });

      if (!submitRes.ok) {
        const userMsg = submitRes.error;
        setErrorMessage(userMsg);
        trackXpressEvent('inquiry_submit_failed', {
          ...analyticsScope,
          error_category: categorizeBookingError(userMsg),
          booking_step: 'send',
          response_time_bucket: bucketResponseMs(performance.now() - submitStarted),
        });
        setLoading(false);
        setTransitionPhase(null);
        return;
      }

      const inquiry = submitRes.result;

      trackXpressEvent('inquiry_submit_success', {
        ...analyticsScope,
        booking_step: 'send',
        response_time_bucket: bucketResponseMs(performance.now() - submitStarted),
      });
      if (new URLSearchParams(window.location.search).get('nearby')) {
        trackXpressEvent('nearby_booking_completed', {
          ...analyticsScope,
          booking_step: 'send',
        });
      }

      completeInquiry(inquiry, checkIn, checkOut);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Booking error:', error);
      const errMsg =
        error instanceof Error
          ? error.message
          : 'We couldn’t send your request just now — please try again in a moment.';
      setErrorMessage(errMsg);
      trackXpressEvent('inquiry_submit_failed', {
        property_id: property.id,
        property_slug: property.slug ?? undefined,
        city: property.city,
        inquiry_type: 'book_pay_later',
        error_category: categorizeBookingError(errMsg),
        booking_step: 'send',
      });
      setLoading(false);
      setTransitionPhase(null);
    }
  };

  const guestCap = Math.max(1, property.max_guests || 1);
  const safeGuestCount = Math.min(Math.max(1, numGuests), guestCap);
  const hasDates = Boolean(checkInDate && checkOutDate);
  const hasDetails = Boolean(
    formData.guest_name.trim() && formData.guest_email.trim() && formData.guest_phone.trim(),
  );

  const prevGuestsStepRef = useRef(false);
  useEffect(() => {
    if (hasDetails && !prevGuestsStepRef.current) {
      orchestratedScrollTo('booking_contact', { skipIfVisible: true, highlight: true });
    }
    prevGuestsStepRef.current = hasDetails;
  }, [hasDetails]);

  useEffect(() => {
    const onAbandon = () => {
      if (inquirySubmittedRef.current || loading || transitionPhase !== null) return;
      if (!hasDates && !hasDetails) return;
      const step = !hasDates ? 'dates' : !hasDetails ? 'contact' : 'send';
      trackXpressEvent('booking_abandonment', {
        ...analyticsScope,
        abandonment_step: step,
      });
    };
    window.addEventListener('pagehide', onAbandon);
    return () => window.removeEventListener('pagehide', onAbandon);
  }, [analyticsScope, hasDates, hasDetails, loading, transitionPhase]);

  const bookingStep = hasDetails ? 4 : hasDates ? 3 : 1;

  return (
    <>
    <form
      onSubmit={handleSubmit}
      className="relative max-w-full overflow-x-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <InquiryHoneypotField value={honeypot} onChange={setHoneypot} />
      <BookingProgressBar currentStep={bookingStep} labels={[...BOOKING_STEP_LABELS]} />

      {checkInDate && checkOutDate && (
        <div
          className="flex items-center justify-between gap-3 py-4"
          style={{ borderBottom: '1px solid var(--lux-divider)' }}
        >
          <div className="min-w-0">
            <p className="xpx-concierge-stay-summary-label">Your stay</p>
            <p className="mt-1 text-sm font-normal leading-snug" style={{ color: 'var(--lux-ink)' }}>
              <span className="sr-only">Arrival </span>
              {checkInDate.toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}
              <span aria-hidden> → </span>
              <span className="sr-only">Departure </span>
              {checkOutDate.toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <p className="xpx-concierge-hint mt-1">
              {numberOfDays} {numberOfDays === 1 ? 'night' : 'nights'} · {safeGuestCount}{' '}
              {safeGuestCount === 1 ? 'traveller' : 'travellers'}
            </p>
          </div>
          <button
            type="button"
            onClick={onEditDates}
            className="xpx-lux-link shrink-0 text-sm"
          >
            Change dates
          </button>
        </div>
      )}

      <InquiryConfidenceStrip className="mt-6" />

      <div className="xpx-reservation-stack mt-8" id="booking-step-contact">
        <div>
          <label className="xpx-concierge-label" htmlFor="inquiry-guest-name">
            Your name
          </label>
          <input
            id="inquiry-guest-name"
            type="text"
            required
            value={formData.guest_name}
            onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
            className="xpx-concierge-field"
            placeholder="As we should address you"
            autoComplete="name"
          />
        </div>

        <div>
          <label className="xpx-concierge-label" htmlFor="inquiry-guest-email">
            Email
          </label>
          <input
            id="inquiry-guest-email"
            type="email"
            required
            value={formData.guest_email}
            onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
            className="xpx-concierge-field"
            placeholder="Where we may follow up"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="xpx-concierge-label" htmlFor="inquiry-guest-phone">
            Mobile
          </label>
          <input
            id="inquiry-guest-phone"
            type="tel"
            required
            inputMode="numeric"
            autoComplete="tel"
            value={formData.guest_phone}
            onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
            className="xpx-concierge-field"
            placeholder="10-digit mobile"
          />
          <p className="xpx-concierge-hint mt-2">
            So a member of our team can reach you about your stay.
          </p>
        </div>
      </div>

      <div className="xpx-reservation-stack mt-8" style={{ borderTop: '1px solid var(--lux-divider)', paddingTop: '2rem' }}>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={includeDecoration}
            onChange={(e) => setIncludeDecoration(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-lux-divider text-lux-accent focus:ring-lux-accent"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-normal" style={{ color: 'var(--lux-ink)' }}>
                Celebration arrangement
              </span>
              <span className="ml-auto text-sm tabular-nums" style={{ color: 'var(--lux-ink-muted)' }}>
                ₹2,000
              </span>
            </div>
            <p className="xpx-concierge-hint mt-1">
              Balloons, banners, and a themed setup for your occasion.
            </p>
          </div>
        </label>

        <div>
          <label className="xpx-concierge-label" htmlFor="inquiry-special-requests">
            Special requests <span className="font-normal text-lux-whisper">(optional)</span>
          </label>
          <textarea
            id="inquiry-special-requests"
            value={formData.special_requests}
            onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
            rows={4}
            className="xpx-concierge-field resize-none"
            placeholder="Dietary needs, arrival time, celebrations — anything we should know."
          />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="xpx-concierge-label mb-0">Private arrangement code</span>
            {appliedPromo && (
              <button
                type="button"
                onClick={handleClearPromo}
                className="xpx-lux-link text-xs"
              >
                Remove
              </button>
            )}
          </div>
          {appliedPromo ? (
            <p className="xpx-concierge-whisper">
              <span className="font-medium tabular-nums">{appliedPromo.code}</span> —{' '}
              {appliedPromo.label}
            </p>
          ) : (
            <div className="flex items-stretch gap-3">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="If you have one"
                className="xpx-concierge-field min-w-0 flex-1 uppercase tracking-wide"
              />
              <button type="button" onClick={handleApplyPromo} className="xpx-lux-link shrink-0">
                Apply
              </button>
            </div>
          )}
          {promoError && (
            <p className="xpx-concierge-guidance" role="status">
              {promoError}
            </p>
          )}
        </div>

        <div>
          <p className="xpx-concierge-label">Your stay</p>
          {numberOfDays > 0 && pricingQuote.guestTotal > 0 ? (
            <>
              <GuestPricingBreakdown
                lines={pricingQuote.lines}
                guestTotal={pricingQuote.guestTotal}
              />
              {totalSaved > 0 && (
                <p className="xpx-concierge-hint mt-3 text-right tabular-nums">
                  Arrangement saves ₹{totalSaved.toLocaleString('en-IN')}
                </p>
              )}
            </>
          ) : (
            <p className="xpx-concierge-hint flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.25} aria-hidden />
              Choose arrival and departure above to see your estimated stay.
            </p>
          )}
        </div>
      </div>

      {errorMessage && <ConciergeGuidance message={errorMessage} />}

      <div
        className="sticky bottom-0 z-10 -mx-1 mt-8 px-1 pt-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        style={{ background: 'var(--lux-base)' }}
        id="booking-step-submit"
      >
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="xpx-concierge-cta disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? INQUIRY_SENDING_LABEL : inquiryCtaLabel('form_submit')}
        </button>
        <p className="xpx-concierge-hint mt-3 text-center">
          We’ll review availability personally. {GUEST_PRICING_NO_COMMISSION}
        </p>
      </div>
    </form>
    {transitionPhase !== null && (
      <InquirySubmitTransition phase={transitionPhase} onComplete={handleTransitionComplete} />
    )}
    </>
  );
}

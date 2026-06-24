import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Mail,
  User,
  MessageSquare,
  Sparkles,
  Tag,
  X,
  Loader2,
} from 'lucide-react';
import type { Property } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import { applyDiscounts, findPromoCode, type PromoCodeDef } from '../lib/offers';
import { calculateBookingTotal } from '../lib/pricingUtils';
import { saveBookingConfirmationSnapshot } from '../lib/bookingConfirmationStorage';
import { parseInquirySubmitResult, type FrequentAmigoStatus } from '../lib/inquiryHostContact';
import GuestPhoneOtpStep from './GuestPhoneOtpStep';
import BookingProgressBar from './booking/BookingProgressBar';
import { BOOKING_STEP_LABELS } from './booking/bookingStepLabels';
import type { BookingOtpVerifyResult } from '../lib/bookingOtp';
import { normalizePhoneDigits } from '../lib/bookingOtp';
import {
  bucketResponseMs,
  categorizeBookingError,
  trackXpressEvent,
  type AnalyticsScope,
} from '../lib/analytics';
import { orchestratedScrollTo } from '../lib/scrollOrchestrator';

export type BookingFormSuccessDetail = { bookingId: string };

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

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="mt-3 rounded-xl border px-4 py-3 text-sm font-medium"
      style={{
        background: 'rgba(254,242,242,0.9)',
        borderColor: 'rgba(254,202,202,0.9)',
        color: '#991B1B',
      }}
      role="alert"
    >
      {message}
    </div>
  );
}

function BookingStepLabels({
  currentStep,
  phoneVerified,
}: {
  currentStep: number;
  phoneVerified: boolean;
}) {
  const steps = BOOKING_STEP_LABELS.map((label, index) => {
    const n = index + 1;
    const done = n < currentStep || (n === BOOKING_STEP_LABELS.length && phoneVerified);
    const active = n === currentStep && !done;
    return { n, label, active, done };
  });

  return (
    <p
      className="text-[11px] font-semibold tracking-wide text-xpx-subtle text-center"
      aria-label="Booking steps"
    >
      {steps.map((step, i) => (
        <span key={step.n}>
          {i > 0 ? <span className="mx-1.5 text-xpx-border-strong">·</span> : null}
          <span
            className={
              step.done
                ? 'text-emerald-700'
                : step.active
                  ? 'text-xpx-text'
                  : 'text-xpx-subtle'
            }
          >
            {step.n} {step.label}
          </span>
        </span>
      ))}
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
  const [phoneVerification, setPhoneVerification] = useState<BookingOtpVerifyResult | null>(
    null,
  );

  const numberOfDays = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  }, [checkInDate, checkOutDate]);
  const decorationPrice = includeDecoration ? 2000 : 0;

  const discountResult = useMemo(
    () => applyDiscounts(calculatedPrice, property, appliedPromo),
    [calculatedPrice, property, appliedPromo],
  );
  const feePricing = useMemo(
    () => calculateBookingTotal(calculatedPrice, numberOfDays, numGuests, property),
    [calculatedPrice, numberOfDays, numGuests, property],
  );
  const totalDiscounts = discountResult.propertyDiscount + discountResult.promoDiscount;
  const totalPrice = feePricing.grandTotal - totalDiscounts + decorationPrice;
  const totalSaved = discountResult.propertyDiscount + discountResult.promoDiscount;

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
      setPromoError('Invalid promo code.');
      setAppliedPromo(null);
      return;
    }
    if (promo.minSubtotal && calculatedPrice < promo.minSubtotal) {
      setPromoError(
        `This code requires a subtotal of at least ₹${promo.minSubtotal.toLocaleString()}.`,
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
      return 'Please select check-in and check-out dates from the calendar above.';
    }
    if (checkOutDate <= checkInDate) {
      return 'Check-out must be after check-in.';
    }
    if (!formData.guest_name.trim() || !formData.guest_email.trim() || !formData.guest_phone.trim()) {
      return 'Please fill all fields';
    }
    const phoneDigits = normalizePhoneDigits(formData.guest_phone);
    if (phoneDigits.length !== 10) {
      return 'Please enter a valid 10-digit phone number';
    }
    if (totalPrice <= 0) {
      return 'Invalid booking total. Please reselect your dates.';
    }
    if (!phoneVerification) {
      return 'Please verify your mobile number with the OTP sent by SMS';
    }
    if (phoneVerification.phoneDigits !== normalizePhoneDigits(formData.guest_phone)) {
      return 'Phone number changed — verify again before sending your inquiry';
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
    bookingId: string,
    checkIn: string,
    checkOut: string,
    hostName: string,
    hostPhone: string,
    amigo?: FrequentAmigoStatus,
  ) => {
    inquirySubmittedRef.current = true;

    saveBookingConfirmationSnapshot({
      v: 1,
      savedAt: Date.now(),
      bookingId,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyCity: property.city,
      propertySlug: property.slug ?? null,
      checkIn,
      checkOut,
      numGuests: numGuests,
      estimatedTotal: totalPrice,
      guestEmail: formData.guest_email,
      hostContactName: hostName,
      hostContactPhone: hostPhone,
      includeDecoration,
      paymentStatus: 'inquiry',
      bookingStatus: 'pending_host',
      externalListings: property.external_listings ?? null,
      ...(amigo
        ? {
            frequentAmigoCount: amigo.qualifyingCount,
            frequentAmigoUnlocked: amigo.unlocked,
            frequentAmigoThreshold: amigo.threshold,
          }
        : {}),
    });

    setLoading(false);
    trackXpressEvent('inquiry_success', {
      ...analyticsScope,
      inquiry_type: 'book_pay_later',
      booking_step: 'complete',
    });
    onSuccess({ bookingId });
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
        setErrorMessage('Booking unavailable');
        trackXpressEvent('inquiry_submit_failed', {
          ...analyticsScope,
          error_category: 'availability',
          booking_step: 'send',
          response_time_bucket: bucketResponseMs(performance.now() - submitStarted),
        });
        setLoading(false);
        return;
      }

      const { data: rpcData, error: insertError } = await supabase.rpc('create_pending_booking', {
        p_property_id: property.id,
        p_host_id: property.host_id,
        p_guest_name: formData.guest_name.trim(),
        p_guest_email: formData.guest_email.trim(),
        p_guest_phone: normalizePhoneDigits(formData.guest_phone),
        p_check_in: checkIn,
        p_check_out: checkOut,
        p_num_guests: numGuests,
        p_amount_total: totalPrice,
        p_total_price: totalPrice,
        p_nights: numberOfDays,
        p_otp_verification_token: phoneVerification.verificationToken,
        p_special_requests: formData.special_requests.trim() || null,
        p_include_decoration: includeDecoration,
      });

      if (insertError) {
        if (import.meta.env.DEV) console.error('Booking insert error:', insertError);
        const msg = insertError.message?.toLowerCase() ?? '';
        let userMsg: string;
        if (msg.includes('booking unavailable')) {
          userMsg = 'Booking unavailable';
        } else if (msg.includes('column') || insertError.code === 'PGRST204') {
          userMsg =
            'Booking could not be saved (database schema mismatch). Run the latest Supabase migrations and try again.';
        } else {
          userMsg = `Failed to create booking: ${insertError.message}`;
        }
        setErrorMessage(userMsg);
        trackXpressEvent('inquiry_submit_failed', {
          ...analyticsScope,
          error_category: categorizeBookingError(userMsg),
          booking_step: 'send',
          response_time_bucket: bucketResponseMs(performance.now() - submitStarted),
        });
        setLoading(false);
        return;
      }

      const inquiry = parseInquirySubmitResult(rpcData);
      if (!inquiry) {
        const hostLoadMsg =
          'Inquiry saved, but host contact could not be loaded. Please open your confirmation link or try again.';
        setErrorMessage(hostLoadMsg);
        trackXpressEvent('inquiry_submit_failed', {
          ...analyticsScope,
          error_category: 'host_contact',
          booking_step: 'send',
          response_time_bucket: bucketResponseMs(performance.now() - submitStarted),
        });
        setLoading(false);
        return;
      }

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

      completeInquiry(
        inquiry.bookingId,
        checkIn,
        checkOut,
        inquiry.hostName,
        inquiry.hostPhone,
        inquiry.frequentAmigo,
      );
    } catch (error) {
      if (import.meta.env.DEV) console.error('Booking error:', error);
      const errMsg =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
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
    if (hasDetails && !phoneVerification && !prevGuestsStepRef.current) {
      orchestratedScrollTo('booking_otp', { skipIfVisible: true, highlight: true });
    }
    prevGuestsStepRef.current = hasDetails;
  }, [hasDetails, phoneVerification]);

  const prevVerifiedRef = useRef(false);
  useEffect(() => {
    if (phoneVerification && !prevVerifiedRef.current) {
      trackXpressEvent('booking_step_completed', {
        ...analyticsScope,
        booking_step: 'verify',
      });
    }
    prevVerifiedRef.current = Boolean(phoneVerification);
  }, [phoneVerification, analyticsScope]);

  useEffect(() => {
    const onAbandon = () => {
      if (inquirySubmittedRef.current || loading) return;
      if (!hasDates && !hasDetails && !phoneVerification) return;
      const step = !hasDates
        ? 'dates'
        : !hasDetails
          ? 'contact'
          : !phoneVerification
            ? 'otp'
            : 'send';
      trackXpressEvent('booking_abandonment', {
        ...analyticsScope,
        abandonment_step: step,
      });
    };
    window.addEventListener('pagehide', onAbandon);
    return () => window.removeEventListener('pagehide', onAbandon);
  }, [analyticsScope, hasDates, hasDetails, loading, phoneVerification]);

  const bookingStep = phoneVerification
    ? 4
    : hasDetails
      ? 4
      : hasDates
        ? 3
        : 1;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 max-w-full overflow-x-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <BookingProgressBar currentStep={bookingStep} labels={[...BOOKING_STEP_LABELS]} />
      <BookingStepLabels
        currentStep={bookingStep}
        phoneVerified={Boolean(phoneVerification)}
      />

      {checkInDate && checkOutDate && (
        <div
          className="rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3"
          style={{
            background: 'var(--xpx-surface-light)',
            border: '1px solid var(--xpx-border)',
          }}
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-xpx-text leading-snug">
              {checkInDate.toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}
              {' → '}
              {checkOutDate.toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <p className="text-xs text-xpx-muted mt-0.5">
              {numberOfDays} {numberOfDays === 1 ? 'night' : 'nights'} · {safeGuestCount}{' '}
              {safeGuestCount === 1 ? 'guest' : 'guests'}
            </p>
          </div>
          <button
            type="button"
            onClick={onEditDates}
            className="shrink-0 text-xs font-semibold text-xpx-text underline underline-offset-2 hover:text-xpx-warm-dark px-3 py-2 min-h-[44px] min-w-[44px]"
          >
            Edit dates
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="booking-step-contact">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-xpx-subtle mb-2">
            <User className="w-3.5 h-3.5 inline mr-1" aria-hidden />
            Full name
          </label>
          <input
            type="text"
            required
            value={formData.guest_name}
            onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
            className="xpx-input"
            placeholder="Your name"
            autoComplete="name"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-xpx-subtle mb-2">
            <Mail className="w-3.5 h-3.5 inline mr-1" aria-hidden />
            Email
          </label>
          <input
            type="email"
            required
            value={formData.guest_email}
            onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
            className="xpx-input"
            placeholder="you@email.com"
            autoComplete="email"
          />
        </div>

        <div className="md:col-span-2" id="booking-step-otp">
          <GuestPhoneOtpStep
            phone={formData.guest_phone}
            onPhoneChange={(guest_phone) => setFormData({ ...formData, guest_phone })}
            verified={phoneVerification}
            onVerified={setPhoneVerification}
            onClearVerification={() => setPhoneVerification(null)}
            disabled={loading}
            analyticsScope={analyticsScope}
          />
        </div>
      </div>

      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includeDecoration}
            onChange={(e) => setIncludeDecoration(e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded border-xpx-border text-emerald-600 focus:ring-emerald-500"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" aria-hidden />
              <span className="font-bold text-xpx-text text-sm">Decoration add-on</span>
              <span className="ml-auto text-base font-bold text-xpx-text tabular-nums">₹2,000</span>
            </div>
            <p className="text-xs text-xpx-muted leading-relaxed">
              Balloons, banners, and themed setup for your occasion.
            </p>
          </div>
        </label>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-xpx-subtle mb-2">
          <MessageSquare className="w-3.5 h-3.5 inline mr-1" aria-hidden />
          Special requests <span className="normal-case font-medium text-xpx-muted">(optional)</span>
        </label>
        <textarea
          value={formData.special_requests}
          onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
          rows={3}
          className="xpx-input resize-none"
          placeholder="Anything the host should know?"
        />
      </div>

      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-xpx-text text-sm">Promo code</h4>
          {appliedPromo && (
            <button
              type="button"
              onClick={handleClearPromo}
              className="text-xs font-semibold text-xpx-muted hover:text-xpx-text inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
              Remove
            </button>
          )}
        </div>
        {appliedPromo ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 flex items-start gap-3">
            <Tag className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" aria-hidden />
            <div className="text-sm text-emerald-900 min-w-0">
              <p className="font-semibold">
                <span className="font-mono">{appliedPromo.code}</span> applied
              </p>
              <p className="text-xs">{appliedPromo.label}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1 min-w-0">
              <Tag
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-xpx-subtle"
                aria-hidden
              />
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="WELCOME10"
                className="xpx-input pl-9 uppercase tracking-wide text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyPromo}
              className="shrink-0 px-4 py-2.5 rounded-xl border border-xpx-border-strong text-sm font-semibold text-xpx-text hover:bg-xpx-surface-light transition-colors"
            >
              Apply
            </button>
          </div>
        )}
        {promoError && <p className="mt-2 text-xs text-red-600">{promoError}</p>}
      </div>

      <div
        className="rounded-2xl p-4 sm:p-5"
        style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
      >
        <h4 className="font-bold text-xpx-text text-sm mb-3">Price summary</h4>
        <div className="space-y-2.5 text-sm">
          {numberOfDays > 0 && (
            <div className="flex justify-between items-center gap-3">
              <span className="text-xpx-muted">
                Stay ({numberOfDays} {numberOfDays === 1 ? 'night' : 'nights'})
              </span>
              <span className="font-semibold text-xpx-text tabular-nums shrink-0">
                ₹{calculatedPrice.toLocaleString('en-IN')}
              </span>
            </div>
          )}
          {discountResult.propertyDiscount > 0 && (
            <div className="flex justify-between items-center text-emerald-700 gap-3">
              <span className="flex items-center gap-1.5 min-w-0">
                <Tag className="w-3.5 h-3.5 shrink-0" aria-hidden />
                Property offer
              </span>
              <span className="font-semibold tabular-nums shrink-0">
                −₹{discountResult.propertyDiscount.toLocaleString('en-IN')}
              </span>
            </div>
          )}
          {discountResult.promoDiscount > 0 && (
            <div className="flex justify-between items-center text-emerald-700 gap-3">
              <span className="flex items-center gap-1.5 min-w-0">
                <Tag className="w-3.5 h-3.5 shrink-0" aria-hidden />
                Promo {discountResult.promoCodeApplied}
              </span>
              <span className="font-semibold tabular-nums shrink-0">
                −₹{discountResult.promoDiscount.toLocaleString('en-IN')}
              </span>
            </div>
          )}
          {includeDecoration && (
            <div className="flex justify-between items-center gap-3">
              <span className="text-xpx-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden />
                Decoration
              </span>
              <span className="font-semibold text-xpx-text tabular-nums shrink-0">
                ₹{decorationPrice.toLocaleString('en-IN')}
              </span>
            </div>
          )}
          <div
            className="pt-3 flex justify-between items-baseline gap-3"
            style={{ borderTop: '1px solid var(--xpx-border)' }}
          >
            <span className="text-xpx-text font-bold">Total</span>
            <span className="text-2xl font-extrabold text-xpx-text tabular-nums shrink-0">
              ₹{totalPrice.toLocaleString('en-IN')}
            </span>
          </div>
          {totalSaved > 0 && numberOfDays > 0 && (
            <p className="text-xs font-semibold text-emerald-700 text-right">
              You save ₹{totalSaved.toLocaleString('en-IN')}
            </p>
          )}
        </div>
        {numberOfDays === 0 && (
          <p className="text-xs text-xpx-muted mt-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden />
            Select dates above to see pricing
          </p>
        )}
      </div>

      {errorMessage && <ErrorBanner message={errorMessage} />}

      <div className="sticky bottom-0 z-10 -mx-1 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[var(--xpx-surface)] via-[var(--xpx-surface)] to-transparent" id="booking-step-submit">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl font-bold text-[15px] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 motion-reduce:transition-none"
          style={{ background: 'var(--xpx-cta)', minHeight: 52 }}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
              Sending inquiry…
            </>
          ) : (
            'Send booking inquiry'
          )}
        </button>
        <p className="text-[11px] text-xpx-subtle text-center mt-2 leading-relaxed">
          No online payment on this step. Host confirms availability and coordinates payment
          directly.
        </p>
      </div>
    </form>
  );
}

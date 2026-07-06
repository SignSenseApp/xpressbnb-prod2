import { useMemo } from 'react';
import { Tag, Users, Sparkles } from 'lucide-react';
import type { Property } from '../../lib/database.types';
import BookingCalendar from '../BookingCalendar';
import { computeOffer } from '../../lib/offers';
import { buildGuestPricingQuote } from '../../lib/guestPricingEngine';
import {
  GUEST_PRICING_INQUIRY_TOTAL_NOTE,
  GUEST_PRICING_NIGHTLY_HINT,
  GUEST_PRICING_TRIP_HINT,
} from '../../lib/guestPricingCopy';
import GuestPricingBreakdown from '../pricing/GuestPricingBreakdown';
import { inquiryCtaLabel } from '../../lib/inquiryCopy';
import PropertyTrustNotes from './PropertyTrustNotes';

interface PropertySidebarProps {
  property: Property;
  /** Date range / nightly total provided by the calendar inside the sidebar. */
  checkIn: Date | null;
  checkOut: Date | null;
  nightlyTotal: number;
  onDateRangeSelect: (checkIn: Date | null, checkOut: Date | null, total: number) => void;
  /** Guest count — controlled by the property page (single source of truth). */
  numGuests: number;
  onGuestsChange: (guests: number) => void;
  /** True when check-in and check-out are selected and valid. */
  hasValidDates: boolean;
  /** Primary CTA when dates are missing — scrolls to the calendar. */
  onCheckAvailability: () => void;
  /** Primary CTA when dates are set — opens the booking form. */
  onRequestToBook: () => void;
  /** Hide primary booking CTA while the inquiry form is open. */
  hideBookingCtas?: boolean;
  /** Opens the existing OfferModal with a "make an offer" prefill. */
  onMakeOffer: () => void;
  /** WELCOME10-style promo pill copy (passed in so the page controls the
   *  exact promo it wants to surface here). */
  promoCode: string | null;
  promoLabel: string | null;
  /** From hero search URL — seed calendar + guest count */
  initialCalendarCheckIn?: string | null;
  initialCalendarCheckOut?: string | null;
  initialTripGuests?: number;
}

/**
 * Booking sidebar.
 *
 * Renders the price card, promo pill, calendar, guests dropdown, an
 * itemised price breakdown and inquiry CTAs (Check availability / Send inquiry +
 * "Make an Offer"). On desktop it lives in a sticky column to the right
 * of the main content; on mobile it stacks at the bottom of the content
 * flow and the page also surfaces a fixed bottom action bar that scrolls
 * to this sidebar.
 *
 * Crucially: this component DOES NOT mutate booking state on its own. It
 * just calls back into the page-level handlers, so the existing booking
 * pipeline (BookingForm + Supabase insert) stays unchanged.
 */
export default function PropertySidebar({
  property,
  checkIn,
  checkOut,
  nightlyTotal,
  onDateRangeSelect,
  numGuests,
  onGuestsChange,
  hasValidDates,
  onCheckAvailability,
  onRequestToBook,
  hideBookingCtas = false,
  onMakeOffer,
  promoCode,
  promoLabel,
  initialCalendarCheckIn,
  initialCalendarCheckOut,
}: PropertySidebarProps) {
  const basePrice = property.price_per_day || property.price_full_day || 0;
  const offer = computeOffer(property, basePrice);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(
      1,
      Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    );
  }, [checkIn, checkOut]);

  const quote = useMemo(
    () =>
      buildGuestPricingQuote({
        property,
        accommodationSubtotal: nightlyTotal,
        nights,
        numGuests,
      }),
    [nightlyTotal, nights, numGuests, property],
  );

  return (
    <div
      className="rounded-3xl p-5 sm:p-6 lg:max-h-none"
      style={{
        background: 'var(--xpx-surface)',
        border: '1px solid var(--xpx-border-strong)',
        boxShadow: 'var(--xpx-shadow-floating)',
      }}
    >
      {/* Headline price */}
      <div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl sm:text-[34px] font-extrabold text-xpx-text leading-none tabular-nums">
            ₹{(offer.discountAmount > 0 ? offer.finalPrice : basePrice).toLocaleString('en-IN')}
          </span>
          {offer.discountAmount > 0 && (
            <span className="text-base text-xpx-subtle line-through tabular-nums">
              ₹{basePrice.toLocaleString('en-IN')}
            </span>
          )}
          <span className="text-sm text-xpx-muted">/ night</span>
        </div>
        <p className="text-[11px] text-xpx-subtle mt-1">
          {nights > 0 ? GUEST_PRICING_TRIP_HINT(nights) : GUEST_PRICING_NIGHTLY_HINT}
        </p>
      </div>

      {/* Promo pill — sourced from offers.ts WELCOME10 by default. */}
      {promoCode && (
        <div
          className="mt-4 rounded-xl p-3 flex items-start gap-2.5"
          style={{
            background:
              'linear-gradient(120deg, var(--xpx-accent-a18) 0%, var(--xpx-accent-a12) 60%, var(--xpx-surface-light) 100%)',
            border: '1px solid var(--xpx-accent-a32)',
          }}
        >
          <div
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--xpx-accent-a12)', color: 'var(--accent-dark)' }}
          >
            <Tag className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs leading-snug">
            <span className="font-bold tabular-nums" style={{ color: 'var(--accent-dark)' }}>
              {promoCode}
            </span>{' '}
            <span className="text-xpx-text font-semibold">— {promoLabel}.</span>
            <span className="text-xpx-muted"> Apply when you send your inquiry.</span>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="mt-4" id="booking-step-calendar">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-xpx-subtle mb-2">
          Book your stay
        </p>
        <BookingCalendar
          propertyId={property.id}
          basePrice={basePrice}
          onDateRangeSelect={onDateRangeSelect}
          initialCheckIn={initialCalendarCheckIn ?? undefined}
          initialCheckOut={initialCalendarCheckOut ?? undefined}
        />
      </div>

      {/* Guests dropdown — limited to property.max_guests. */}
      <div className="mt-4" id="booking-step-guests">
        <label className="block text-[11px] uppercase tracking-[0.18em] font-bold text-xpx-subtle mb-2">
          Guests
        </label>
        <div className="relative">
          <Users
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-xpx-subtle pointer-events-none"
          />
          <select
            value={numGuests}
            onChange={(e) => onGuestsChange(Number(e.target.value))}
            className="xpx-input pl-9 cursor-pointer"
            aria-label="Number of guests"
          >
            {Array.from({ length: Math.max(1, property.max_guests || 1) }, (_, i) => i + 1).map(
              (n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Guest' : 'Guests'}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Price breakdown — only renders once the user has selected dates so
          we never display a blank itemised list. */}
      {nights > 0 && quote.guestTotal > 0 && (
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--xpx-border)' }}>
          <GuestPricingBreakdown lines={quote.lines} guestTotal={quote.guestTotal} />
        </div>
      )}

      {!hideBookingCtas && (
        <>
          <button
            type="button"
            onClick={hasValidDates ? onRequestToBook : onCheckAvailability}
            className="xpx-btn-primary mt-5 w-full rounded-2xl py-3.5 text-[15px] touch-manipulation"
            style={{ minHeight: 52 }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              {hasValidDates
                ? inquiryCtaLabel('property_with_dates')
                : inquiryCtaLabel('property_no_dates')}
            </span>
          </button>

          <button
            type="button"
            onClick={onMakeOffer}
            className="mt-2.5 w-full py-3 rounded-2xl font-semibold text-sm text-xpx-text transition-colors motion-reduce:transition-none motion-reduce:active:scale-100 active:scale-[0.98]"
            style={{
              background: 'var(--xpx-surface)',
              border: '1px solid var(--xpx-border-strong)',
              minHeight: 48,
            }}
          >
            Make an Offer
          </button>
        </>
      )}

      <p
        className="mt-3 text-[11px] text-xpx-subtle text-center leading-snug px-1"
      >
        Share your dates and contact details to send a request. {GUEST_PRICING_INQUIRY_TOTAL_NOTE}
      </p>
      <PropertyTrustNotes className="mt-3 px-1" />

      {/* When the user hasn't picked dates yet, give a soft prompt so the
          empty breakdown doesn't read as "broken". */}
      {nights === 0 && (
        <p className="mt-2 text-[11px] text-center text-xpx-muted">
          Select check-in &amp; check-out above to see the full price breakdown.
        </p>
      )}
    </div>
  );
}

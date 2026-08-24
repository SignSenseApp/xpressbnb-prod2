import { useMemo } from 'react';
import { Tag, Users, Clock, MessageCircle, BadgePercent, ChevronDown } from 'lucide-react';
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
import { formatBookingDate } from '../../lib/formatBookingDate';
import PropertyTrustNotes from './PropertyTrustNotes';

interface PropertySidebarProps {
  property: Property;
  checkIn: Date | null;
  checkOut: Date | null;
  nightlyTotal: number;
  onDateRangeSelect: (checkIn: Date | null, checkOut: Date | null, total: number) => void;
  numGuests: number;
  onGuestsChange: (guests: number) => void;
  hasValidDates: boolean;
  onCheckAvailability: () => void;
  onRequestToBook: () => void;
  hideBookingCtas?: boolean;
  onMakeOffer: () => void;
  promoCode: string | null;
  promoLabel: string | null;
  initialCalendarCheckIn?: string | null;
  initialCalendarCheckOut?: string | null;
  initialTripGuests?: number;
}

/**
 * Sticky booking sidebar — Stripe-level pricing clarity.
 * Presentation-only; all booking state lives on PropertyPage.
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
      Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
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

  const scrollToCalendar = () => {
    document.getElementById('booking-step-calendar')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  };

  const displayNightly = offer.discountAmount > 0 ? offer.finalPrice : basePrice;
  const stripeNightly =
    nights > 0 && nightlyTotal > 0 ? Math.round(nightlyTotal / nights) : displayNightly;

  return (
    <div className="xpx-property-sidebar-v2 rounded-2xl p-5 sm:p-6 lg:max-h-none">
      {/* Headline price */}
      <div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-3xl sm:text-[34px] font-extrabold text-xpx-text leading-none tabular-nums">
            ₹{displayNightly.toLocaleString('en-IN')}
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

      {/* Date + guest picker */}
      <div
        className="mt-4 rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--xpx-border-strong)' }}
      >
        <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--xpx-border)' }}>
          <button
            type="button"
            onClick={scrollToCalendar}
            className="px-4 py-3 text-left hover:bg-slate-50 transition-colors touch-manipulation"
            style={{ borderColor: 'var(--xpx-border)' }}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide text-xpx-subtle">
              Check-in
            </span>
            <span className="block mt-0.5 text-sm font-semibold text-xpx-text tabular-nums">
              {checkIn ? formatBookingDate(checkIn) : 'Add date'}
            </span>
          </button>
          <button
            type="button"
            onClick={scrollToCalendar}
            className="px-4 py-3 text-left hover:bg-slate-50 transition-colors touch-manipulation"
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide text-xpx-subtle">
              Check-out
            </span>
            <span className="block mt-0.5 text-sm font-semibold text-xpx-text tabular-nums">
              {checkOut ? formatBookingDate(checkOut) : 'Add date'}
            </span>
          </button>
        </div>
        <div className="border-t" style={{ borderColor: 'var(--xpx-border)' }} id="booking-step-guests">
          <label htmlFor="property-sidebar-guests" className="block px-4 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-xpx-subtle">
            Guests
          </label>
          <div className="relative">
            <Users
              className="absolute left-4 top-[calc(50%+4px)] -translate-y-1/2 w-4 h-4 text-xpx-subtle pointer-events-none"
            />
            <select
              id="property-sidebar-guests"
              value={numGuests}
              onChange={(e) => onGuestsChange(Number(e.target.value))}
              className="w-full pl-10 pr-9 pb-3 pt-0.5 text-sm font-semibold text-xpx-text bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] cursor-pointer appearance-none"
              aria-label="Number of guests"
            >
              {Array.from({ length: Math.max(1, property.max_guests || 1) }, (_, i) => i + 1).map(
                (n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'guest' : 'guests'}
                  </option>
                ),
              )}
            </select>
            <ChevronDown
              className="absolute right-3 top-[calc(50%+4px)] -translate-y-1/2 w-4 h-4 text-xpx-subtle pointer-events-none"
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* Price breakdown — Stripe clarity */}
      {nights > 0 && quote.guestTotal > 0 && (
        <div className="mt-5">
          <GuestPricingBreakdown
            lines={quote.lines}
            guestTotal={quote.guestTotal}
            variant="stripe"
            nights={nights}
            averageNightlyInr={stripeNightly}
          />
        </div>
      )}

      {/* Calendar */}
      <div className="mt-5" id="booking-step-calendar">
        <BookingCalendar
          propertyId={property.id}
          basePrice={basePrice}
          onDateRangeSelect={onDateRangeSelect}
          initialCheckIn={initialCalendarCheckIn ?? undefined}
          initialCheckOut={initialCalendarCheckOut ?? undefined}
        />
      </div>

      {!hideBookingCtas && (
        <>
          <button
            type="button"
            onClick={hasValidDates ? onRequestToBook : onCheckAvailability}
            className="xpx-btn-primary xpx-property-inquiry-cta mt-5 w-full rounded-xl py-3.5 text-[15px] touch-manipulation hover:scale-100"
            style={{ minHeight: 52 }}
          >
            {hasValidDates
              ? inquiryCtaLabel('property_with_dates')
              : inquiryCtaLabel('property_no_dates')}
          </button>

          <button
            type="button"
            onClick={onMakeOffer}
            className="mt-2.5 w-full py-3 rounded-2xl font-semibold text-sm text-xpx-text transition-colors motion-reduce:transition-none motion-reduce:active:scale-100 active:scale-[0.98] hover:bg-slate-50"
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

      <ul className="mt-4 flex flex-col gap-1.5 text-[11px] text-xpx-muted">
        <li className="inline-flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 shrink-0 text-emerald-700" aria-hidden />
          Ops reviews inquiries
        </li>
        <li className="inline-flex items-center gap-2">
          <MessageCircle className="w-3.5 h-3.5 shrink-0 text-emerald-700" aria-hidden />
          Host responds directly
        </li>
        <li className="inline-flex items-center gap-2">
          <BadgePercent className="w-3.5 h-3.5 shrink-0 text-emerald-700" aria-hidden />
          Zero guest commission
        </li>
      </ul>

      <p className="mt-3 text-[11px] text-xpx-subtle text-center leading-snug px-1">
        Share your dates and contact details to send a request. {GUEST_PRICING_INQUIRY_TOTAL_NOTE}
      </p>
      <PropertyTrustNotes className="mt-3 px-1 hidden lg:block" />

      {nights === 0 && (
        <p className="mt-2 text-[11px] text-center text-xpx-muted">
          Select check-in &amp; check-out above to see the full price breakdown.
        </p>
      )}
    </div>
  );
}

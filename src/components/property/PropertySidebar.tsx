import { useMemo } from 'react';
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
 * Concierge column — reservation desk for the property page.
 * Visual only; all booking state flows through page-level handlers.
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

  const displayPrice = offer.discountAmount > 0 ? offer.finalPrice : basePrice;

  return (
    <aside className="xpx-concierge lg:max-h-none" aria-label="Your stay">
      <p className="xpx-lux-eyebrow">Your stay</p>
      <h2 className="xpx-lux-heading">Plan your stay</h2>

      <div className="xpx-lux-section-body">
        <div>
          <p className="xpx-concierge-price-label">From</p>
          <p className="xpx-concierge-price-amount">
            ₹{displayPrice.toLocaleString('en-IN')}
            {offer.discountAmount > 0 && (
              <span className="xpx-concierge-price-strike">
                ₹{basePrice.toLocaleString('en-IN')}
              </span>
            )}
          </p>
          <p className="xpx-concierge-price-unit">per night</p>
          <p className="xpx-concierge-hint">
            {nights > 0 ? GUEST_PRICING_TRIP_HINT(nights) : GUEST_PRICING_NIGHTLY_HINT}
          </p>
        </div>

        {promoCode && (
          <p className="xpx-concierge-promo-whisper">
            {promoLabel ? `${promoLabel} · ` : ''}
            <span className="tabular-nums">{promoCode}</span> — mention when you send your request.
          </p>
        )}

        <div className="xpx-concierge-section" id="booking-step-calendar">
          <label className="xpx-concierge-label" htmlFor="concierge-calendar-region">
            Arrival &amp; departure
          </label>
          <div id="concierge-calendar-region">
            <BookingCalendar
              propertyId={property.id}
              basePrice={basePrice}
              onDateRangeSelect={onDateRangeSelect}
              initialCheckIn={initialCalendarCheckIn ?? undefined}
              initialCheckOut={initialCalendarCheckOut ?? undefined}
            />
          </div>
        </div>

        <div className="xpx-concierge-section" id="booking-step-guests">
          <label className="xpx-concierge-label" htmlFor="concierge-travellers">
            Travellers
          </label>
          <select
            id="concierge-travellers"
            value={numGuests}
            onChange={(e) => onGuestsChange(Number(e.target.value))}
            className="xpx-concierge-field xpx-concierge-select"
            aria-label="Number of travellers"
          >
            {Array.from({ length: Math.max(1, property.max_guests || 1) }, (_, i) => i + 1).map(
              (n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'traveller' : 'travellers'}
                </option>
              ),
            )}
          </select>
        </div>

        {nights > 0 && quote.guestTotal > 0 && (
          <div className="xpx-concierge-section">
            <hr className="xpx-concierge-divider" />
            <p className="xpx-concierge-label">Your stay</p>
            <GuestPricingBreakdown lines={quote.lines} guestTotal={quote.guestTotal} />
          </div>
        )}

        {!hideBookingCtas && (
          <div className="xpx-concierge-section space-y-3">
            <button
              type="button"
              onClick={hasValidDates ? onRequestToBook : onCheckAvailability}
              className="xpx-concierge-cta"
            >
              {hasValidDates
                ? inquiryCtaLabel('property_with_dates')
                : inquiryCtaLabel('property_no_dates')}
            </button>
            <button type="button" onClick={onMakeOffer} className="xpx-concierge-link w-full">
              Propose a private offer
            </button>
          </div>
        )}

        <p className="xpx-concierge-whisper mt-5 leading-relaxed">
          {GUEST_PRICING_INQUIRY_TOTAL_NOTE}
        </p>
        <PropertyTrustNotes className="mt-3" />

        {nights === 0 && (
          <p className="xpx-concierge-hint mt-3 text-center">
            Choose arrival and departure to see your estimated stay.
          </p>
        )}
      </div>
    </aside>
  );
}

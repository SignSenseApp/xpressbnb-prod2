import { useMemo, useState } from 'react';
import { Tag, Users, Shield, Sparkles } from 'lucide-react';
import type { Property } from '../../lib/database.types';
import BookingCalendar from '../BookingCalendar';
import { computeOffer } from '../../lib/offers';
import { computeFeeBreakdown } from '../../config/propertyDefaults';

interface PropertySidebarProps {
  property: Property;
  /** Date range / nightly total provided by the calendar inside the sidebar. */
  checkIn: Date | null;
  checkOut: Date | null;
  nightlyTotal: number;
  onDateRangeSelect: (checkIn: Date | null, checkOut: Date | null, total: number) => void;
  /** Primary CTA — restyled wrapper around the existing booking flow. */
  onBookNow: () => void;
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
 * itemised price breakdown and the two CTAs ("Book Now & Pay Later" +
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
  onBookNow,
  onMakeOffer,
  promoCode,
  promoLabel,
  initialCalendarCheckIn,
  initialCalendarCheckOut,
  initialTripGuests,
}: PropertySidebarProps) {
  const basePrice = property.price_per_day || property.price_full_day || 0;
  const offer = computeOffer(property, basePrice);

  const maxG = Math.max(1, property.max_guests || 1);
  const [guests, setGuests] = useState<number>(() =>
    Math.min(initialTripGuests != null ? initialTripGuests : 2, maxG)
  );

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(
      1,
      Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    );
  }, [checkIn, checkOut]);

  const breakdown = useMemo(
    () => computeFeeBreakdown(nightlyTotal, nights),
    [nightlyTotal, nights]
  );

  return (
    <div
      className="rounded-3xl p-5 sm:p-6"
      style={{
        background: 'var(--xpx-surface)',
        border: '1px solid var(--xpx-border-strong)',
        boxShadow: '0 18px 56px rgba(15,23,42,0.10)',
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
          Starting price (extra charges may apply)
        </p>
      </div>

      {/* Promo pill — sourced from offers.ts WELCOME10 by default. */}
      {promoCode && (
        <div
          className="mt-4 rounded-xl p-3 flex items-start gap-2.5"
          style={{
            background:
              'linear-gradient(120deg, rgba(80,200,120,0.18) 0%, rgba(80,200,120,0.06) 60%, var(--xpx-surface-light) 100%)',
            border: '1px solid rgba(80,200,120,0.36)',
          }}
        >
          <div
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(80,200,120,0.12)', color: 'var(--accent-dark)' }}
          >
            <Tag className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs leading-snug">
            <span className="font-bold tabular-nums" style={{ color: 'var(--accent-dark)' }}>
              {promoCode}
            </span>{' '}
            <span className="text-xpx-text font-semibold">— {promoLabel}.</span>
            <span className="text-xpx-muted"> Apply at checkout.</span>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-xpx-subtle mb-2">
          Check availability
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
      <div className="mt-4">
        <label className="block text-[11px] uppercase tracking-[0.18em] font-bold text-xpx-subtle mb-2">
          Guests
        </label>
        <div className="relative">
          <Users
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-xpx-subtle pointer-events-none"
          />
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
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
      {nights > 0 && (
        <dl
          className="mt-5 pt-5 space-y-2 text-sm"
          style={{ borderTop: '1px solid var(--xpx-border)' }}
        >
          <div className="flex justify-between">
            <dt className="text-xpx-muted">
              ₹{Math.round(nightlyTotal / nights).toLocaleString('en-IN')} × {nights}{' '}
              {nights === 1 ? 'night' : 'nights'}
            </dt>
            <dd className="text-xpx-text font-medium tabular-nums">
              ₹{breakdown.nightlyTotal.toLocaleString('en-IN')}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xpx-muted">Cleaning fee</dt>
            <dd className="text-xpx-text font-medium tabular-nums">
              ₹{breakdown.cleaningFee.toLocaleString('en-IN')}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xpx-muted">Service fee</dt>
            <dd className="text-xpx-text font-medium tabular-nums">
              ₹{breakdown.serviceFee.toLocaleString('en-IN')}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xpx-muted">Taxes</dt>
            <dd className="text-xpx-text font-medium tabular-nums">
              ₹{breakdown.taxes.toLocaleString('en-IN')}
            </dd>
          </div>
          <div
            className="pt-3 mt-3 flex justify-between text-base"
            style={{ borderTop: '1px solid var(--xpx-border)' }}
          >
            <dt className="text-xpx-text font-bold">Total</dt>
            <dd className="text-xpx-text font-extrabold tabular-nums">
              ₹{breakdown.total.toLocaleString('en-IN')}
            </dd>
          </div>
        </dl>
      )}

      {/* Primary CTA → wraps the existing booking flow. */}
      <button
        type="button"
        onClick={onBookNow}
        className="mt-5 w-full py-3.5 rounded-2xl font-bold text-[15px] text-white transition-transform active:scale-[0.98]"
        style={{
          background: 'var(--xpx-cta)',
          boxShadow: '0 10px 32px rgba(255,56,92,0.32)',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          minHeight: 52,
        }}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          Request to book
        </span>
      </button>

      {/* Secondary CTA — opens the existing OfferModal. */}
      <button
        type="button"
        onClick={onMakeOffer}
        className="mt-2.5 w-full py-3 rounded-2xl font-semibold text-sm text-xpx-text transition-colors active:scale-[0.98]"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border-strong)',
          minHeight: 48,
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        Make an Offer
      </button>

      <p
        className="mt-3 text-[11px] text-xpx-subtle text-center inline-flex items-center justify-center gap-1.5 w-full"
      >
        <Shield className="w-3 h-3" style={{ color: 'var(--accent-dark)' }} />
        Send an inquiry — no online payment on this step. Host confirms directly.
      </p>

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

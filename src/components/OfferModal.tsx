import { useEffect, useMemo, useState } from 'react';
import { X, Tag, MessageCircle, Mail, User, ArrowDown, CheckCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import type { Property } from '../lib/database.types';

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
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Whenever the modal re-opens or the listing changes, reset the suggested
  // offer back to a sensible default.
  useEffect(() => {
    if (open) {
      setOffer(defaultOffer);
      setError(null);
      setSuccess(false);
    }
  }, [open, defaultOffer]);

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

    if (!name.trim() || !email.trim()) {
      setError('Please share your name and email so the host can reply.');
      return;
    }
    if (offer < minOffer || offer > maxOffer) {
      setError(`Offer must be between ₹${minOffer.toLocaleString()} and ₹${maxOffer.toLocaleString()} per night.`);
      return;
    }

    setSubmitting(true);

    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const checkin = checkInDate ? fmt(checkInDate) : fmt(today);
    const checkout =
      checkOutDate
        ? fmt(checkOutDate)
        : fmt(new Date(today.getTime() + inferredNights * 24 * 60 * 60 * 1000));

    // Record the offer as a pending booking with a structured prefix so the
    // host's existing Bookings page surfaces it without any new UI.
    const offerNote = `[OFFER ₹${offer}/night × ${inferredNights} nights = ₹${totalOffer.toLocaleString()}] ${
      message.trim() ? `Message: ${message.trim()}` : ''
    }`.trim();

    const offerInsert = {
      property_id: property.id,
      host_id: property.host_id,
      guest_name: name.trim(),
      guest_email: email.trim(),
      guest_phone: '',
      check_in_date: checkin,
      check_out_date: checkout,
      checkin,
      checkout,
      num_guests: 1,
      booking_type: 'full_day' as const,
      amount_total: totalOffer,
      total_price: totalOffer,
      status: 'pending' as const,
      payment_status: 'offer_pending',
      special_requests: offerNote,
      source: 'xpressbnb',
    };

    const { error: insertError } = await supabase.from('bookings').insert(offerInsert);

    if (insertError) {
      console.error('Offer insert failed', insertError);
      setError(insertError.message || 'Could not send your offer. Please try again.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSuccess(true);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Make an offer"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in-up"
        onClick={onClose}
      />

      <div
        // svh respects mobile browser chrome; max-h prevents the sheet from
        // ever pushing past the viewport. Inner form scrolls within.
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-sheet-up sm:animate-fade-in-up"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.18)',
          maxHeight: '92svh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle (mobile) — affords "this is a swipe-able sheet" to
            the user. Visible against the white sheet. */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden flex-shrink-0">
          <div className="w-12 h-1.5 rounded-full" style={{ background: 'rgba(15,23,42,0.18)' }} />
        </div>

        <div className="flex items-start justify-between px-6 pt-4 pb-2 flex-shrink-0">
          <div>
            <p className="xpx-eyebrow">Open to negotiation</p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight mt-1">
              Make your offer
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 rounded-full text-xpx-muted hover:text-xpx-text hover:bg-slate-100 active:scale-90 transition-transform"
            style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body so a tall sheet on a small phone doesn't clip the
            submit button — the form scrolls inside the sheet. */}
        <div className="overflow-y-auto overscroll-contain flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>

        {success ? (
          <div className="px-6 pb-6 pt-4 space-y-5 text-center">
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{ background: 'rgba(80,200,120,0.12)', border: '1px solid rgba(80,200,120,0.4)' }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: '#3dae68' }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-xpx-text">Offer sent</h3>
              <p className="text-sm text-xpx-muted mt-1">
                The host typically replies within an hour. We&apos;ll email you at{' '}
                <span className="text-xpx-text font-semibold">{email}</span> with their response.
              </p>
            </div>
            <div
              className="rounded-2xl p-4 text-left"
              style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
            >
              <div className="flex justify-between text-sm">
                <span className="text-xpx-muted">Your offer</span>
                <span className="font-bold text-xpx-text">
                  ₹{offer.toLocaleString()}/night
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-xpx-muted">Total ({inferredNights} {inferredNights === 1 ? 'night' : 'nights'})</span>
                <span className="font-bold" style={{ color: theme.accentDark }}>
                  ₹{totalOffer.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl font-bold transition-all"
              style={{ background: theme.accent, color: '#ffffff', boxShadow: '0 8px 24px rgba(80,200,120,0.32)' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 sm:px-6 pb-6 pt-2 space-y-5">
            {/* Listed vs Your offer comparison.
                On the smallest widths the labels could collide — switch to a
                single column stack below 360px (custom Tailwind class via min-w). */}
            <div
              className="rounded-2xl p-4"
              style={{
                background:
                  'linear-gradient(135deg, rgba(80,200,120,0.10) 0%, var(--xpx-surface-light) 100%)',
                border: '1px solid rgba(80,200,120,0.28)',
              }}
            >
              {/* Listed | Offered | Total — three stat columns, comfortable
                  even on a 320px phone because we use gap-2 + min-w-0. */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 items-end">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wide text-xpx-muted font-semibold">Listed</p>
                  <p className="mt-1 text-sm sm:text-base font-semibold text-xpx-text line-through opacity-70 truncate">
                    ₹{listPrice.toLocaleString()}
                  </p>
                </div>
                <div className="min-w-0 text-center">
                  <p className="xpx-eyebrow text-[10px] sm:text-[11px]">Offered</p>
                  <p className="mt-1 text-lg sm:text-2xl font-extrabold text-xpx-text leading-none truncate">
                    ₹{offer.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-xpx-subtle mt-0.5">/night</p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-[10px] sm:text-xs uppercase tracking-wide text-xpx-muted font-semibold">Total</p>
                  <p className="mt-1 text-sm sm:text-base font-extrabold truncate" style={{ color: theme.accentDark }}>
                    ₹{totalOffer.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-xpx-subtle mt-0.5">{inferredNights}n</p>
                </div>
              </div>
              {discountPct > 0 && (
                <div
                  className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: 'rgba(80,200,120,0.12)',
                    color: '#3dae68',
                    border: '1px solid rgba(80,200,120,0.32)',
                  }}
                >
                  <ArrowDown className="w-3 h-3" />
                  {discountPct}% below list
                </div>
              )}
            </div>

            {/* Slider — keeps the experience tactile */}
            <div>
              <input
                type="range"
                min={minOffer}
                max={maxOffer}
                step={50}
                value={offer}
                onChange={(e) => setOffer(Number(e.target.value))}
                aria-label="Offer per night"
                className="w-full accent-[var(--accent)]"
              />
              <div className="mt-1 flex justify-between text-[10px] text-xpx-subtle font-mono">
                <span>₹{minOffer.toLocaleString()}</span>
                <span>₹{maxOffer.toLocaleString()}</span>
              </div>
            </div>

            {/* Numeric input + nights summary */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
                  Per night (₹)
                </span>
                <input
                  type="number"
                  min={minOffer}
                  max={maxOffer}
                  step={50}
                  value={offer}
                  onChange={(e) => setOffer(Math.max(minOffer, Math.min(maxOffer, Number(e.target.value) || 0)))}
                  className="xpx-input"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </label>
              <div>
                <span className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
                  For
                </span>
                <div
                  className="rounded-xl px-4 py-3 text-sm text-xpx-text flex items-center justify-between"
                  style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
                >
                  <span>{inferredNights} {inferredNights === 1 ? 'night' : 'nights'}</span>
                  <span className="font-bold" style={{ color: theme.accentDark }}>
                    ₹{totalOffer.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
                  Your name
                </span>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-xpx-subtle" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aarav Mehta"
                    className="xpx-input pl-9"
                    required
                    autoComplete="name"
                    autoCapitalize="words"
                  />
                </div>
              </label>
              <label className="block">
                <span className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
                  Email
                </span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-xpx-subtle" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="xpx-input pl-9"
                    required
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                  />
                </div>
              </label>
            </div>

            {/* Optional message — quietly humanizes the offer */}
            <label className="block">
              <span className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
                Note to host (optional)
              </span>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-3 w-4 h-4 text-xpx-subtle" />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="A line about your stay helps hosts say yes — anniversary, work trip, group of 4, etc."
                  className="xpx-input pl-9 resize-none"
                  maxLength={300}
                />
              </div>
            </label>

            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: theme.accent,
                color: '#ffffff',
                boxShadow: '0 8px 32px rgba(80,200,120,0.32)',
              }}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {submitting ? 'Sending…' : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Send offer to host
                  </>
                )}
              </span>
            </button>

            <p className="text-[11px] text-xpx-subtle text-center">
              <Tag className="w-3 h-3 inline mr-1" />
              Hosts see your offer with the dates and message. No payment is taken yet.
            </p>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}

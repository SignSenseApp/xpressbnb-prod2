import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, MessageCircle, Tag, X } from 'lucide-react';
import { theme } from '../lib/theme';

interface CounterOfferDialogProps {
  open: boolean;
  onClose: () => void;
  /** The price the guest originally proposed, per night. */
  guestOfferPerNight: number;
  /** The original list price per night (used for sanity bounds + framing). */
  listPricePerNight: number;
  /** How many nights the guest asked for. */
  nights: number;
  /** Submit handler — parent does the Supabase write. */
  onSubmit: (counterPerNight: number, hostMessage: string) => Promise<void>;
}

/**
 * CounterOfferDialog — host-side counter-proposal sheet.
 *
 * UX intent:
 *  - Always anchor on the guest's number so the host sees what they're
 *    counter-ing against.
 *  - Suggest a default counter halfway between guest offer and list price
 *    (gives both parties a believable middle ground to start from).
 *  - Bound the counter between guest's offer and full list price; the host
 *    can't go higher than list (that defeats the negotiation), can't go
 *    lower than the guest's offer (because then they should just accept).
 */
export default function CounterOfferDialog({
  open,
  onClose,
  guestOfferPerNight,
  listPricePerNight,
  nights,
  onSubmit,
}: CounterOfferDialogProps) {
  const min = guestOfferPerNight;
  const max = Math.max(listPricePerNight, guestOfferPerNight);
  const suggested = useMemo(() => {
    const mid = Math.round(((min + max) / 2) / 50) * 50;
    return Math.max(min, Math.min(max, mid));
  }, [min, max]);

  const [counter, setCounter] = useState(suggested);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCounter(suggested);
      setError(null);
      setMessage('');
    }
  }, [open, suggested]);

  if (!open) return null;

  const totalCounter = counter * nights;
  const aboveGuest = counter - guestOfferPerNight;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (counter < min || counter > max) {
      setError(
        `Counter must be between ₹${min.toLocaleString()} (guest offer) and ₹${max.toLocaleString()} (list price).`,
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(counter, message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send counter.';
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Counter offer"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fade-in-up"
        onClick={onClose}
      />

      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-sheet-up sm:animate-fade-in-up"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.18)',
          maxHeight: '92svh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full" style={{ background: 'rgba(15,23,42,0.18)' }} />
        </div>

        <div className="flex items-start justify-between px-6 pt-4 pb-2">
          <div>
            <p className="xpx-eyebrow">Counter the offer</p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight mt-1">
              Propose a new price
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 rounded-full text-xpx-muted hover:text-xpx-text hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 sm:px-6 pb-6 pt-2 space-y-5">
          {/* Negotiation framing */}
          <div
            className="rounded-2xl p-4"
            style={{
              background:
                'linear-gradient(135deg, rgba(244,162,97,0.10) 0%, var(--xpx-surface-light) 100%)',
              border: '1px solid rgba(244,162,97,0.28)',
            }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-xpx-muted">Guest&apos;s offer</span>
              <span className="font-semibold text-xpx-text">
                ₹{guestOfferPerNight.toLocaleString()}/night
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-xpx-muted">Your list price</span>
              <span className="font-semibold text-xpx-text">
                ₹{listPricePerNight.toLocaleString()}/night
              </span>
            </div>
            <div className="my-3 xpx-divider" />
            <div className="flex items-center justify-between">
              <span className="xpx-eyebrow">Your counter</span>
              <span className="text-2xl font-extrabold text-xpx-text">
                ₹{counter.toLocaleString()}
                <span className="text-sm font-medium text-xpx-muted">/night</span>
              </span>
            </div>
            {aboveGuest > 0 && (
              <p className="mt-1 text-[11px] text-xpx-subtle">
                ₹{aboveGuest.toLocaleString()} above guest&apos;s offer ·{' '}
                <span className="font-semibold" style={{ color: theme.warmDark }}>
                  ₹{totalCounter.toLocaleString()} total
                </span>{' '}
                for {nights} {nights === 1 ? 'night' : 'nights'}
              </p>
            )}
          </div>

          {/* Slider + numeric */}
          <div>
            <input
              type="range"
              min={min}
              max={max}
              step={50}
              value={counter}
              onChange={(e) => setCounter(Number(e.target.value))}
              aria-label="Counter offer per night"
              className="w-full accent-[var(--xpx-warm)]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-xpx-subtle font-mono">
              <span>₹{min.toLocaleString()}</span>
              <span>₹{max.toLocaleString()}</span>
            </div>
          </div>

          <label className="block">
            <span className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
              Per night (₹)
            </span>
            <input
              type="number"
              min={min}
              max={max}
              step={50}
              value={counter}
              onChange={(e) =>
                setCounter(Math.max(min, Math.min(max, Number(e.target.value) || 0)))
              }
              className="xpx-input"
            />
          </label>

          <label className="block">
            <span className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
              Message to guest (optional)
            </span>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-3 w-4 h-4 text-xpx-subtle" />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Quick note on why this price works for you, what's included, or alternative dates."
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
              background: theme.warm,
              color: '#ffffff',
              boxShadow: '0 8px 32px rgba(244,162,97,0.32)',
            }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {submitting ? 'Sending counter…' : (
                <>
                  <Tag className="w-4 h-4" />
                  Send counter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </span>
          </button>

          <p className="text-[11px] text-xpx-subtle text-center">
            We&apos;ll email the guest. They can accept, decline, or counter back.
          </p>
        </form>
      </div>
    </div>
  );
}

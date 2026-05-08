import { Tag, Sparkles } from 'lucide-react';
import type { Property } from '../lib/database.types';
import { computeOffer, listFeaturedPromoCodes } from '../lib/offers';
import { theme } from '../lib/theme';

interface OfferBannerProps {
  property: Property;
  className?: string;
}

/**
 * OfferBanner — promo strip above the price summary. Soft warm/emerald
 * gradients on the new light surface; the warm accent stays the brand
 * anchor.
 */
export default function OfferBanner({ property, className = '' }: OfferBannerProps) {
  const base = property.price_per_day || property.price_full_day || 0;
  const offer = computeOffer(property, base);
  const featuredPromo = listFeaturedPromoCodes()[0];

  if (offer.discountAmount > 0) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl p-4 ${className}`}
        style={{
          background:
            'linear-gradient(120deg, rgba(80,200,120,0.10) 0%, rgba(80,200,120,0.05) 60%, var(--xpx-surface-light) 100%)',
          border: '1px solid rgba(80,200,120,0.32)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ background: 'rgba(80,200,120,0.14)', color: '#50C878' }}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold tracking-[0.18em] uppercase" style={{ color: '#50C878' }}>
              Limited time
            </p>
            <p className="mt-0.5 text-sm font-semibold text-xpx-text">
              {offer.label} — save ₹{offer.discountAmount.toLocaleString()} per night
            </p>
            <p className="mt-0.5 text-xs text-xpx-muted">
              Discount auto-applied at checkout. Combine with promo code for extra savings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!featuredPromo) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 ${className}`}
      style={{
        background:
          'linear-gradient(120deg, rgba(80,200,120,0.12) 0%, rgba(80,200,120,0.04) 60%, var(--xpx-surface-light) 100%)',
        border: '1px solid rgba(80,200,120,0.35)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: 'rgba(80,200,120,0.14)', color: theme.accent }}
        >
          <Tag className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold tracking-[0.18em] uppercase" style={{ color: theme.accent }}>
            Offer available
          </p>
          <p className="mt-0.5 text-sm font-semibold text-xpx-text">
            Use code{' '}
            <span
              className="font-mono px-1.5 py-0.5 rounded-md"
              style={{
                background: 'rgba(80,200,120,0.12)',
                border: '1px solid rgba(80,200,120,0.35)',
                color: '#3dae68',
              }}
            >
              {featuredPromo.code}
            </span>{' '}
            — {featuredPromo.label}
          </p>
          <p className="mt-0.5 text-xs text-xpx-muted">
            Apply your promo code in the booking form. Minimum subtotal ₹
            {(featuredPromo.minSubtotal ?? 0).toLocaleString()}.
          </p>
        </div>
      </div>
    </div>
  );
}

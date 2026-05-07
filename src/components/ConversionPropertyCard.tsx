import { MapPin, Star, Heart, CheckCircle, Shield, Clock } from 'lucide-react';
import type { Property } from '../lib/database.types';
import { theme } from '../lib/theme';

interface ConversionPropertyCardProps {
  property: Property;
}

/**
 * ConversionPropertyCard — light card used in city listings.
 * Mirrors the FeaturedCard look on the homepage so users feel they're
 * inside one product, not three. White surface, soft shadow, busy-photo
 * gradient at the bottom of the image keeps top-pinned text legible.
 */
export default function ConversionPropertyCard({ property }: ConversionPropertyCardProps) {
  const handleClick = () => {
    window.history.pushState({}, '', `/property/${property.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Single primary marketing badge — picks the most distinguishing trait.
  const primaryBadge = property.hourly_stay_available
    ? { label: 'Hourly Stay', color: '#2563EB' }
    : property.is_private_space
    ? { label: 'Private Space', color: '#50C878' }
    : property.instant_booking
    ? { label: 'Instant Book', color: theme.accent }
    : null;

  const price = (property.price_per_day || property.price_full_day || 0).toLocaleString();

  return (
    <article
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick();
      }}
      className="cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] group focus:outline-none focus:ring-2 focus:ring-[var(--accent)] xpx-tap"
      style={{
        background: 'var(--xpx-surface)',
        border: '1px solid var(--xpx-border)',
        boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
      }}
    >
      {/* Image */}
      <div className="relative h-44 sm:h-52 overflow-hidden" style={{ background: 'var(--xpx-surface-light)' }}>
        {property.images?.[0] ? (
          <img
            src={property.images[0]}
            alt={property.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xpx-subtle text-sm">
            No image
          </div>
        )}

        {/* Bottom gradient for legibility on busy photos */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.45) 100%)',
          }}
        />

        {/* Wishlist */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(15,23,42,0.12)' }}
          aria-label="Save"
        >
          <Heart className="w-4 h-4" style={{ color: theme.accent }} fill={theme.accent} />
        </button>

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {property.is_couple_friendly && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                background: theme.accentLight,
                color: '#22c55e',
                border: `1px solid ${theme.accentBorder}`,
              }}
            >
              Couple Friendly
            </span>
          )}
          {property.is_verified && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                background: theme.accentLight,
                color: '#22c55e',
                border: `1px solid ${theme.accentBorder}`,
              }}
            >
              <CheckCircle className="w-3 h-3" style={{ color: theme.accent }} />
              Verified
            </span>
          )}
          {primaryBadge && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
              style={{ background: primaryBadge.color }}
            >
              {primaryBadge.label}
            </span>
          )}
        </div>

        {/* Hourly indicator */}
        {property.hourly_stay_available && (
          <div
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-white"
            style={{ background: 'rgba(37,99,235,0.92)' }}
          >
            <Clock className="w-3 h-3" />
            Hourly
          </div>
        )}

        {/* Guest favourite */}
        {typeof property.rating === 'number' && property.rating >= 4.5 && (
          <div
            className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
          >
            <Star className="w-3 h-3" style={{ color: theme.rating }} fill={theme.rating} />
            Guest favourite
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-base text-xpx-text line-clamp-1 leading-tight transition-colors group-hover:text-[var(--accent-dark)]">
            {property.title}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-xpx-muted text-xs">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="line-clamp-1">{property.city}</span>
          </div>
        </div>

        {/* Trust chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          {typeof property.rating === 'number' && property.rating > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-xpx-text"
              style={{ background: 'rgba(80,200,120,0.08)', border: '1px solid rgba(80,200,120,0.35)' }}
            >
              <Star className="w-3 h-3" style={{ color: theme.rating }} fill={theme.rating} />
              {property.rating.toFixed(1)}
            </span>
          )}
          {property.no_brokerage && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold"
              style={{ background: 'rgba(80,200,120,0.10)', border: '1px solid rgba(80,200,120,0.32)', color: '#3dae68' }}
            >
              <CheckCircle className="w-3 h-3" />
              No Brokerage
            </span>
          )}
          {property.pay_at_property && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold"
              style={{ background: 'rgba(37,99,235,0.10)', border: '1px solid rgba(37,99,235,0.32)', color: '#1D4ED8' }}
            >
              <Shield className="w-3 h-3" />
              Pay Later
            </span>
          )}
        </div>

        {/* Footer row */}
        <div className="pt-2 xpx-divider flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-xpx-text">₹{price}</span>
            <span className="text-xs text-xpx-subtle font-medium">/night</span>
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: 'rgba(80,200,120,0.10)', border: '1px solid rgba(80,200,120,0.32)', color: '#3dae68' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#50C878' }} />
            Best Price
          </span>
        </div>
      </div>
    </article>
  );
}

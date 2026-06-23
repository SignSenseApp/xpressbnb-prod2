import { MapPin, CheckCircle, Shield, Clock } from 'lucide-react';
import type { Property } from '../lib/database.types';
import { theme } from '../lib/theme';
import PropertyTrustLine from './PropertyTrustLine';
import SaveListingButton from './SaveListingButton';
import { firstImageUrl, snapshotFromProperty } from '../lib/savedListingsStorage';
import { trackXpressEvent } from '../lib/analytics';

interface ConversionPropertyCardProps {
  property: Property;
  /** Preserve hero search (?checkin=&checkout=&guests=) when opening the listing */
  tripQuery?: string;
}

/**
 * ConversionPropertyCard — light card used in city listings.
 * Mirrors the FeaturedCard look on the homepage so users feel they're
 * inside one product, not three. White surface, soft shadow, busy-photo
 * gradient at the bottom of the image keeps top-pinned text legible.
 */
export default function ConversionPropertyCard({
  property,
  tripQuery = '',
}: ConversionPropertyCardProps) {
  const handleClick = () => {
    trackXpressEvent('property_card_click', {
      property_id: property.id,
      property_slug: property.slug ?? undefined,
      city: property.city,
    });
    const q = tripQuery.startsWith('?') ? tripQuery : tripQuery ? `?${tripQuery}` : '';
    window.history.pushState({}, '', `/property/${property.id}${q}`);
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
  const coverImage = firstImageUrl(property.images);

  return (
    <article
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick();
      }}
      className="h-full flex flex-col cursor-pointer overflow-hidden rounded-2xl transition-shadow duration-200 md:hover:shadow-[0_12px_32px_rgba(15,23,42,0.10)] motion-reduce:transition-none active:scale-[0.99] group focus:outline-none focus:ring-2 focus:ring-[var(--accent)] xpx-tap"
      style={{
        background: 'var(--xpx-surface)',
        border: '1px solid var(--xpx-border)',
        boxShadow: 'var(--xpx-shadow-card)',
      }}
    >
      {/* Image — fixed 4:3 ratio prevents layout shift while photos load */}
      <div className="xpx-card-media">
        {coverImage ? (
          <img
            src={coverImage}
            alt={property.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 ease-out motion-reduce:transition-none md:group-hover:scale-[1.03]"
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

        <SaveListingButton
          propertyId={property.id}
          getSnapshot={() => snapshotFromProperty(property)}
        />

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {property.is_couple_friendly && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                background: theme.accentLight,
                color: '#3dae68',
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
                color: '#3dae68',
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

      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 space-y-3 min-w-0">
        <div className="min-w-0">
          <h3 className="font-bold text-[15px] sm:text-base text-xpx-text line-clamp-2 leading-snug transition-colors group-hover:text-[var(--accent-dark)]">
            {property.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 text-xpx-muted text-xs min-w-0">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            <span className="line-clamp-1 truncate">{property.city}</span>
          </div>
        </div>

        {/* Trust */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0 max-w-full">
          <PropertyTrustLine property={property} />
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
        <div className="mt-auto pt-2 xpx-divider flex items-center justify-between gap-2">
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

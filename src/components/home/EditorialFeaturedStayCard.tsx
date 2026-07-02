import { memo, useEffect, useState } from 'react';
import { Check, Heart, MapPin } from 'lucide-react';
import type { Property } from '../../lib/database.types';
import { fetchPublicHost } from '../../lib/hostPublicCache';
import { safeHostDisplayName, safeHostInitial } from '../../lib/host';
import { firstImageUrl } from '../../lib/savedListingsStorage';
import { trackXpressEvent } from '../../lib/analytics';
import { useGuestOnboardingOptional } from '../../contexts/GuestOnboardingContext';

const FALLBACK_IMAGE = '/images/home/featured-villa.png';

type EditorialFeaturedStayCardProps = {
  property: Property;
  tripQuery?: string;
  showHostFavorite?: boolean;
  className?: string;
};

/** Large editorial property card — Airbnb Luxe × COS Magazine */
export default memo(function EditorialFeaturedStayCard({
  property,
  tripQuery = '',
  showHostFavorite = false,
  className = '',
}: EditorialFeaturedStayCardProps) {
  const [hostName, setHostName] = useState<string | null>(null);
  const [hostVerified, setHostVerified] = useState(false);
  const onboarding = useGuestOnboardingOptional();

  useEffect(() => {
    if (!property.host_id) return;
    let cancelled = false;
    void fetchPublicHost(property.host_id).then((row) => {
      if (cancelled) return;
      if (row) {
        setHostName(safeHostDisplayName(row.name));
        setHostVerified(row.kyc_status === 'verified');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [property.host_id]);

  const image = firstImageUrl(property.images) || FALLBACK_IMAGE;
  const price = (property.price_per_day || property.price_full_day || 0).toLocaleString('en-IN');
  const city = property.city?.trim() || 'India';
  const displayHost = hostName ?? 'Host';
  const initial = safeHostInitial(displayHost);
  const isFavorite = showHostFavorite || property.is_verified;

  const handleClick = () => {
    trackXpressEvent('property_card_click', {
      property_id: property.id,
      property_slug: property.slug ?? undefined,
      city: property.city,
      source: 'editorial_featured',
    });
    onboarding?.recordListingEngagement();
    const q = tripQuery.startsWith('?') ? tripQuery : tripQuery ? `?${tripQuery}` : '';
    window.history.pushState({}, '', `/property/${property.id}${q}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <article
      className={`xpx-editorial-stay-card group xpx-press ${className}`}
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick();
      }}
    >
      <div className="xpx-editorial-stay-card__media">
        <img
          src={image}
          alt=""
          className="xpx-editorial-stay-card__img"
          loading="lazy"
          decoding="async"
        />
        <div className="xpx-editorial-stay-card__scrim" aria-hidden />

        <span className="xpx-editorial-stay-card__location">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {city}
        </span>

        {isFavorite && (
          <span className="xpx-editorial-stay-card__sticker" aria-label="Host Favourite">
            <span className="hidden md:inline-flex items-center gap-[0.3rem]">
              <Heart className="h-3 w-3 fill-current" aria-hidden />
              Host Favorite
            </span>
            <span className="md:hidden xm-feat-sticker">
              <strong>Host</strong>
              Favourite ♡
            </span>
          </span>
        )}

        <div className="xpx-editorial-stay-card__footer">
          <div className="xpx-editorial-stay-card__host">
            <span className="xpx-editorial-stay-card__avatar" aria-hidden>
              {initial}
            </span>
            <span className="xpx-editorial-stay-card__host-name">
              Hosted by {displayHost}
              {hostVerified && (
                <Check className="inline h-3.5 w-3.5 ml-0.5 text-white/90" strokeWidth={3} aria-hidden />
              )}
            </span>
          </div>
          <span className="xpx-editorial-stay-card__price">
            ₹{price}
            <span className="xpx-editorial-stay-card__price-unit"> / night</span>
          </span>
        </div>
      </div>
      <h3 className="xpx-editorial-stay-card__title">{property.title}</h3>
    </article>
  );
});

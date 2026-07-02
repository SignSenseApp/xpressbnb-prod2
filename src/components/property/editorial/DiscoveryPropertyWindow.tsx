/**
 * EDITORIAL SURFACE — `/property/*` story discovery only.
 *
 * Do not use on homepage, city listings, search, saved, or map browsing.
 * Marketplace browsing uses `ConversionPropertyCard` (see marketplace/README.md).
 */

import { useEffect, useRef } from 'react';
import type { Property } from '../../../lib/database.types';
import {
  discoveryTeaser,
  formatDiscoveryLocation,
} from '../../../lib/discoveryEditorial';
import {
  listPropertyImages,
  propertyCardImageSrc,
  propertyCardImageSrcSet,
  propertyHeroImageSrc,
  propertyHeroImageSrcSet,
  PROPERTY_CARD_IMAGE_SIZES,
} from '../../../lib/propertyImages';
import {
  observeDiscoveryPrefetch,
  openDiscoveryProperty,
  prefetchDiscoveryProperty,
} from '../../../lib/discoveryNavigation';
import { useGuestOnboardingOptional } from '../../../contexts/GuestOnboardingContext';

export type DiscoveryWindowVariant = 'feature' | 'portrait' | 'wide' | 'quiet';

type DiscoveryPropertyWindowProps = {
  property: Property;
  variant: DiscoveryWindowVariant;
  nearbyDistanceKm?: number;
  nearbySource?: string;
  ctaLabel?: string;
  headingLevel?: 'h2' | 'h3';
};

function DiscoveryImage({
  property,
  variant,
}: {
  property: Property;
  variant: DiscoveryWindowVariant;
}) {
  const images = listPropertyImages(property.images);
  const src = images[0];
  if (!src) {
    return <div className="xpx-discovery-window-image xpx-discovery-window-image--empty" aria-hidden />;
  }

  const isFeature = variant === 'feature' || variant === 'wide';
  const imgSrc = isFeature ? propertyHeroImageSrc(src) : propertyCardImageSrc(src);
  const srcSet = isFeature ? propertyHeroImageSrcSet(src) : propertyCardImageSrcSet(src);
  const sizes = isFeature ? '(min-width: 1024px) 85vw, 100vw' : PROPERTY_CARD_IMAGE_SIZES;

  return (
    <img
      src={imgSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt=""
      loading="lazy"
      decoding="async"
      className="xpx-discovery-window-image"
    />
  );
}

export default function DiscoveryPropertyWindow({
  property,
  variant,
  nearbyDistanceKm,
  nearbySource,
  ctaLabel = 'Open this story',
  headingLevel = 'h3',
}: DiscoveryPropertyWindowProps) {
  const ref = useRef<HTMLElement>(null);
  const onboarding = useGuestOnboardingOptional();
  const TitleTag = headingLevel;
  const location = formatDiscoveryLocation(property.city, property.state);
  const teaser = discoveryTeaser(property);

  useEffect(() => observeDiscoveryPrefetch(ref.current), [property.id]);

  const open = () => {
    openDiscoveryProperty({
      property,
      nearbyDistanceKm,
      nearbySource,
      onEngagement: () => onboarding?.recordListingEngagement(),
    });
  };

  return (
    <article
      ref={ref}
      className={`xpx-discovery-window xpx-discovery-window--${variant}`}
      onClick={open}
      onMouseEnter={() => prefetchDiscoveryProperty(property)}
      onTouchStart={() => prefetchDiscoveryProperty(property)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open();
      }}
    >
      <div className="xpx-discovery-window-media">
        <DiscoveryImage property={property} variant={variant} />
      </div>
      <div className="xpx-discovery-window-copy">
        <TitleTag className="xpx-discovery-window-title">{property.title}</TitleTag>
        {teaser && variant !== 'quiet' && (
          <p className="xpx-discovery-window-teaser">{teaser}</p>
        )}
        <p className="xpx-discovery-window-location">{location}</p>
        <span className="xpx-discovery-window-cta">{ctaLabel}</span>
      </div>
    </article>
  );
}

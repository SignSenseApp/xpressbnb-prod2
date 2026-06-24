import { useRef, useState } from 'react';
import type { Property } from '../lib/database.types';
import { computeXpressbnbStayScore } from '../lib/xpressbnbStayScore';
import { openStayScoreInfo } from '../lib/stayScoreEducation';
import SaveListingButton from './SaveListingButton';
import PropertyCardHostRow from './PropertyCardHostRow';
import PropertyCardGallery from './PropertyCardGallery';
import { snapshotFromProperty } from '../lib/savedListingsStorage';
import { listPropertyImages } from '../lib/propertyImages';
import { trackXpressEvent } from '../lib/analytics';
import {
  VerifiedShieldIcon,
  ImageGalleryIcon,
  LocationPinIcon,
  GuestsIcon,
  BedroomIcon,
  BathroomIcon,
  StarOutlineIcon,
  InfoCircleIcon,
  HomeOutlineIcon,
  ShieldOutlineIcon,
  PercentOutlineIcon,
} from './icons/PropertyCardIcons';

interface ConversionPropertyCardProps {
  property: Property;
  /** Preserve hero search (?checkin=&checkout=&guests=) when opening the listing */
  tripQuery?: string;
  /** Optional layout classes (e.g. homepage carousel snap widths) */
  className?: string;
}

function countImages(images: Property['images']): number {
  return listPropertyImages(images).length;
}

function formatLocation(city: string, state: string): string {
  const c = city?.trim() ?? '';
  const s = state?.trim() ?? '';
  if (c && s) return `${c}, ${s}`;
  return c || s || 'Location coming soon';
}

/**
 * Finalized XpressBNB property card — pixel-accurate to product spec.
 * Used in city listings, saved page, and homepage featured carousel.
 */
export default function ConversionPropertyCard({
  property,
  tripQuery = '',
  className = '',
}: ConversionPropertyCardProps) {
  const swipeRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const handleClick = () => {
    if (swipeRef.current) {
      swipeRef.current = false;
      return;
    }
    trackXpressEvent('property_card_click', {
      property_id: property.id,
      property_slug: property.slug ?? undefined,
      city: property.city,
    });
    const q = tripQuery.startsWith('?') ? tripQuery : tripQuery ? `?${tripQuery}` : '';
    window.history.pushState({}, '', `/property/${property.id}${q}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const price = (property.price_per_day || property.price_full_day || 0).toLocaleString('en-IN');
  const imageCount = countImages(property.images);
  const stayScore = computeXpressbnbStayScore(property);
  const locationLabel = formatLocation(property.city, property.state);
  const guests = property.max_guests ?? 0;
  const bedrooms = property.bedrooms ?? 0;
  const bathrooms = property.bathrooms ?? 0;

  const openStayScore = (e: React.MouseEvent) => {
    e.stopPropagation();
    openStayScoreInfo();
  };

  return (
    <article
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick();
      }}
      className={`xpx-property-card group flex h-full w-full max-w-[380px] cursor-pointer flex-col overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] motion-reduce:transition-none active:scale-[0.99] md:mx-auto ${className}`}
    >
      {/* Hero image gallery */}
      <PropertyCardGallery
        images={property.images}
        alt={property.title}
        isCardHovered={isHovered}
        onIndexChange={setGalleryIndex}
        onSwipe={() => {
          swipeRef.current = true;
        }}
      >
        {property.is_verified && (
          <div className="absolute left-3 top-3 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#16A34A] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <VerifiedShieldIcon className="h-3.5 w-3.5" />
              Verified
            </span>
          </div>
        )}

        <SaveListingButton
          propertyId={property.id}
          getSnapshot={() => snapshotFromProperty(property)}
        />

        {/* Floating glass price card */}
        <div
          className="absolute bottom-3 left-3 z-10 rounded-xl px-3 py-2"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <p className="leading-tight">
            <span className="text-base font-bold text-[#111827]">₹{price}</span>
            <span className="text-sm font-medium text-[#6B7280]"> / night</span>
          </p>
          <p className="mt-0.5 text-[11px] text-[#6B7280]">Direct from Host</p>
        </div>

        {imageCount > 0 && (
          <div
            className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            <ImageGalleryIcon className="h-3.5 w-3.5" />
            <span className="tabular-nums">
              {Math.min(galleryIndex + 1, imageCount)} / {imageCount}
            </span>
          </div>
        )}
      </PropertyCardGallery>

      {/* Card body */}
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 px-5 pb-5 pt-4">
        {/* Title */}
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[#111827] sm:text-base">
            {property.title}
          </h3>
          <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-[#6B7280]">
            <LocationPinIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{locationLabel}</span>
          </div>
        </div>

        {/* Host row */}
        <PropertyCardHostRow
          hostId={property.host_id}
          propertyVerified={property.is_verified}
        />

        {/* Specs grid */}
        <div className="grid grid-cols-3 divide-x divide-[#E5E7EB] py-1">
          <SpecCell icon={<GuestsIcon className="h-[18px] w-[18px]" />} value={guests} label="Guests" />
          <SpecCell icon={<BedroomIcon className="h-[18px] w-[18px]" />} value={bedrooms} label="Bedroom" />
          <SpecCell icon={<BathroomIcon className="h-[18px] w-[18px]" />} value={bathrooms} label="Bathroom" />
        </div>

        {/* XpressBNB Stay Score */}
        <button
          type="button"
          onClick={openStayScore}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]"
          style={{ background: '#F1FAF5' }}
          aria-label={stayScore.label}
        >
          <StarOutlineIcon className="h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden />
          <span className="min-w-0 flex-1 text-sm font-semibold text-[#16A34A]">
            {stayScore.label}
          </span>
          <InfoCircleIcon className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden />
        </button>

        {/* Trust row */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 pt-0.5">
          <TrustItem icon={<HomeOutlineIcon className="h-3.5 w-3.5" />} label="Direct with host" />
          <TrustItem icon={<ShieldOutlineIcon className="h-3.5 w-3.5" />} label="No platform fee" />
          <TrustItem icon={<PercentOutlineIcon className="h-3.5 w-3.5" />} label="Zero commission" />
        </div>
      </div>
    </article>
  );
}

function SpecCell({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 text-center">
      <span className="text-[#6B7280]" aria-hidden>
        {icon}
      </span>
      <span className="text-sm font-bold tabular-nums text-[#111827]">{value}</span>
      <span className="text-[10px] text-[#6B7280]">{label}</span>
    </div>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#16A34A] sm:text-[11px]">
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}

import type { Property } from '../../lib/database.types';
import { getPropertyTrustDisplay } from '../../lib/propertyTrustDisplay';
import {
  EditorialChapter,
  EditorialEyebrow,
  EditorialHeadline,
  PullQuote,
} from '../editorial/EditorialLayouts';

interface PropertyReviewsProps {
  property: Property;
}

/**
 * Editorial citation — one hero observation when ops has verified external trust.
 */
export default function PropertyReviews({ property }: PropertyReviewsProps) {
  const trust = getPropertyTrustDisplay(property);

  if (trust.kind !== 'verified_external_rating') {
    return null;
  }

  return (
    <EditorialChapter id="reviews" aria-labelledby="reviews-heading">
      <EditorialEyebrow>Guest voice</EditorialEyebrow>
      <EditorialHeadline id="reviews-heading" size="sm">
        What travelers remember
      </EditorialHeadline>

      <PullQuote size="hero" cite="Verified from a linked external listing">
        {trust.label}
      </PullQuote>

      <p className="xpx-ed-centered-essay xpx-ed-chapter-lead mt-2">
        XpressBNB does not yet collect its own post-stay guest reviews. This figure is verified by
        our team from a linked external listing.
      </p>
    </EditorialChapter>
  );
}

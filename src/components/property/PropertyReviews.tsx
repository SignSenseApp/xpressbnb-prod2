import type { Property } from '../../lib/database.types';
import { getPropertyTrustDisplay } from '../../lib/propertyTrustDisplay';

interface PropertyReviewsProps {
  property: Property;
}

/**
 * External trust section — only shown when ops has verified an external rating.
 * No XpressBNB guest reviews, host-submitted external_reviews, or property.rating.
 */
export default function PropertyReviews({ property }: PropertyReviewsProps) {
  const trust = getPropertyTrustDisplay(property);

  if (trust.kind !== 'verified_external_rating') {
    return null;
  }

  return (
    <section
      id="reviews"
      className="rounded-3xl p-6 sm:p-8"
      style={{
        background: 'var(--xpx-surface)',
        border: '1px solid var(--xpx-border)',
        boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
      }}
    >
      <p className="xpx-eyebrow mb-1">External reviews</p>
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-xpx-text">
        Verified rating
      </h2>
      <p className="mt-4 text-base sm:text-lg font-semibold text-xpx-text tabular-nums">
        {trust.label}
      </p>
      <p className="mt-2 text-sm text-xpx-muted leading-relaxed max-w-xl">
        This rating was manually verified by the XpressBNB team from a linked external listing.
        XpressBNB does not yet collect its own post-stay guest reviews.
      </p>
    </section>
  );
}

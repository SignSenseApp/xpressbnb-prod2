import { useEffect, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import type { Property, Review } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { getSubRatings, hasReviewSignal, type SubRating } from '../../config/propertyDefaults';
import PropertyTrustNotes from './PropertyTrustNotes';

interface PropertyReviewsProps {
  property: Property;
}

function mapExternalReview(
  propertyId: string,
  row: {
    id: string;
    reviewer_name: string;
    rating: number;
    comment: string | null;
    review_date: string;
    created_at: string | null;
  },
): Review {
  return {
    id: row.id,
    property_id: propertyId,
    booking_id: null,
    guest_name: row.reviewer_name,
    rating: row.rating,
    comment: row.comment,
    created_at: row.created_at ?? row.review_date,
  };
}

/**
 * "What guests are saying" section.
 *
 * Pulls up to 6 reviews from `external_reviews` for this property and
 * features the most recent. Falls back gracefully when no reviews exist.
 */
export default function PropertyReviews({ property }: PropertyReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('external_reviews')
          .select('id, reviewer_name, rating, comment, review_date, created_at')
          .eq('property_id', property.id)
          .order('review_date', { ascending: false })
          .limit(6);
        if (cancelled) return;
        if (error) {
          console.error('PropertyReviews: failed to fetch reviews', error);
          setReviews([]);
        } else {
          setReviews((data ?? []).map((row) => mapExternalReview(property.id, row)));
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [property.id]);

  const featured = reviews[0];
  const moreReviews = reviews.slice(1, 4);
  const totalReviews = property.total_reviews || reviews.length;
  const overallRating = Number(property.rating) || 0;
  const subRatings = getSubRatings(property);
  const showSubBars = hasReviewSignal(property);
  const hasReviews = reviews.length > 0 || showSubBars;

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
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="xpx-eyebrow mb-1">{hasReviews ? 'Guest reviews' : 'Direct booking'}</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-xpx-text">
            {hasReviews ? 'What guests are saying' : 'Book with confidence'}
          </h2>
        </div>
        {totalReviews > 0 && (
          <a
            href="#reviews"
            className="text-sm font-semibold underline-offset-4 hover:underline"
            style={{ color: 'var(--xpx-warm-dark)' }}
          >
            See all {totalReviews} reviews →
          </a>
        )}
      </div>

      {/* Rating block or trust fallback when there are no reviews yet */}
      {loaded && !hasReviews ? (
        <div
          className="rounded-2xl p-6 sm:p-7"
          style={{
            background:
              'linear-gradient(135deg, rgba(80,200,120,0.08) 0%, var(--xpx-surface-light) 100%)',
            border: '1px solid var(--xpx-border)',
          }}
        >
          <p className="text-base sm:text-lg font-bold text-xpx-text leading-snug">
            Book directly with the host
          </p>
          <p className="mt-2 text-sm text-xpx-muted leading-relaxed">
            Ask for the best available price, check dates, and confirm your stay on WhatsApp.
            Payment is arranged directly with the host — no guest commission on XpressBNB.
          </p>
          <PropertyTrustNotes className="mt-4" />
        </div>
      ) : (
      <div className="grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-10 items-start">
        <div
          className="rounded-2xl p-5 sm:p-6 flex flex-col items-start"
          style={{
            background:
              'linear-gradient(135deg, rgba(80,200,120,0.10) 0%, var(--xpx-surface-light) 100%)',
            border: '1px solid var(--xpx-border)',
          }}
        >
          <div className="flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-extrabold text-xpx-text leading-none tabular-nums">
              {overallRating > 0 ? overallRating.toFixed(1) : '—'}
            </span>
            <Star
              className="w-7 h-7"
              style={{ color: 'var(--xpx-warm)' }}
              fill="currentColor"
            />
          </div>
          <div className="flex items-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = overallRating >= n - 0.25;
              const half = !filled && overallRating >= n - 0.75;
              return (
                <Star
                  key={n}
                  className="w-4 h-4"
                  style={{
                    color: filled || half ? 'var(--xpx-rating)' : 'rgba(15,23,42,0.18)',
                  }}
                  fill={filled ? 'currentColor' : 'none'}
                />
              );
            })}
          </div>
          <p className="mt-3 text-sm text-xpx-muted">
            {totalReviews > 0 ? (
              <>
                Based on{' '}
                <span className="font-semibold text-xpx-text tabular-nums">{totalReviews}</span>{' '}
                {totalReviews === 1 ? 'review' : 'reviews'}
              </>
            ) : !loaded ? (
              'Loading guest feedback…'
            ) : null}
          </p>
        </div>

        {/* Sub-rating bars — only render when we have a real rating signal */}
        {showSubBars ? (
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-x-8 sm:gap-y-4">
            {subRatings.map((sr) => (
              <SubRatingBar key={sr.label} sub={sr} />
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div
            className="rounded-2xl p-6 text-sm text-xpx-muted leading-relaxed"
            style={{
              background: 'var(--xpx-surface-light)',
              border: '1px solid var(--xpx-border)',
            }}
          >
            Recent guests have shared their experience below. Ask the host for availability
            and the best price for your dates.
          </div>
        ) : !loaded ? (
          <div
            className="rounded-2xl p-6 animate-pulse"
            style={{
              background: 'var(--xpx-surface-light)',
              border: '1px solid var(--xpx-border)',
            }}
          >
            <div className="h-3 w-2/3 rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
          </div>
        ) : null}
      </div>
      )}

      {/* Featured review */}
      {hasReviews && loaded && featured ? (
        <article
          className="mt-8 rounded-2xl p-6"
          style={{
            background: 'var(--xpx-surface-light)',
            border: '1px solid var(--xpx-border)',
          }}
        >
          <Quote
            className="w-8 h-8 mb-3"
            style={{ color: 'var(--xpx-warm)' }}
          />
          <p className="text-base sm:text-lg text-xpx-text leading-relaxed italic">
            &ldquo;{featured.comment ?? 'Great stay.'}&rdquo;
          </p>
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'var(--xpx-warm)' }}
            >
              {(featured.guest_name?.charAt(0) || 'G').toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-xpx-text">{featured.guest_name || 'Guest'}</p>
              <p className="text-xs text-xpx-subtle">
                {featured.created_at
                  ? new Date(featured.created_at).toLocaleString('en-IN', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : ''}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-sm font-bold text-xpx-text tabular-nums">
              <Star className="w-4 h-4" style={{ color: 'var(--xpx-rating)' }} fill="currentColor" />
              {Number(featured.rating).toFixed(1)}
            </div>
          </div>
        </article>
      ) : null}

      {hasReviews && loaded && moreReviews.length > 0 ? (
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          {moreReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl p-5"
              style={{
                background: 'var(--xpx-surface-light)',
                border: '1px solid var(--xpx-border)',
              }}
            >
              <p className="text-sm text-xpx-text leading-relaxed line-clamp-4">
                &ldquo;{review.comment ?? 'Great stay.'}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-xpx-text">{review.guest_name || 'Guest'}</p>
                <div className="ml-auto flex items-center gap-1 text-sm font-bold text-xpx-text tabular-nums">
                  <Star
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--xpx-rating)' }}
                    fill="currentColor"
                  />
                  {Number(review.rating).toFixed(1)}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : hasReviews && !loaded ? (
        <div
          className="mt-8 rounded-2xl p-6 animate-pulse"
          style={{
            background: 'var(--xpx-surface-light)',
            border: '1px solid var(--xpx-border)',
          }}
        >
          <div className="h-4 w-1/2 rounded mb-3" style={{ background: 'rgba(15,23,42,0.06)' }} />
          <div className="h-3 w-3/4 rounded mb-2" style={{ background: 'rgba(15,23,42,0.06)' }} />
          <div className="h-3 w-2/3 rounded" style={{ background: 'rgba(15,23,42,0.06)' }} />
        </div>
      ) : null}
    </section>
  );
}

function SubRatingBar({ sub }: { sub: SubRating }) {
  const pct = Math.max(0, Math.min(100, (sub.value / 5) * 100));
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
      <span className="text-sm text-xpx-text font-medium">{sub.label}</span>
      <span className="text-sm font-bold text-xpx-text tabular-nums">{sub.value.toFixed(1)}</span>
      <div
        className="col-span-2 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(15,23,42,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--xpx-warm-dark), var(--xpx-warm))',
          }}
        />
      </div>
    </div>
  );
}

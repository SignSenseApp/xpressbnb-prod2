/**
 * Factual guest-facing trust badge copy.
 * Each label maps to a real production signal — who verified, what, when applicable.
 */

export const TRUST_BADGE_COPY = {
  hostKyc: {
    short: 'ID verified',
    title: 'Host identity verified by XpressBnB (KYC on file).',
  },
  premiumListing: {
    short: 'Premium listing',
    title: 'Host has an active paid plan — badge shown on this listing.',
  },
  directHostListing: {
    short: 'Direct host listing',
    title: 'Priced and managed by the host on XpressBnB.',
  },
  guestId: {
    short: 'Your Guest ID',
    title: 'Private reference issued when your inquiry was submitted.',
  },
  inquiryReviewed: {
    short: 'Inquiry reviewed',
    title: 'XpressBnB Operations reviewed this inquiry before host contact.',
  },
  externalRating: {
    title: 'Rating checked by XpressBnB from the host’s linked platform listing.',
  },
} as const;

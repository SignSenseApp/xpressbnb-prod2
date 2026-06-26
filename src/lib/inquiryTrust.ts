/**
 * Inquiry trust badges — honest, extensible marketplace trust levels.
 *
 * Launch (v1): only `quality_reviewed` when Ops has approved an inquiry.
 * Future levels render only when backing data exists (never implied).
 */

export type InquiryTrustLevel =
  | 'quality_reviewed'
  | 'phone_verified'
  | 'government_id_verified'
  | 'returning_guest'
  | 'repeat_booking'
  | 'super_guest';

export type InquiryTrustBadge = {
  level: InquiryTrustLevel;
  label: string;
  shortLabel: string;
  description: string;
};

export const INQUIRY_TRUST_BADGES: Record<InquiryTrustLevel, InquiryTrustBadge> = {
  quality_reviewed: {
    level: 'quality_reviewed',
    label: 'Quality Reviewed',
    shortLabel: 'Quality Reviewed',
    description:
      'This inquiry has been reviewed by XpressBNB Operations before being shared with you.',
  },
  phone_verified: {
    level: 'phone_verified',
    label: 'Phone Verified',
    shortLabel: 'Phone Verified',
    description: 'Guest mobile number was verified with a one-time code.',
  },
  government_id_verified: {
    level: 'government_id_verified',
    label: 'Government ID Verified',
    shortLabel: 'ID Verified',
    description: 'Government-issued identity was verified.',
  },
  returning_guest: {
    level: 'returning_guest',
    label: 'Returning Guest',
    shortLabel: 'Returning Guest',
    description: 'This guest has completed a stay with XpressBNB before.',
  },
  repeat_booking: {
    level: 'repeat_booking',
    label: 'Repeat Booking',
    shortLabel: 'Repeat Booking',
    description: 'This guest has multiple confirmed bookings.',
  },
  super_guest: {
    level: 'super_guest',
    label: 'Super Guest',
    shortLabel: 'Super Guest',
    description: 'Recognised frequent guest with a strong booking history.',
  },
};

export type InquiryTrustBookingFields = {
  phone_verified: boolean;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  approval_source?: string | null;
  status?: string | null;
  contact_released?: boolean | null;
  /** Reserved — set when SMS OTP path is active */
  phone_otp_verified_at?: string | null;
};

/** Mirrors public.inquiry_contact_released() — Ops approval released guest contact. */
export function isInquiryContactReleased(booking: InquiryTrustBookingFields): boolean {
  if (booking.contact_released === true) return true;
  if (booking.contact_released === false) return false;
  return (
    booking.phone_verified === true &&
    Boolean(booking.reviewed_at) &&
    Boolean(booking.reviewed_by) &&
    booking.status !== 'inquiry_preparing' &&
    booking.status !== 'inquiry_pending'
  );
}

/** @deprecated Use isInquiryContactReleased — name kept for existing call sites */
export function isQualityReviewedInquiry(booking: InquiryTrustBookingFields): boolean {
  return isInquiryContactReleased(booking);
}

export function isReadyToContactGuest(booking: InquiryTrustBookingFields): boolean {
  return isQualityReviewedInquiry(booking) && booking.status === 'pending_host';
}

/**
 * Active trust badges for an inquiry — only levels with real backing data.
 */
export function getInquiryTrustBadges(booking: InquiryTrustBookingFields): InquiryTrustBadge[] {
  const badges: InquiryTrustBadge[] = [];

  if (isQualityReviewedInquiry(booking)) {
    badges.push(INQUIRY_TRUST_BADGES.quality_reviewed);
  }

  if (booking.phone_otp_verified_at) {
    badges.push(INQUIRY_TRUST_BADGES.phone_verified);
  }

  return badges;
}

export function primaryInquiryTrustBadge(
  booking: InquiryTrustBookingFields,
): InquiryTrustBadge | null {
  const badges = getInquiryTrustBadges(booking);
  return badges[0] ?? null;
}

export function formatApprovalSource(source: string | null | undefined): string {
  if (!source || source === 'xpressbnb_operations') {
    return 'XpressBNB Operations';
  }
  if (source === 'automated') return 'XpressBNB';
  return 'XpressBNB Operations';
}

export function formatReviewedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const QUALITY_REVIEW_PENDING_HELPER =
  'This inquiry is currently being reviewed by XpressBNB Operations.';

export const QUALITY_REVIEW_HELPER =
  'This inquiry has been reviewed by XpressBNB Operations before being shared with you.';

export const CONTACT_DETAILS_REVIEWED_HELPER =
  'Contact details were checked during quality review. This is not government ID verification.';

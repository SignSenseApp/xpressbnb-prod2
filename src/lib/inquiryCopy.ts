/**
 * Inquiry-first product language — single source for guest CTAs.
 * Avoid OTA terms (Book Now, Reserve, Instant Book) on the guest path.
 */

export type InquiryCtaContext =
  | 'property_no_dates'
  | 'property_with_dates'
  | 'host_card'
  | 'form_submit'
  | 'offer_submit'
  | 'modal_entry'
  | 'artist_whatsapp';

/** Opening spread CTA — editorial arrival, not marketplace transaction. */
export function openingArrivalCtaLabel(hasDates: boolean): string {
  return hasDates ? 'Continue to reservation' : 'Begin your stay';
}

export function inquiryCtaLabel(context: InquiryCtaContext): string {
  switch (context) {
    case 'property_no_dates':
      return 'Choose your stay';
    case 'property_with_dates':
      return 'Send your request';
    case 'host_card':
      return 'Request to book';
    case 'form_submit':
      return 'Send your request';
    case 'offer_submit':
      return 'Send your offer';
    case 'modal_entry':
      return 'Request to book';
    case 'artist_whatsapp':
      return 'Request via WhatsApp';
    default:
      return 'Send inquiry';
  }
}

export const INQUIRY_SENDING_LABEL = 'Preparing your request…';

export const INQUIRY_HOST_TAGLINE =
  'We bring genuine travel inquiries directly to hosts.';

export const INQUIRY_GUEST_TAGLINE =
  'Inquire when you are ready. Hear directly from the host. Zero guest commission.';

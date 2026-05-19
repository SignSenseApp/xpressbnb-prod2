/**
 * Client-side hook after host accept/reject (UI feedback only).
 * WhatsApp is sent server-side: DB trigger enqueues inquiry_host_accepted/rejected
 * → send-inquiry-notification edge function → public.notifications.
 */
export function notifyGuestInquiryDecision(
  booking: {
    id: string;
    guest_name: string;
    guest_phone: string;
    guest_email: string;
  },
  decision: 'accepted' | 'rejected',
  propertyTitle?: string,
): void {
  const label = propertyTitle ? ` for ${propertyTitle}` : '';
  const message =
    decision === 'accepted'
      ? `Your inquiry${label} was accepted. The host may reach you shortly.`
      : `Your inquiry${label} was declined by the host.`;

  if (import.meta.env.DEV) {
    console.info('[guest-notify:placeholder]', {
      bookingId: booking.id,
      decision,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone,
      message,
    });
  }

}

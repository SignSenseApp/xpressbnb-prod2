/** Inquiry WhatsApp copy (English + short Hindi). */

export type InquiryMessageContext = {
  propertyTitle: string;
  dateRange: string;
  guestName: string;
  guestPhone: string;
  hostName: string;
  hostPhone: string;
  dashboardLink: string;
};

export type Locale = 'en' | 'hi';

function pickLocale(preferred?: string | null): Locale {
  if (preferred === 'hi') return 'hi';
  return 'en';
}

export function guestInquirySentMessage(ctx: InquiryMessageContext, locale?: string | null): string {
  const loc = pickLocale(locale);
  if (loc === 'hi') {
    return `Aapki inquiry "${ctx.propertyTitle}" (${ctx.dateRange}) host ${ctx.hostName} ko bhej di gayi. Host: ${ctx.hostPhone}`;
  }
  return `Your inquiry for ${ctx.propertyTitle} ${ctx.dateRange} sent to ${ctx.hostName}. Host phone: ${ctx.hostPhone}`;
}

export function hostNewInquiryMessage(ctx: InquiryMessageContext, locale?: string | null): string {
  const loc = pickLocale(locale);
  if (loc === 'hi') {
    return `Nayi inquiry: ${ctx.guestName} ${ctx.guestPhone}, ${ctx.propertyTitle} ${ctx.dateRange}. Accept/Reject: ${ctx.dashboardLink}`;
  }
  return `New inquiry from ${ctx.guestName} ${ctx.guestPhone} for ${ctx.propertyTitle} ${ctx.dateRange}. Open dashboard to Accept/Reject: ${ctx.dashboardLink}`;
}

export function guestInquiryAcceptedMessage(ctx: InquiryMessageContext, locale?: string | null): string {
  const loc = pickLocale(locale);
  if (loc === 'hi') {
    return `Host ne aapki inquiry "${ctx.propertyTitle}" (${ctx.dateRange}) accept kar li. Host jald sampark karenge.`;
  }
  return `Your inquiry for ${ctx.propertyTitle} ${ctx.dateRange} was accepted by ${ctx.hostName}. The host may contact you soon.`;
}

export function guestInquiryRejectedMessage(ctx: InquiryMessageContext, locale?: string | null): string {
  const loc = pickLocale(locale);
  if (loc === 'hi') {
    return `Host ne aapki inquiry "${ctx.propertyTitle}" (${ctx.dateRange}) decline kar di.`;
  }
  return `Your inquiry for ${ctx.propertyTitle} ${ctx.dateRange} was declined by the host.`;
}

export function formatDateRange(checkIn: string, checkOut: string): string {
  try {
    const inD = new Date(checkIn);
    const outD = new Date(checkOut);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(inD)} – ${fmt(outD)}`;
  } catch {
    return `${checkIn} – ${checkOut}`;
  }
}

export function normalizeIndiaE164(phone: string): string | null {
  const d = phone.replace(/\D/g, '').slice(-10);
  if (d.length !== 10) return null;
  return `91${d}`;
}

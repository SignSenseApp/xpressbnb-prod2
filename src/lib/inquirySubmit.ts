import { supabase } from './supabase';
import { parseFrequentAmigoStatus, type FrequentAmigoStatus } from './inquiryHostContact';

export type MarketplaceInquiryResult = {
  bookingId: string;
  customerReference: string;
  status: string;
  spamScore: number;
  requiresReview: boolean;
  frequentAmigo?: FrequentAmigoStatus;
};

export type SubmitBookingInquiryPayload = {
  inquiry_type: 'book_pay_later' | 'make_offer';
  property_id: string;
  host_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  turnstile_token: string;
  device_fingerprint: string;
  amount_total?: number;
  total_price?: number;
  nights?: number;
  special_requests?: string;
  include_decoration?: boolean;
  offer_amount?: number;
  offer_message?: string;
};

async function messageFromEdgeInvoke(error: unknown, data: unknown, fallback: string): Promise<string> {
  const fromData = (data as { error?: string } | null)?.error;
  if (fromData) return fromData;

  if (error && typeof error === 'object' && 'context' in error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = (await ctx.json()) as { error?: string };
        if (body?.error) return body.error;
      } catch {
        /* ignore */
      }
    }
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

export function parseMarketplaceInquiryResult(data: unknown): MarketplaceInquiryResult | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const bookingId = String(o.booking_id ?? o.bookingId ?? '');
  const customerReference = String(o.customer_reference ?? o.customerReference ?? '').toUpperCase();
  if (!bookingId || !customerReference) return null;

  const frequentAmigo = parseFrequentAmigoStatus(o.frequent_amigo ?? o.frequentAmigo);

  return {
    bookingId,
    customerReference,
    status: String(o.status ?? 'inquiry_preparing'),
    spamScore: Number(o.spam_score ?? o.spamScore ?? 0),
    requiresReview: o.requires_review === true || o.requiresReview === true,
    ...(frequentAmigo ? { frequentAmigo } : {}),
  };
}

export async function submitBookingInquiry(
  payload: SubmitBookingInquiryPayload,
): Promise<{ ok: true; result: MarketplaceInquiryResult } | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke('submit-booking-inquiry', {
    body: payload,
  });

  if (error) {
    return {
      ok: false,
      error: await messageFromEdgeInvoke(error, data, 'Could not submit your inquiry'),
    };
  }

  const envelope = data as { ok?: boolean; error?: string } & Record<string, unknown>;
  if (envelope?.error) {
    return { ok: false, error: envelope.error };
  }

  const result = parseMarketplaceInquiryResult(envelope?.ok ? envelope : data);
  if (!result) {
    return { ok: false, error: 'Unexpected response from server' };
  }

  return { ok: true, result };
}

export type InquiryTrackStatus =
  | 'preparing'
  | 'sent_to_host'
  | 'viewed_by_host'
  | 'host_responded'
  | 'completed'
  | 'cancelled';

export type InquiryTrackResult = {
  customerReference: string;
  displayStatus: InquiryTrackStatus;
  status: string;
  phoneVerified: boolean;
  propertyId: string;
  checkInDate: string;
  checkOutDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  reviewedAt: string | null;
};

export function inquiryTrackStatusLabel(status: InquiryTrackStatus): string {
  switch (status) {
    case 'preparing':
      return 'Preparing';
    case 'sent_to_host':
      return 'Sent to host';
    case 'viewed_by_host':
      return 'Viewed by host';
    case 'host_responded':
      return 'Host responded';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Preparing';
  }
}

export async function trackInquiryByReference(
  customerReference: string,
  guestEmail: string,
): Promise<{ ok: true; result: InquiryTrackResult } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('track_inquiry_by_reference', {
    p_customer_reference: customerReference.trim().toUpperCase(),
    p_guest_email: guestEmail.trim(),
  });

  if (error) {
    return { ok: false, error: error.message || 'Inquiry not found' };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Inquiry not found' };
  }

  const o = data as Record<string, unknown>;
  return {
    ok: true,
    result: {
      customerReference: String(o.customer_reference ?? customerReference),
      displayStatus: String(o.display_status ?? 'preparing') as InquiryTrackStatus,
      status: String(o.status ?? ''),
      phoneVerified: o.phone_verified === true,
      propertyId: String(o.property_id ?? ''),
      checkInDate: String(o.check_in_date ?? ''),
      checkOutDate: o.check_out_date ? String(o.check_out_date) : null,
      createdAt: o.created_at ? String(o.created_at) : null,
      updatedAt: o.updated_at ? String(o.updated_at) : null,
      reviewedAt: o.reviewed_at ? String(o.reviewed_at) : null,
    },
  };
}

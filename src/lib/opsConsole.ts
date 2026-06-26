import { supabase } from './supabase';

export type OpsHealth = {
  active_properties: number;
  inactive_properties: number;
  active_by_city: Record<string, number>;
  total_hosts: number;
  hosts_missing_phone: number;
  verified_inquiries_today: number;
  pending_host_inquiries: number;
};

export type OpsPropertyRow = {
  id: string;
  title: string;
  city: string;
  host_name: string;
  host_id: string | null;
  is_active: boolean;
  host_phone_present: boolean;
  images_present: boolean;
  price_present: boolean;
  slug: string | null;
};

export type OpsHostRow = {
  id: string;
  name: string;
  email: string;
  phone_present: boolean;
  active_property_count: number;
  subscription_status: string;
  plan_tier: string;
  subscription_active: boolean;
};

export type OpsInquiryRow = {
  id: string;
  created_at: string | null;
  property_title: string;
  property_id: string;
  city: string;
  status: string | null;
  phone_verified: boolean;
  host_name: string;
  host_id: string | null;
  amount: number | null;
  guest_phone_masked: string;
  guest_phone?: string;
  customer_reference: string | null;
  guest_name: string | null;
  guest_email: string | null;
  spam_score: number | null;
};

export type OpsAlerts = {
  stuck_pending_host: Array<{
    id: string;
    minutes_old: number;
    bucket: string;
    property_title: string;
    property_id: string;
    host_id: string | null;
  }>;
  active_missing_host_phone: Array<{
    id: string;
    title: string;
    city: string;
    host_id: string | null;
  }>;
  active_missing_images: Array<{ id: string; title: string; city: string }>;
  active_invalid_price: Array<{ id: string; title: string; city: string }>;
};

export type OpsFunnelWindow = {
  verified_inquiries: number;
  pending_host: number;
  median_host_response_minutes: number | null;
  property_views: number;
};

export type OpsSnapshot = {
  health: OpsHealth;
  properties: OpsPropertyRow[];
  hosts: OpsHostRow[];
  inquiries: OpsInquiryRow[];
  alerts: OpsAlerts;
  funnel_24h?: OpsFunnelWindow;
  funnel_7d?: OpsFunnelWindow;
  view_events_caveat?: string;
  generated_at: string;
  pending_review?: OpsInquiryRow[];
};

async function messageFromInvoke(error: unknown, data: unknown, fallback: string): Promise<string> {
  const fromData = (data as { error?: string } | null)?.error;
  if (fromData) return fromData;

  if (error && typeof error === 'object' && 'context' in error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = (await ctx.json()) as { error?: string };
        if (body?.error) return body.error;
      } catch {
        // ignore
      }
    }
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

export async function fetchOpsSnapshot(): Promise<{
  ok: boolean;
  data?: OpsSnapshot;
  error?: string;
  status?: 'denied' | 'auth' | 'error';
}> {
  const { data, error } = await supabase.functions.invoke('ops-console', {
    body: { action: 'snapshot' },
  });

  if (error) {
    const msg = await messageFromInvoke(error, data, 'Failed to load ops data');
    const lower = msg.toLowerCase();
    if (lower.includes('denied') || lower.includes('403')) {
      return { ok: false, error: msg, status: 'denied' };
    }
    if (lower.includes('sign in') || lower.includes('session') || lower.includes('401')) {
      return { ok: false, error: msg, status: 'auth' };
    }
    return { ok: false, error: msg, status: 'error' };
  }

  return { ok: true, data: data as OpsSnapshot };
}

export async function deactivateOpsProperty(propertyId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke('ops-console', {
    body: { action: 'deactivate_property', property_id: propertyId },
  });

  if (error) {
    const msg = await messageFromInvoke(error, data, 'Failed to deactivate property');
    return { ok: false, error: msg };
  }

  return { ok: true };
}

export async function approveOpsInquiry(bookingId: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke('ops-console', {
    body: { action: 'approve_inquiry', booking_id: bookingId },
  });

  if (error) {
    const msg = await messageFromInvoke(error, data, 'Failed to approve inquiry');
    return { ok: false, error: msg };
  }

  const payload = data as { ok?: boolean; error?: string };
  if (payload?.error) return { ok: false, error: payload.error };
  return { ok: true };
}

export async function rejectOpsInquiry(
  bookingId: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('ops-console', {
    body: { action: 'reject_inquiry', booking_id: bookingId, reason },
  });

  if (error) {
    const msg = await messageFromInvoke(error, data, 'Failed to reject inquiry');
    return { ok: false, error: msg };
  }

  const payload = data as { ok?: boolean; error?: string };
  if (payload?.error) return { ok: false, error: payload.error };
  return { ok: true };
}

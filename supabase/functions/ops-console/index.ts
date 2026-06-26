import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';

/**
 * ops-console — internal launch ops (read-mostly).
 *
 * Auth: Supabase JWT + email in admin_users OR OPS_ALLOWED_EMAILS secret.
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPS_ALLOWED_EMAILS (optional)
 */

type RequestBody = {
  action?: 'snapshot' | 'deactivate_property' | 'approve_inquiry' | 'reject_inquiry';
  property_id?: string;
  booking_id?: string;
  reason?: string;
};

type PropertyRow = {
  id: string;
  title: string;
  city: string;
  slug: string | null;
  host_id: string | null;
  is_active: boolean | null;
  images: unknown;
  price_per_day: number | null;
  price_full_day: number | null;
  created_at: string | null;
};

type HostRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subscription_status: string | null;
  plan_tier: string;
};

type BookingRow = {
  id: string;
  created_at: string | null;
  status: string | null;
  phone_verified: boolean;
  guest_phone: string;
  guest_name: string | null;
  guest_email: string | null;
  host_id: string | null;
  property_id: string;
  amount_total: number | null;
  total_price: number | null;
  offer_amount: number | null;
  host_decision_at: string | null;
  customer_reference: string | null;
  spam_score: number | null;
};

type FunnelWindowMetrics = {
  verified_inquiries: number;
  pending_host: number;
  median_host_response_minutes: number | null;
  property_views: number;
};

const VIEW_EVENTS_CAVEAT =
  'view_events counts paid listings only, one deduped insert per browser session — not total GA4 pageviews.';

function medianHostResponseMinutes(
  rows: Array<{ created_at: string | null; host_decision_at: string | null }>,
): number | null {
  const minutes = rows
    .map((row) => {
      if (!row.created_at || !row.host_decision_at) return null;
      const delta =
        (new Date(row.host_decision_at).getTime() - new Date(row.created_at).getTime()) / 60000;
      return delta >= 0 ? delta : null;
    })
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);

  if (minutes.length === 0) return null;
  const mid = Math.floor(minutes.length / 2);
  return minutes.length % 2 === 1
    ? Math.round(minutes[mid])
    : Math.round((minutes[mid - 1] + minutes[mid]) / 2);
}

async function buildFunnelWindow(
  adminClient: ReturnType<typeof createClient>,
  sinceIso: string,
): Promise<FunnelWindowMetrics> {
  const [verifiedRes, pendingRes, viewsRes, decidedRes] = await Promise.all([
    adminClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('phone_verified', true)
      .gte('created_at', sinceIso),
    adminClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_host')
      .eq('phone_verified', true)
      .gte('created_at', sinceIso),
    adminClient
      .from('view_events')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', 'property')
      .gte('timestamp', sinceIso),
    adminClient
      .from('bookings')
      .select('created_at, host_decision_at')
      .eq('phone_verified', true)
      .not('host_decision_at', 'is', null)
      .gte('created_at', sinceIso)
      .limit(500),
  ]);

  return {
    verified_inquiries: verifiedRes.count ?? 0,
    pending_host: pendingRes.count ?? 0,
    median_host_response_minutes: medianHostResponseMinutes(decidedRes.data ?? []),
    property_views: viewsRes.count ?? 0,
  };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

function hasPhone(phone: string | null | undefined): boolean {
  const d = (phone ?? '').replace(/\D/g, '');
  return d.length >= 10;
}

function hasImages(images: unknown): boolean {
  return Array.isArray(images) && images.length > 0 && typeof images[0] === 'string';
}

function hasValidPrice(p: PropertyRow): boolean {
  const day = Number(p.price_per_day ?? 0);
  const full = Number(p.price_full_day ?? 0);
  return day > 0 || full > 0;
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(-10);
  if (d.length < 4) return '—';
  return `+91 *****${d.slice(-4)}`;
}

function mapInquiryRow(
  b: BookingRow,
  propById: Map<string, PropertyRow>,
  hostById: Map<string, HostRow>,
) {
  const prop = propById.get(b.property_id);
  const host = b.host_id ? hostById.get(b.host_id) : undefined;
  const amount = b.amount_total ?? b.offer_amount ?? b.total_price ?? null;
  return {
    id: b.id,
    created_at: b.created_at,
    property_title: prop?.title ?? '—',
    property_id: b.property_id,
    city: prop?.city ?? '—',
    status: b.status,
    phone_verified: b.phone_verified,
    host_name: host?.name ?? '—',
    host_id: b.host_id,
    amount,
    guest_phone_masked: maskPhone(b.guest_phone),
    guest_phone: b.guest_phone,
    customer_reference: b.customer_reference,
    guest_name: b.guest_name,
    guest_email: b.guest_email,
    spam_score: b.spam_score,
  };
}

async function isOpsAdmin(
  email: string,
  adminClient: ReturnType<typeof createClient>,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const envList = Deno.env.get('OPS_ALLOWED_EMAILS') ?? '';
  const allowed = envList
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.includes(normalized)) return true;

  const { data } = await adminClient
    .from('admin_users')
    .select('id')
    .ilike('email', normalized)
    .maybeSingle();

  return !!data;
}

async function requireOpsUser(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { error: jsonResponse(req, { error: 'Server misconfigured' }, 500) };
  }

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return { error: jsonResponse(req, { error: 'Sign in required' }, 401) };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user?.email) {
    return { error: jsonResponse(req, { error: 'Invalid session' }, 401) };
  }

  const adminClient = createClient(supabaseUrl, serviceKey);
  const email = userData.user.email;
  const allowed = await isOpsAdmin(email, adminClient);
  if (!allowed) {
    return { error: jsonResponse(req, { error: 'Ops access denied' }, 403) };
  }

  return { adminClient, email, userId: userData.user.id };
}

async function buildSnapshot(adminClient: ReturnType<typeof createClient>) {
  const [{ data: properties }, { data: hosts }, { data: bookings }] = await Promise.all([
    adminClient
      .from('properties')
      .select(
        'id, title, city, slug, host_id, is_active, images, price_per_day, price_full_day, created_at',
      )
      .order('created_at', { ascending: false }),
    adminClient
      .from('hosts')
      .select('id, name, email, phone, subscription_status, plan_tier')
      .order('created_at', { ascending: false }),
    adminClient
      .from('bookings')
      .select(
        'id, created_at, status, phone_verified, guest_phone, guest_name, guest_email, host_id, property_id, amount_total, total_price, offer_amount, customer_reference, spam_score',
      )
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const props = (properties ?? []) as PropertyRow[];
  const hostRows = (hosts ?? []) as HostRow[];
  const bookingRows = (bookings ?? []) as BookingRow[];

  const hostById = new Map(hostRows.map((h) => [h.id, h]));
  const propById = new Map(props.map((p) => [p.id, p]));

  const activeProps = props.filter((p) => p.is_active === true);
  const inactiveProps = props.filter((p) => p.is_active !== true);

  const activeByCity: Record<string, number> = {};
  for (const p of activeProps) {
    const city = p.city?.trim() || 'Unknown';
    activeByCity[city] = (activeByCity[city] ?? 0) + 1;
  }

  const hostsMissingPhone = hostRows.filter((h) => !hasPhone(h.phone)).length;

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const verifiedInquiriesToday = bookingRows.filter(
    (b) =>
      b.phone_verified === true &&
      b.created_at &&
      new Date(b.created_at) >= startOfToday,
  ).length;

  const pendingHostInquiries = bookingRows.filter(
    (b) => b.status === 'pending_host' && b.phone_verified === true,
  ).length;

  const activeCountByHost = new Map<string, number>();
  for (const p of activeProps) {
    if (!p.host_id) continue;
    activeCountByHost.set(p.host_id, (activeCountByHost.get(p.host_id) ?? 0) + 1);
  }

  const propertyReadiness = props.map((p) => {
    const host = p.host_id ? hostById.get(p.host_id) : undefined;
    return {
      id: p.id,
      title: p.title,
      city: p.city,
      host_name: host?.name ?? '—',
      host_id: p.host_id,
      is_active: p.is_active === true,
      host_phone_present: host ? hasPhone(host.phone) : false,
      images_present: hasImages(p.images),
      price_present: hasValidPrice(p),
      slug: p.slug,
    };
  });

  const hostReadiness = hostRows.map((h) => ({
    id: h.id,
    name: h.name,
    email: h.email,
    phone_present: hasPhone(h.phone),
    active_property_count: activeCountByHost.get(h.id) ?? 0,
    subscription_status: h.subscription_status ?? 'unknown',
    plan_tier: h.plan_tier,
    subscription_active: h.subscription_status === 'active',
  }));

  const verifiedInquiries = bookingRows
    .filter((b) => b.phone_verified === true)
    .slice(0, 50)
    .map((b) => mapInquiryRow(b, propById, hostById));

  const pendingReview = bookingRows
    .filter((b) => b.status === 'inquiry_preparing')
    .slice(0, 50)
    .map((b) => mapInquiryRow(b, propById, hostById));

  const now = Date.now();
  const minutesOld = (createdAt: string | null) => {
    if (!createdAt) return 0;
    return Math.floor((now - new Date(createdAt).getTime()) / 60000);
  };

  const stuckPendingHost = bookingRows
    .filter(
      (b) =>
        b.status === 'pending_host' &&
        b.phone_verified === true &&
        minutesOld(b.created_at) >= 15,
    )
    .map((b) => {
      const prop = propById.get(b.property_id);
      const mins = minutesOld(b.created_at);
      return {
        id: b.id,
        minutes_old: mins,
        bucket: mins >= 60 ? '60+' : mins >= 30 ? '30+' : '15+',
        property_title: prop?.title ?? '—',
        property_id: b.property_id,
        host_id: b.host_id,
      };
    });

  const activeMissingHostPhone = activeProps
    .filter((p) => {
      const host = p.host_id ? hostById.get(p.host_id) : undefined;
      return !host || !hasPhone(host.phone);
    })
    .map((p) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      host_id: p.host_id,
    }));

  const activeMissingImages = activeProps
    .filter((p) => !hasImages(p.images))
    .map((p) => ({ id: p.id, title: p.title, city: p.city }));

  const activeInvalidPrice = activeProps
    .filter((p) => !hasValidPrice(p))
    .map((p) => ({ id: p.id, title: p.title, city: p.city }));

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [funnel_24h, funnel_7d] = await Promise.all([
    buildFunnelWindow(adminClient, since24h),
    buildFunnelWindow(adminClient, since7d),
  ]);

  return {
    health: {
      active_properties: activeProps.length,
      inactive_properties: inactiveProps.length,
      active_by_city: activeByCity,
      total_hosts: hostRows.length,
      hosts_missing_phone: hostsMissingPhone,
      verified_inquiries_today: verifiedInquiriesToday,
      pending_host_inquiries: pendingHostInquiries,
    },
    properties: propertyReadiness,
    hosts: hostReadiness,
    inquiries: verifiedInquiries,
    pending_review: pendingReview,
    alerts: {
      stuck_pending_host: stuckPendingHost,
      active_missing_host_phone: activeMissingHostPhone,
      active_missing_images: activeMissingImages,
      active_invalid_price: activeInvalidPrice,
    },
    funnel_24h,
    funnel_7d,
    view_events_caveat: VIEW_EVENTS_CAVEAT,
    generated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeadersFor(req) });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405);
  }

  const authResult = await requireOpsUser(req);
  if ('error' in authResult && authResult.error) return authResult.error;
  const { adminClient, userId } = authResult as {
    adminClient: ReturnType<typeof createClient>;
    userId: string;
  };

  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    body = {};
  }

  const action = body.action ?? 'snapshot';

  if (action === 'deactivate_property') {
    const propertyId = body.property_id?.trim();
    if (!propertyId) {
      return jsonResponse(req, { error: 'property_id required' }, 400);
    }

    const { error } = await adminClient
      .from('properties')
      .update({ is_active: false })
      .eq('id', propertyId);

    if (error) {
      console.error('ops deactivate_property', error.message);
      return jsonResponse(req, { error: 'Failed to deactivate property' }, 500);
    }

    return jsonResponse(req, { ok: true, property_id: propertyId });
  }

  if (action === 'approve_inquiry') {
    const bookingId = body.booking_id?.trim();
    if (!bookingId) {
      return jsonResponse(req, { error: 'booking_id required' }, 400);
    }

    const { data, error } = await adminClient.rpc('approve_inquiry_for_host', {
      p_booking_id: bookingId,
      p_reviewed_by: userId,
    });

    if (error) {
      console.error('ops approve_inquiry', error.message);
      return jsonResponse(req, { error: error.message || 'Failed to approve inquiry' }, 400);
    }

    return jsonResponse(req, { ok: true, ...(data as Record<string, unknown>) });
  }

  if (action === 'reject_inquiry') {
    const bookingId = body.booking_id?.trim();
    if (!bookingId) {
      return jsonResponse(req, { error: 'booking_id required' }, 400);
    }

    const { data, error } = await adminClient.rpc('reject_inquiry', {
      p_booking_id: bookingId,
      p_reviewed_by: userId,
      p_reason: body.reason?.trim() || null,
    });

    if (error) {
      console.error('ops reject_inquiry', error.message);
      return jsonResponse(req, { error: error.message || 'Failed to reject inquiry' }, 400);
    }

    return jsonResponse(req, { ok: true, ...(data as Record<string, unknown>) });
  }

  if (action === 'snapshot') {
    const snapshot = await buildSnapshot(adminClient);
    return jsonResponse(req, snapshot);
  }

  return jsonResponse(req, { error: 'Unknown action' }, 400);
});

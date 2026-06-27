import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';
import { clientIp } from '../_shared/client-ip.ts';
import {
  IP_INQUIRIES_PER_HOUR,
  validateInquiryAbuse,
} from '../_shared/inquiry-abuse.ts';

/**
 * submit-booking-inquiry — guest inquiry submission with lightweight abuse protection.
 *
 * Layers: honeypot, min interaction time, IP rate limit, field validation.
 * Ops review gate unchanged. p_turnstile_passed=true when abuse checks pass (legacy RPC flag).
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

type InquiryType = 'book_pay_later' | 'make_offer';

type SubmitBody = {
  inquiry_type?: InquiryType;
  property_id?: string;
  host_id?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  check_in?: string;
  check_out?: string;
  num_guests?: number;
  amount_total?: number;
  total_price?: number;
  nights?: number;
  special_requests?: string;
  include_decoration?: boolean;
  offer_amount?: number;
  offer_message?: string;
  device_fingerprint?: string;
  form_opened_at?: number;
  company_website?: string;
};

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

function normalizePhone10(raw: string): string {
  const d = String(raw ?? '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : d;
}

function isValidEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  return email.length >= 5 && email.length <= 254 && EMAIL_RE.test(email);
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(req, { error: 'Server configuration error' }, 500);
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return json(req, { error: 'Invalid JSON body' }, 400);
  }

  const ip = clientIp(req);
  const inquiryType: InquiryType = body.inquiry_type === 'make_offer' ? 'make_offer' : 'book_pay_later';

  const abuse = validateInquiryAbuse({
    honeypot: body.company_website,
    form_opened_at: body.form_opened_at,
    check_in: body.check_in,
    check_out: body.check_out,
  });
  if (!abuse.ok) {
    return json(req, { error: abuse.message }, abuse.status);
  }

  const guestEmail = String(body.guest_email ?? '').trim();
  const guestPhone = normalizePhone10(String(body.guest_phone ?? ''));
  const guestName = String(body.guest_name ?? '').trim();

  if (!guestName) {
    return json(req, { error: 'Name is required' }, 400);
  }
  if (!isValidEmail(guestEmail)) {
    return json(req, { error: 'Please enter a valid email address' }, 400);
  }
  if (guestPhone.length !== 10) {
    return json(req, { error: 'Please enter a valid 10-digit mobile number' }, 400);
  }
  if (!body.property_id || !body.host_id || !body.check_in || !body.check_out) {
    return json(req, { error: 'Missing booking details' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  if (ip) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('inquiry_submission_log')
      .select('id', { count: 'exact', head: true })
      .eq('submission_ip', ip)
      .gte('created_at', since);

    if ((count ?? 0) >= IP_INQUIRIES_PER_HOUR) {
      return json(
        req,
        { error: 'Too many inquiries from this connection. Please wait and try again.' },
        429,
      );
    }
  }

  const common = {
    p_property_id: body.property_id,
    p_host_id: body.host_id,
    p_guest_name: guestName,
    p_guest_email: guestEmail.toLowerCase(),
    p_guest_phone: guestPhone,
    p_check_in: body.check_in,
    p_check_out: body.check_out,
    p_device_fingerprint: body.device_fingerprint ?? null,
    p_submission_ip: ip || null,
    p_turnstile_passed: true,
    p_otp_verification_token: null,
  };

  let rpcName: string;
  let rpcArgs: Record<string, unknown>;

  if (inquiryType === 'make_offer') {
    rpcName = 'create_make_offer_inquiry';
    rpcArgs = {
      ...common,
      p_offer_amount: body.offer_amount,
      p_num_guests: body.num_guests ?? 1,
      p_offer_message: body.offer_message ?? null,
      p_special_requests: body.special_requests ?? null,
    };
  } else {
    rpcName = 'create_pending_booking';
    rpcArgs = {
      ...common,
      p_num_guests: body.num_guests,
      p_amount_total: body.amount_total,
      p_total_price: body.total_price,
      p_nights: body.nights,
      p_special_requests: body.special_requests ?? null,
      p_include_decoration: body.include_decoration ?? false,
    };
  }

  const { data, error } = await admin.rpc(rpcName, rpcArgs);

  if (error) {
    const msg = error.message ?? 'Could not submit inquiry';
    const status = msg.toLowerCase().includes('too many') ? 429 : 400;
    return json(req, { error: msg }, status);
  }

  return json(req, { ok: true, ...(data as Record<string, unknown>) });
});

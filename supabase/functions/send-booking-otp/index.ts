import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import {
  MAX_OTP_SENDS_PER_IP,
  MAX_OTP_SENDS_PER_PHONE,
  OTP_TTL_MIN,
  PURPOSE_BOOKING,
} from '../_shared/otp-constants.ts';
import { insertOtpRequest, listRecentOtpRequestIds } from '../_shared/otp-db.ts';
import { normalizeIndia10 } from '../_shared/otp-phone.ts';
import { sendOtp } from '../_shared/otp-provider.ts';

type SendBody = {
  phone?: string;
  purpose?: string;
};

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? 'unknown';
  return req.headers.get('cf-connecting-ip') ?? 'unknown';
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const started = performance.now();

  try {
    const body = (await req.json()) as SendBody;
    const purpose = body.purpose ?? '';

    if (purpose !== PURPOSE_BOOKING) {
      return new Response(JSON.stringify({ error: 'Invalid purpose' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const d10 = normalizeIndia10(String(body.phone ?? ''));
    if (!d10) {
      return new Response(JSON.stringify({ error: 'Valid 10-digit India phone required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const ip = clientIp(req);
    const phoneIds = await listRecentOtpRequestIds(
      supabaseUrl,
      serviceKey,
      `phone=eq.${encodeURIComponent(d10)}&purpose=eq.${encodeURIComponent(PURPOSE_BOOKING)}`,
      MAX_OTP_SENDS_PER_PHONE + 1,
    );
    if (phoneIds.includes('__error__')) {
      return new Response(JSON.stringify({ error: 'Rate limit check failed' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (phoneIds.length >= MAX_OTP_SENDS_PER_PHONE) {
      return new Response(JSON.stringify({ error: 'Too many OTP requests for this number' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const ipKey = encodeURIComponent(ip);
    const ipIds = await listRecentOtpRequestIds(
      supabaseUrl,
      serviceKey,
      `request_ip=eq.${ipKey}&purpose=eq.${encodeURIComponent(PURPOSE_BOOKING)}`,
      MAX_OTP_SENDS_PER_IP + 1,
    );
    if (ipIds.length >= MAX_OTP_SENDS_PER_IP) {
      return new Response(JSON.stringify({ error: 'Too many OTP requests from this network' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const providerResult = await sendOtp(d10);
    if (!providerResult.ok) {
      console.log(
        JSON.stringify({
          event: 'otp_send',
          ok: false,
          provider: providerResult.provider,
          latency_ms: providerResult.latencyMs,
        }),
      );
      return new Response(JSON.stringify({ error: providerResult.error }), {
        status: providerResult.statusCode,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString();
    const ok = await insertOtpRequest(supabaseUrl, serviceKey, {
      phone: d10,
      purpose: PURPOSE_BOOKING,
      code_hash: providerResult.codeHash,
      request_ip: ip,
      expires_at: expiresAt,
    });
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Could not record OTP request' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const latencyMs = Math.round(performance.now() - started);
    console.log(
      JSON.stringify({
        event: 'otp_send',
        ok: true,
        provider: providerResult.provider,
        latency_ms: latencyMs,
        provider_latency_ms: providerResult.latencyMs,
      }),
    );

    return new Response(
      JSON.stringify({
        ok: true,
        masked_phone: `+91 ••••• ••${d10.slice(8)}`,
        provider: providerResult.provider,
        latency_ms: latencyMs,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});

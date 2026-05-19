import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeadersFor } from '../_shared/cors.ts';

/**
 * send-booking-otp
 *
 * India SMS notes:
 * - Twilio Verify: templates are managed inside the Verify service (often simpler for OTP).
 * - Twilio programmable SMS (Messaging): TRAI DLT registration + approved template IDs
 *   are mandatory — do not send ad-hoc marketing-style bodies in production.
 */
const PURPOSE_BOOKING = 'booking_inquiry';
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_PHONE = 3;
const MAX_SENDS_PER_IP = 20;
const OTP_TTL_MIN = 10;

type SendBody = {
  phone?: string;
  purpose?: string;
};

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? 'unknown';
  return req.headers.get('cf-connecting-ip') ?? 'unknown';
}

function normalizeIndia10(phone: string): string | null {
  const d = phone.replace(/\D/g, '').slice(-10);
  return d.length === 10 ? d : null;
}

function e164India(d10: string): string {
  return `+91${d10}`;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function listRecentIds(
  supabaseUrl: string,
  serviceKey: string,
  query: string,
  limit: number,
): Promise<string[]> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const url =
    `${supabaseUrl}/rest/v1/otp_requests?${query}` +
    `&created_at=gte.${encodeURIComponent(since)}` +
    `&select=id&limit=${limit}`;
  const r = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!r.ok) {
    console.error('otp_requests list failed', await r.text());
    return ['__error__'];
  }
  const rows = await r.json();
  if (!Array.isArray(rows)) return ['__error__'];
  return rows.map((row: { id: string }) => row.id);
}

async function insertOtpRequest(
  supabaseUrl: string,
  serviceKey: string,
  row: {
    phone: string;
    purpose: string;
    code_hash: string;
    request_ip: string;
    expires_at: string;
  },
): Promise<boolean> {
  const r = await fetch(`${supabaseUrl}/rest/v1/otp_requests`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    console.error('otp_requests insert failed', await r.text());
    return false;
  }
  return true;
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
    const phoneIds = await listRecentIds(
      supabaseUrl,
      serviceKey,
      `phone=eq.${encodeURIComponent(d10)}&purpose=eq.${encodeURIComponent(PURPOSE_BOOKING)}`,
      MAX_SENDS_PER_PHONE + 1,
    );
    if (phoneIds.includes('__error__')) {
      return new Response(JSON.stringify({ error: 'Rate limit check failed' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (phoneIds.length >= MAX_SENDS_PER_PHONE) {
      return new Response(JSON.stringify({ error: 'Too many OTP requests for this number' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const ipKey = encodeURIComponent(ip);
    const ipIds = await listRecentIds(
      supabaseUrl,
      serviceKey,
      `request_ip=eq.${ipKey}&purpose=eq.${encodeURIComponent(PURPOSE_BOOKING)}`,
      MAX_SENDS_PER_IP + 1,
    );
    if (ipIds.length >= MAX_SENDS_PER_IP) {
      return new Response(JSON.stringify({ error: 'Too many OTP requests from this network' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const verifySid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');
    const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken) {
      return new Response(JSON.stringify({ error: 'SMS provider not configured' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const auth = btoa(`${accountSid}:${authToken}`);
    const to = e164India(d10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString();

    let codeHash = 'twilio_verify';

    if (verifySid) {
      const vfUrl =
        `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifySid)}/Verifications`;
      const vfBody = new URLSearchParams({ To: to, Channel: 'sms' });
      const vfRes = await fetch(vfUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: vfBody.toString(),
      });
      if (!vfRes.ok) {
        console.error('Twilio Verify send failed', await vfRes.text());
        return new Response(JSON.stringify({ error: 'Failed to send verification SMS' }), {
          status: 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    } else {
      if (!twilioFrom) {
        return new Response(
          JSON.stringify({
            error:
              'Set TWILIO_VERIFY_SERVICE_SID or TWILIO_PHONE_NUMBER (DLT template required for India SMS)',
          }),
          {
            status: 500,
            headers: { ...cors, 'Content-Type': 'application/json' },
          },
        );
      }
      const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
      codeHash = await sha256Hex(otp);
      const msg =
        `Your XpressBnB booking verification code is ${otp}. Valid ${OTP_TTL_MIN} minutes. Do not share this code.`;
      const msgUrl =
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
      const msgBody = new URLSearchParams({
        To: to,
        From: twilioFrom,
        Body: msg,
      });
      const msgRes = await fetch(msgUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: msgBody.toString(),
      });
      if (!msgRes.ok) {
        console.error('Twilio SMS failed', await msgRes.text());
        return new Response(JSON.stringify({ error: 'Failed to send verification SMS' }), {
          status: 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    const ok = await insertOtpRequest(supabaseUrl, serviceKey, {
      phone: d10,
      purpose: PURPOSE_BOOKING,
      code_hash: codeHash,
      request_ip: ip,
      expires_at: expiresAt,
    });
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Could not record OTP request' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        masked_phone: `+91 ••••• ••${d10.slice(8)}`,
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

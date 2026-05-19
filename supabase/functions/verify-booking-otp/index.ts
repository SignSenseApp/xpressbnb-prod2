import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeadersFor } from '../_shared/cors.ts';

const PURPOSE_BOOKING = 'booking_inquiry';
const VERIFY_TOKEN_TTL_MIN = 15;
const MAX_OTP_ATTEMPTS = 8;

type VerifyBody = {
  phone?: string;
  otp?: string;
  booking_draft_id?: string | null;
};

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

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
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
    const body = (await req.json()) as VerifyBody;
    const d10 = normalizeIndia10(String(body.phone ?? ''));
    const otp = String(body.otp ?? '').trim();

    if (!d10 || !/^\d{6}$/.test(otp)) {
      return new Response(JSON.stringify({ error: 'Phone and 6-digit OTP required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let draftId: string | null = null;
    if (body.booking_draft_id != null && String(body.booking_draft_id).length > 0) {
      const raw = String(body.booking_draft_id);
      if (!isUuid(raw)) {
        return new Response(JSON.stringify({ error: 'Invalid booking_draft_id' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      draftId = raw;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const verifySid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

    if (!accountSid || !authToken) {
      return new Response(JSON.stringify({ error: 'SMS provider not configured' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const auth = btoa(`${accountSid}:${authToken}`);
    const to = e164India(d10);

    let approved = false;

    if (verifySid) {
      const chkUrl =
        `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifySid)}/VerificationCheck`;
      const chkBody = new URLSearchParams({ To: to, Code: otp });
      const chkRes = await fetch(chkUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: chkBody.toString(),
      });
      const chkJson = (await chkRes.json()) as { status?: string };
      if (!chkRes.ok) {
        console.error('Twilio VerifyCheck HTTP error', JSON.stringify(chkJson));
        return new Response(JSON.stringify({ error: 'Verification failed' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      approved = chkJson.status === 'approved';
    } else {
      const q =
        `phone=eq.${encodeURIComponent(d10)}` +
        `&purpose=eq.${encodeURIComponent(PURPOSE_BOOKING)}` +
        '&order=created_at.desc&limit=1';
      const sessRes = await fetch(`${supabaseUrl}/rest/v1/otp_requests?${q}`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      if (!sessRes.ok) {
        console.error('otp_requests fetch failed', await sessRes.text());
        return new Response(JSON.stringify({ error: 'Verification failed' }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      const sessions = await sessRes.json();
      const session = Array.isArray(sessions) && sessions[0] ? sessions[0] : null;
      if (
        !session ||
        String(session.code_hash) === 'twilio_verify' ||
        new Date(session.expires_at) < new Date()
      ) {
        return new Response(JSON.stringify({ error: 'Invalid or expired OTP session' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const attempts = Number(session.attempts ?? 0);
      if (attempts >= MAX_OTP_ATTEMPTS) {
        return new Response(JSON.stringify({ error: 'Too many incorrect attempts' }), {
          status: 429,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const otpHash = await sha256Hex(otp);
      if (otpHash !== session.code_hash) {
        await fetch(`${supabaseUrl}/rest/v1/otp_requests?id=eq.${session.id}`, {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ attempts: attempts + 1 }),
        });
        return new Response(JSON.stringify({ error: 'Invalid OTP' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      approved = true;
    }

    if (!approved) {
      return new Response(JSON.stringify({ error: 'Invalid OTP' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const expiresAt = new Date(
      Date.now() + VERIFY_TOKEN_TTL_MIN * 60 * 1000,
    ).toISOString();

    const ins = await fetch(`${supabaseUrl}/rest/v1/booking_otp_verifications`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        phone: d10,
        booking_draft_id: draftId,
        expires_at: expiresAt,
      }),
    });

    if (!ins.ok) {
      console.error('booking_otp_verifications insert failed', await ins.text());
      return new Response(JSON.stringify({ error: 'Could not finalize verification' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const rows = await ins.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    const token = row?.id as string | undefined;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Verification persistence failed' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        verification_token: token,
        expires_at: expiresAt,
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

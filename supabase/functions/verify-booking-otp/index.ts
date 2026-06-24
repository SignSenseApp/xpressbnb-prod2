import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import {
  BOOKING_OTP_CODE_LENGTH,
  BOOKING_OTP_PATTERN,
  isExternalOtpMarker,
  MAX_OTP_ATTEMPTS,
  VERIFY_TOKEN_TTL_MIN,
} from '../_shared/otp-constants.ts';
import {
  fetchLatestOtpRequest,
  incrementOtpAttempts,
} from '../_shared/otp-db.ts';
import { normalizeIndia10 } from '../_shared/otp-phone.ts';
import { sha256Hex, verifyOtp } from '../_shared/otp-provider.ts';

type VerifyBody = {
  phone?: string;
  otp?: string;
  booking_draft_id?: string | null;
};

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

  const started = performance.now();

  try {
    const body = (await req.json()) as VerifyBody;
    const d10 = normalizeIndia10(String(body.phone ?? ''));
    const otp = String(body.otp ?? '').trim();

    if (!d10 || !BOOKING_OTP_PATTERN.test(otp)) {
      return new Response(
        JSON.stringify({ error: `Phone and ${BOOKING_OTP_CODE_LENGTH}-digit OTP required` }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        },
      );
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

    const providerResult = await verifyOtp(d10, otp);
    let approved = false;

    if (!providerResult.ok) {
      console.log(
        JSON.stringify({
          event: 'otp_verify',
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

    if ('localHash' in providerResult && providerResult.localHash) {
      const session = await fetchLatestOtpRequest(supabaseUrl, serviceKey, d10);
      if (
        !session ||
        isExternalOtpMarker(session.code_hash) ||
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
        await incrementOtpAttempts(supabaseUrl, serviceKey, session.id, attempts);
        return new Response(JSON.stringify({ error: 'Invalid OTP' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      approved = true;
    } else {
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

    const latencyMs = Math.round(performance.now() - started);
    console.log(
      JSON.stringify({
        event: 'otp_verify',
        ok: true,
        provider: providerResult.provider,
        latency_ms: latencyMs,
        provider_latency_ms: providerResult.latencyMs,
      }),
    );

    return new Response(
      JSON.stringify({
        ok: true,
        verification_token: token,
        expires_at: expiresAt,
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

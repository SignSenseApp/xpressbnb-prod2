import {
  BOOKING_OTP_CODE_LENGTH,
  EXTERNAL_OTP_MARKER,
} from './otp-constants.ts';
import {
  fetchWithTelecomTimeout,
  TelecomFetchTimeoutError,
} from './otp-http.ts';
import { e164India } from './otp-phone.ts';

export type TwilioSendResult =
  | { ok: true; codeHash: string }
  | { ok: false; error: string; statusCode: number };

export type TwilioVerifyResult =
  | { ok: true; mode: 'external' | 'local' }
  | { ok: false; error: string; statusCode: number };

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function twilioAuth(): { accountSid: string; authToken: string; authHeader: string } | null {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!accountSid || !authToken) return null;
  return {
    accountSid,
    authToken,
    authHeader: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
  };
}

function logTwilio(event: string, ok: boolean, latencyMs: number, extra?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      event,
      provider: 'twilio',
      ok,
      latency_ms: latencyMs,
      ...extra,
    }),
  );
}

/** Send OTP via Twilio Verify (preferred) or programmable SMS fallback. */
export async function sendOtp(phone10: string): Promise<TwilioSendResult> {
  const creds = twilioAuth();
  if (!creds) {
    return { ok: false, error: 'SMS provider not configured', statusCode: 500 };
  }

  const verifySid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');
  const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER');
  const to = e164India(phone10);
  const started = performance.now();

  if (verifySid) {
    try {
      const vfUrl =
        `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifySid)}/Verifications`;
      const vfBody = new URLSearchParams({ To: to, Channel: 'sms' });
      const vfRes = await fetchWithTelecomTimeout(
        vfUrl,
        {
          method: 'POST',
          headers: {
            Authorization: creds.authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: vfBody.toString(),
        },
        { provider: 'twilio', operation: 'send' },
      );
      const latencyMs = Math.round(performance.now() - started);
      if (!vfRes.ok) {
        console.error('Twilio Verify send failed', await vfRes.text());
        logTwilio('otp_provider_send', false, latencyMs, { mode: 'verify' });
        return { ok: false, error: 'Failed to send verification SMS', statusCode: 502 };
      }
      logTwilio('otp_provider_send', true, latencyMs, { mode: 'verify' });
      return { ok: true, codeHash: EXTERNAL_OTP_MARKER };
    } catch (e) {
      const latencyMs = Math.round(performance.now() - started);
      if (e instanceof TelecomFetchTimeoutError) {
        logTwilio('otp_provider_send', false, latencyMs, { mode: 'verify', timed_out: true });
        return { ok: false, error: 'Failed to send verification SMS', statusCode: 502 };
      }
      throw e;
    }
  }

  if (!twilioFrom) {
    return {
      ok: false,
      error:
        'Set TWILIO_VERIFY_SERVICE_SID or TWILIO_PHONE_NUMBER (DLT template required for India SMS)',
      statusCode: 500,
    };
  }

  const otp = (
    Math.floor(
      10 ** (BOOKING_OTP_CODE_LENGTH - 1) +
        Math.random() * 9 * 10 ** (BOOKING_OTP_CODE_LENGTH - 1),
    )
  ).toString();
  const codeHash = await sha256Hex(otp);
  const msg =
    `Your XpressBNB OTP is ${otp}. Do not share it with anyone. Verified inquiries unlock host contact safely.`;
  const msgUrl =
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(creds.accountSid)}/Messages.json`;
  const msgBody = new URLSearchParams({ To: to, From: twilioFrom, Body: msg });
  try {
    const msgRes = await fetchWithTelecomTimeout(
      msgUrl,
      {
        method: 'POST',
        headers: {
          Authorization: creds.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: msgBody.toString(),
      },
      { provider: 'twilio', operation: 'send' },
    );
    const latencyMs = Math.round(performance.now() - started);
    if (!msgRes.ok) {
      console.error('Twilio SMS failed', await msgRes.text());
      logTwilio('otp_provider_send', false, latencyMs, { mode: 'sms' });
      return { ok: false, error: 'Failed to send verification SMS', statusCode: 502 };
    }
    logTwilio('otp_provider_send', true, latencyMs, { mode: 'sms' });
    return { ok: true, codeHash };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - started);
    if (e instanceof TelecomFetchTimeoutError) {
      logTwilio('otp_provider_send', false, latencyMs, { mode: 'sms', timed_out: true });
      return { ok: false, error: 'Failed to send verification SMS', statusCode: 502 };
    }
    throw e;
  }
}

/**
 * Verify OTP via Twilio Verify when configured; otherwise signal local hash verification.
 * Local hash verification is handled by the edge function using otp_requests.
 */
export async function verifyOtp(phone10: string, otp: string): Promise<TwilioVerifyResult> {
  const creds = twilioAuth();
  if (!creds) {
    return { ok: false, error: 'SMS provider not configured', statusCode: 500 };
  }

  const verifySid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');
  if (!verifySid) {
    return { ok: true, mode: 'local' };
  }

  const to = e164India(phone10);
  const started = performance.now();
  const chkUrl =
    `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifySid)}/VerificationCheck`;
  const chkBody = new URLSearchParams({ To: to, Code: otp });
  try {
    const chkRes = await fetchWithTelecomTimeout(
      chkUrl,
      {
        method: 'POST',
        headers: {
          Authorization: creds.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: chkBody.toString(),
      },
      { provider: 'twilio', operation: 'verify' },
    );
    const latencyMs = Math.round(performance.now() - started);
    const chkJson = (await chkRes.json()) as { status?: string };
    if (!chkRes.ok) {
      console.error('Twilio VerifyCheck HTTP error', JSON.stringify(chkJson));
      logTwilio('otp_provider_verify', false, latencyMs, { mode: 'verify' });
      return { ok: false, error: 'Verification failed', statusCode: 400 };
    }
    if (chkJson.status !== 'approved') {
      logTwilio('otp_provider_verify', false, latencyMs, { mode: 'verify' });
      return { ok: false, error: 'Invalid OTP', statusCode: 400 };
    }
    logTwilio('otp_provider_verify', true, latencyMs, { mode: 'verify' });
    return { ok: true, mode: 'external' };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - started);
    if (e instanceof TelecomFetchTimeoutError) {
      logTwilio('otp_provider_verify', false, latencyMs, { mode: 'verify', timed_out: true });
      return { ok: false, error: 'Verification failed', statusCode: 502 };
    }
    throw e;
  }
}

export { sha256Hex };

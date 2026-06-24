import { BOOKING_OTP_CODE_LENGTH, OTP_TTL_MIN } from './otp-constants.ts';
import {
  fetchWithTelecomTimeout,
  TelecomFetchTimeoutError,
} from './otp-http.ts';
import { msg91Mobile } from './otp-phone.ts';

const MSG91_SEND_URL = 'https://control.msg91.com/api/v5/otp';
const MSG91_VERIFY_URL = 'https://control.msg91.com/api/v5/otp/verify';

export type Msg91SendResult =
  | { ok: true; requestId?: string }
  | { ok: false; error: string; statusCode: number };

export type Msg91VerifyResult =
  | { ok: true }
  | { ok: false; error: string; statusCode: number };

type Msg91Json = {
  type?: string;
  message?: string;
  request_id?: string;
  code?: string | number;
};

function msg91Config(): { authKey: string; templateId: string } | null {
  const authKey = Deno.env.get('MSG91_AUTH_KEY')?.trim();
  const templateId = Deno.env.get('MSG91_TEMPLATE_ID')?.trim();
  if (!authKey || !templateId) return null;
  return { authKey, templateId };
}

function msg91Code(body: Msg91Json): string {
  return String(body.code ?? '').trim();
}

function msg91Message(body: Msg91Json): string {
  return String(body.message ?? '').trim();
}

function msg91MessageLower(body: Msg91Json): string {
  return msg91Message(body).toLowerCase();
}

/** MSG91 success shapes vary slightly across API versions. */
function isMsg91SendSuccess(res: Response, body: Msg91Json): boolean {
  if (!res.ok) return false;
  const type = String(body.type ?? '').toLowerCase();
  const msg = msg91MessageLower(body);
  if (type === 'success') return true;
  if (msg.includes('otp sent') || msg.includes('successfully')) return true;
  return false;
}

function isMsg91VerifySuccess(res: Response, body: Msg91Json): boolean {
  if (!res.ok) return false;
  const type = String(body.type ?? '').toLowerCase();
  const msg = msg91MessageLower(body);
  if (type === 'success') return true;
  if (msg.includes('otp verified success')) return true;
  if (msg.includes('verified')) return true;
  return false;
}

function mapMsg91DltError(): { error: string; statusCode: number } {
  return {
    error: 'Could not send verification SMS. Please try again in a few minutes.',
    statusCode: 502,
  };
}

function mapMsg91SendError(status: number, body: Msg91Json): { error: string; statusCode: number } {
  const msg = msg91MessageLower(body);
  const code = msg91Code(body);

  if (status === 401 || msg.includes('auth') || msg.includes('invalid key')) {
    return { error: 'SMS verification is temporarily unavailable', statusCode: 500 };
  }
  if (
    code === '211' ||
    code === '203' ||
    msg.includes('template') ||
    msg.includes('dlt') ||
    msg.includes('scrub') ||
    msg.includes('pe id') ||
    msg.includes('header/sender')
  ) {
    return mapMsg91DltError();
  }
  if (msg.includes('invalid mobile') || msg.includes('invalid number')) {
    return { error: 'Enter a valid 10-digit mobile number', statusCode: 400 };
  }
  if (status === 429 || msg.includes('limit') || msg.includes('too many')) {
    return { error: 'Too many OTP requests. Please try again later.', statusCode: 429 };
  }
  return { error: 'Failed to send verification SMS', statusCode: status >= 400 ? status : 502 };
}

function mapMsg91VerifyError(status: number, body: Msg91Json): { error: string; statusCode: number } {
  const msg = msg91MessageLower(body);
  const code = msg91Code(body);

  if (status === 401 || msg.includes('auth') || msg.includes('invalid key')) {
    return { error: 'Verification is temporarily unavailable', statusCode: 500 };
  }
  if (code === '203' || msg.includes('dlt') || msg.includes('template')) {
    return { error: 'Verification is temporarily unavailable', statusCode: 502 };
  }
  if (msg.includes('expire')) {
    return { error: 'Invalid or expired code', statusCode: 400 };
  }
  if (msg.includes('not match') || msg.includes('incorrect') || msg.includes('invalid')) {
    return { error: 'Invalid OTP', statusCode: 400 };
  }
  if (status === 429 || msg.includes('limit')) {
    return { error: 'Too many incorrect attempts', statusCode: 429 };
  }
  return { error: 'Invalid OTP', statusCode: 400 };
}

function logMsg91Provider(
  operation: 'send' | 'verify',
  ok: boolean,
  latencyMs: number,
  extra?: Record<string, unknown>,
): void {
  console.log(
    JSON.stringify({
      event: `otp_provider_${operation}`,
      provider: 'msg91',
      ok,
      latency_ms: latencyMs,
      ...extra,
    }),
  );
}

async function parseMsg91Json(res: Response): Promise<Msg91Json> {
  try {
    const body = await res.json();
    if (body && typeof body === 'object') return body as Msg91Json;
    return {};
  } catch {
    return {};
  }
}

function timeoutUserMessage(operation: 'send' | 'verify'): { error: string; statusCode: number } {
  return operation === 'send'
    ? { error: 'Failed to send verification SMS', statusCode: 502 }
    : { error: 'Verification failed', statusCode: 502 };
}

/**
 * Send a 4-digit OTP via MSG91 OTP API v5.
 * DLT template must be mapped to MSG91_TEMPLATE_ID in dashboard secrets.
 */
export async function sendOtp(phone10: string): Promise<Msg91SendResult> {
  const cfg = msg91Config();
  if (!cfg) {
    return {
      ok: false,
      error: 'SMS provider not configured',
      statusCode: 500,
    };
  }

  const mobile = msg91Mobile(phone10);
  const started = performance.now();

  try {
    const res = await fetchWithTelecomTimeout(
      MSG91_SEND_URL,
      {
        method: 'POST',
        headers: {
          authkey: cfg.authKey,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          template_id: cfg.templateId,
          mobile,
          otp_length: String(BOOKING_OTP_CODE_LENGTH),
          otp_expiry: String(OTP_TTL_MIN),
        }),
      },
      { provider: 'msg91', operation: 'send' },
    );

    const latencyMs = Math.round(performance.now() - started);
    const body = await parseMsg91Json(res);

    if (isMsg91SendSuccess(res, body)) {
      logMsg91Provider('send', true, latencyMs, {
        request_id: body.request_id ?? null,
      });
      return { ok: true, requestId: body.request_id };
    }

    console.error(
      JSON.stringify({
        event: 'otp_provider_send_unexpected',
        provider: 'msg91',
        http_status: res.status,
        body,
        latency_ms: latencyMs,
      }),
    );
    const mapped = mapMsg91SendError(res.status, body);
    logMsg91Provider('send', false, latencyMs, {
      http_status: res.status,
      provider_code: msg91Code(body) || null,
      mapped_status: mapped.statusCode,
    });
    return { ok: false, ...mapped };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - started);
    if (e instanceof TelecomFetchTimeoutError) {
      logMsg91Provider('send', false, latencyMs, { timed_out: true });
      return { ok: false, ...timeoutUserMessage('send') };
    }
    console.error('MSG91 send network error', e);
    logMsg91Provider('send', false, latencyMs, { network_error: true });
    return { ok: false, error: 'Failed to send verification SMS', statusCode: 502 };
  }
}

/** Verify OTP via MSG91 OTP API v5. */
export async function verifyOtp(phone10: string, otp: string): Promise<Msg91VerifyResult> {
  const cfg = msg91Config();
  if (!cfg) {
    return {
      ok: false,
      error: 'SMS provider not configured',
      statusCode: 500,
    };
  }

  const mobile = msg91Mobile(phone10);
  const url = new URL(MSG91_VERIFY_URL);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp', otp.trim());
  // Must match send OTP expiry — MSG91 v5 pairs custom send expiry with verify.
  url.searchParams.set('otp_expiry', String(OTP_TTL_MIN));

  const started = performance.now();

  try {
    const res = await fetchWithTelecomTimeout(
      url.toString(),
      {
        method: 'GET',
        headers: {
          authkey: cfg.authKey,
          accept: 'application/json',
        },
      },
      { provider: 'msg91', operation: 'verify' },
    );

    const latencyMs = Math.round(performance.now() - started);
    const body = await parseMsg91Json(res);

    if (isMsg91VerifySuccess(res, body)) {
      logMsg91Provider('verify', true, latencyMs);
      return { ok: true };
    }

    console.error(
      JSON.stringify({
        event: 'otp_provider_verify_unexpected',
        provider: 'msg91',
        http_status: res.status,
        body,
        latency_ms: latencyMs,
      }),
    );
    const mapped = mapMsg91VerifyError(res.status, body);
    logMsg91Provider('verify', false, latencyMs, {
      http_status: res.status,
      provider_code: msg91Code(body) || null,
      mapped_status: mapped.statusCode,
    });
    return { ok: false, ...mapped };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - started);
    if (e instanceof TelecomFetchTimeoutError) {
      logMsg91Provider('verify', false, latencyMs, { timed_out: true });
      return { ok: false, ...timeoutUserMessage('verify') };
    }
    console.error('MSG91 verify network error', e);
    logMsg91Provider('verify', false, latencyMs, { network_error: true });
    return { ok: false, error: 'Verification failed', statusCode: 502 };
  }
}

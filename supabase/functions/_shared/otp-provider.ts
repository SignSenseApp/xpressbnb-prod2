import {
  EXTERNAL_OTP_MARKER,
  resolveOtpProvider,
  type OtpProviderName,
} from './otp-constants.ts';
import * as msg91 from './msg91-otp.ts';
import * as twilio from './twilio-otp.ts';
import { maskPhone10 } from './otp-phone.ts';

export type ProviderSendResult =
  | { ok: true; codeHash: string; provider: OtpProviderName; latencyMs: number }
  | { ok: false; error: string; statusCode: number; provider: OtpProviderName; latencyMs: number };

export type ProviderVerifyResult =
  | { ok: true; provider: OtpProviderName; latencyMs: number; localHash?: false }
  | { ok: true; provider: OtpProviderName; latencyMs: number; localHash: true }
  | { ok: false; error: string; statusCode: number; provider: OtpProviderName; latencyMs: number };

function auditLog(event: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ...fields }));
}

export function getOtpProvider(): OtpProviderName {
  const resolved = resolveOtpProvider();
  const flag = Deno.env.get('OTP_PROVIDER')?.trim() ?? null;
  auditLog('provider_selected', {
    provider: resolved,
    otp_provider_env: flag,
    source: flag === 'msg91' || flag === 'twilio' ? 'OTP_PROVIDER' : 'default_twilio',
  });
  return resolved;
}

export async function sendOtp(phone10: string): Promise<ProviderSendResult> {
  const provider = getOtpProvider();
  const started = performance.now();
  const maskedPhone = maskPhone10(phone10);

  auditLog('provider_send_started', {
    provider,
    phone_masked: maskedPhone,
    template_id: provider === 'msg91' ? Deno.env.get('MSG91_TEMPLATE_ID')?.trim() ?? null : null,
  });

  if (provider === 'msg91') {
    const result = await msg91.sendOtp(phone10);
    const latencyMs = Math.round(performance.now() - started);
    if (!result.ok) {
      auditLog('provider_send_failed', {
        provider,
        phone_masked: maskedPhone,
        response_code: result.statusCode,
      });
      return { ...result, provider, latencyMs };
    }
    auditLog('provider_send_success', {
      provider,
      phone_masked: maskedPhone,
      response_code: 200,
    });
    return {
      ok: true,
      codeHash: EXTERNAL_OTP_MARKER,
      provider,
      latencyMs,
    };
  }

  const result = await twilio.sendOtp(phone10);
  const latencyMs = Math.round(performance.now() - started);
  if (!result.ok) {
    auditLog('provider_send_failed', {
      provider,
      phone_masked: maskedPhone,
      response_code: result.statusCode,
    });
    return { ...result, provider, latencyMs };
  }
  auditLog('provider_send_success', {
    provider,
    phone_masked: maskedPhone,
    response_code: 200,
  });
  return { ok: true, codeHash: result.codeHash, provider, latencyMs };
}

export async function verifyOtp(phone10: string, otp: string): Promise<ProviderVerifyResult> {
  const provider = getOtpProvider();
  const started = performance.now();

  if (provider === 'msg91') {
    const result = await msg91.verifyOtp(phone10, otp);
    const latencyMs = Math.round(performance.now() - started);
    if (!result.ok) {
      return { ...result, provider, latencyMs };
    }
    return { ok: true, provider, latencyMs };
  }

  const result = await twilio.verifyOtp(phone10, otp);
  const latencyMs = Math.round(performance.now() - started);
  if (!result.ok) {
    return { ...result, provider, latencyMs };
  }
  if (result.mode === 'local') {
    return { ok: true, provider, latencyMs, localHash: true };
  }
  return { ok: true, provider, latencyMs };
}

export { sha256Hex } from './twilio-otp.ts';

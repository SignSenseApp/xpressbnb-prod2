import {
  EXTERNAL_OTP_MARKER,
  resolveOtpProvider,
  type OtpProviderName,
} from './otp-constants.ts';
import * as msg91 from './msg91-otp.ts';
import * as twilio from './twilio-otp.ts';

export type ProviderSendResult =
  | { ok: true; codeHash: string; provider: OtpProviderName; latencyMs: number }
  | { ok: false; error: string; statusCode: number; provider: OtpProviderName; latencyMs: number };

export type ProviderVerifyResult =
  | { ok: true; provider: OtpProviderName; latencyMs: number; localHash?: false }
  | { ok: true; provider: OtpProviderName; latencyMs: number; localHash: true }
  | { ok: false; error: string; statusCode: number; provider: OtpProviderName; latencyMs: number };

export function getOtpProvider(): OtpProviderName {
  return resolveOtpProvider();
}

export async function sendOtp(phone10: string): Promise<ProviderSendResult> {
  const provider = getOtpProvider();
  const started = performance.now();

  if (provider === 'msg91') {
    const result = await msg91.sendOtp(phone10);
    const latencyMs = Math.round(performance.now() - started);
    if (!result.ok) {
      return { ...result, provider, latencyMs };
    }
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
    return { ...result, provider, latencyMs };
  }
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

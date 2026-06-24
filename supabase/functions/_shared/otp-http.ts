/** Telecom HTTP helpers — bounded fetch with structured failure logs. */

export const TELECOM_FETCH_TIMEOUT_MS = 15_000;

export type TelecomFetchMeta = {
  provider: 'msg91' | 'twilio';
  operation: 'send' | 'verify';
};

export class TelecomFetchTimeoutError extends Error {
  constructor(provider: string, operation: string) {
    super(`Telecom ${provider} ${operation} timed out after ${TELECOM_FETCH_TIMEOUT_MS}ms`);
    this.name = 'TelecomFetchTimeoutError';
  }
}

export async function fetchWithTelecomTimeout(
  url: string,
  init: RequestInit,
  meta: TelecomFetchMeta,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TELECOM_FETCH_TIMEOUT_MS);
  const started = performance.now();

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    const latencyMs = Math.round(performance.now() - started);
    const timedOut = e instanceof Error && e.name === 'AbortError';
    console.error(
      JSON.stringify({
        event: 'otp_provider_fetch_error',
        provider: meta.provider,
        operation: meta.operation,
        timed_out: timedOut,
        latency_ms: latencyMs,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    if (timedOut) throw new TelecomFetchTimeoutError(meta.provider, meta.operation);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Client IP for Supabase Edge Functions — hosting agnostic.
 *
 * Priority (per production migration spec):
 * 1. x-forwarded-for (first hop — Vercel, most reverse proxies)
 * 2. x-real-ip
 * 3. forwarded (RFC 7239 `for=` token)
 * 4. cf-connecting-ip (legacy Cloudflare proxy only — not hosting assumption)
 * 5. empty string
 *
 * Used for rate limits and Turnstile siteverify remoteip. Never log raw headers in production.
 */

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function normalizeIp(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Bracketed IPv6 from Forwarded header: [2001:db8::1]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1);
  }

  // IPv4 with optional port
  const ipv4Port = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4Port) return ipv4Port[1];

  if (IPV4_RE.test(trimmed)) return trimmed;

  // Unbracketed IPv6 or host identifiers — return as-is when non-empty
  return trimmed;
}

function parseForwardedFor(header: string): string {
  // RFC 7239 examples: for=192.0.2.60, for="[2001:db8::1]:8000"
  const match = header.match(/for=(?:"?\[?)([^;\],"]+)/i);
  if (!match?.[1]) return '';
  return normalizeIp(match[1].replace(/"$/g, ''));
}

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    const normalized = first ? normalizeIp(first) : '';
    if (normalized) return normalized;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    const normalized = normalizeIp(realIp);
    if (normalized) return normalized;
  }

  const forwarded = req.headers.get('forwarded');
  if (forwarded) {
    const parsed = parseForwardedFor(forwarded);
    if (parsed) return parsed;
  }

  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) {
    const normalized = normalizeIp(cfIp);
    if (normalized) return normalized;
  }

  return '';
}

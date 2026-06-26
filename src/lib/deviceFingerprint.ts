/**
 * Client-side device fingerprint for inquiry spam scoring (non-invasive).
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return '';

  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency ?? ''),
  ];

  const raw = parts.join('|');

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32);
    } catch {
      /* fall through */
    }
  }

  return raw.slice(0, 64);
}

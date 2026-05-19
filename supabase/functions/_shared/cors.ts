/**
 * CORS for guest booking flows (production site + local dev).
 */
const ALLOWED_ORIGINS = [
  'https://www.xpressbnb.com',
  'https://xpressbnb.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allow = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : 'https://www.xpressbnb.com';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

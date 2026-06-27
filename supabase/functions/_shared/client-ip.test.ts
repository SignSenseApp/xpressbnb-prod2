import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip.ts';

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request('https://example.com/inquiry', { headers });
}

describe('clientIp', () => {
  it('prefers x-forwarded-for first hop', () => {
    expect(
      clientIp(
        requestWithHeaders({
          'x-forwarded-for': '203.0.113.10, 70.41.3.18',
          'x-real-ip': '198.51.100.1',
          'cf-connecting-ip': '192.0.2.1',
        }),
      ),
    ).toBe('203.0.113.10');
  });

  it('falls back to x-real-ip', () => {
    expect(
      clientIp(
        requestWithHeaders({
          'x-real-ip': '198.51.100.44',
          'cf-connecting-ip': '192.0.2.1',
        }),
      ),
    ).toBe('198.51.100.44');
  });

  it('parses forwarded header for=', () => {
    expect(
      clientIp(
        requestWithHeaders({
          forwarded: 'for=192.0.2.60;proto=https;by=203.0.113.43',
        }),
      ),
    ).toBe('192.0.2.60');
  });

  it('uses cf-connecting-ip only as last resort', () => {
    expect(
      clientIp(
        requestWithHeaders({
          'cf-connecting-ip': '192.0.2.99',
        }),
      ),
    ).toBe('192.0.2.99');
  });

  it('returns empty when no proxy headers', () => {
    expect(clientIp(requestWithHeaders({}))).toBe('');
  });

  it('strips IPv4 port suffix', () => {
    expect(
      clientIp(
        requestWithHeaders({
          'x-forwarded-for': '203.0.113.10:443',
        }),
      ),
    ).toBe('203.0.113.10');
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { validateClientEnv } from './env';

describe('validateClientEnv', () => {
  const env = import.meta.env;

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'maps-key');
    vi.stubEnv('PROD', false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.assign(import.meta.env, env);
  });

  it('returns no issues when required vars are set', () => {
    const errors = validateClientEnv().filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('errors when Supabase URL missing', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    expect(validateClientEnv().some((i) => i.key === 'VITE_SUPABASE_URL' && i.severity === 'error')).toBe(
      true,
    );
  });

});

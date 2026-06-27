/**
 * Client-side environment validation — clear diagnostics, no secret exposure.
 * Supabase URL/key hard-fail remains in supabase.ts (app cannot start without them).
 */

export type EnvIssueSeverity = 'error' | 'warn';

export type EnvIssue = {
  key: string;
  severity: EnvIssueSeverity;
  message: string;
};

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Validate Vite `import.meta.env` for guest marketplace runtime. */
export function validateClientEnv(): EnvIssue[] {
  const issues: EnvIssue[] = [];

  if (!isNonEmpty(import.meta.env.VITE_SUPABASE_URL)) {
    issues.push({
      key: 'VITE_SUPABASE_URL',
      severity: 'error',
      message: 'Missing Supabase project URL. Set in Vercel or .env.local — see docs/ENVIRONMENT.md.',
    });
  } else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(import.meta.env.VITE_SUPABASE_URL.trim())) {
    issues.push({
      key: 'VITE_SUPABASE_URL',
      severity: 'warn',
      message: 'VITE_SUPABASE_URL does not look like a standard Supabase project URL.',
    });
  }

  if (!isNonEmpty(import.meta.env.VITE_SUPABASE_ANON_KEY)) {
    issues.push({
      key: 'VITE_SUPABASE_ANON_KEY',
      severity: 'error',
      message: 'Missing Supabase anon key. Set in Vercel or .env.local.',
    });
  }

  if (!isNonEmpty(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)) {
    issues.push({
      key: 'VITE_GOOGLE_MAPS_API_KEY',
      severity: 'warn',
      message: 'Maps views will be limited without VITE_GOOGLE_MAPS_API_KEY.',
    });
  }

  return issues;
}

/** Log env issues once at startup — errors in prod, warnings in dev. */
export function reportClientEnvIssues(): void {
  const issues = validateClientEnv();
  if (issues.length === 0) return;

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warn');

  if (import.meta.env.PROD && errors.length > 0) {
    console.error(
      '[XpressBnB] Configuration error — fix Vercel environment variables:',
      errors.map((e) => `${e.key}: ${e.message}`).join(' | '),
    );
  }

  if (warnings.length > 0 && (import.meta.env.DEV || errors.length === 0)) {
    console.warn(
      '[XpressBnB] Configuration notice:',
      warnings.map((w) => `${w.key}: ${w.message}`).join(' | '),
    );
  }
}

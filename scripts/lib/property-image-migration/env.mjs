import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Load KEY=VALUE pairs from .env.local / .env into process.env (no override).
 * @param {string} cwd
 */
export function loadDotEnv(cwd = process.cwd()) {
  for (const name of ['.env.local', '.env']) {
    const filePath = resolve(cwd, name);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

export function resolveSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY (required for migration — set in .env, never commit)',
    );
  }
  return { url, serviceRoleKey };
}

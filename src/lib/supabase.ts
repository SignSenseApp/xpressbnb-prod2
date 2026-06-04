import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});

/** Log PostgREST / Auth errors with message + code (avoids console `[object Object]`). */
export function logSupabaseError(context: string, error: unknown) {
  if (error && typeof error === 'object') {
    const e = error as { message?: string; code?: string; details?: string; hint?: string };
    console.error(context, {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint,
    });
    return;
  }
  console.error(context, error);
}

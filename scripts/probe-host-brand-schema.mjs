/**
 * Read-only probe: checks whether Brand tables/RPC exist on configured Supabase.
 * Uses only VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from .env (never prints secrets).
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
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
    env[key] = value;
  }
  return env;
}

const env = loadEnv('.env');
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.log('BLOCKER: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(2);
}

console.log('Remote Supabase URL host:', new URL(url).host);

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function probe(name, fn) {
  const { error } = await fn();
  const code = error?.code ?? 'ok';
  const msg = error?.message?.slice(0, 140) ?? 'no error';
  console.log(`${name}: code=${code} msg=${msg}`);
  return error;
}

await probe('host_brands', () =>
  supabase.from('host_brands').select('id', { count: 'exact', head: true }),
);
await probe('host_brand_properties', () =>
  supabase.from('host_brand_properties').select('id', { count: 'exact', head: true }),
);
await probe('hosts_public_select', () =>
  supabase.from('hosts').select('id', { count: 'exact', head: true }),
);
await probe('properties_public_select', () =>
  supabase.from('properties').select('id').limit(1),
);

const { data: anonRows, error: anonSelectErr } = await supabase
  .from('host_brands')
  .select('id, host_id, business_name')
  .limit(1);
console.log(
  `host_brands_anon_select: code=${anonSelectErr?.code ?? 'ok'} rows=${anonRows?.length ?? 0} msg=${anonSelectErr?.message?.slice(0, 140) ?? 'no error'}`,
);

const { error: anonInsertErr } = await supabase.from('host_brands').insert({
  host_id: '00000000-0000-0000-0000-000000000001',
  business_name: 'Anon Probe Brand',
});
console.log(
  `host_brands_anon_insert: code=${anonInsertErr?.code ?? 'ok'} msg=${anonInsertErr?.message?.slice(0, 140) ?? 'no error'}`,
);

const { error: rpcErr } = await supabase.rpc('replace_host_brand_properties', {
  p_brand_id: '00000000-0000-0000-0000-000000000001',
  p_property_ids: [],
});
console.log(
  `replace_host_brand_properties_anon: code=${rpcErr?.code ?? 'ok'} msg=${rpcErr?.message?.slice(0, 140) ?? 'no error'}`,
);

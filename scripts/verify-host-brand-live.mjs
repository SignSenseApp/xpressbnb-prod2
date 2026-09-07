/**
 * Live Host Brand persistence + RLS verification harness.
 *
 * Requires:
 * - Migration applied on the configured Supabase project
 * - VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env
 *
 * Uses authenticated Supabase clients (not service role) for RLS proof.
 * Creates ephemeral auth users, runs tests, and cleans up where possible.
 *
 * Usage: node scripts/verify-host-brand-live.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

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

function assertCase(name, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${name}${detail ? `: ${detail}` : ''}`);
  return ok;
}

function makeClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signUpHost(client, label) {
  const email = `brand-live-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.invalid`;
  const password = `Test-${randomUUID()}!Aa1`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.user) {
    throw new Error(`signUp failed for ${label}: ${error?.message ?? 'no user'}`);
  }
  if (!data.session) {
    throw new Error(
      `signUp for ${label} returned no session (email confirmation may be enabled)`,
    );
  }
  return { email, password, userId: data.user.id, session: data.session };
}

async function ensureHostProfile(client, email, name) {
  const { data, error } = await client.rpc('ensure_host_profile', {
    p_name: name,
    p_email: email,
    p_phone: '',
  });
  if (error) throw new Error(`ensure_host_profile failed: ${error.message}`);
  return data;
}

async function getOwnHostId(client) {
  const { data, error } = await client.from('hosts').select('id').maybeSingle();
  if (error) throw new Error(`load own host failed: ${error.message}`);
  if (!data?.id) throw new Error('host profile missing after ensure_host_profile');
  return data.id;
}

async function createOwnedProperty(client, hostId, suffix) {
  const { data, error } = await client
    .from('properties')
    .insert({
      host_id: hostId,
      title: `Brand Live Test ${suffix}`,
      description: 'Live verification property',
      address: 'Test Address',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      latitude: 28.6139,
      longitude: 77.209,
      property_type: 'apartment',
      price_per_day: 1000,
      bedrooms: 1,
      bathrooms: 1,
      max_guests: 2,
      is_active: false,
    })
    .select('id')
    .single();
  if (error || !data?.id) {
    throw new Error(`create property failed: ${error?.message ?? 'no id'}`);
  }
  return data.id;
}

const env = loadEnv('.env');
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error('BLOCKER: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(2);
}

console.log('Target host:', new URL(url).host);

const anonClient = makeClient(url, anon);
const results = [];

const schemaProbe = await anonClient.from('host_brands').select('id').limit(1);
if (schemaProbe.error?.code === 'PGRST205') {
  console.error('BLOCKER: host_brands table not found — apply migration before live verification.');
  process.exit(3);
}
if (
  schemaProbe.error &&
  schemaProbe.error.code !== '42501' &&
  !/permission denied/i.test(schemaProbe.error.message ?? '')
) {
  console.error(`BLOCKER: schema probe failed: ${schemaProbe.error.message}`);
  process.exit(3);
}
console.log(
  schemaProbe.error
    ? 'Schema probe: host_brands exists (anon correctly denied)'
    : 'Schema probe: host_brands reachable',
);

let hostA;
let hostB;
let hostAId;
let hostBId;
let brandAId;
let propAId;
let propBId;

try {
  hostA = await signUpHost(makeClient(url, anon), 'a');
  hostB = await signUpHost(makeClient(url, anon), 'b');

  const clientA = makeClient(url, anon);
  const clientB = makeClient(url, anon);
  await clientA.auth.setSession(hostA.session);
  await clientB.auth.setSession(hostB.session);

  await ensureHostProfile(clientA, hostA.email, 'Brand Live A');
  await ensureHostProfile(clientB, hostB.email, 'Brand Live B');
  hostAId = await getOwnHostId(clientA);
  hostBId = await getOwnHostId(clientB);
  propAId = await createOwnedProperty(clientA, hostAId, 'A');
  propBId = await createOwnedProperty(clientB, hostBId, 'B');

  // TEST F/G anon
  const anonCreate = await anonClient.from('host_brands').insert({
    host_id: hostAId,
    business_name: 'Anon Brand',
  });
  results.push(assertCase('F anon cannot create Brand', !!anonCreate.error, anonCreate.error?.code));

  const anonUpdate = await anonClient
    .from('host_brands')
    .update({ business_name: 'Anon Update' })
    .eq('host_id', hostAId);
  results.push(assertCase('G anon cannot modify Brand', !!anonUpdate.error, anonUpdate.error?.code));

  // TEST A/B/C owner
  const createBrand = await clientA
    .from('host_brands')
    .insert({ host_id: hostAId, business_name: '  Café नाम  ', business_description: 'Desc' })
    .select('id, host_id, business_name, business_description')
    .single();
  results.push(assertCase('A owner can create Brand', !createBrand.error && !!createBrand.data?.id));
  brandAId = createBrand.data?.id;

  const readOwn = await clientA
    .from('host_brands')
    .select('id')
    .eq('host_id', hostAId)
    .maybeSingle();
  results.push(assertCase('B owner can read own Brand', !readOwn.error && !!readOwn.data?.id));

  const updateOwn = await clientA
    .from('host_brands')
    .update({ business_name: 'Updated Brand Name' })
    .eq('id', brandAId)
    .select('business_name')
    .single();
  results.push(
    assertCase(
      'C owner can update own Brand',
      !updateOwn.error && updateOwn.data?.business_name === 'Updated Brand Name',
    ),
  );

  // TEST D/E cross-owner
  const readOther = await clientB.from('host_brands').select('id').eq('id', brandAId).maybeSingle();
  results.push(assertCase('D other host cannot read Brand', !readOther.data && !readOther.error));

  const updateOther = await clientB
    .from('host_brands')
    .update({ business_name: 'Host B Takeover' })
    .eq('id', brandAId)
    .select('id');
  results.push(assertCase('E other host cannot update Brand', !!updateOther.error || (updateOther.data ?? []).length === 0));

  // TEST K host_id reassignment via trigger
  const reassign = await clientA
    .from('host_brands')
    .update({ host_id: hostBId })
    .eq('id', brandAId);
  results.push(assertCase('K Brand host_id cannot be reassigned', !!reassign.error, reassign.error?.code));

  // Duplicate brand concurrency guard
  const dupBrand = await clientA.from('host_brands').insert({
    host_id: hostAId,
    business_name: 'Duplicate Brand',
  });
  results.push(assertCase('One host cannot create two Brand rows', !!dupBrand.error, dupBrand.error?.code));

  // TEST I own property association
  const assocOwn = await clientA
    .from('host_brand_properties')
    .insert({ brand_id: brandAId, property_id: propAId })
    .select('id')
    .single();
  results.push(assertCase('I host can associate own property', !assocOwn.error && !!assocOwn.data?.id));

  // TEST H foreign property
  const assocForeign = await clientA
    .from('host_brand_properties')
    .insert({ brand_id: brandAId, property_id: propBId })
    .select('id')
    .single();
  results.push(assertCase('H host cannot associate foreign property', !!assocForeign.error, assocForeign.error?.code));

  // TEST J property cannot be reassigned to foreign property on update
  const assocUpdateForeign = await clientA
    .from('host_brand_properties')
    .update({ property_id: propBId })
    .eq('brand_id', brandAId)
    .eq('property_id', propAId);
  results.push(
    assertCase('J association cannot move to foreign property', !!assocUpdateForeign.error, assocUpdateForeign.error?.code),
  );

  // RPC tests
  const rpcOwn = await clientA.rpc('replace_host_brand_properties', {
    p_brand_id: brandAId,
    p_property_ids: [propAId],
  });
  results.push(assertCase('RPC owner + own property succeeds', !rpcOwn.error, rpcOwn.error?.message));

  const rpcForeign = await clientA.rpc('replace_host_brand_properties', {
    p_brand_id: brandAId,
    p_property_ids: [propAId, propBId],
  });
  results.push(assertCase('RPC owner + foreign property fails', !!rpcForeign.error, rpcForeign.error?.message));

  const rpcOtherHost = await clientB.rpc('replace_host_brand_properties', {
    p_brand_id: brandAId,
    p_property_ids: [propBId],
  });
  results.push(assertCase('RPC other host + target brand fails', !!rpcOtherHost.error, rpcOtherHost.error?.message));

  const rpcAnon = await anonClient.rpc('replace_host_brand_properties', {
    p_brand_id: brandAId,
    p_property_ids: [],
  });
  results.push(assertCase('RPC anon fails', !!rpcAnon.error, rpcAnon.error?.code ?? rpcAnon.error?.message));

  // Transactional partial set: mixed valid/invalid must not partially persist
  const beforeMixed = await clientA
    .from('host_brand_properties')
    .select('property_id')
    .eq('brand_id', brandAId);
  await clientA.rpc('replace_host_brand_properties', {
    p_brand_id: brandAId,
    p_property_ids: [propAId, propBId],
  });
  const afterMixed = await clientA
    .from('host_brand_properties')
    .select('property_id')
    .eq('brand_id', brandAId);
  const unchanged =
    JSON.stringify((beforeMixed.data ?? []).map((r) => r.property_id).sort()) ===
    JSON.stringify((afterMixed.data ?? []).map((r) => r.property_id).sort());
  results.push(assertCase('RPC mixed set leaves associations unchanged on failure', unchanged));

  // Brand with zero properties allowed
  const rpcClear = await clientA.rpc('replace_host_brand_properties', {
    p_brand_id: brandAId,
    p_property_ids: [],
  });
  const zeroProps = await clientA
    .from('host_brand_properties')
    .select('id')
    .eq('brand_id', brandAId);
  results.push(
    assertCase(
      'Brand can exist with zero properties',
      !rpcClear.error && (zeroProps.data ?? []).length === 0,
    ),
  );

  // Delete brand removes associations only
  await clientA.rpc('replace_host_brand_properties', {
    p_brand_id: brandAId,
    p_property_ids: [propAId],
  });
  await clientA.from('host_brands').delete().eq('id', brandAId);
  const assocAfterDelete = await clientA
    .from('host_brand_properties')
    .select('id')
    .eq('brand_id', brandAId);
  const propStillThere = await clientA.from('properties').select('id').eq('id', propAId).maybeSingle();
  results.push(assertCase('Deleting Brand removes associations only', (assocAfterDelete.data ?? []).length === 0));
  results.push(assertCase('Deleting Brand does not delete properties', !!propStillThere.data?.id));

  // Delete property does not break host
  await clientA.from('properties').delete().eq('id', propAId);
  const hostStillThere = await clientA.from('hosts').select('id').eq('id', hostAId).maybeSingle();
  results.push(assertCase('Deleting property preserves Host integrity', !!hostStillThere.data?.id));

  // Validation contract via DB constraints
  const badName = await clientA.from('host_brands').insert({
    host_id: hostAId,
    business_name: 'a',
  });
  results.push(assertCase('business_name min length enforced', !!badName.error, badName.error?.code));

  const longName = await clientA.from('host_brands').insert({
    host_id: hostAId,
    business_name: 'x'.repeat(61),
  });
  results.push(assertCase('business_name max length enforced', !!longName.error, longName.error?.code));

  const unicodeName = await clientA
    .from('host_brands')
    .insert({ host_id: hostAId, business_name: 'नाम & Co.' })
    .select('business_name')
    .single();
  results.push(
    assertCase(
      'Unicode/punctuation business names supported',
      !unicodeName.error && unicodeName.data?.business_name === 'नाम & Co.',
    ),
  );
  if (unicodeName.data?.id) {
    await clientA.from('host_brands').delete().eq('id', unicodeName.data.id);
  }
} catch (error) {
  console.error('HARNESS ERROR:', error instanceof Error ? error.message : String(error));
  process.exit(4);
} finally {
  // Best-effort cleanup of test properties/brands; auth users may remain without admin API.
  try {
    const cleanupClient = makeClient(url, anon);
    if (hostB?.session) {
      await cleanupClient.auth.setSession(hostB.session);
      if (propBId) await cleanupClient.from('properties').delete().eq('id', propBId);
    }
  } catch {
    // ignore cleanup failures
  }
}

const passed = results.filter(Boolean).length;
const failed = results.length - passed;
console.log(`\nSUMMARY: ${passed}/${results.length} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BUCKET } from '../property-image-migration/constants.mjs';
import { DEFAULT_MIGRATION_STATE } from './constants.mjs';
import { parseSupabasePropertyImageUrl } from '../property-image-migration/urlParser.mjs';

/**
 * @param {unknown} images
 * @returns {string[]}
 */
export function normalizePropertyImageUrls(images) {
  if (!Array.isArray(images)) return [];
  const out = [];
  for (const item of images) {
    if (typeof item === 'string' && item.trim()) out.push(item.trim());
  }
  return out;
}

/**
 * @typedef {import('@supabase/supabase-js').SupabaseClient} SupabaseClient
 */

/**
 * @param {SupabaseClient} supabase
 */
export async function listAllStorageObjects(supabase) {
  const objects = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list('', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`Storage list failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      if (item?.name && item.id) objects.push(item);
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return objects;
}

/**
 * @param {SupabaseClient} supabase
 */
export async function collectReferencedPaths(supabase) {
  const { data, error } = await supabase.from('properties').select('id, images');
  if (error) throw new Error(`Failed to read properties: ${error.message}`);

  /** @type {Map<string, Set<string>>} */
  const pathToPropertyIds = new Map();

  for (const row of data ?? []) {
    for (const url of normalizePropertyImageUrls(row.images)) {
      const parsed = parseSupabasePropertyImageUrl(url);
      if (!parsed) continue;
      if (!pathToPropertyIds.has(parsed.path)) {
        pathToPropertyIds.set(parsed.path, new Set());
      }
      pathToPropertyIds.get(parsed.path).add(row.id);
    }
  }

  return pathToPropertyIds;
}

/**
 * @param {SupabaseClient} supabase
 * @param {string} path
 */
export async function isPathReferencedLive(supabase, path) {
  const refs = await collectReferencedPaths(supabase);
  return refs.has(path);
}

/**
 * @param {string} migrationStateFile
 * @returns {{ paths: Set<string>, unreadable: boolean }}
 */
export function loadMigrationProtectedPaths(migrationStateFile = DEFAULT_MIGRATION_STATE) {
  const paths = new Set();
  const filePath = resolve(migrationStateFile);
  if (!existsSync(filePath)) return { paths, unreadable: false };

  try {
    const state = JSON.parse(readFileSync(filePath, 'utf8'));
    for (const record of state.migrated ?? []) {
      if (record.oldPath) paths.add(record.oldPath);
      if (record.newPath) paths.add(record.newPath);
    }
    for (const record of state.failed ?? []) {
      const parsed = parseSupabasePropertyImageUrl(record.url ?? '');
      if (parsed?.path) paths.add(parsed.path);
    }
    return { paths, unreadable: false };
  } catch {
    return { paths, unreadable: true };
  }
}

/**
 * @param {string | undefined} isoDate
 * @param {number} olderThanDays
 */
export function isOlderThan(isoDate, olderThanDays) {
  if (!isoDate) return false;
  const created = new Date(isoDate);
  if (Number.isNaN(created.getTime())) return false;
  const ageMs = Date.now() - created.getTime();
  return ageMs >= olderThanDays * 24 * 60 * 60 * 1000;
}

/**
 * @param {SupabaseClient} supabase
 * @param {string} path
 */
export async function verifyStorageObjectExists(supabase, path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return false;
  const buf = Buffer.from(await data.arrayBuffer());
  return buf.length >= 0;
}

/**
 * @param {SupabaseClient} supabase
 * @param {string} path
 */
export async function deleteStorageObject(supabase, path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

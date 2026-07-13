import { randomUUID } from 'node:crypto';
import { BUCKET } from './constants.mjs';
import { optimizePropertyImageBuffer, sha256 } from './optimizer.mjs';
import {
  isCompleted,
  markCompleted,
  markFailed,
  migrationKey,
  saveState,
} from './state.mjs';
import {
  isAlreadyOptimizedWebp,
  parseSupabasePropertyImageUrl,
} from './urlParser.mjs';

/**
 * @typedef {import('@supabase/supabase-js').SupabaseClient} SupabaseClient
 * @typedef {import('./state.mjs').MigrationState} MigrationState
 */

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
 * @param {string[]} images
 * @param {string} oldUrl
 * @param {string} newUrl
 */
export function replaceImageUrl(images, oldUrl, newUrl) {
  return images.map((url) => (url === oldUrl ? newUrl : url));
}

/**
 * @param {SupabaseClient} supabase
 * @param {string} path
 */
async function downloadObject(supabase, path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw new Error(`Download failed (${path}): ${error.message}`);
  if (!data) throw new Error(`Download returned empty body (${path})`);
  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer;
}

/**
 * @param {SupabaseClient} supabase
 * @param {string} path
 */
async function verifyObjectExists(supabase, path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return false;
  const buf = Buffer.from(await data.arrayBuffer());
  return buf.length > 0;
}

/**
 * @param {SupabaseClient} supabase
 * @param {string} path
 */
async function deleteObject(supabase, path) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Delete failed (${path}): ${error.message}`);
}

/**
 * @param {SupabaseClient} supabase
 * @param {string} propertyId
 * @param {string[]} images
 */
async function updatePropertyImages(supabase, propertyId, images) {
  const { error } = await supabase.from('properties').update({ images }).eq('id', propertyId);
  if (error) throw new Error(`DB update failed (${propertyId}): ${error.message}`);
}

/**
 * @param {SupabaseClient} supabase
 * @param {string} propertyId
 */
async function fetchPropertyImages(supabase, propertyId) {
  const { data, error } = await supabase.from('properties').select('images').eq('id', propertyId).single();
  if (error) throw new Error(`DB read failed (${propertyId}): ${error.message}`);
  return normalizePropertyImageUrls(data?.images);
}

/**
 * @param {object} options
 * @param {SupabaseClient} options.supabase
 * @param {MigrationState} options.state
 * @param {string} options.stateFile
 * @param {boolean} options.dryRun
 * @param {boolean} options.verbose
 * @param {number | undefined} options.limit
 * @param {string | undefined} options.propertyId
 * @param {Map<string, string>} options.pathReplacements path -> new public URL
 */
export async function runMigration(options) {
  const {
    supabase,
    state,
    stateFile,
    dryRun,
    verbose,
    limit,
    propertyId,
    pathReplacements,
  } = options;

  let query = supabase.from('properties').select('id, images').order('created_at', { ascending: true });
  if (propertyId) {
    query = query.eq('id', propertyId);
  }

  const { data: properties, error } = await query;
  if (error) throw new Error(`Failed to list properties: ${error.message}`);

  const rows = properties ?? [];
  const workItems = [];

  for (const row of rows) {
    const urls = normalizePropertyImageUrls(row.images);
    for (const url of urls) {
      workItems.push({ propertyId: row.id, url });
    }
  }

  const total = limit ? Math.min(limit, workItems.length) : workItems.length;
  const startedMs = Date.now();
  let processed = 0;
  let migratedCount = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  const log = (message) => {
    if (verbose) console.log(message);
  };

  for (let i = 0; i < workItems.length; i += 1) {
    if (limit && processed >= limit) break;

    const { propertyId: pid, url } = workItems[i];
    const key = migrationKey(pid, url);
    processed += 1;

    if (isCompleted(state, key)) {
      state.counters.skipped += 1;
      log(`[skip:resume] ${pid} ${url}`);
      continue;
    }

    const parsed = parseSupabasePropertyImageUrl(url);
    if (!parsed) {
      state.counters.external += 1;
      state.completedKeys.push(key);
      saveState(stateFile, state);
      log(`[skip:external] ${url}`);
      continue;
    }

    if (isAlreadyOptimizedWebp(parsed.path)) {
      state.counters.alreadyWebp += 1;
      state.completedKeys.push(key);
      saveState(stateFile, state);
      log(`[skip:webp] ${parsed.path}`);
      continue;
    }

    if (pathReplacements.has(parsed.path)) {
      const newUrl = pathReplacements.get(parsed.path);
      state.counters.duplicate += 1;
      if (!dryRun) {
        const currentImages = await fetchPropertyImages(supabase, pid);
        const updated = replaceImageUrl(currentImages, url, newUrl);
        await updatePropertyImages(supabase, pid, updated);
      }
      markCompleted(state, key, {
        propertyId: pid,
        oldUrl: url,
        newUrl,
        oldPath: parsed.path,
        newPath: parseSupabasePropertyImageUrl(newUrl)?.path ?? '',
        oldBytes: 0,
        newBytes: 0,
        oldHash: '',
        newHash: '',
        migratedAt: new Date().toISOString(),
        duplicate: true,
      });
      saveState(stateFile, state);
      log(`[skip:duplicate-path] ${parsed.path} -> ${newUrl}`);
      continue;
    }

    try {
      let inputBuffer;
      try {
        inputBuffer = await downloadObject(supabase, parsed.path);
      } catch (downloadError) {
        state.counters.missing += 1;
        markFailed(state, {
          propertyId: pid,
          url,
          error: downloadError instanceof Error ? downloadError.message : String(downloadError),
          failedAt: new Date().toISOString(),
        });
        saveState(stateFile, state);
        console.warn(`[missing] ${parsed.path}`);
        continue;
      }

      const oldHash = sha256(inputBuffer);
      const optimized = await optimizePropertyImageBuffer(inputBuffer);

      if (optimized.skip) {
        if (optimized.reason === 'animated-gif') {
          state.counters.animatedGif += 1;
        }
        state.completedKeys.push(key);
        saveState(stateFile, state);
        log(`[skip:${optimized.reason}] ${parsed.path}`);
        continue;
      }

      if (optimized.hash === oldHash) {
        state.counters.skipped += 1;
        state.completedKeys.push(key);
        saveState(stateFile, state);
        log(`[skip:unchanged-hash] ${parsed.path}`);
        continue;
      }

      const newPath = `${randomUUID()}.webp`;
      const newFileName = newPath;

      if (dryRun) {
        migratedCount += 1;
        bytesBefore += inputBuffer.length;
        bytesAfter += optimized.bytes;
        console.log(
          `[dry-run] ${parsed.path} (${inputBuffer.length}B) -> ${newPath} (${optimized.bytes}B)`,
        );
        continue;
      }

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(newPath, optimized.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/webp',
      });
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(newFileName);

      const verified = await verifyObjectExists(supabase, newPath);
      if (!verified) {
        throw new Error(`Verification failed for uploaded object ${newPath}`);
      }

      const previousImages = await fetchPropertyImages(supabase, pid);
      const updatedImages = replaceImageUrl(previousImages, url, publicUrl);
      await updatePropertyImages(supabase, pid, updatedImages);

      const readBack = await fetchPropertyImages(supabase, pid);
      if (!readBack.includes(publicUrl)) {
        await updatePropertyImages(supabase, pid, previousImages);
        throw new Error(`DB verification failed — rolled back property ${pid}`);
      }

      await deleteObject(supabase, parsed.path);

      pathReplacements.set(parsed.path, publicUrl);

      markCompleted(state, key, {
        propertyId: pid,
        oldUrl: url,
        newUrl: publicUrl,
        oldPath: parsed.path,
        newPath,
        oldBytes: inputBuffer.length,
        newBytes: optimized.bytes,
        oldHash,
        newHash: optimized.hash,
        migratedAt: new Date().toISOString(),
      });
      saveState(stateFile, state);

      migratedCount += 1;
      bytesBefore += inputBuffer.length;
      bytesAfter += optimized.bytes;

      const elapsedSec = (Date.now() - startedMs) / 1000;
      const rate = processed / Math.max(elapsedSec, 0.001);
      const remaining = total - processed;
      const etaSec = Math.round(remaining / Math.max(rate, 0.001));

      console.log(
        `[migrated ${processed}/${total}] ${parsed.path} -> ${newPath} ` +
          `(${inputBuffer.length}B -> ${optimized.bytes}B) ETA ~${etaSec}s`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      markFailed(state, {
        propertyId: pid,
        url,
        error: message,
        failedAt: new Date().toISOString(),
      });
      saveState(stateFile, state);
      console.warn(`[failed] ${pid} ${url}: ${message}`);
    }
  }

  return {
    processed,
    total,
    migratedCount,
    bytesBefore,
    bytesAfter,
    state,
  };
}

/**
 * @param {object} options
 * @param {SupabaseClient} options.supabase
 * @param {MigrationState} options.state
 * @param {string} options.stateFile
 * @param {boolean} options.verbose
 * @param {boolean} [options.deleteNew]
 */
export async function runRollback(options) {
  const { supabase, state, stateFile, verbose, deleteNew = false } = options;
  const migrated = [...state.migrated].reverse();
  let restored = 0;

  for (const record of migrated) {
    if (record.duplicate) continue;
    try {
      const current = await fetchPropertyImages(supabase, record.propertyId);
      const rolledBack = replaceImageUrl(current, record.newUrl, record.oldUrl);
      await updatePropertyImages(supabase, record.propertyId, rolledBack);

      if (deleteNew && record.newPath) {
        await deleteObject(supabase, record.newPath);
      }

      restored += 1;
      if (verbose) {
        console.log(`[rollback] ${record.propertyId} ${record.newUrl} -> ${record.oldUrl}`);
      }
    } catch (error) {
      console.warn(
        `[rollback-failed] ${record.propertyId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  saveState(stateFile, state);
  return { restored, total: migrated.length };
}

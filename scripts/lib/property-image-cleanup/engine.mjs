import { formatBytes } from '../property-image-audit/classify.mjs';
import {
  collectReferencedPaths,
  deleteStorageObject,
  isOlderThan,
  isPathReferencedLive,
  listAllStorageObjects,
  loadMigrationProtectedPaths,
  verifyStorageObjectExists,
} from './storage.mjs';

/**
 * @typedef {import('@supabase/supabase-js').SupabaseClient} SupabaseClient
 */

/**
 * @param {object} object
 * @param {Map<string, Set<string>>} referencedPaths
 * @param {Set<string>} protectedPaths
 * @param {boolean} migrationStateUnreadable
 * @param {number} olderThanDays
 */
export function evaluateCandidate(
  object,
  referencedPaths,
  protectedPaths,
  migrationStateUnreadable,
  olderThanDays,
) {
  const path = object.name;
  const size = object.metadata?.size ?? 0;
  const createdAt = object.created_at ?? object.updated_at;
  const refs = referencedPaths.get(path);

  if (migrationStateUnreadable) {
    return { eligible: false, path, size, skipReason: 'migration-state-unreadable' };
  }

  if (refs && refs.size > 0) {
    return {
      eligible: false,
      path,
      size,
      skipReason: refs.size > 1 ? 'referenced-multiple' : 'referenced',
      referenceCount: refs.size,
    };
  }

  if (protectedPaths.has(path)) {
    return { eligible: false, path, size, skipReason: 'migration-protected' };
  }

  if (!isOlderThan(createdAt, olderThanDays)) {
    return { eligible: false, path, size, skipReason: 'too-recent', createdAt };
  }

  return { eligible: true, path, size, createdAt };
}

/**
 * @param {object} options
 * @param {SupabaseClient} options.supabase
 * @param {boolean} options.execute
 * @param {number | undefined} options.limit
 * @param {number} options.olderThanDays
 * @param {boolean} options.verbose
 * @param {string} options.migrationStateFile
 */
export async function runPropertyImageCleanup(options) {
  const startedMs = Date.now();
  const { supabase, execute, limit, olderThanDays, verbose, migrationStateFile } = options;

  const log = (msg) => {
    if (verbose) console.log(msg);
  };

  const objects = await listAllStorageObjects(supabase);
  const referencedPaths = await collectReferencedPaths(supabase);
  const { paths: protectedPaths, unreadable: migrationStateUnreadable } =
    loadMigrationProtectedPaths(migrationStateFile);

  if (migrationStateUnreadable) {
    console.warn(
      'Migration state file is unreadable — all deletions blocked until state is fixed.',
    );
  }

  /** @type {Array<{ path: string, size: number, createdAt?: string }>} */
  const candidates = [];
  /** @type {Array<{ path: string, size: number, reason: string, referenceCount?: number }>} */
  const skipped = [];

  for (const object of objects) {
    const result = evaluateCandidate(
      object,
      referencedPaths,
      protectedPaths,
      migrationStateUnreadable,
      olderThanDays,
    );
    if (result.eligible) {
      candidates.push({
        path: result.path,
        size: result.size,
        createdAt: result.createdAt,
      });
    } else {
      skipped.push({
        path: result.path,
        size: result.size,
        reason: result.skipReason ?? 'unknown',
        referenceCount: result.referenceCount,
      });
    }
  }

  candidates.sort((a, b) => b.size - a.size);

  const toProcess = limit ? candidates.slice(0, limit) : candidates;

  /** @type {Array<{ path: string, size: number, status: string }>} */
  const deleted = [];
  /** @type {Array<{ path: string, size: number, reason: string }>} */
  const failures = [];
  /** @type {Array<{ path: string, size: number, reason: string }>} */
  const skippedAtDelete = [];

  for (const candidate of toProcess) {
    const exists = await verifyStorageObjectExists(supabase, candidate.path);
    if (!exists) {
      skippedAtDelete.push({ path: candidate.path, size: candidate.size, reason: 'missing-at-verify' });
      log(`[skip] ${candidate.path} — missing at verify`);
      continue;
    }

    const stillReferenced = await isPathReferencedLive(supabase, candidate.path);
    if (stillReferenced) {
      skippedAtDelete.push({ path: candidate.path, size: candidate.size, reason: 'referenced-at-verify' });
      log(`[skip] ${candidate.path} — referenced on live re-scan`);
      continue;
    }

    if (!execute) {
      log(`[dry-run] would delete ${candidate.path} (${candidate.size} bytes)`);
      continue;
    }

    try {
      await deleteStorageObject(supabase, candidate.path);
      const gone = !(await verifyStorageObjectExists(supabase, candidate.path));
      if (!gone) {
        throw new Error('Object still exists after delete');
      }
      deleted.push({ path: candidate.path, size: candidate.size, status: 'deleted' });
      log(`[deleted] ${candidate.path}`);
    } catch (error) {
      failures.push({
        path: candidate.path,
        size: candidate.size,
        reason: error instanceof Error ? error.message : String(error),
      });
      log(`[failed] ${candidate.path}: ${error instanceof Error ? error.message : error}`);
    }
  }

  const reclaimedBytes = deleted.reduce((sum, item) => sum + item.size, 0);
  const executionMs = Date.now() - startedMs;

  return {
    generatedAt: new Date().toISOString(),
    mode: execute ? 'execute' : 'dry-run',
    options: { limit, olderThanDays, execute, verbose },
    summary: {
      objectsScanned: objects.length,
      deletionCandidates: candidates.length,
      processed: toProcess.length,
      deleted: deleted.length,
      skipped: skipped.length + skippedAtDelete.length,
      failures: failures.length,
      reclaimedBytes,
      reclaimedFormatted: formatBytes(reclaimedBytes),
      executionSeconds: Math.round(executionMs / 1000),
    },
    scannedObjects: objects.length,
    orphanCandidates: candidates,
    skippedObjects: [...skipped, ...skippedAtDelete],
    deletedObjects: deleted,
    failures,
    executionTimeMs: executionMs,
  };
}

/**
 * @param {Awaited<ReturnType<typeof runPropertyImageCleanup>>} report
 */
export function printCleanupReport(report) {
  const s = report.summary;
  const lines = [
    '',
    'Storage Cleanup',
    '',
    'Objects scanned',
    String(s.objectsScanned),
    '',
    'Deletion candidates',
    String(s.deletionCandidates),
    '',
    'Deleted',
    String(s.deleted),
    '',
    'Skipped',
    String(s.skipped),
    '',
    'Space reclaimed',
    s.reclaimedFormatted,
    '',
    'Execution',
    `${s.executionSeconds} seconds`,
    '',
    `Mode: ${report.mode}`,
    '',
  ];
  console.log(lines.join('\n'));
}

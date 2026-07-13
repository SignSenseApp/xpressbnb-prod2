#!/usr/bin/env node
/**
 * One-time migration: optimize existing Supabase property-images to WebP.
 *
 * Requires service role key (never expose to browser):
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run migrate-property-images -- --dry-run --verbose
 *   npm run migrate-property-images -- --verbose
 *   npm run migrate-property-images -- --property-id=<uuid> --limit=5
 *   npm run migrate-property-images -- --rollback --verbose
 */
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_STATE_FILE } from './lib/property-image-migration/constants.mjs';
import { loadDotEnv, resolveSupabaseConfig } from './lib/property-image-migration/env.mjs';
import { runMigration, runRollback } from './lib/property-image-migration/engine.mjs';
import { createEmptyState, loadState } from './lib/property-image-migration/state.mjs';

function parseArgs(argv) {
  const flags = {
    dryRun: false,
    verbose: false,
    rollback: false,
    deleteNew: false,
    stateFile: DEFAULT_STATE_FILE,
    limit: undefined,
    propertyId: undefined,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--verbose') flags.verbose = true;
    else if (arg === '--rollback') flags.rollback = true;
    else if (arg === '--delete-new') flags.deleteNew = true;
    else if (arg.startsWith('--state-file=')) flags.stateFile = arg.split('=')[1];
    else if (arg.startsWith('--limit=')) flags.limit = Number(arg.split('=')[1]);
    else if (arg.startsWith('--property-id=')) flags.propertyId = arg.split('=')[1];
    else if (arg === '--help' || arg === '-h') {
      console.log(`migrate-property-images

Options:
  --dry-run              Plan only; no upload/DB/delete
  --verbose              Detailed logs
  --rollback             Restore DB URLs from state file (originals kept unless deleted manually)
  --delete-new           With --rollback, also delete migrated WebP objects
  --state-file=PATH      Resume/rollback state (default: ${DEFAULT_STATE_FILE})
  --limit=N              Process at most N images
  --property-id=UUID     Scope to one property
  --help                 Show help
`);
      process.exit(0);
    }
  }

  return flags;
}

async function main() {
  loadDotEnv();
  const flags = parseArgs(process.argv.slice(2));
  const { url, serviceRoleKey } = resolveSupabaseConfig();

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const state = existsSync(flags.stateFile) ? loadState(flags.stateFile) : createEmptyState();
  const pathReplacements = new Map();

  for (const record of state.migrated) {
    if (record.oldPath && record.newUrl) {
      pathReplacements.set(record.oldPath, record.newUrl);
    }
  }

  if (flags.rollback) {
    console.log('Starting rollback from migration state...');
    const result = await runRollback({
      supabase,
      state,
      stateFile: flags.stateFile,
      verbose: flags.verbose,
      deleteNew: flags.deleteNew,
    });
    console.log(`Rollback complete: restored ${result.restored}/${result.total} records`);
    return;
  }

  console.log(
    `Property image migration ${flags.dryRun ? '(DRY RUN)' : ''} — state: ${flags.stateFile}`,
  );

  const result = await runMigration({
    supabase,
    state: state,
    stateFile: flags.stateFile,
    dryRun: flags.dryRun,
    verbose: flags.verbose,
    limit: flags.limit,
    propertyId: flags.propertyId,
    pathReplacements,
  });

  const savedBytes = result.bytesBefore - result.bytesAfter;
  const savedPct =
    result.bytesBefore > 0 ? Math.round((savedBytes / result.bytesBefore) * 100) : 0;

  console.log('\n=== Migration summary ===');
  console.log(`Processed:        ${result.processed}/${result.total}`);
  console.log(`Migrated:         ${result.migratedCount}`);
  console.log(`Skipped (resume): ${result.state.counters.skipped}`);
  console.log(`External URLs:    ${result.state.counters.external}`);
  console.log(`Already WebP:     ${result.state.counters.alreadyWebp}`);
  console.log(`Animated GIF:     ${result.state.counters.animatedGif}`);
  console.log(`Missing files:    ${result.state.counters.missing}`);
  console.log(`Duplicate paths:  ${result.state.counters.duplicate}`);
  console.log(`Failed:           ${result.state.failed.length}`);
  if (result.bytesBefore > 0) {
    console.log(
      `Bytes before:     ${(result.bytesBefore / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(
      `Bytes after:      ${(result.bytesAfter / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(
      `Estimated save:   ${(savedBytes / 1024 / 1024).toFixed(2)} MB (${savedPct}%)`,
    );
  }
  if (flags.dryRun) {
    console.log('\nDry run complete — no storage or database changes were made.');
  }
}


main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

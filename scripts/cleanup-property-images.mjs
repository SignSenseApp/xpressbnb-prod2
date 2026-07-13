#!/usr/bin/env node
/**
 * Engineer-operated storage garbage collector for property-images bucket.
 *
 * Default: dry-run (no deletions). Pass --execute to delete verified orphans.
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * Usage:
 *   npm run cleanup-property-images
 *   npm run cleanup-property-images -- --execute --verbose --limit=10
 *   npm run cleanup-property-images -- --older-than=45
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_CLEANUP_REPORT,
  DEFAULT_MIGRATION_STATE,
  DEFAULT_OLDER_THAN_DAYS,
} from './lib/property-image-cleanup/constants.mjs';
import {
  printCleanupReport,
  runPropertyImageCleanup,
} from './lib/property-image-cleanup/engine.mjs';
import { loadDotEnv, resolveSupabaseConfig } from './lib/property-image-migration/env.mjs';

function parseArgs(argv) {
  const flags = {
    execute: false,
    verbose: false,
    limit: undefined,
    olderThanDays: DEFAULT_OLDER_THAN_DAYS,
    output: DEFAULT_CLEANUP_REPORT,
    migrationStateFile: DEFAULT_MIGRATION_STATE,
  };

  for (const arg of argv) {
    if (arg === '--execute') flags.execute = true;
    else if (arg === '--dry-run') flags.execute = false;
    else if (arg === '--verbose') flags.verbose = true;
    else if (arg.startsWith('--limit=')) flags.limit = Number(arg.split('=')[1]);
    else if (arg.startsWith('--older-than=')) flags.olderThanDays = Number(arg.split('=')[1]);
    else if (arg.startsWith('--output=')) flags.output = arg.split('=')[1];
    else if (arg.startsWith('--migration-state=')) flags.migrationStateFile = arg.split('=')[1];
    else if (arg === '--help' || arg === '-h') {
      console.log(`cleanup-property-images — orphan storage garbage collector

Options:
  --dry-run              Report only (default)
  --execute              Delete verified orphan objects
  --limit=N              Process at most N candidates
  --older-than=DAYS      Minimum object age (default: ${DEFAULT_OLDER_THAN_DAYS})
  --verbose              Detailed logging
  --output=PATH          JSON report (default: ${DEFAULT_CLEANUP_REPORT})
  --migration-state=PATH Protect paths in migration state file
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

  if (!flags.execute) {
    console.log('Dry-run mode — no objects will be deleted. Pass --execute to delete.');
  } else {
    console.log('EXECUTE mode — verified orphan objects will be permanently deleted.');
  }

  const report = await runPropertyImageCleanup({
    supabase,
    execute: flags.execute,
    limit: flags.limit,
    olderThanDays: flags.olderThanDays,
    verbose: flags.verbose,
    migrationStateFile: flags.migrationStateFile,
  });

  const outputPath = resolve(flags.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2));

  printCleanupReport(report);
  console.log(`Report written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

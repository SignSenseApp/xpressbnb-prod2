#!/usr/bin/env node
/**
 * Read-only audit of property image storage (database + Supabase bucket).
 *
 * NEVER uploads, deletes, or modifies storage or database.
 *
 * Requires:
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run audit-property-images
 *   npm run audit-property-images -- --output=.audit/property-storage-report.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { loadDotEnv, resolveSupabaseConfig } from './lib/property-image-migration/env.mjs';
import { printAuditReport, runPropertyImageAudit } from './lib/property-image-audit/engine.mjs';

const DEFAULT_OUTPUT = '.audit/property-storage-report.json';

function parseArgs(argv) {
  let output = DEFAULT_OUTPUT;
  for (const arg of argv) {
    if (arg.startsWith('--output=')) output = arg.split('=')[1];
    else if (arg === '--help' || arg === '-h') {
      console.log(`audit-property-images — read-only storage health report

Options:
  --output=PATH   JSON report path (default: ${DEFAULT_OUTPUT})
  --help          Show help
`);
      process.exit(0);
    }
  }
  return { output };
}

async function main() {
  loadDotEnv();
  const { output } = parseArgs(process.argv.slice(2));
  const { url, serviceRoleKey } = resolveSupabaseConfig();

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('Running read-only property image audit...');
  const report = await runPropertyImageAudit(supabase);

  const outputPath = resolve(output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2));

  printAuditReport(report);
  console.log(`Report written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

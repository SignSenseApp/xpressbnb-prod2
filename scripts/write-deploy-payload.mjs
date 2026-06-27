import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const fn = process.argv[2];
const out = process.argv[3];
if (!fn || !out) {
  console.error('Usage: node scripts/write-deploy-payload.mjs <function> <out.json>');
  process.exit(1);
}

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'deploy-edge-mcp-payload.mjs');
const result = spawnSync(process.execPath, [script, fn], { encoding: 'utf8' });
if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(result.status ?? 1);
}
fs.writeFileSync(out, result.stdout, 'utf8');
console.log(`Wrote ${out} (${result.stdout.length} bytes)`);

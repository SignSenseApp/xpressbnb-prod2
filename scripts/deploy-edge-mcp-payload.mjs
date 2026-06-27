import fs from 'node:fs';
import path from 'node:path';

const fn = process.argv[2];
if (!fn) {
  console.error('Usage: node scripts/deploy-edge-mcp-payload.mjs <function-name>');
  process.exit(1);
}

const root = path.join('supabase', 'functions');
const shared = ['cors.ts', 'client-ip.ts'];
const extra =
  fn === 'send-inquiry-notification'
    ? ['inquiry-messages.ts', 'whatsapp-meta.ts']
    : [];

const files = [
  {
    name: 'index.ts',
    content: fs.readFileSync(path.join(root, fn, 'index.ts'), 'utf8'),
  },
  ...[...shared, ...extra].map((f) => ({
    name: `../_shared/${f}`,
    content: fs.readFileSync(path.join(root, '_shared', f), 'utf8'),
  })),
];

const payload = {
  name: fn,
  entrypoint_path: 'index.ts',
  verify_jwt: fn === 'ops-console',
  files,
};

process.stdout.write(JSON.stringify(payload));
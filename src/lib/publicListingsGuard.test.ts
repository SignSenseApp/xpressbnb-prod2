import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

/** Guest-facing paths that must route property fetches through publicListings.ts */
const GUEST_PATH_PREFIXES = [
  'components/NewHomepage.tsx',
  'pages/CityListingPage.tsx',
  'pages/PropertyPage.tsx',
  'pages/RishikeshStaysPage.tsx',
  'PublicSite.tsx',
  'pages/ExploreCitiesPage.tsx',
];

/** Documented exceptions — different query shape (saved IDs, not marketplace inventory). */
const APPROVED_QUERY_FILES = new Set([
  join(SRC_ROOT, 'lib/publicListings.ts').replace(/\\/g, '/'),
  join(SRC_ROOT, 'pages/SavedListingsPage.tsx').replace(/\\/g, '/'),
]);

const RAW_QUERY_PATTERN = /\.from\(['"]properties['"]\)/;

function collectGuestFiles(): string[] {
  const files: string[] = [];
  for (const prefix of GUEST_PATH_PREFIXES) {
    files.push(join(SRC_ROOT, prefix));
  }
  return files;
}

function collectHostAdminFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'host' || entry === 'ops') {
        files.push(...collectAllTsxUnder(full));
      }
      continue;
    }
    if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

function collectAllTsxUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectAllTsxUnder(full));
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('public listings static guard', () => {
  it('guest-facing pages do not issue raw properties queries', () => {
    const violations: string[] = [];
    for (const file of collectGuestFiles()) {
      const normalized = file.replace(/\\/g, '/');
      if (APPROVED_QUERY_FILES.has(normalized)) continue;
      const source = readFileSync(file, 'utf8');
      if (RAW_QUERY_PATTERN.test(source)) {
        violations.push(normalized);
      }
    }
    expect(violations).toEqual([]);
  });

  it('allows host/admin dashboards to query properties directly', () => {
    const hostFiles = collectHostAdminFiles(join(SRC_ROOT, 'pages'));
    const hostComponentFiles = collectAllTsxUnder(join(SRC_ROOT, 'components')).filter((f) =>
      f.includes('AdminDashboard') || f.includes('PropertyListingForm') || f.includes('PropertyUpgradeModal'),
    );
    const candidates = [...hostFiles, ...hostComponentFiles];
    expect(candidates.some((f) => RAW_QUERY_PATTERN.test(readFileSync(f, 'utf8')))).toBe(true);
  });
});

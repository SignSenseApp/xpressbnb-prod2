import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EDITORIAL_DISCOVERY_IMPORT_ALLOWLIST,
  EDITORIAL_DISCOVERY_IMPORT_PATTERN,
  MARKETPLACE_CARD_IMPORT_ALLOWLIST,
  MARKETPLACE_CARD_IMPORT_PATTERN,
  MARKETPLACE_SURFACE_FILES,
} from './marketplaceFreeze';

const SRC_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

function rel(pathFromSrc: string): string {
  return pathFromSrc.replace(/\\/g, '/');
}

function readSrc(relativePath: string): string {
  return readFileSync(join(SRC_ROOT, relativePath), 'utf8');
}

function collectTsxFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      collectTsxFiles(full, acc);
      continue;
    }
    if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      acc.push(rel(relative(SRC_ROOT, full)));
    }
  }
  return acc;
}

describe('marketplace architecture freeze (MP-Freeze)', () => {
  it('only allowlisted files import ConversionPropertyCard', () => {
    const violations: string[] = [];
    const allow = new Set<string>(MARKETPLACE_CARD_IMPORT_ALLOWLIST);

    for (const file of collectTsxFiles(SRC_ROOT)) {
      if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
      const source = readSrc(file);
      if (!MARKETPLACE_CARD_IMPORT_PATTERN.test(source)) continue;
      if (!allow.has(file)) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });

  it('editorial discovery modules are only imported from property surfaces', () => {
    const violations: string[] = [];

    for (const file of collectTsxFiles(SRC_ROOT)) {
      const source = readSrc(file);
      if (!EDITORIAL_DISCOVERY_IMPORT_PATTERN.test(source)) continue;
      const allowed = EDITORIAL_DISCOVERY_IMPORT_ALLOWLIST.some((prefix) => file.startsWith(prefix));
      if (!allowed) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });

  it('marketplace surfaces do not import editorial discovery presentation', () => {
    const violations: string[] = [];

    for (const surface of MARKETPLACE_SURFACE_FILES) {
      const source = readSrc(surface);
      if (EDITORIAL_DISCOVERY_IMPORT_PATTERN.test(source)) {
        violations.push(surface);
      }
      if (/from\s+['"][^'"]*\/editorial\/EditorialLayouts/.test(source)) {
        violations.push(`${surface} (EditorialLayouts)`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('editorial discovery does not import ConversionPropertyCard', () => {
    const editorialFiles = collectTsxFiles(join(SRC_ROOT, 'components/property/editorial'));
    const violations = editorialFiles.filter((file) =>
      MARKETPLACE_CARD_IMPORT_PATTERN.test(readSrc(file)),
    );
    expect(violations).toEqual([]);
  });
});

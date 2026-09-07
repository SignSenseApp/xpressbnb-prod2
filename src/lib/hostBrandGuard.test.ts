import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_LISTING_FIELDS } from './publicListings';

const SRC_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PROJECT_ROOT = join(SRC_ROOT, '..');
const MIGRATION = join(
  PROJECT_ROOT,
  'supabase/migrations/20260907123000_create_host_brands.sql',
);

const GUEST_SURFACE_FILES = [
  'lib/publicListings.ts',
  'lib/hostPublicCache.ts',
  'components/HostCard.tsx',
  'components/NewHomepage.tsx',
  'components/ConversionPropertyCard.tsx',
  'pages/PropertyPage.tsx',
  'pages/CityListingPage.tsx',
  'pages/RishikeshStaysPage.tsx',
  'pages/ExploreCitiesPage.tsx',
];

function readProject(relativePath: string): string {
  return readFileSync(join(SRC_ROOT, relativePath), 'utf8');
}

describe('host brand public-surface protection', () => {
  it('does not add Brand fields to guest listing projections', () => {
    expect(CARD_LISTING_FIELDS).not.toContain('business_name');
    expect(CARD_LISTING_FIELDS.join(' ')).not.toMatch(/brand/i);
  });

  it('does not add Brand fields to public host cache', () => {
    expect(readProject('lib/hostPublicCache.ts')).toMatch(
      /const HOST_PUBLIC_SELECT = 'id, name, bio, kyc_status, total_bookings, created_at'/,
    );
  });

  it('guest surfaces do not import hostBrand or query host_brands', () => {
    const violations: string[] = [];
    for (const file of GUEST_SURFACE_FILES) {
      const source = readProject(file);
      if (
        source.includes("from './hostBrand'") ||
        source.includes("from '../lib/hostBrand'") ||
        source.includes('host_brands') ||
        source.includes('host_brand_properties')
      ) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('host brand UI stays on the domain boundary', () => {
  const uiFiles = [
    'pages/host/OverviewPage.tsx',
    'components/host/BrandOnboardingFlow.tsx',
    'components/host/BrandRecognitionCard.tsx',
    'components/host/HostBrandIdentityLockup.tsx',
  ];

  it('does not query Brand tables directly from UI components', () => {
    const violations: string[] = [];
    for (const file of uiFiles) {
      const source = readProject(file);
      if (source.includes(".from('host_brands')") || source.includes('.from("host_brands")')) {
        violations.push(`${file}: host_brands`);
      }
      if (
        source.includes(".from('host_brand_properties')") ||
        source.includes('.from("host_brand_properties")')
      ) {
        violations.push(`${file}: host_brand_properties`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('Overview loads Brand through the domain helper', () => {
    expect(readProject('pages/host/OverviewPage.tsx')).toMatch(/loadHostBrandState/);
  });
});

describe('host brand migration contract', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it('creates host-private Brand tables without changing properties.host_id', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.host_brands/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.host_brand_properties/);
    expect(sql).toMatch(/CONSTRAINT host_brands_host_id_key UNIQUE \(host_id\)/);
    expect(sql).not.toMatch(/ALTER TABLE\s+(public\.)?properties\b/i);
    expect(sql).not.toMatch(/ALTER TABLE\s+(public\.)?hosts\b/i);
  });

  it('cascades Brand delete onto association rows only', () => {
    expect(sql).toMatch(
      /brand_id uuid NOT NULL REFERENCES public\.host_brands\(id\) ON DELETE CASCADE/,
    );
    expect(sql).toMatch(
      /property_id uuid NOT NULL REFERENCES public\.properties\(id\) ON DELETE CASCADE/,
    );
    expect(sql).toMatch(/host_id uuid NOT NULL REFERENCES public\.hosts\(id\) ON DELETE CASCADE/);
    expect(sql).not.toMatch(/ALTER TABLE\s+(public\.)?properties\b[\s\S]{0,200}brand_id/i);
  });

  it('revokes anonymous access and uses current_host_ids for owner RLS', () => {
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.host_brands FROM anon/);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.host_brand_properties FROM anon/);
    expect(sql).toMatch(/host_id IN \(SELECT public\.current_host_ids\(\)\)/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.replace_host_brand_properties/);
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.replace_host_brand_properties\(uuid, uuid\[\]\) FROM anon/,
    );
  });

  it('enforces same-host property association in a trigger', () => {
    expect(sql).toMatch(/enforce_host_brand_property_same_host/);
    expect(sql).toMatch(/Brand host cannot be reassigned/);
  });
});

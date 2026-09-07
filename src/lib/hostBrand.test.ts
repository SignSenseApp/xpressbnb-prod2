import { describe, expect, it } from 'vitest';
import {
  HOST_BRAND_DESCRIPTION_MAX,
  HOST_BRAND_NAME_MAX,
  normalizeBusinessDescription,
  normalizeBusinessName,
  uniquePropertyIds,
  validateHostBrandInput,
} from './hostBrand';

describe('normalizeBusinessName', () => {
  it('trims surrounding whitespace only', () => {
    expect(normalizeBusinessName('  Riverstone Stays  ')).toBe('Riverstone Stays');
  });

  it('does not change capitalization or punctuation', () => {
    expect(normalizeBusinessName("O'Neil's Homestay & Co.")).toBe("O'Neil's Homestay & Co.");
  });
});

describe('normalizeBusinessDescription', () => {
  it('returns null for empty or whitespace-only values', () => {
    expect(normalizeBusinessDescription(null)).toBeNull();
    expect(normalizeBusinessDescription(undefined)).toBeNull();
    expect(normalizeBusinessDescription('   ')).toBeNull();
  });

  it('trims a real description', () => {
    expect(normalizeBusinessDescription('  Private stays in Rishikesh  ')).toBe(
      'Private stays in Rishikesh',
    );
  });
});

describe('validateHostBrandInput', () => {
  it('accepts a valid English business name', () => {
    expect(validateHostBrandInput({ businessName: 'Riverstone Stays' })).toEqual([]);
  });

  it('accepts Hindi and mixed-script names', () => {
    expect(validateHostBrandInput({ businessName: 'शिव स्टेज़' })).toEqual([]);
    expect(validateHostBrandInput({ businessName: 'Rishikesh शिव Stays' })).toEqual([]);
  });

  it('rejects an empty name', () => {
    expect(validateHostBrandInput({ businessName: '' })).toEqual([
      { field: 'businessName', message: 'Enter a business name to continue.' },
    ]);
  });

  it('rejects whitespace-only names', () => {
    expect(validateHostBrandInput({ businessName: '   \n\t  ' })).toEqual([
      { field: 'businessName', message: 'Enter a business name to continue.' },
    ]);
  });

  it('rejects a single-character name', () => {
    expect(validateHostBrandInput({ businessName: 'A' })).toEqual([
      { field: 'businessName', message: 'Enter a business name to continue.' },
    ]);
  });

  it('accepts the maximum name length', () => {
    const name = 'न'.repeat(HOST_BRAND_NAME_MAX);
    expect(validateHostBrandInput({ businessName: name })).toEqual([]);
  });

  it('rejects names over the maximum length', () => {
    const name = 'a'.repeat(HOST_BRAND_NAME_MAX + 1);
    expect(validateHostBrandInput({ businessName: name })).toEqual([
      { field: 'businessName', message: 'Keep the business name under 60 characters.' },
    ]);
  });

  it('accepts an omitted description', () => {
    expect(validateHostBrandInput({ businessName: 'Quiet Court' })).toEqual([]);
  });

  it('rejects a description over the maximum length', () => {
    const description = 'x'.repeat(HOST_BRAND_DESCRIPTION_MAX + 1);
    expect(validateHostBrandInput({ businessName: 'Quiet Court', businessDescription: description })).toEqual(
      [{ field: 'businessDescription', message: 'Keep the description under 160 characters.' }],
    );
  });
});

describe('uniquePropertyIds', () => {
  it('dedupes, trims, and drops invalid ids', () => {
    expect(
      uniquePropertyIds([
        '11111111-1111-4111-8111-111111111111',
        ' 11111111-1111-4111-8111-111111111111 ',
        'not-a-uuid',
        '22222222-2222-4222-8222-222222222222',
      ]),
    ).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ]);
  });
});

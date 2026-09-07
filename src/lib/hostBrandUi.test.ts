import { afterEach, describe, expect, it } from 'vitest';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
}
import {
  HOST_BRAND_COPY,
  HOST_BRAND_DISMISS_STORAGE_PREFIX,
  brandLeaveCopy,
  brandCardVariant,
  brandFlowNeedsLeaveConfirm,
  brandFlowStepLabel,
  brandSuccessBody,
  brandSuccessLinkCopy,
  defaultSelectedPropertyIds,
  dismissHostBrandCard,
  hostBrandDismissStorageKey,
  hostInitial,
  initialBrandFlowStep,
  isBrandNameDraftDirty,
  isPropertySelectionDirty,
  isHostBrandCardDismissed,
  m4PrimaryLabel,
  nextBrandFlowStep,
  previousBrandFlowStep,
  togglePropertyId,
} from './hostBrandUi';
import { HOST_BRAND_NAME_MAX, HOST_BRAND_SAVE_ERROR, validateHostBrandInput } from './hostBrand';
import type { HostBrandIdentity } from './hostBrand';

const brand: HostBrandIdentity = {
  id: 'brand-1',
  hostId: 'host-1',
  businessName: 'Riverstone Stays',
  businessDescription: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

afterEach(() => {
  localStorage.clear();
});

describe('brandCardVariant / M1 eligibility', () => {
  const base = {
    hostId: 'host-1',
    overviewLoading: false,
    brandLoading: false,
    brand: null as HostBrandIdentity | null,
    dismissed: false,
    propertyCount: 1,
    totalBookingsAllTime: 0,
  };

  it('shows recognition when host is loaded, no Brand, and at least one property', () => {
    expect(brandCardVariant(base)).toBe('recognition');
  });

  it('shows recognition when the operational signal is all-time bookings', () => {
    expect(brandCardVariant({ ...base, propertyCount: 0, totalBookingsAllTime: 1 })).toBe(
      'recognition',
    );
  });

  it('hides while Overview or Brand data is loading', () => {
    expect(brandCardVariant({ ...base, overviewLoading: true })).toBe('hidden');
    expect(brandCardVariant({ ...base, brandLoading: true })).toBe('hidden');
  });

  it('hides recognition when Brand data failed to load', () => {
    expect(brandCardVariant({ ...base, brandError: true })).toBe('hidden');
  });

  it('hides when the host is not loaded', () => {
    expect(brandCardVariant({ ...base, hostId: null })).toBe('hidden');
  });

  it('hides recognition after Not now dismissal', () => {
    expect(brandCardVariant({ ...base, dismissed: true })).toBe('hidden');
  });

  it('hides recognition when there is no operational signal', () => {
    expect(brandCardVariant({ ...base, propertyCount: 0, totalBookingsAllTime: 0 })).toBe('hidden');
  });

  it('shows the Brand summary instead of recognition when Brand exists', () => {
    expect(brandCardVariant({ ...base, brand, dismissed: true })).toBe('summary');
  });
});

describe('dismissal persistence', () => {
  it('is host-scoped and does not write Brand data', () => {
    expect(hostBrandDismissStorageKey('host-a')).toBe(`${HOST_BRAND_DISMISS_STORAGE_PREFIX}host-a`);
    dismissHostBrandCard('host-a');
    expect(isHostBrandCardDismissed('host-a')).toBe(true);
    expect(isHostBrandCardDismissed('host-b')).toBe(false);
  });
});

describe('Brand onboarding flow steps', () => {
  it('starts create at M2 meaning and edit at M3 name', () => {
    expect(initialBrandFlowStep('create')).toBe('meaning');
    expect(initialBrandFlowStep('edit')).toBe('name');
  });

  it('advances meaning → name → properties → success', () => {
    expect(nextBrandFlowStep('meaning')).toBe('name');
    expect(nextBrandFlowStep('name')).toBe('properties');
    expect(nextBrandFlowStep('properties')).toBe('success');
  });

  it('labels M2–M4 as steps 1–3 and omits success from the stepper', () => {
    expect(brandFlowStepLabel('meaning')).toBe('Step 1 of 3');
    expect(brandFlowStepLabel('name')).toBe('Step 2 of 3');
    expect(brandFlowStepLabel('properties')).toBe('Step 3 of 3');
    expect(brandFlowStepLabel('success')).toBeNull();
  });

  it('closes from M2; edit back from M3 closes; M4 back returns to name', () => {
    expect(previousBrandFlowStep('meaning', 'create')).toBe('close');
    expect(previousBrandFlowStep('name', 'create')).toBe('meaning');
    expect(previousBrandFlowStep('name', 'edit')).toBe('close');
    expect(previousBrandFlowStep('properties', 'create')).toBe('name');
  });

  it('asks to leave without saving from M3 and M4 only', () => {
    expect(brandFlowNeedsLeaveConfirm('meaning')).toBe(false);
    expect(brandFlowNeedsLeaveConfirm('name')).toBe(true);
    expect(brandFlowNeedsLeaveConfirm('properties')).toBe(true);
    expect(brandFlowNeedsLeaveConfirm('success')).toBe(false);
  });
});

describe('M3 name validation (domain)', () => {
  it('accepts a valid business name', () => {
    expect(validateHostBrandInput({ businessName: 'Riverstone Stays' })).toEqual([]);
  });

  it('rejects an empty name', () => {
    expect(validateHostBrandInput({ businessName: '' })[0]?.field).toBe('businessName');
  });

  it('rejects a name over 60 characters', () => {
    expect(
      validateHostBrandInput({ businessName: 'a'.repeat(HOST_BRAND_NAME_MAX + 1) })[0]?.message,
    ).toMatch(/60/);
  });

  it('treats draft as dirty when name or description changes', () => {
    expect(isBrandNameDraftDirty('A', '', '', '')).toBe(true);
    expect(isBrandNameDraftDirty('A', '', 'A', '')).toBe(false);
  });
});

describe('M4 property association', () => {
  const ids = ['p1', 'p2', 'p3'];

  it('selects every listing by default on create', () => {
    expect(defaultSelectedPropertyIds('create', ids, [])).toEqual(ids);
  });

  it('selects the single listing on create with one property', () => {
    expect(defaultSelectedPropertyIds('create', ['p1'], [])).toEqual(['p1']);
  });

  it('starts with an empty selection when there are zero properties', () => {
    expect(defaultSelectedPropertyIds('create', [], [])).toEqual([]);
  });

  it('restores saved associations on edit and drops unknown ids', () => {
    expect(defaultSelectedPropertyIds('edit', ids, ['p2', 'gone'])).toEqual(['p2']);
  });

  it('toggles selection without relying on a color-only rule', () => {
    expect(togglePropertyId(['p1', 'p2'], 'p2')).toEqual(['p1']);
    expect(togglePropertyId(['p1'], 'p2')).toEqual(['p1', 'p2']);
  });

  it('treats selection as dirty when it differs from persisted associations', () => {
    expect(isPropertySelectionDirty(['p1', 'p2'], [])).toBe(true);
    expect(isPropertySelectionDirty(['p1'], ['p1'])).toBe(false);
    expect(isPropertySelectionDirty(['p2'], ['p1'])).toBe(true);
  });

  it('uses Save business name when there are no listings', () => {
    expect(m4PrimaryLabel(0)).toBe(HOST_BRAND_COPY.m4SaveWithoutListings);
    expect(m4PrimaryLabel(2)).toBe(HOST_BRAND_COPY.m4SaveWithListings);
  });
});

describe('success and summary copy', () => {
  it('keeps Host as operator after Brand is added', () => {
    expect(brandSuccessBody('Riverstone Stays')).toBe(
      'You are still the host. Riverstone Stays is now part of your operation.',
    );
  });

  it('reports linked listing count or the later-link empty path', () => {
    expect(brandSuccessLinkCopy(0)).toBe('Link listings anytime from Properties.');
    expect(brandSuccessLinkCopy(1)).toBe('1 listing linked');
    expect(brandSuccessLinkCopy(3)).toBe('3 listings linked');
  });

  it('uses the first character of the host name for the lockup', () => {
    expect(hostInitial('River')).toBe('R');
    expect(hostInitial('')).toBe('H');
  });

  it('asks to leave without saving entered name, or unsaved listing links after name save', () => {
    expect(brandLeaveCopy(false).body).toBe(HOST_BRAND_COPY.leaveBody);
    expect(brandLeaveCopy(true).body).toBe(HOST_BRAND_COPY.leaveBodyUnlinked);
  });

  it('keeps a single recoverable save-error message', () => {
    expect(HOST_BRAND_SAVE_ERROR).toBe('Could not save your business name. Try again.');
  });
});

/**
 * Host Brand onboarding UI helpers.
 *
 * Persistence of Brand identity is server-side (`hostBrand.ts`).
 * "Not now" is a local UX preference only — not a Brand row.
 */

import type { HostBrandIdentity } from './hostBrand';

export const HOST_BRAND_DISMISS_STORAGE_PREFIX = 'xpx-host-brand-dismissed:';

export type BrandFlowMode = 'create' | 'edit';
export type BrandFlowStep = 'meaning' | 'name' | 'properties' | 'success';
export type BrandCardVariant = 'hidden' | 'recognition' | 'summary';

export type HostBrandListingOption = {
  id: string;
  title: string;
  city: string;
  coverUrl: string | null;
};

export const HOST_BRAND_COPY = {
  m1Eyebrow: 'Your operation',
  m1Title: 'Give your hospitality business a name',
  m1Body:
    'Add an optional business name for your stays. It is not a paid plan, and your listings stay on your host account.',
  m1Primary: 'Add a business name',
  m1Secondary: 'Not now',
  summaryEyebrow: 'Your business identity',
  summaryAction: 'Edit business name',
  m2Headline: 'Host is you. Brand is the house.',
  m2HostLine: 'Host — you, the person running your stays',
  m2BrandLine: 'Brand — the hospitality name you operate under',
  m2SameLogin: 'Same login, same listings — not a paid plan',
  m2Trust: 'Free to add. Does not change who owns your listings.',
  m2Continue: 'Continue',
  hostRole: 'You · Operator',
  brandRole: 'Business name · Optional',
  brandPlaceholder: 'Your business name',
  nameLabel: 'Business name',
  namePlaceholder: 'e.g. Riverstone Stays',
  nameHelper:
    'This is the hospitality name you operate under. It is optional and separate from your personal host profile.',
  descriptionLabel: 'Short description (optional)',
  descriptionPlaceholder: 'A line about your stays or service area',
  m4Title: 'Which listings use this business name?',
  m4Helper: 'Your listings stay on your host account. This only links a business name to them.',
  m4EmptyTitle: 'No listings yet',
  m4EmptyBody: 'You can still save your business name and link listings later.',
  m4SaveWithListings: 'Save & finish',
  m4SaveWithoutListings: 'Save business name',
  saving: 'Saving…',
  successTitle: 'Business name added',
  successBack: 'Back to Overview',
  leaveTitle: 'Leave without saving?',
  leaveBody: 'Your business name has not been saved yet.',
  leaveBodyUnlinked: 'Listing links have not been saved yet.',
  leaveStay: 'Stay',
  leaveConfirm: 'Leave',
} as const;

export function hostBrandDismissStorageKey(hostId: string): string {
  return `${HOST_BRAND_DISMISS_STORAGE_PREFIX}${hostId.trim()}`;
}

export function isHostBrandCardDismissed(hostId: string): boolean {
  const id = hostId.trim();
  if (!id || typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(hostBrandDismissStorageKey(id)) === '1';
  } catch {
    return false;
  }
}

export function dismissHostBrandCard(hostId: string): void {
  const id = hostId.trim();
  if (!id || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(hostBrandDismissStorageKey(id), '1');
  } catch {
    /* private mode / quota — treat as session-only dismiss */
  }
}

export function brandCardVariant(input: {
  hostId: string | null | undefined;
  overviewLoading: boolean;
  brandLoading: boolean;
  brandError?: boolean;
  brand: HostBrandIdentity | null;
  dismissed: boolean;
  propertyCount: number;
  totalBookingsAllTime: number;
}): BrandCardVariant {
  if (input.overviewLoading || input.brandLoading || !input.hostId?.trim()) {
    return 'hidden';
  }
  if (input.brandError) return 'hidden';
  if (input.brand) return 'summary';
  if (input.dismissed) return 'hidden';
  if (input.propertyCount >= 1 || input.totalBookingsAllTime >= 1) {
    return 'recognition';
  }
  return 'hidden';
}

export function initialBrandFlowStep(mode: BrandFlowMode): BrandFlowStep {
  return mode === 'edit' ? 'name' : 'meaning';
}

export function brandFlowStepNumber(step: BrandFlowStep): 1 | 2 | 3 | null {
  if (step === 'meaning') return 1;
  if (step === 'name') return 2;
  if (step === 'properties') return 3;
  return null;
}

export function brandFlowStepLabel(step: BrandFlowStep): string | null {
  const n = brandFlowStepNumber(step);
  return n ? `Step ${n} of 3` : null;
}

export function nextBrandFlowStep(step: BrandFlowStep): BrandFlowStep {
  if (step === 'meaning') return 'name';
  if (step === 'name') return 'properties';
  return 'success';
}

export function previousBrandFlowStep(
  step: BrandFlowStep,
  mode: BrandFlowMode,
): BrandFlowStep | 'close' {
  if (step === 'meaning' || step === 'success') return 'close';
  if (step === 'name') return mode === 'edit' ? 'close' : 'meaning';
  return 'name';
}

export function brandFlowNeedsLeaveConfirm(step: BrandFlowStep): boolean {
  return step === 'name' || step === 'properties';
}

export function isBrandNameDraftDirty(
  businessName: string,
  businessDescription: string,
  initialName: string,
  initialDescription: string,
): boolean {
  return (
    businessName !== initialName || businessDescription !== initialDescription
  );
}

export function defaultSelectedPropertyIds(
  mode: BrandFlowMode,
  allIds: readonly string[],
  existingAssociationIds: readonly string[],
): string[] {
  if (mode === 'edit') {
    const allowed = new Set(allIds);
    return existingAssociationIds.filter((id) => allowed.has(id));
  }
  return [...allIds];
}

export function togglePropertyId(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
}

export function isPropertySelectionDirty(
  selected: readonly string[],
  persisted: readonly string[],
): boolean {
  if (selected.length !== persisted.length) return true;
  const persistedSet = new Set(persisted);
  return selected.some((id) => !persistedSet.has(id));
}

export function brandLeaveCopy(nameAlreadySaved: boolean): { title: string; body: string } {
  return {
    title: HOST_BRAND_COPY.leaveTitle,
    body: nameAlreadySaved ? HOST_BRAND_COPY.leaveBodyUnlinked : HOST_BRAND_COPY.leaveBody,
  };
}

export function m4PrimaryLabel(propertyCount: number): string {
  return propertyCount === 0
    ? HOST_BRAND_COPY.m4SaveWithoutListings
    : HOST_BRAND_COPY.m4SaveWithListings;
}

export function brandSuccessBody(businessName: string): string {
  return `You are still the host. ${businessName} is now part of your operation.`;
}

export function brandSuccessLinkCopy(linkedCount: number): string {
  if (linkedCount === 1) return '1 listing linked';
  if (linkedCount > 1) return `${linkedCount} listings linked`;
  return 'Link listings anytime from Properties.';
}

export function hostInitial(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return 'H';
  return Array.from(trimmed)[0]!.toUpperCase();
}

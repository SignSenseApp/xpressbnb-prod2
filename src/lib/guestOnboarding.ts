/**
 * Guest first-visit onboarding — persisted engagement + product education modal state.
 * Overlay sequencing is owned by GuestOnboardingContext; this module is storage + signals.
 */

export const WELCOME_OFFER_SEEN_KEY = 'xpx_welcome_offer_seen_v1';
export const ONBOARDING_ENGAGEMENT_KEY = 'xpx_onboarding_engagement_v1';

/** Brief pause before product-education modal after property-row intent (ms). */
export const WELCOME_INTRO_PAUSE_MS = 400;

/** Listing interactions before PWA install may appear. */
export const MIN_LISTING_BROWSES_FOR_INSTALL = 2;

export type OnboardingEngagement = {
  propertyRowSeen: boolean;
  listingBrowseCount: number;
};

export type OnboardingOverlay = 'cookie' | 'location' | 'welcome' | null;

export type OnboardingPhase =
  | 'cookie'
  | 'location'
  | 'awaiting_engagement'
  | 'welcome'
  | 'complete';

const DEFAULT_ENGAGEMENT: OnboardingEngagement = {
  propertyRowSeen: false,
  listingBrowseCount: 0,
};

function readEngagement(): OnboardingEngagement {
  if (typeof window === 'undefined') return { ...DEFAULT_ENGAGEMENT };
  try {
    const raw = localStorage.getItem(ONBOARDING_ENGAGEMENT_KEY);
    if (!raw) return { ...DEFAULT_ENGAGEMENT };
    const parsed = JSON.parse(raw) as Partial<OnboardingEngagement>;
    return {
      propertyRowSeen: Boolean(parsed.propertyRowSeen),
      listingBrowseCount: Math.max(0, Number(parsed.listingBrowseCount) || 0),
    };
  } catch {
    return { ...DEFAULT_ENGAGEMENT };
  }
}

function writeEngagement(next: OnboardingEngagement): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_ENGAGEMENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode — non-fatal */
  }
}

export function hasWelcomeOfferSeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(WELCOME_OFFER_SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

export function markWelcomeOfferSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WELCOME_OFFER_SEEN_KEY, '1');
  } catch {
    /* non-fatal */
  }
}

export function getOnboardingEngagement(): OnboardingEngagement {
  return readEngagement();
}

export function recordPropertyRowSeen(): OnboardingEngagement {
  const current = readEngagement();
  if (current.propertyRowSeen) return current;
  const next = { ...current, propertyRowSeen: true };
  writeEngagement(next);
  return next;
}

export function recordListingBrowse(): OnboardingEngagement {
  const current = readEngagement();
  const next = {
    ...current,
    listingBrowseCount: current.listingBrowseCount + 1,
  };
  writeEngagement(next);
  return next;
}

export function hasListingEngagementForInstall(): boolean {
  return readEngagement().listingBrowseCount >= MIN_LISTING_BROWSES_FOR_INSTALL;
}

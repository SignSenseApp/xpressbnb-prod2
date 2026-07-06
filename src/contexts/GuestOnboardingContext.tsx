import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { hasCookieConsentDecision, subscribeCookieConsent } from '../lib/cookieConsent';
import {
  hasWelcomeOfferSeen,
  markWelcomeOfferSeen,
  recordListingBrowse,
  recordPropertyRowSeen,
  WELCOME_INTRO_PAUSE_MS,
  MIN_LISTING_BROWSES_FOR_INSTALL,
  getOnboardingEngagement,
  type OnboardingOverlay,
  type OnboardingPhase,
} from '../lib/guestOnboarding';
import { isGeolocationSupported } from '../lib/geolocation';
import { readLocationPreference, shouldShowLocationPrompt } from '../lib/locationPreferences';
import { shouldShowInstallBanner } from '../lib/pwa';
import { useNearbyLocation } from './NearbyLocationContext';

type GuestOnboardingContextValue = {
  enabled: boolean;
  phase: OnboardingPhase;
  activeOverlay: OnboardingOverlay;
  isOnboardingSettled: boolean;
  canShowInstallPrompt: boolean;
  propertyBookingActive: boolean;
  setPropertyBookingActive: (active: boolean) => void;
  recordPropertyRowVisible: () => void;
  recordListingEngagement: () => void;
  dismissWelcome: () => void;
};

const GuestOnboardingContext = createContext<GuestOnboardingContextValue | null>(null);

function needsLocationStep(): boolean {
  if (!isGeolocationSupported()) return false;
  return shouldShowLocationPrompt(readLocationPreference());
}

function computeInitialPhase(): OnboardingPhase {
  if (!hasCookieConsentDecision()) return 'cookie';
  if (needsLocationStep()) return 'location';
  if (!hasWelcomeOfferSeen()) return 'awaiting_engagement';
  return 'complete';
}

function overlayForPhase(phase: OnboardingPhase): OnboardingOverlay {
  if (phase === 'cookie') return 'cookie';
  if (phase === 'location') return 'location';
  if (phase === 'welcome') return 'welcome';
  return null;
}

export function GuestOnboardingProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const nearby = useNearbyLocation();
  const [phase, setPhase] = useState<OnboardingPhase>(() =>
    enabled ? computeInitialPhase() : 'complete',
  );
  const [listingBrowseCount, setListingBrowseCount] = useState(
    () => getOnboardingEngagement().listingBrowseCount,
  );
  const [propertyBookingActive, setPropertyBookingActiveState] = useState(false);
  const latchPropertyBookingActive = useCallback(() => {
    setPropertyBookingActiveState(true);
  }, []);
  const welcomePauseRef = useRef<number | null>(null);
  const locationOpenedRef = useRef(false);
  const prevPromptOpenRef = useRef(nearby.isPromptOpen);

  const rawOverlay = enabled ? overlayForPhase(phase) : null;
  const activeOverlay =
    propertyBookingActive && rawOverlay === 'welcome' ? null : rawOverlay;

  const advanceAfterLocation = useCallback(() => {
    if (!hasWelcomeOfferSeen()) {
      setPhase('awaiting_engagement');
      return;
    }
    setPhase('complete');
  }, []);

  const scheduleWelcome = useCallback(() => {
    if (welcomePauseRef.current != null) {
      window.clearTimeout(welcomePauseRef.current);
    }
    welcomePauseRef.current = window.setTimeout(() => {
      welcomePauseRef.current = null;
      setPhase('welcome');
    }, WELCOME_INTRO_PAUSE_MS);
  }, []);

  const dismissWelcome = useCallback(() => {
    markWelcomeOfferSeen();
    setPhase('complete');
  }, []);

  const recordPropertyRowVisible = useCallback(() => {
    if (!enabled || phase !== 'awaiting_engagement') return;
    const engagement = recordPropertyRowSeen();
    if (engagement.propertyRowSeen) {
      scheduleWelcome();
    }
  }, [enabled, phase, scheduleWelcome]);

  const recordListingEngagement = useCallback(() => {
    if (!enabled) return;
    const next = recordListingBrowse();
    setListingBrowseCount(next.listingBrowseCount);
  }, [enabled]);

  // Cookie decision → location or engagement
  useEffect(() => {
    if (!enabled) return;
    return subscribeCookieConsent(() => {
      if (!hasCookieConsentDecision()) return;
      setPhase((current) => {
        if (current !== 'cookie') return current;
        return needsLocationStep() ? 'location' : hasWelcomeOfferSeen() ? 'complete' : 'awaiting_engagement';
      });
    });
  }, [enabled]);

  // Open location sheet when entering location phase
  useEffect(() => {
    if (!enabled || phase !== 'location') {
      locationOpenedRef.current = false;
      return;
    }
    if (locationOpenedRef.current) return;
    locationOpenedRef.current = true;
    nearby.openPrompt();
  }, [enabled, phase, nearby]);

  // Detect location sheet closed → advance
  useEffect(() => {
    if (!enabled) return;
    const wasOpen = prevPromptOpenRef.current;
    prevPromptOpenRef.current = nearby.isPromptOpen;

    if (phase !== 'location') return;
    if (!wasOpen || nearby.isPromptOpen) return;
    advanceAfterLocation();
  }, [enabled, phase, nearby.isPromptOpen, advanceAfterLocation]);

  // Skip location when unsupported on entry
  useEffect(() => {
    if (!enabled || phase !== 'location') return;
    if (!needsLocationStep()) {
      advanceAfterLocation();
    }
  }, [enabled, phase, advanceAfterLocation]);

  useEffect(() => {
    return () => {
      if (welcomePauseRef.current != null) {
        window.clearTimeout(welcomePauseRef.current);
      }
    };
  }, []);

  const isOnboardingSettled = !enabled || phase === 'complete';

  const canShowInstallPrompt =
    enabled &&
    phase === 'complete' &&
    activeOverlay === null &&
    listingBrowseCount >= MIN_LISTING_BROWSES_FOR_INSTALL &&
    shouldShowInstallBanner();

  const value = useMemo<GuestOnboardingContextValue>(
    () => ({
      enabled,
      phase,
      activeOverlay,
      isOnboardingSettled,
      canShowInstallPrompt,
      propertyBookingActive,
      setPropertyBookingActive: latchPropertyBookingActive,
      recordPropertyRowVisible,
      recordListingEngagement,
      dismissWelcome,
    }),
    [
      enabled,
      phase,
      activeOverlay,
      isOnboardingSettled,
      canShowInstallPrompt,
      propertyBookingActive,
      latchPropertyBookingActive,
      recordPropertyRowVisible,
      recordListingEngagement,
      dismissWelcome,
    ],
  );

  return (
    <GuestOnboardingContext.Provider value={value}>{children}</GuestOnboardingContext.Provider>
  );
}

export function useGuestOnboarding(): GuestOnboardingContextValue {
  const ctx = useContext(GuestOnboardingContext);
  if (!ctx) {
    throw new Error('useGuestOnboarding must be used within GuestOnboardingProvider');
  }
  return ctx;
}

export function useGuestOnboardingOptional(): GuestOnboardingContextValue | null {
  return useContext(GuestOnboardingContext);
}

import { useCallback } from 'react';
import { CookieConsentBanner } from '../CookieConsent';
import InstallAppPrompt from '../InstallAppPrompt';
import { useGuestOnboarding } from '../../contexts/GuestOnboardingContext';
import { navigateTo } from '../../lib/navigation';
import WelcomeOfferModal from './WelcomeOfferModal';

type GuestOnboardingOrchestratorProps = {
  hidden?: boolean;
};

/**
 * Single owner of guest first-visit overlays — cookie, welcome, install gating.
 * Location sheet is opened via context phase; NearbyLocationShell renders the sheet.
 */
export default function GuestOnboardingOrchestrator({
  hidden = false,
}: GuestOnboardingOrchestratorProps) {
  const {
    enabled,
    activeOverlay,
    canShowInstallPrompt,
    dismissWelcome,
  } = useGuestOnboarding();

  const handleWelcomeExplore = useCallback(() => {
    dismissWelcome();
    const listings = document.getElementById('listings');
    if (listings) {
      listings.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [dismissWelcome]);

  const handleWelcomeSignIn = useCallback(() => {
    dismissWelcome();
    navigateTo('/auth/login');
  }, [dismissWelcome]);

  if (!enabled) {
    return (
      <>
        <CookieConsentBanner />
        <InstallAppPrompt hidden={hidden} />
      </>
    );
  }

  return (
    <>
      <CookieConsentBanner orchestrated forceVisible={activeOverlay === 'cookie'} />
      <WelcomeOfferModal
        open={activeOverlay === 'welcome'}
        onExplore={handleWelcomeExplore}
        onSignIn={handleWelcomeSignIn}
        onDismiss={dismissWelcome}
      />
      <InstallAppPrompt hidden={hidden} orchestrated forceVisible={canShowInstallPrompt} />
    </>
  );
}

import { lazy, Suspense, useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import NewHomepage from './components/NewHomepage';
import Preloader from './components/Preloader';
import MobileBottomNav from './components/MobileBottomNav';
import InstallAppPrompt from './components/InstallAppPrompt';
import { CookieConsentBanner } from './components/CookieConsent';
import RouteFallback from './components/RouteFallback';
import { closeHomeOverlay, getHomeOverlayPage } from './lib/navigation';

const PropertyPage = lazy(() => import('./pages/PropertyPage'));
const BookingConfirmationPage = lazy(() => import('./pages/BookingConfirmationPage'));
const CityListingPage = lazy(() => import('./pages/CityListingPage'));
const RishikeshStaysPage = lazy(() => import('./pages/RishikeshStaysPage'));
const ExploreCitiesPage = lazy(() => import('./pages/ExploreCitiesPage'));
const SavedListingsPage = lazy(() => import('./pages/SavedListingsPage'));
const AuthRouter = lazy(() => import('./pages/auth/AuthRouter'));
const OpsConsolePage = lazy(() => import('./pages/ops/OpsConsolePage'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const BlogPage = lazy(() => import('./components/BlogPage'));
const PrivacyPolicyPage = lazy(() => import('./components/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./components/TermsPage'));
const StayScoreInfoSheet = lazy(() => import('./components/StayScoreInfoSheet'));
const StayScoreEducationTooltip = lazy(() => import('./components/StayScoreEducationTooltip'));
const HostDashboardLayout = lazy(() => import('./pages/host/HostDashboardLayout'));
const OverviewPage = lazy(() => import('./pages/host/OverviewPage'));
const PropertiesPage = lazy(() => import('./pages/host/PropertiesPage'));
const BookingsPage = lazy(() => import('./pages/host/BookingsPage'));
const SettingsPage = lazy(() => import('./pages/host/SettingsPage'));
const CalendarPage = lazy(() => import('./pages/host/CalendarPage'));
const CalendarSyncPage = lazy(() => import('./pages/host/CalendarSyncPage'));
const EarningsPage = lazy(() => import('./pages/host/EarningsPage'));
const AnalyticsPage = lazy(() => import('./pages/host/AnalyticsPage'));
const ReviewsPage = lazy(() => import('./pages/host/ReviewsPage'));
const SubscriptionPage = lazy(() => import('./pages/host/SubscriptionPage'));
const SupportPage = lazy(() => import('./pages/host/SupportPage'));
const ImportPage = lazy(() => import('./pages/host/ImportPage'));

function syncLocation() {
  return {
    path: window.location.pathname,
    key: `${window.location.pathname}${window.location.search}`,
  };
}

export default function AppRouter() {
  const { user, host, loading, signOut } = useAuth();
  const [currentPath, setCurrentPath] = useState(() => syncLocation().path);
  const [locationKey, setLocationKey] = useState(() => syncLocation().key);
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const handlePopState = () => {
      setIsRouteLoading(true);
      const loc = syncLocation();
      setCurrentPath(loc.path);
      setLocationKey(loc.key);
      setTimeout(() => setIsRouteLoading(false), 300);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setIsRouteLoading(false);
        setIsInitialLoad(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    if (!isInitialLoad) {
      setIsRouteLoading(true);
      const timer = setTimeout(() => setIsRouteLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [currentPath, locationKey, isInitialLoad]);

  useEffect(() => {
    if (!loading && user && host) {
      const isResettingPassword = currentPath.startsWith('/auth/reset-password');
      const isOpsConsole = currentPath.startsWith('/ops');
      const homeOverlay = getHomeOverlayPage();
      const shouldRedirectToDashboard =
        !isResettingPassword &&
        !isOpsConsole &&
        !homeOverlay &&
        (currentPath.startsWith('/auth') || currentPath === '/' || currentPath === '/host');
      if (shouldRedirectToDashboard) {
        const dashboardPath = `/host/${host.id}/dashboard/overview`;
        window.history.pushState({}, '', dashboardPath);
        const loc = syncLocation();
        setCurrentPath(loc.path);
        setLocationKey(loc.key);
      }
    }
  }, [user, host, loading, currentPath, locationKey]);

  const showPreloader = loading || isRouteLoading;

  if (loading) {
    return <Preloader isLoading={true} />;
  }

  const handleNavigate = (path: string) => {
    setIsRouteLoading(true);
    window.history.pushState({}, '', path);
    const loc = syncLocation();
    setCurrentPath(loc.path);
    setLocationKey(loc.key);
    setTimeout(() => setIsRouteLoading(false), 300);
  };

  const renderContent = () => {
    void locationKey;

    if (currentPath.startsWith('/auth')) {
      return <AuthRouter />;
    }

    if (currentPath.startsWith('/ops')) {
      return <OpsConsolePage onNavigate={handleNavigate} />;
    }

    if (currentPath.startsWith('/booking/')) {
      return <BookingConfirmationPage />;
    }

    if (currentPath.startsWith('/property/')) {
      return <PropertyPage />;
    }

    if (currentPath === '/explore' || currentPath === '/explore/') {
      return <ExploreCitiesPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/saved' || currentPath === '/saved/') {
      return <SavedListingsPage onNavigate={handleNavigate} />;
    }

    if (currentPath.startsWith('/stays/')) {
      const citySlug = currentPath.split('/stays/')[1].split('/')[0];
      if (citySlug === 'rishikesh') {
        return <RishikeshStaysPage />;
      }
      return <CityListingPage city={citySlug} />;
    }

    if (user && !host) {
      return <HostProfileError onRetry={() => window.location.reload()} onSignOut={signOut} />;
    }

    if (user && host) {
      if (currentPath.startsWith('/host/')) {
        const match = currentPath.match(/\/host\/[^/]+\/dashboard\/(.+)/);
        const page = match ? match[1] : 'overview';

        const handleHostNavigate = (newPage: string) => {
          setIsRouteLoading(true);
          const newPath = `/host/${host.id}/dashboard/${newPage}`;
          window.history.pushState({}, '', newPath);
          setCurrentPath(newPath);
          setTimeout(() => setIsRouteLoading(false), 300);
        };

        return (
          <HostDashboardLayout currentPage={page} onNavigate={handleHostNavigate} hostId={host.id}>
            {page === 'overview' && <OverviewPage onNavigate={handleHostNavigate} />}
            {page === 'properties' && <PropertiesPage />}
            {page === 'calendar' && <CalendarPage hostId={host.id} />}
            {page === 'bookings' && <BookingsPage onNavigate={handleHostNavigate} />}
            {page === 'calendar-sync' && <CalendarSyncPage />}
            {page === 'import' && <ImportPage />}
            {page === 'earnings' && <EarningsPage />}
            {page === 'realtime' && <AnalyticsPage />}
            {page === 'reviews' && <ReviewsPage />}
            {page === 'subscription' && <SubscriptionPage />}
            {page === 'settings' && <SettingsPage />}
            {page === 'support' && <SupportPage />}
          </HostDashboardLayout>
        );
      }
    }

    const homeOverlay = getHomeOverlayPage();
    if (homeOverlay === 'about') {
      return <AboutPage onClose={closeHomeOverlay} />;
    }
    if (homeOverlay === 'blog') {
      return <BlogPage onClose={closeHomeOverlay} />;
    }
    if (homeOverlay === 'privacy') {
      return <PrivacyPolicyPage onClose={closeHomeOverlay} />;
    }
    if (homeOverlay === 'terms') {
      return <TermsPage onClose={closeHomeOverlay} />;
    }

    return <NewHomepage />;
  };

  return (
    <>
      <Preloader isLoading={showPreloader} />
      <Suspense fallback={<RouteFallback />}>{renderContent()}</Suspense>
      <CookieConsentBanner />
      <Suspense fallback={null}>
        <StayScoreInfoSheet />
        <StayScoreEducationTooltip />
      </Suspense>
      <InstallAppPrompt hidden={currentPath.startsWith('/booking/')} />
      <MobileBottomNav currentPath={currentPath} onNavigate={handleNavigate} />
    </>
  );
}

function HostProfileError({
  onRetry,
  onSignOut,
}: {
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--xpx-page, #F8FAFC)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{ background: 'var(--xpx-surface, #fff)', border: '1px solid var(--xpx-border, #e2e8f0)', boxShadow: '0 24px 64px rgba(15,23,42,0.10)' }}
      >
        <h1 className="text-xl font-extrabold text-xpx-text mb-2">We couldn&apos;t load your host profile</h1>
        <p className="text-sm text-xpx-muted mb-6 leading-relaxed">
          You&apos;re signed in, but your host dashboard didn&apos;t load. This is usually a temporary
          connection issue. Please retry — if it keeps happening, sign out and sign back in.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2.5 rounded-xl font-bold text-white transition-all"
            style={{ background: 'var(--xpx-warm, #50C878)', boxShadow: '0 6px 20px rgba(80,200,120,0.35)' }}
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="px-5 py-2.5 rounded-xl font-semibold text-xpx-text transition-colors"
            style={{ background: 'var(--xpx-surface-light, #f1f5f9)', border: '1px solid var(--xpx-border-strong, #cbd5e1)' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

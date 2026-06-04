import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import PropertyPage from './pages/PropertyPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import CityListingPage from './pages/CityListingPage';
import RishikeshStaysPage from './pages/RishikeshStaysPage';
import ExploreCitiesPage from './pages/ExploreCitiesPage';
import NewHomepage from './components/NewHomepage';
import AuthRouter from './pages/auth/AuthRouter';
import HostDashboardLayout from './pages/host/HostDashboardLayout';
import OverviewPage from './pages/host/OverviewPage';
import PropertiesPage from './pages/host/PropertiesPage';
import BookingsPage from './pages/host/BookingsPage';
import SettingsPage from './pages/host/SettingsPage';
import CalendarPage from './pages/host/CalendarPage';
import CalendarSyncPage from './pages/host/CalendarSyncPage';
import EarningsPage from './pages/host/EarningsPage';
import AnalyticsPage from './pages/host/AnalyticsPage';
import ReviewsPage from './pages/host/ReviewsPage';
import SubscriptionPage from './pages/host/SubscriptionPage';
import SupportPage from './pages/host/SupportPage';
import ImportPage from './pages/host/ImportPage';
import AboutPage from './components/AboutPage';
import BlogPage from './components/BlogPage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsPage from './components/TermsPage';
import Preloader from './components/Preloader';
import MobileBottomNav from './components/MobileBottomNav';
import InstallAppPrompt from './components/InstallAppPrompt';
import { CookieConsentBanner } from './components/CookieConsent';
import { closeHomeOverlay, getHomeOverlayPage } from './lib/navigation';

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
      // Never bounce a recovering user away from /auth/reset-password — Supabase
      // creates a temporary session for PASSWORD_RECOVERY and we must let the
      // user complete the form before redirecting anywhere else.
      const isResettingPassword = currentPath.startsWith('/auth/reset-password');
      const homeOverlay = getHomeOverlayPage();
      const shouldRedirectToDashboard =
        !isResettingPassword &&
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

    if (currentPath.startsWith('/booking/')) {
      return <BookingConfirmationPage />;
    }

    if (currentPath.startsWith('/property/')) {
      return <PropertyPage />;
    }

    if (currentPath === '/explore' || currentPath === '/explore/') {
      return <ExploreCitiesPage onNavigate={handleNavigate} />;
    }

    if (currentPath.startsWith('/stays/')) {
      const citySlug = currentPath.split('/stays/')[1].split('/')[0];
      if (citySlug === 'rishikesh') {
        return <RishikeshStaysPage />;
      }
      return <CityListingPage city={citySlug} />;
    }

    // Authenticated, but the host profile could not be loaded/created. Surface a
    // retry instead of silently falling through to the public homepage (which is
    // what made login "do nothing"). Public routes above still render normally.
    if (user && !host) {
      return <HostProfileError onRetry={() => window.location.reload()} onSignOut={signOut} />;
    }

    if (user && host) {
      if (currentPath.startsWith('/host/')) {
        const match = currentPath.match(/\/host\/[^/]+\/dashboard\/(.+)/);
        const page = match ? match[1] : 'overview';

        const handleNavigate = (newPage: string) => {
          setIsRouteLoading(true);
          const newPath = `/host/${host.id}/dashboard/${newPage}`;
          window.history.pushState({}, '', newPath);
          setCurrentPath(newPath);
          setTimeout(() => setIsRouteLoading(false), 300);
        };

        return (
          <HostDashboardLayout currentPage={page} onNavigate={handleNavigate} hostId={host.id}>
            {page === 'overview' && <OverviewPage onNavigate={handleNavigate} />}
            {page === 'properties' && <PropertiesPage />}
            {page === 'calendar' && <CalendarPage hostId={host.id} />}
            {page === 'bookings' && <BookingsPage onNavigate={handleNavigate} />}
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
      {renderContent()}
      <CookieConsentBanner />
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

import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import PropertyPage from './pages/PropertyPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import CityListingPage from './pages/CityListingPage';
import RishikeshStaysPage from './pages/RishikeshStaysPage';
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
import Preloader from './components/Preloader';
import MobileBottomNav from './components/MobileBottomNav';

export default function AppRouter() {
  const { user, host, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const handlePopState = () => {
      setIsRouteLoading(true);
      setCurrentPath(window.location.pathname);
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
  }, [currentPath, isInitialLoad]);

  useEffect(() => {
    if (!loading && user && host) {
      // Never bounce a recovering user away from /auth/reset-password — Supabase
      // creates a temporary session for PASSWORD_RECOVERY and we must let the
      // user complete the form before redirecting anywhere else.
      const isResettingPassword = currentPath.startsWith('/auth/reset-password');
      const shouldRedirectToDashboard =
        !isResettingPassword &&
        (currentPath.startsWith('/auth') || currentPath === '/' || currentPath === '/host');
      if (shouldRedirectToDashboard) {
        const dashboardPath = `/host/${host.id}/dashboard/overview`;
        // #region agent log
        fetch('http://127.0.0.1:7309/ingest/3b31d44b-bafe-4429-b25d-b5d1550a4355', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'adac9b' },
          body: JSON.stringify({
            sessionId: 'adac9b',
            hypothesisId: 'B',
            location: 'AppRouter.tsx:auth-redirect-effect',
            message: 'redirecting authenticated host to dashboard',
            data: { fromPath: currentPath, toPath: dashboardPath },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        window.history.pushState({}, '', dashboardPath);
        setCurrentPath(dashboardPath);
      }
    }
  }, [user, host, loading, currentPath]);

  const showPreloader = loading || isRouteLoading;

  if (loading) {
    return <Preloader isLoading={true} />;
  }

  const renderContent = () => {
    // #region agent log
    const resolveRouteBranch = (): string => {
      if (currentPath.startsWith('/auth')) return 'auth';
      if (currentPath.startsWith('/booking/')) return 'booking';
      if (currentPath.startsWith('/property/')) return 'property';
      if (currentPath.startsWith('/stays/')) return 'stays';
      if (user && host && currentPath.startsWith('/host/')) return 'host-dashboard';
      if (currentPath === '/' || currentPath === '') return 'new-homepage';
      return 'new-homepage-fallback';
    };
    const routeBranch = resolveRouteBranch();
    fetch('http://127.0.0.1:7309/ingest/3b31d44b-bafe-4429-b25d-b5d1550a4355', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'adac9b' },
      body: JSON.stringify({
        sessionId: 'adac9b',
        hypothesisId: 'A',
        location: 'AppRouter.tsx:renderContent',
        message: 'route branch resolved',
        data: {
          routeBranch,
          currentPath,
          pathname: typeof window !== 'undefined' ? window.location.pathname : '',
          hasUser: Boolean(user),
          hasHost: Boolean(host),
          loading,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (currentPath.startsWith('/auth')) {
      return <AuthRouter />;
    }

    if (currentPath.startsWith('/booking/')) {
      return <BookingConfirmationPage />;
    }

    if (currentPath.startsWith('/property/')) {
      return <PropertyPage />;
    }

    if (currentPath.startsWith('/stays/')) {
      const citySlug = currentPath.split('/stays/')[1].split('/')[0];
      if (citySlug === 'rishikesh') {
        return <RishikeshStaysPage />;
      }
      return <CityListingPage city={citySlug} />;
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
            {page === 'bookings' && <BookingsPage />}
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

    return <NewHomepage />;
  };

  const handleNavigate = (path: string) => {
    setIsRouteLoading(true);
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    setTimeout(() => setIsRouteLoading(false), 300);
  };

  return (
    <>
      <Preloader isLoading={showPreloader} />
      {renderContent()}
      <MobileBottomNav currentPath={currentPath} onNavigate={handleNavigate} />
    </>
  );
}

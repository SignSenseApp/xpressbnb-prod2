import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthRouter from './pages/auth/AuthRouter';
import HostDashboardLayout from './pages/host/HostDashboardLayout';
import OverviewPage from './pages/host/OverviewPage';

export default function Router() {
  const { user, host, loading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState('');
  const [hostPage, setHostPage] = useState('overview');

  useEffect(() => {
    const path = window.location.pathname;
    setCurrentRoute(path);

    const handlePopState = () => {
      setCurrentRoute(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentRoute(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#50C878] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (currentRoute.startsWith('/auth')) {
    return <AuthRouter onClose={() => navigate('/')} />;
  }

  if (currentRoute.startsWith('/host/') && user && host) {
    const handlePageNavigate = (page: string) => {
      setHostPage(page);
      navigate(`/host/${host.id}/dashboard/${page}`);
    };

    return (
      <HostDashboardLayout currentPage={hostPage} onNavigate={handlePageNavigate} hostId={host.id}>
        {hostPage === 'overview' && <OverviewPage />}
        {hostPage === 'properties' && <div>Properties page coming soon...</div>}
        {hostPage === 'calendar-sync' && <div>Calendar Sync page coming soon...</div>}
        {hostPage === 'import' && <div>Import page coming soon...</div>}
        {hostPage === 'bookings' && <div>Bookings page coming soon...</div>}
        {hostPage === 'earnings' && <div>Earnings page coming soon...</div>}
        {hostPage === 'realtime' && <div>Analytics page coming soon...</div>}
        {hostPage === 'reviews' && <div>Reviews page coming soon...</div>}
        {hostPage === 'subscription' && <div>Subscription page coming soon...</div>}
        {hostPage === 'settings' && <div>Settings page coming soon...</div>}
        {hostPage === 'support' && <div>Support page coming soon...</div>}
      </HostDashboardLayout>
    );
  }

  return null;
}

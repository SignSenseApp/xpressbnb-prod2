import { Compass, Home, Bookmark, MessageCircle, Plus, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface MobileBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const LEFT_TABS = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'saved', label: 'Saved', icon: Bookmark, path: '/saved' },
] as const;

const RIGHT_TABS = [
  { id: 'inbox', label: 'Inbox', icon: MessageCircle, path: '/track-inquiry' },
  { id: 'profile', label: 'Profile', icon: User, path: '/auth/login' },
] as const;

type Tab = (typeof LEFT_TABS)[number] | (typeof RIGHT_TABS)[number];

/** Fixed white bottom navigation — design spec (72px, center + button) */
export default function MobileBottomNav({ currentPath, onNavigate }: MobileBottomNavProps) {
  const { user, host } = useAuth();

  const shouldHide =
    currentPath.startsWith('/auth') ||
    currentPath.startsWith('/host/') ||
    currentPath.startsWith('/ops') ||
    currentPath.startsWith('/inquiry/success/') ||
    currentPath.startsWith('/guest/welcome/') ||
    currentPath.includes('/property/') ||
    currentPath.startsWith('/booking/');

  if (shouldHide) return null;

  const getActiveTab = () => {
    if (currentPath === '/saved') return 'saved';
    if (currentPath === '/' || currentPath === '') return 'home';
    if (currentPath.startsWith('/track-inquiry')) return 'inbox';
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: Tab) => {
    if (tab.id === 'home') {
      if (currentPath === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        onNavigate('/');
      }
    } else if (tab.id === 'profile') {
      if (user && host) {
        onNavigate(`/host/${host.id}/dashboard/overview`);
      } else {
        onNavigate('/auth/login');
      }
    } else {
      onNavigate(tab.path);
    }
  };

  const renderTab = (tab: Tab) => {
    const isActive = activeTab === tab.id;
    const Icon = tab.icon;
    return (
      <button
        key={tab.id}
        onClick={() => handleTabClick(tab)}
        className={`xm-nav__tab${isActive ? ' xm-nav__tab--active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
        aria-label={tab.id === 'profile' && user ? 'Dashboard' : tab.label}
      >
        <span className="xm-nav__icon-wrap">
          <Icon
            className="xm-nav__icon"
            strokeWidth={isActive ? 2 : 1.8}
            fill={isActive ? 'currentColor' : 'none'}
          />
          {tab.id === 'inbox' && <span className="xm-nav__dot" aria-hidden />}
        </span>
        <span className="xm-nav__label">
          {tab.id === 'profile' && user ? 'Dashboard' : tab.label}
        </span>
      </button>
    );
  };

  return (
    <nav className="xm-nav md:hidden" aria-label="Primary">
      {LEFT_TABS.map(renderTab)}
      <div className="xm-nav__fab-slot">
        <button
          type="button"
          onClick={() => onNavigate('/explore')}
          className="xm-nav__fab"
          aria-label="Explore stays"
        >
          <Plus strokeWidth={2.5} />
        </button>
      </div>
      {RIGHT_TABS.map(renderTab)}
    </nav>
  );
}

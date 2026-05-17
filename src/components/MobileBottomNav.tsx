import { Home, Compass, Bookmark, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ACCENT = '#50C878';

interface MobileBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const TABS = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'explore', label: 'Explore', icon: Compass, path: '/stays/delhi' },
  { id: 'saved', label: 'Saved', icon: Bookmark, path: '/' },
  { id: 'profile', label: 'Profile', icon: User, path: '/auth/login' },
] as const;

export default function MobileBottomNav({ currentPath, onNavigate }: MobileBottomNavProps) {
  const { user, host } = useAuth();

  const shouldHide =
    currentPath.startsWith('/auth') ||
    currentPath.startsWith('/host/') ||
    currentPath.includes('/property/') ||
    currentPath.startsWith('/booking/');

  if (shouldHide) return null;

  const getActiveTab = () => {
    if (currentPath === '/' || currentPath === '') return 'home';
    if (currentPath.startsWith('/stays/')) return 'explore';
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: typeof TABS[number]) => {
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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      aria-label="Primary"
    >
      <div
        // Frosted-white floating bar with a subtle slate hairline up top.
        // Using svh-style sizing so the bar doesn't shift when the URL bar
        // collapses on scroll.
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          borderTop: '1px solid var(--xpx-border)',
          boxShadow: '0 -8px 32px rgba(15,23,42,0.04)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-stretch justify-around px-2" style={{ minHeight: 64 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl active:scale-[0.92] transition-transform"
                style={{
                  color: isActive ? ACCENT : '#64748B',
                  // Comfortable Apple-grade hit target.
                  minHeight: 56,
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
              >
                {/* Active pill behind the icon — slides in with spring easing.
                    Subtle warm tint, never loud. */}
                <span
                  className="absolute inset-x-3 top-1.5 bottom-1.5 rounded-2xl transition-all"
                  style={{
                    background: isActive ? 'rgba(80,200,120,0.14)' : 'transparent',
                    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    transitionDuration: '260ms',
                  }}
                />
                <Icon
                  className="w-6 h-6 relative z-10 transition-transform"
                  strokeWidth={isActive ? 2.4 : 1.6}
                  style={{ transform: isActive ? 'translateY(-1px)' : 'translateY(0)' }}
                />
                <span
                  className="relative z-10 text-[10.5px] transition-all"
                  style={{ fontWeight: isActive ? 700 : 500, letterSpacing: '0.01em' }}
                >
                  {tab.id === 'profile' && user ? 'Dashboard' : tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

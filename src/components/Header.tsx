import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isArrivalRevealed } from '../lib/arrivalReveal';
import { XPRESSBNB_LOGO_NAV_IMG_CLASS, XPRESSBNB_LOGO_PATH } from '../lib/branding';
import { theme } from '../lib/theme';
import LocationIdentityChip from './nearby/LocationIdentityChip';
import XpModeSwitch from './XpModeSwitch';
import GuestSessionChip from './guest/GuestSessionChip';

interface HeaderProps {
  onAboutClick: () => void;
  onBlogClick: () => void;
  onHostLoginClick?: () => void;
  /**
   * When true, the header starts transparent over a hero photo and only
   * gains its frosted-white glass background once the user scrolls. Use on
   * pages with a hero image right under the header. Text uses a subtle
   * shadow while transparent so it stays legible on busy photos.
   */
  transparentOnTop?: boolean;
  /**
   * Property-page arrival — chrome stays invisible until ~one viewport of scroll,
   * then fades in with soft blur. Museum signage before; full navigation after.
   */
  arrivalMode?: boolean;
  /** Show soft guest welcome strip when local guest identity exists */
  showGuestSession?: boolean;
}

/**
 * Header — light Gen Z navbar shared across all non-home pages.
 */
export default function Header({
  onAboutClick,
  onBlogClick,
  onHostLoginClick,
  transparentOnTop = false,
  arrivalMode = false,
  showGuestSession = false,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => {
    if (arrivalMode) return false;
    return !transparentOnTop;
  });

  useEffect(() => {
    if (arrivalMode) {
      const onScroll = () => setScrolled(isArrivalRevealed());
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    if (!transparentOnTop) return;

    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [arrivalMode, transparentOnTop]);

  useEffect(() => {
    if (arrivalMode && !scrolled) {
      setMobileMenuOpen(false);
    }
  }, [arrivalMode, scrolled]);

  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const overHero = arrivalMode ? !scrolled : transparentOnTop && !scrolled;

  const navTextClass = overHero ? 'text-white' : 'text-xpx-muted';
  const navTextHover = overHero
    ? 'hover:text-white hover:bg-white/15'
    : 'hover:text-xpx-text hover:bg-slate-100';
  const brandTextClass = overHero ? 'text-white' : 'text-xpx-text';
  const transparentTextShadow = overHero
    ? '0 1px 2px rgba(0,0,0,0.35), 0 0 18px rgba(0,0,0,0.22)'
    : 'none';

  const headerClassName = arrivalMode
    ? `xpx-header-arrival${scrolled ? ' xpx-header-arrival--revealed' : ''}`
    : 'transition-all duration-500';

  const headerStyle = arrivalMode
    ? undefined
    : {
        background: scrolled ? 'rgba(255,255,255,0.78)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.6)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.6)' : 'none',
        borderBottom: scrolled ? `1px solid ${theme.border}` : '1px solid transparent',
      };

  return (
    <header className={`sticky top-0 z-50 xpx-top-chrome ${headerClassName}`} style={headerStyle}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 flex items-center justify-between xpx-nav-row gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink xpx-header-arrival-mark">
          <button
            onClick={goHome}
            className="flex items-center gap-2 min-w-0 shrink text-base sm:text-lg md:text-xl leading-none"
            aria-label="XpressBnB home"
          >
            <img
              src={XPRESSBNB_LOGO_PATH}
              alt=""
              className={XPRESSBNB_LOGO_NAV_IMG_CLASS}
              width={48}
              height={48}
              decoding="async"
            />
            <span
              className={`hidden sm:inline truncate ${brandTextClass}`}
              style={{
                fontSize: 'clamp(20px, 2.2vw, 24px)',
                letterSpacing: '-0.03em',
                fontWeight: 800,
                textShadow: transparentTextShadow,
                lineHeight: 1,
              }}
            >
              <span>Xpress</span>
              <span style={{ color: overHero ? '#6ee7b7' : '#34D399' }}>BnB</span>
            </span>
          </button>
          {(!arrivalMode || scrolled) && (
            <XpModeSwitch variant={overHero ? 'light' : 'dark'} />
          )}
        </div>

        <nav
          className={`hidden md:flex items-center gap-1 xpx-header-arrival-chrome${arrivalMode && !scrolled ? ' xpx-header-arrival-chrome--hidden' : ''}`}
          aria-hidden={arrivalMode && !scrolled ? true : undefined}
        >
          <LocationIdentityChip variant={overHero ? 'light' : 'dark'} className="mr-2" />
          <button
            onClick={goHome}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-opacity duration-250 ${navTextClass} ${navTextHover}`}
            style={{ textShadow: transparentTextShadow }}
            tabIndex={arrivalMode && !scrolled ? -1 : undefined}
          >
            Stays
          </button>
          <button
            disabled
            className={`px-4 py-2 rounded-full text-sm font-medium cursor-default ${
              overHero ? 'text-white/55' : 'text-xpx-subtle'
            }`}
            style={{ textShadow: transparentTextShadow }}
            tabIndex={-1}
          >
            Experiences
          </button>
          <button
            disabled
            className={`px-4 py-2 rounded-full text-sm font-medium cursor-default ${
              overHero ? 'text-white/55' : 'text-xpx-subtle'
            }`}
            style={{ textShadow: transparentTextShadow }}
            tabIndex={-1}
          >
            Services
          </button>
          <button
            onClick={onAboutClick}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-opacity duration-250 ${navTextClass} ${navTextHover}`}
            style={{ textShadow: transparentTextShadow }}
            tabIndex={arrivalMode && !scrolled ? -1 : undefined}
          >
            About
          </button>
          <button
            onClick={onBlogClick}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-opacity duration-250 ${navTextClass} ${navTextHover}`}
            style={{ textShadow: transparentTextShadow }}
            tabIndex={arrivalMode && !scrolled ? -1 : undefined}
          >
            Blog
          </button>
        </nav>

        <div
          className={`flex items-center gap-2 shrink-0 xpx-header-arrival-chrome${arrivalMode && !scrolled ? ' xpx-header-arrival-chrome--hidden' : ''}`}
          aria-hidden={arrivalMode && !scrolled ? true : undefined}
        >
          {showGuestSession && <GuestSessionChip scrolled={!overHero} />}
          {onHostLoginClick && (
            <button
              onClick={onHostLoginClick}
              className="xpx-header-host-login rounded-full px-3.5 sm:px-5 md:px-6 py-2 md:py-2.5 font-bold text-xs sm:text-sm whitespace-nowrap bg-xpx-warm hover:bg-xpx-warm-dark text-white"
              tabIndex={arrivalMode && !scrolled ? -1 : undefined}
            >
              Host Login
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-full transition-opacity duration-250 ${
              overHero ? 'text-white hover:bg-white/15' : 'text-xpx-text hover:bg-slate-100'
            }`}
            aria-label="Menu"
            tabIndex={arrivalMode && !scrolled ? -1 : undefined}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && scrolled && (
        <div className="md:hidden border-t xpx-header-arrival-mobile-menu">
          <nav className="px-4 py-3 space-y-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onAboutClick();
              }}
              className="block w-full text-left px-5 py-3 text-xpx-text hover:bg-slate-100 rounded-2xl font-semibold transition-opacity duration-250"
            >
              About
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onBlogClick();
              }}
              className="block w-full text-left px-5 py-3 text-xpx-text hover:bg-slate-100 rounded-2xl font-semibold transition-opacity duration-250"
            >
              Blog
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

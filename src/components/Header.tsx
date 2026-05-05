import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { theme } from '../lib/theme';

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
}

/**
 * Header — light Gen Z navbar shared across all non-home pages.
 *
 * Design language:
 *  - frosted-white glass surface that fades from transparent → blurred on
 *    scroll, with a subtle slate hairline.
 *  - warm accent (theme.warm) for the brand mark and the primary CTA.
 *  - tight tracking, extra-bold logotype.
 */
export default function Header({
  onAboutClick,
  onBlogClick,
  onHostLoginClick,
  transparentOnTop = false,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(!transparentOnTop);

  useEffect(() => {
    if (!transparentOnTop) return;
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [transparentOnTop]);

  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // While transparent over a hero, force light text + a soft text shadow
  // for legibility. Once scrolled, switch to dark ink on white glass.
  const navTextClass = scrolled ? 'text-xpx-muted' : 'text-white';
  const navTextHover = scrolled ? 'hover:text-xpx-text hover:bg-slate-100' : 'hover:text-white hover:bg-white/15';
  const brandTextClass = scrolled ? 'text-xpx-text' : 'text-white';
  const transparentTextShadow = scrolled
    ? 'none'
    : '0 1px 2px rgba(0,0,0,0.35), 0 0 18px rgba(0,0,0,0.22)';

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.78)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.6)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.6)' : 'none',
        borderBottom: scrolled ? `1px solid ${theme.border}` : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 flex items-center justify-between h-[60px] md:h-[72px] gap-2">
        <button onClick={goHome} className="flex items-center gap-2 min-w-0 shrink">
          <img
            src="/image.png"
            alt="XpressBnB"
            className="h-8 md:h-9 w-8 md:w-9 object-contain shrink-0"
          />
          <span
            className={`text-base sm:text-lg md:text-xl font-extrabold tracking-tight truncate ${brandTextClass}`}
            style={{ textShadow: transparentTextShadow }}
          >
            Xpress<span style={{ color: theme.warm }}>BnB</span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={goHome}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${navTextClass} ${navTextHover}`}
            style={{ textShadow: transparentTextShadow }}
          >
            Stays
          </button>
          <button
            disabled
            className={`px-4 py-2 rounded-full text-sm font-medium cursor-default ${
              scrolled ? 'text-xpx-subtle' : 'text-white/55'
            }`}
            style={{ textShadow: transparentTextShadow }}
          >
            Experiences
          </button>
          <button
            disabled
            className={`px-4 py-2 rounded-full text-sm font-medium cursor-default ${
              scrolled ? 'text-xpx-subtle' : 'text-white/55'
            }`}
            style={{ textShadow: transparentTextShadow }}
          >
            Services
          </button>
          <button
            onClick={onAboutClick}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${navTextClass} ${navTextHover}`}
            style={{ textShadow: transparentTextShadow }}
          >
            About
          </button>
          <button
            onClick={onBlogClick}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${navTextClass} ${navTextHover}`}
            style={{ textShadow: transparentTextShadow }}
          >
            Blog
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {onHostLoginClick && (
            <button
              onClick={onHostLoginClick}
              className="rounded-full px-3.5 sm:px-5 md:px-6 py-2 md:py-2.5 font-bold text-xs sm:text-sm transition-all hover:scale-[1.03] whitespace-nowrap"
              style={{
                background: theme.warm,
                color: '#ffffff',
                boxShadow: '0 6px 18px rgba(244,162,97,0.32)',
              }}
            >
              Host Login
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-full transition-colors ${
              scrolled ? 'text-xpx-text hover:bg-slate-100' : 'text-white hover:bg-white/15'
            }`}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="md:hidden border-t"
          style={{
            borderColor: theme.border,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(20px) saturate(1.6)',
          }}
        >
          <nav className="px-4 py-3 space-y-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onAboutClick();
              }}
              className="block w-full text-left px-5 py-3 text-xpx-text hover:bg-slate-100 rounded-2xl font-semibold transition-colors"
            >
              About
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onBlogClick();
              }}
              className="block w-full text-left px-5 py-3 text-xpx-text hover:bg-slate-100 rounded-2xl font-semibold transition-colors"
            >
              Blog
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

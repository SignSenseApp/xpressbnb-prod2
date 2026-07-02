import { Menu, MessageCircle, X } from 'lucide-react';
import type { RefObject } from 'react';
import { XPRESSBNB_LOGO_PATH } from '../../lib/branding';
import HeroSearchBar, { type HeroSearchBarProps } from '../search/HeroSearchBar';

const HERO_IMAGE = '/images/home/hero-mobile.png';

const TRAVELER_AVATARS = [
  '/images/home/avatars/avatar-1.png',
  '/images/home/avatars/avatar-2.png',
  '/images/home/avatars/avatar-3.png',
  '/images/home/avatars/avatar-4.png',
  '/images/home/avatars/avatar-5.png',
] as const;

export type MobileHomepageHeroProps = {
  searchBarProps: HeroSearchBarProps;
  searchSentinelRef: RefObject<HTMLDivElement>;
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  onNavigateInbox: () => void;
  onScrollHome: () => void;
};

/**
 * Mobile homepage hero — XpressBnB mobile design spec.
 * 72vh image with 160° dark gradient, transparent absolute header
 * (white logo card + frosted glass icon buttons), content anchored to
 * the bottom: headline, subtitle, 54px search pill, social proof row.
 * Mobile only (<768px); desktop hero is separate and frozen.
 */
export default function MobileHomepageHero({
  searchBarProps,
  searchSentinelRef,
  mobileNavOpen,
  onToggleMobileNav,
  onNavigateInbox,
  onScrollHome,
}: MobileHomepageHeroProps) {
  return (
    <section className="xmh" aria-label="Discover stays">
      <img
        src={HERO_IMAGE}
        alt=""
        className="xmh-photo"
        width={1024}
        height={683}
        fetchPriority="high"
        loading="eager"
        decoding="async"
      />
      <div className="xmh-overlay" aria-hidden />

      <header className="xmh-header">
        <button
          type="button"
          onClick={onScrollHome}
          className="xmh-logo"
          aria-label="XpressBnB home"
        >
          <img
            src={XPRESSBNB_LOGO_PATH}
            alt=""
            className="xmh-logo__icon"
            width={22}
            height={22}
            decoding="async"
          />
          <span className="xmh-logo__label">XpressBnB</span>
        </button>

        <div className="xmh-header__actions">
          <button
            type="button"
            onClick={onNavigateInbox}
            className="xmh-glass-btn"
            aria-label="Inbox"
          >
            <MessageCircle strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onToggleMobileNav}
            className="xmh-glass-btn"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileNavOpen ? <X strokeWidth={1.8} /> : <Menu strokeWidth={1.8} />}
          </button>
        </div>
      </header>

      <div className="xmh-content">
        <h1 className="xmh-headline">
          Stay somewhere
          <br />
          <em className="xmh-headline__accent">worth</em> remembering.
        </h1>

        <p className="xmh-sub">Private stays. Direct hosts. No hidden fees.</p>

        <div ref={searchSentinelRef} className="xmh-search">
          <HeroSearchBar {...searchBarProps} variant="hero-h1" />
        </div>

        <div className="xmh-proof">
          <div className="xmh-proof__avatars" aria-hidden>
            {TRAVELER_AVATARS.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className="xmh-proof__avatar"
                width={26}
                height={26}
                loading={i < 2 ? 'eager' : 'lazy'}
                decoding="async"
              />
            ))}
          </div>
          <p className="xmh-proof__text">
            1M+ travelers trust <strong>XpressBnB</strong>
          </p>
        </div>
      </div>
    </section>
  );
}

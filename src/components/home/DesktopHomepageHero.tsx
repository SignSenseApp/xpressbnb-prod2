import HeroSearchBar, { type HeroSearchBarProps } from '../search/HeroSearchBar';

const HERO_IMAGE = '/images/home/hero-rishikesh.png';

export type DesktopHomepageHeroProps = {
  searchBarProps: HeroSearchBarProps;
};

/** Desktop homepage hero — unchanged from pre-mobile-rebuild layout. */
export default function DesktopHomepageHero({ searchBarProps }: DesktopHomepageHeroProps) {
  return (
    <section className="xpx-h1-hero hidden md:block" aria-label="Discover stays">
      <div className="xpx-h1-hero__frame">
        <img
          src={HERO_IMAGE}
          alt=""
          className="xpx-h1-hero__image"
          width={1280}
          height={720}
          fetchPriority="high"
          decoding="async"
        />
        <div className="xpx-h1-hero__content">
          <div className="xpx-h1-hero__copy">
            <h1 className="xpx-h1-hero__title">
              <span className="xpx-h1-hero__title-line">Stay</span>
              <span className="xpx-h1-hero__title-line">somewhere</span>
              <span className="xpx-h1-hero__title-line xpx-h1-hero__title-line--accent">worth</span>
              <span className="xpx-h1-hero__title-line">remembering.</span>
            </h1>
            <p className="xpx-h1-hero__sub">
              Private stays. Direct hosts.
              <br />
              No hidden fees.
            </p>
          </div>
          <div className="xpx-h1-hero__spacer" aria-hidden />
          <div className="xpx-h1-hero__lower">
            <div className="xpx-h1-hero__search">
              <HeroSearchBar {...searchBarProps} variant="hero" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

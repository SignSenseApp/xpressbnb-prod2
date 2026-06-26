import { lazy, Suspense, useMemo, type CSSProperties } from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  ShieldCheck,
  Zap,
  Lock,
  Menu,
  X,
} from 'lucide-react';
import { XPRESSBNB_LOGO_PATH } from '../lib/branding';
import SEOHead from './SEOHead';
import { generateOrganizationStructuredData } from '../lib/seo';
import { addDaysIso, parseTripFromSearch } from '../lib/tripSearch';
import { scrollToId } from '../lib/smoothScroll';
import { readScrollAnchorOffset } from '../lib/layoutTokens';
import XpModeSwitch from './XpModeSwitch';
import HomepageBelowFoldGate from './HomepageBelowFoldGate';
import HeroSearchBar from './search/HeroSearchBar';
import { useNearbyLocationOptional } from '../contexts/NearbyLocationContext';
import { useGuestOnboardingOptional } from '../contexts/GuestOnboardingContext';
import { usePrefersReducedMotion } from '../hooks/useGalleryMotion';
import { useStickySearchMorph } from '../hooks/useStickySearchMorph';
import { readLocationPreference } from '../lib/locationPreferences';

const PersonalizedHomeFeed = lazy(() => import('./nearby/PersonalizedHomeFeed'));

// Global brand system (premium minimal emerald scale).
const ACCENT = '#059669';
const ACCENT_DARK = '#047857';
const ACCENT_LIGHT = '#ecfdf5';
const BASE = '#FAFAF8';
const SURFACE = '#FFFFFF';
const SURFACE_LIGHT = '#F8FAFC';
const TEXT = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER = '#E5E7EB';
/**
 * Pexels CDN: keep `w` modest for first paint (LCP). Pattern:
 * `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&cs=tinysrgb&w=<width>`
 */
const HERO_PEXELS_W_DESKTOP = 1280;
const HERO_IMAGE_WIDTHS = [375, 768, HERO_PEXELS_W_DESKTOP] as const;
/** Full-bleed hero — image width always matches viewport. */
const HERO_IMAGE_SIZES = '100vw';

function pexelsPhotoUrl(photoId: string, width: number) {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

function heroPexelsSrcSet(photoId: string): string {
  return HERO_IMAGE_WIDTHS.map((w) => `${pexelsPhotoUrl(photoId, w)} ${w}w`).join(', ');
}

function heroPexelsSrc(photoId: string): string {
  return pexelsPhotoUrl(photoId, HERO_PEXELS_W_DESKTOP);
}

/** Intrinsic 16:9 hints for hero `<img>` (object-cover; real aspect may vary slightly). */
const HERO_IMG_INTRINSIC = { width: 1920, height: 1080 } as const;

const HERO_SLIDE_META = [
  { city: 'Gurgaon', tagline: 'Corporate hub, premium stays', photoId: '1571460' },
  { city: 'Delhi', tagline: 'Capital stays, unbeatable prices', photoId: '2506988' },
  { city: 'Rishikesh', tagline: 'Yoga capital, riverside retreats', photoId: '2161449' },
  { city: 'Noida', tagline: 'Modern city, verified comfort', photoId: '1396122' },
  {
    city: 'Greater Noida',
    tagline: 'Spacious homes, serene surroundings',
    photoId: '1643383',
  },
] as const;

const HERO_SLIDES = HERO_SLIDE_META.map(({ city, tagline, photoId }) => ({
  city,
  tagline,
  photoId,
  src: heroPexelsSrc(photoId),
  srcSet: heroPexelsSrcSet(photoId),
}));

const CITIES = ['Delhi', 'Gurgaon', 'Noida', 'Greater Noida', 'Ghaziabad', 'Rishikesh'];

const BELOW_FOLD_ANCHOR_IDS = new Set(['listings', 'host', 'why']);
const PERSONALIZED_CROSSFADE_MS = 220;

const TRUST_BADGES = [
  {
    icon: CheckCircle,
    label: 'Verified Properties',
    subtext: 'Every stay vetted',
  },
  {
    icon: Lock,
    label: 'Secure Booking',
    subtext: 'Protected payments',
  },
  {
    icon: Zap,
    label: 'Zero Commission',
    subtext: 'No middleman fees',
  },
  {
    icon: ShieldCheck,
    label: 'Best Price Guarantee',
    subtext: 'Always the best rate',
  },
];

export default function NewHomepage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  /** Slides that have ever been active — mount `<img>` only for these (starts {0} for LCP). */
  const heroSlidesWithImgRef = useRef(new Set<number>([0]));
  heroSlidesWithImgRef.current.add(heroIndex);

  const activateBelowFoldRef = useRef<(() => void) | null>(null);
  const heroSearchSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = (heroIndex + 1) % HERO_SLIDES.length;
    const slide = HERO_SLIDES[next];
    const img = new Image();
    img.sizes = HERO_IMAGE_SIZES;
    img.srcset = slide.srcSet;
    img.src = slide.src;
  }, [heroIndex]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setHeroIndex(i => (i + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const scrollTo = (id: string) => {
    if (BELOW_FOLD_ANCHOR_IDS.has(id)) {
      activateBelowFoldRef.current?.();
    }
    requestAnimationFrame(() => {
      scrollToId(id, { offset: readScrollAnchorOffset(), duration: 1.05 });
    });
  };

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleCityClick = (city: string) => {
    navigate(`/stays/${city.toLowerCase().replace(/\s+/g, '-')}`);
  };

  // Hero search state — city + dates + guests, all serializable into the URL
  // so /stays/<city>?checkin=...&checkout=...&guests=N stays shareable.
  const [searchCity, setSearchCity] = useState<string>('Delhi');
  const [searchCheckin, setSearchCheckin] = useState<string>('');
  const [searchCheckout, setSearchCheckout] = useState<string>('');
  const [searchGuests, setSearchGuests] = useState<number>(2);

  useEffect(() => {
    if (window.location.pathname !== '/') return;
    const t = parseTripFromSearch(window.location.search);
    if (t.checkin) setSearchCheckin(t.checkin);
    if (t.checkout) setSearchCheckout(t.checkout);
    if (t.guests != null && t.guests > 0) setSearchGuests(t.guests);
  }, []);

  const handleSearchCheckin = (v: string) => {
    setSearchCheckin(v);
    setSearchCheckout(prev => {
      if (!v) return prev;
      if (!prev || prev <= v) return addDaysIso(v, 1);
      return prev;
    });
  };

  const handleSearchCheckout = (v: string) => {
    if (searchCheckin && v && v <= searchCheckin) {
      setSearchCheckout(addDaysIso(searchCheckin, 1));
      return;
    }
    setSearchCheckout(v);
  };

  const handleHeroSearch = () => {
    const today = new Date().toISOString().split('T')[0];
    let cin = searchCheckin;
    let cout = searchCheckout;
    if (cin && cin < today) cin = today;
    if (cin && !cout) cout = addDaysIso(cin, 1);
    if (
      cin &&
      cout &&
      new Date(`${cout}T12:00:00`).getTime() <= new Date(`${cin}T12:00:00`).getTime()
    ) {
      cout = addDaysIso(cin, 1);
    }
    const slug = searchCity.toLowerCase().replace(/\s+/g, '-');
    const params = new URLSearchParams();
    if (cin) params.set('checkin', cin);
    if (cout) params.set('checkout', cout);
    if (searchGuests) params.set('guests', String(searchGuests));
    const qs = params.toString();
    navigate(`/stays/${slug}${qs ? `?${qs}` : ''}`);
  };

  const nearby = useNearbyLocationOptional();
  const onboarding = useGuestOnboardingOptional();
  const reducedMotion = usePrefersReducedMotion();
  const hasPersonalizedLocation =
    nearby?.permission === 'granted' &&
    Boolean(nearby.coords ?? readLocationPreference()?.coords);
  const wantsPersonalized = hasPersonalizedLocation;
  const showPersonalized = wantsPersonalized && (onboarding?.isOnboardingSettled ?? true);
  const stickySearchActive = useStickySearchMorph(heroSearchSentinelRef, !showPersonalized);

  const nearbyLocationLabel = useMemo(() => {
    if (!nearby) return null;
    if (nearby.permission === 'granted') {
      const city =
        nearby.detectedCity?.split(',')[0] ?? nearby.locationLabel?.split(',')[0] ?? null;
      return city ? `Near ${city}` : 'Around you';
    }
    return 'Choose location';
  }, [nearby]);

  const handleSearchLocationClick = () => {
    navigate('/explore');
  };

  const searchBarProps = {
    cities: CITIES,
    city: searchCity,
    onCityChange: setSearchCity,
    checkin: searchCheckin,
    onCheckinChange: handleSearchCheckin,
    checkout: searchCheckout,
    onCheckoutChange: handleSearchCheckout,
    guests: searchGuests,
    onGuestsChange: setSearchGuests,
    onSearch: handleHeroSearch,
    locationLabel: nearbyLocationLabel,
    onLocationClick: handleSearchLocationClick,
  };

  const crossfadeStyle = (active: boolean): CSSProperties => ({
    opacity: active ? 1 : 0,
    pointerEvents: active ? 'auto' : 'none',
    transition: reducedMotion ? 'none' : `opacity ${PERSONALIZED_CROSSFADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
  });

  const standardHomepage = (
    <div className="min-h-screen relative overflow-x-clip" style={{ background: BASE, color: TEXT }}>
      <SEOHead
        config={{
          title:
            'XpressBnB - Verified Stays in Delhi NCR | No Commission, Best Price Guaranteed',
          description:
            'Book verified homes and apartments directly from hosts. Premium stays in Delhi, Gurgaon, Noida and Rishikesh. No brokerage, zero commission.',
          keywords:
            'verified stays delhi, no brokerage apartments, premium stays noida, gurgaon serviced apartments, rishikesh retreats',
          canonical: 'https://xpressbnb.com',
          structuredData: generateOrganizationStructuredData(),
        }}
      />

      {/* ──── Top chrome — safe-area aware, sticky search morph on mobile ──── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 xpx-top-chrome transition-[border-color,box-shadow] duration-200"
        style={{
          background: SURFACE,
          borderBottom: scrolled || stickySearchActive ? `1px solid ${BORDER}` : `1px solid rgba(226, 232, 240, 0.65)`,
          boxShadow:
            scrolled || stickySearchActive ? '0 4px 24px rgba(15, 23, 42, 0.06)' : 'none',
        }}
      >
        <div className="xpx-container xpx-nav-row grid grid-cols-[auto_1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-self-start">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 min-w-0 text-left shrink"
              aria-label="XpressBnB home"
            >
              <img
                src={XPRESSBNB_LOGO_PATH}
                alt=""
                className={`object-contain shrink-0 transition-all duration-200 ${
                  scrolled || stickySearchActive ? 'h-8 w-8 sm:h-9 sm:w-9' : 'h-9 w-9 sm:h-10 sm:w-10'
                }`}
                width={40}
                height={40}
                decoding="async"
                fetchPriority="low"
              />
              <span
                className="hidden sm:inline truncate text-[22px] sm:text-[24px] leading-none"
                style={{
                  letterSpacing: '-0.03em',
                  textShadow: '0 1px 2px rgba(15,23,42,0.18)',
                }}
              >
                <span style={{ color: TEXT, fontWeight: 800 }}>Xpress</span>
                <span style={{ color: '#34D399', fontWeight: 800 }}>BnB</span>
              </span>
            </button>
            <XpModeSwitch />
          </div>

          <nav className="hidden lg:flex items-center justify-center gap-1 justify-self-center">
            {['Stays', 'Experiences', 'Host', 'About'].map(label => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  label === 'Host'
                    ? navigate('/auth/login')
                    : scrollTo(label === 'Stays' ? 'listings' : label === 'About' ? 'why' : 'listings')
                }
                className="px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[48px] inline-flex items-center"
                style={{ color: TEXT }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = ACCENT;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = TEXT;
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0 justify-self-end">
            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              className="hidden md:inline-flex items-center justify-center px-3 sm:px-4 rounded-lg text-sm font-medium transition-colors min-h-[48px]"
              style={{ color: TEXT }}
              onMouseEnter={e => {
                e.currentTarget.style.color = ACCENT;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = TEXT;
              }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => navigate('/auth/register')}
              className="inline-flex items-center justify-center rounded-lg px-2 sm:px-3 md:px-4 text-[11px] sm:text-xs md:text-sm font-semibold text-white transition-colors whitespace-nowrap min-h-[48px] shrink touch-manipulation"
              style={{ background: ACCENT }}
              onMouseEnter={e => {
                e.currentTarget.style.background = ACCENT_DARK;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = ACCENT;
              }}
            >
              <span className="hidden md:inline">List your property</span>
              <span className="md:hidden">List property</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen(o => !o)}
              className="lg:hidden inline-flex h-12 w-12 items-center justify-center rounded-lg transition-colors touch-manipulation"
              style={{ color: TEXT }}
              aria-expanded={mobileNavOpen}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileNavOpen ? <X className="h-6 w-6" strokeWidth={2} /> : <Menu className="h-6 w-6" strokeWidth={2} />}
            </button>
          </div>
        </div>

        <div
          className="md:hidden overflow-hidden xpx-container"
          style={{
            maxHeight: stickySearchActive ? 'var(--xpx-sticky-search-height)' : 0,
            opacity: stickySearchActive ? 1 : 0,
            paddingBottom: stickySearchActive ? '0.5rem' : 0,
            transition: reducedMotion
              ? 'none'
              : 'max-height 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), padding-bottom 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          aria-hidden={!stickySearchActive}
        >
          <HeroSearchBar {...searchBarProps} variant="compact" />
        </div>

        {mobileNavOpen && (
          <div
            className="lg:hidden border-t overflow-hidden"
            style={{
              background: SURFACE,
              borderColor: BORDER,
            }}
          >
            <nav className="xpx-container py-3 flex flex-col">
              {['Stays', 'Experiences', 'Host', 'About'].map(label => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    if (label === 'Host') {
                      navigate('/auth/login');
                    } else {
                      scrollTo(label === 'Stays' ? 'listings' : label === 'About' ? 'why' : 'listings');
                    }
                  }}
                  className="w-full text-left py-3.5 px-2 rounded-lg text-[15px] font-medium min-h-[48px] flex items-center touch-manipulation"
                  style={{ color: TEXT }}
                >
                  {label}
                </button>
              ))}
              <div className="border-t mt-2 pt-2 md:hidden" style={{ borderColor: BORDER }}>
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    navigate('/auth/login');
                  }}
                  className="w-full text-left py-3.5 px-2 rounded-lg text-[15px] font-medium min-h-[48px] flex items-center touch-manipulation"
                  style={{ color: TEXT }}
                >
                  Log in
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ──── Hero ──── */}
      <section
        className="relative w-full overflow-hidden"
        style={{ height: 'clamp(430px, 70svh, 520px)', minHeight: 430 }}
      >
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.city}
            className="absolute inset-0"
            style={{
              opacity: i === heroIndex ? 1 : 0,
              transition: 'opacity 1800ms ease-in-out',
            }}
          >
            {heroSlidesWithImgRef.current.has(i) ? (
              <img
                src={slide.src}
                srcSet={slide.srcSet}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full max-w-none object-cover"
                width={HERO_IMG_INTRINSIC.width}
                height={HERO_IMG_INTRINSIC.height}
                sizes={HERO_IMAGE_SIZES}
                loading={i === heroIndex ? 'eager' : 'lazy'}
                fetchPriority={i === heroIndex ? 'high' : 'low'}
                decoding="async"
                style={{
                  transform: i === heroIndex ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 12000ms ease-out',
                }}
              />
            ) : null}
          </div>
        ))}
        {/* Gradient overlay — fades from 35% dark at top to the new off-white
            at the bottom, so the section seam into the cream Trust Strip is
            seamless. Avoids the old hard cinematic-black handoff. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(2,6,23,0.66) 0%, rgba(2,6,23,0.52) 42%, rgba(2,6,23,0.36) 72%, rgba(2,6,23,0.22) 100%)',
          }}
        />

        <div className="relative z-[1] h-full xpx-container xpx-nav-offset pb-6 md:pb-10">
          <div className="h-full flex flex-col justify-end md:justify-center">
            <div
              className="max-w-3xl"
              style={{ animation: 'fadeInUp 560ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
            >
              <h1
                className="text-white font-extrabold leading-[1.08] tracking-tight"
                style={{ fontSize: 'clamp(36px, 6.1vw, 76px)', lineHeight: 0.98, textShadow: '0 8px 28px rgba(2,6,23,0.45)' }}
              >
                Find Your Verified Stay
              </h1>
              <p
                className="mt-4 max-w-2xl text-sm sm:text-base md:text-lg font-medium"
                style={{ color: 'rgba(248,250,252,0.95)', textShadow: '0 2px 10px rgba(2,6,23,0.45)' }}
              >
                Direct bookings. Trusted hosts. Zero commission. Best price, always.
              </p>
            </div>

            <div
              ref={heroSearchSentinelRef}
              className="w-full max-w-5xl mt-5 md:mt-auto md:pb-0.5"
              style={{ animation: 'xpx-search-float-in 620ms cubic-bezier(0.22, 1, 0.36, 1) 90ms both' }}
            >
              <HeroSearchBar {...searchBarProps} variant="hero" />
            </div>
          </div>
        </div>
      </section>

      {/* ──── Trust Strip ──── */}
      <section
        className="relative z-[2] -mt-7 md:-mt-10"
        style={{ background: SURFACE_LIGHT, borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="xpx-container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3 py-5 md:py-6">
            {TRUST_BADGES.map(({ icon: Icon, label, subtext }) => (
              <div
                key={label}
                className="flex items-start gap-2.5 md:gap-3 px-3 md:px-4 py-3 rounded-2xl"
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  boxShadow: '0 6px 18px rgba(15,23,42,0.05)',
                }}
              >
                <div
                  className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: ACCENT_LIGHT }}
                >
                  <Icon className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] md:text-sm font-semibold leading-tight" style={{ color: TEXT }}>
                    {label}
                  </div>
                  <div className="hidden md:block text-xs mt-1 leading-tight" style={{ color: TEXT_MUTED }}>
                    {subtext}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomepageBelowFoldGate
        onCityClick={handleCityClick}
        onNavigate={navigate}
        scrollTo={scrollTo}
        onActivateRef={(activate) => {
          activateBelowFoldRef.current = activate;
        }}
      />
    </div>
  );

  if (!wantsPersonalized) {
    return standardHomepage;
  }

  return (
    <div className="relative min-h-screen" style={{ background: BASE }}>
      <div
        className="min-h-screen"
        style={{
          ...crossfadeStyle(showPersonalized),
          position: showPersonalized ? 'relative' : 'absolute',
          inset: 0,
          width: '100%',
        }}
        aria-hidden={!showPersonalized}
      >
        <SEOHead
          config={{
            title: `Stays near ${nearby?.detectedCity ?? 'you'} | XpressBnB`,
            description:
              'Personalized verified stays near you. Zero commission, direct from hosts.',
            keywords: 'nearby stays, verified homes, xpressbnb',
            canonical: 'https://xpressbnb.com',
            structuredData: generateOrganizationStructuredData(),
          }}
        />
        <Suspense fallback={null}>
          <PersonalizedHomeFeed
            onNavigate={navigate}
            compactSearch={<HeroSearchBar {...searchBarProps} variant="compact" />}
          />
        </Suspense>
      </div>
      <div
        style={{
          ...crossfadeStyle(!showPersonalized),
          position: showPersonalized ? 'absolute' : 'relative',
          inset: 0,
          width: '100%',
        }}
        aria-hidden={showPersonalized}
      >
        {standardHomepage}
      </div>
    </div>
  );
}
